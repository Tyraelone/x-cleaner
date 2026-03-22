import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../../src/shared/defaults";
import {
  RAW_AI_CLASSIFICATION_RESULT,
  REQUEST_AI_CLASSIFICATION,
} from "../../src/shared/messages";
import { classifyWithProvider } from "../../src/background/ai";

describe("classifyWithProvider", () => {
  it("returns a non-blocking raw result when AI is disabled", async () => {
    const fetchImpl = vi.fn();

    const result = await classifyWithProvider(
      {
        enabled: false,
      } as any,
      "a neutral post",
      fetchImpl,
    );

    expect(result).toEqual({
      blocked: false,
      confidence: 0,
      matches: [],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the explicit mock provider branch", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(),
    });

    const result = await classifyWithProvider(
      {
        enabled: true,
        provider: "mock",
        model: "gpt-4o-mini",
      } as any,
      "please follow me now",
      fetchImpl,
    );

    expect(result).toEqual({
      blocked: true,
      category: "spam",
      confidence: 0.99,
      matches: [
        {
          category: "spam",
          matchedText: "follow me",
        },
      ],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requests structured output from the real provider and normalizes it", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        output: {
          blocked: true,
          category: "spam",
          matches: [
            {
              category: "spam",
              matchedText: "follow me",
              startIndex: 10,
              endIndex: 19,
            },
          ],
        },
        confidence: 0.93,
      }),
    });

    const result = await classifyWithProvider(
      {
        enabled: true,
        model: "gpt-4o-mini",
      } as any,
      "please follow me now",
      fetchImpl,
    );

    expect(result).toEqual({
      blocked: true,
      category: "spam",
      confidence: 0.93,
      matches: [
        {
          category: "spam",
          matchedText: "follow me",
          startIndex: 10,
          endIndex: 19,
        },
      ],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "gpt-4o-mini",
      response_format: {
        type: "json_object",
      },
    });
  });

  it("falls back to a non-blocking result when fetch fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await classifyWithProvider(
      {
        enabled: true,
        model: "gpt-4o-mini",
      } as any,
      "please follow me now",
      fetchImpl,
    );

    expect(result).toEqual({
      blocked: false,
      confidence: 0,
      matches: [],
    });
  });

  it("falls back to a non-blocking result when parsing fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error("bad json")),
    });

    const result = await classifyWithProvider(
      {
        enabled: true,
        model: "gpt-4o-mini",
      } as any,
      "please follow me now",
      fetchImpl,
    );

    expect(result).toEqual({
      blocked: false,
      confidence: 0,
      matches: [],
    });
  });
});

describe("background listener", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("returns a typed raw AI response through the worker listener", async () => {
    const addListener = vi.fn();
    const classifyWithProviderMock = vi.fn().mockResolvedValue({
      blocked: true,
      category: "spam",
      confidence: 0.91,
      matches: [],
    });
    const getSettingsMock = vi.fn().mockResolvedValue({
      ...defaultSettings,
      ai: {
        enabled: true,
        provider: "mock",
      } as any,
    });
    const getApiKeyMock = vi.fn().mockResolvedValue(null);

    let registeredListener:
      | ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | void)
      | undefined;

    vi.stubGlobal("chrome", {
      runtime: {
        onMessage: {
          addListener: (listener: typeof registeredListener) => {
            registeredListener = listener;
            addListener(listener);
          },
        },
      },
    });

    vi.doMock("../../src/background/ai", () => ({
      classifyWithProvider: classifyWithProviderMock,
    }));
    vi.doMock("../../src/shared/storage", () => ({
      getSettings: getSettingsMock,
      getApiKey: getApiKeyMock,
    }));

    await import("../../src/background/index");

    expect(addListener).toHaveBeenCalledTimes(1);
    expect(registeredListener).toBeTypeOf("function");

    const sendResponse = vi.fn();
    const keepAlive = registeredListener?.(
      {
        type: REQUEST_AI_CLASSIFICATION,
        payload: {
          requestId: "request-1",
          candidate: {
            id: "candidate-1",
            type: "post",
            text: "please follow me now",
          },
        },
      },
      {},
      sendResponse,
    );

    expect(keepAlive).toBe(true);

    await vi.waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith({
        type: RAW_AI_CLASSIFICATION_RESULT,
        payload: {
          requestId: "request-1",
          blocked: true,
          category: "spam",
          confidence: 0.91,
          matches: [],
        },
      }),
    );
    expect(classifyWithProviderMock).toHaveBeenCalledTimes(1);
    expect(getSettingsMock).toHaveBeenCalledTimes(1);
    expect(getApiKeyMock).not.toHaveBeenCalled();
  });
});
