import { describe, expect, it, vi } from "vitest";
import { classifyWithProvider } from "../../src/background/ai";

describe("classifyWithProvider", () => {
  it("returns a non-blocking raw result when AI is disabled", async () => {
    const fetchImpl = vi.fn();

    const result = await classifyWithProvider(
      {
        enabled: false,
      },
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

  it("parses structured provider output into a raw AI result", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
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
      }),
    });

    const result = await classifyWithProvider(
      {
        enabled: true,
        model: "gpt-4o-mini",
      },
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
  });
});
