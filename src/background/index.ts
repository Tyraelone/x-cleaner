import { classifyWithProvider } from "./ai";
import { createDebugLogger } from "../shared/debug";
import { getApiKey, getSettings } from "../shared/storage";
import {
  RAW_AI_CLASSIFICATION_RESULT,
  REQUEST_AI_CLASSIFICATION,
  type AiClassificationRequestMessage,
  type RawAiClassificationResultMessage,
} from "../shared/messages";

type RuntimeMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: RawAiClassificationResultMessage) => void,
) => boolean | void;

interface ChromeRuntimeLike {
  runtime: {
    onMessage: {
      addListener(listener: RuntimeMessageListener): void;
    };
  };
}

function getAiProvider(provider: string | undefined): "mock" | "openai" | "ark" {
  if (provider === "mock" || provider === "ark") {
    return provider;
  }

  return "openai";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAiClassificationRequestMessage(
  value: unknown,
): value is AiClassificationRequestMessage {
  if (!isRecord(value) || value.type !== REQUEST_AI_CLASSIFICATION) {
    return false;
  }

  const payload = value.payload;

  return (
    isRecord(payload) &&
    typeof payload.requestId === "string" &&
    isRecord(payload.candidate) &&
    typeof payload.candidate.text === "string"
  );
}

function createAuthorizedFetch(apiKey: string, fetchImpl: typeof fetch): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${apiKey}`);

    return fetchImpl(input, {
      ...init,
      headers,
    });
  };
}

function createAllowResponse(
  requestId: string,
): RawAiClassificationResultMessage {
  return {
    type: RAW_AI_CLASSIFICATION_RESULT,
    payload: {
      requestId,
      blocked: false,
      confidence: 0,
      matches: [],
    },
  };
}

async function handleAiClassification(
  message: AiClassificationRequestMessage,
): Promise<RawAiClassificationResultMessage> {
  const settings = message.payload.settings ?? (await getSettings());
  const debugLog = createDebugLogger("background", settings);
  const provider = getAiProvider(settings.ai.provider);
  const needsApiKey = settings.ai.enabled && provider !== "mock";

  debugLog("message-received", {
    requestId: message.payload.requestId,
    provider,
    aiEnabled: settings.ai.enabled,
    textLength: message.payload.candidate.text.length,
  });

  if (needsApiKey) {
    const apiKey = await getApiKey();

    if (!apiKey) {
      debugLog("api-key-missing", {
        requestId: message.payload.requestId,
        provider,
      });
      return createAllowResponse(message.payload.requestId);
    }

    const result = await classifyWithProvider(
      settings.ai,
      message.payload.candidate.text,
      createAuthorizedFetch(apiKey, fetch),
      debugLog,
    );

    debugLog("message-completed", {
      requestId: message.payload.requestId,
      blocked: result.blocked,
      confidence: result.confidence,
    });

    return {
      type: RAW_AI_CLASSIFICATION_RESULT,
      payload: {
        requestId: message.payload.requestId,
        ...result,
      },
    };
  }

  const result = await classifyWithProvider(
    settings.ai,
    message.payload.candidate.text,
    fetch,
    debugLog,
  );

  debugLog("message-completed", {
    requestId: message.payload.requestId,
    blocked: result.blocked,
    confidence: result.confidence,
  });

  return {
    type: RAW_AI_CLASSIFICATION_RESULT,
    payload: {
      requestId: message.payload.requestId,
      ...result,
    },
  };
}

const chromeApi = globalThis as typeof globalThis & {
  chrome?: ChromeRuntimeLike;
};

if (chromeApi.chrome?.runtime?.onMessage) {
  chromeApi.chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isAiClassificationRequestMessage(message)) {
      return false;
    }

    void handleAiClassification(message)
      .then(sendResponse)
      .catch(() => sendResponse(createAllowResponse(message.payload.requestId)));

    return true;
  });
}

console.log("X Cleaner background service worker loaded");

export {};
