import type { RawAiClassificationResult } from "../shared/classifier";
import type { AiConfig, AiProvider, FilterCategory, RuleMatch } from "../shared/types";

const filterCategories = [
  "hate",
  "harassment",
  "sexual",
  "violence",
  "spam",
] as const satisfies readonly FilterCategory[];

type FetchLike = typeof fetch;

type StructuredClassificationRequest = {
  model: string;
  input: Array<{
    role: "system" | "user";
    content: Array<{
      type: "input_text";
      text: string;
    }>;
  }>;
  response_format: {
    type: "json_object";
  };
};

function createAllowResult(confidence = 0): RawAiClassificationResult {
  return {
    blocked: false,
    confidence,
    matches: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFilterCategory(value: unknown): value is FilterCategory {
  return typeof value === "string" && (filterCategories as readonly string[]).includes(value);
}

function isRuleMatch(value: unknown): value is RuleMatch {
  if (!isRecord(value)) {
    return false;
  }

  if (!isFilterCategory(value.category)) {
    return false;
  }

  if (typeof value.matchedText !== "string") {
    return false;
  }

  if (value.startIndex !== undefined && typeof value.startIndex !== "number") {
    return false;
  }

  if (value.endIndex !== undefined && typeof value.endIndex !== "number") {
    return false;
  }

  return true;
}

function normalizeMatches(value: unknown): RuleMatch[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRuleMatch);
}

function normalizeProviderOutput(value: unknown): RawAiClassificationResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const confidence =
    typeof value.confidence === "number" && Number.isFinite(value.confidence)
      ? value.confidence
      : null;

  if (confidence === null) {
    return null;
  }

  if (typeof value.blocked === "boolean") {
    if (!value.blocked) {
      return createAllowResult(confidence);
    }

    const category =
      isFilterCategory(value.category) ? value.category : isFilterCategory(value.label) ? value.label : null;

    if (!category) {
      return null;
    }

    return {
      blocked: true,
      category,
      confidence,
      matches: normalizeMatches(value.matches),
    };
  }

  if (typeof value.label === "string") {
    if (
      [
        "allow",
        "allowed",
        "safe",
        "non-blocking",
        "nonblocking",
        "neutral",
      ].includes(value.label)
    ) {
      return createAllowResult(confidence);
    }

    if (isFilterCategory(value.label)) {
      return {
        blocked: true,
        category: value.label,
        confidence,
        matches: normalizeMatches(value.matches),
      };
    }
  }

  return null;
}

function buildMockProviderResponse(text: string): RawAiClassificationResult {
  const normalizedText = text.toLowerCase();
  const spamKeyword = ["follow me", "buy now", "free money", "subscribe"].find((keyword) =>
    normalizedText.includes(keyword),
  );

  if (!spamKeyword) {
    return createAllowResult(0.5);
  }

  return {
    blocked: true,
    category: "spam",
    confidence: 0.99,
    matches: [
      {
        category: "spam",
        matchedText: spamKeyword,
      },
    ],
  };
}

function extractStructuredProviderOutput(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const rawOutput = value.output;

  if (isRecord(rawOutput)) {
    return {
      ...rawOutput,
      ...(typeof value.confidence === "number" ? { confidence: value.confidence } : {}),
    };
  }

  if (typeof rawOutput === "string") {
    try {
      const parsedOutput = JSON.parse(rawOutput) as unknown;

      if (isRecord(parsedOutput)) {
        return {
          ...parsedOutput,
          ...(typeof value.confidence === "number" ? { confidence: value.confidence } : {}),
        };
      }

      return parsedOutput;
    } catch {
      return rawOutput;
    }
  }

  if (
    "blocked" in value ||
    "label" in value ||
    "confidence" in value ||
    "matches" in value
  ) {
    return value;
  }

  return value;
}

function buildStructuredClassificationRequest(
  model: string,
  text: string,
): StructuredClassificationRequest {
  return {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Return only strict JSON for a content classification result with keys blocked, category, confidence, and matches. blocked must be a boolean. category must be one of hate, harassment, sexual, violence, or spam when blocked is true. confidence must be a number from 0 to 1. matches must be an array of rule matches with category and matchedText.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    ],
    response_format: {
      type: "json_object",
    },
  };
}

async function runRealProvider(
  model: string,
  text: string,
  fetchImpl: FetchLike,
): Promise<RawAiClassificationResult> {
  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(buildStructuredClassificationRequest(model, text)),
    });

    if (!response.ok) {
      return createAllowResult();
    }

    const payload = extractStructuredProviderOutput(await response.json());
    return normalizeProviderOutput(payload) ?? createAllowResult();
  } catch {
    return createAllowResult();
  }
}

export async function classifyWithProvider(
  aiConfig: AiConfig,
  text: string,
  fetchImpl: FetchLike = fetch,
): Promise<RawAiClassificationResult> {
  if (!aiConfig.enabled) {
    return createAllowResult();
  }

  const provider: AiProvider = aiConfig.provider ?? "openai";

  if (provider === "mock") {
    return buildMockProviderResponse(text);
  }

  if (provider === "openai") {
    return runRealProvider(aiConfig.model ?? "gpt-4o-mini", text, fetchImpl);
  }

  return createAllowResult();
}
