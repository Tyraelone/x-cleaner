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
  text: {
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
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

function normalizeMatches(value: unknown): RuleMatch[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const matches: RuleMatch[] = [];

  for (const entry of value) {
    if (!isRuleMatch(entry)) {
      return null;
    }

    matches.push(entry);
  }

  return matches;
}

function isConfidenceInRange(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function normalizeProviderOutput(value: unknown): RawAiClassificationResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const confidence = isConfidenceInRange(value.confidence) ? value.confidence : null;

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

    const matches = normalizeMatches(value.matches);

    if (matches === null) {
      return null;
    }

    return {
      blocked: true,
      category,
      confidence,
      matches,
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
      const matches = normalizeMatches(value.matches);

      if (matches === null) {
        return null;
      }

      return {
        blocked: true,
        category: value.label,
        confidence,
        matches,
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

function extractResponsesOutputText(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawOutput = value.output;

  if (typeof rawOutput === "string") {
    return rawOutput;
  }

  if (!Array.isArray(rawOutput)) {
    return null;
  }

  for (const outputItem of rawOutput) {
    if (!isRecord(outputItem) || outputItem.type !== "message") {
      continue;
    }

    if (!Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (
        isRecord(contentItem) &&
        contentItem.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
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
    text: {
      format: {
        type: "json_schema",
        name: "ai_classification",
        strict: true,
        schema: {
          type: "object",
          oneOf: [
            {
              type: "object",
              properties: {
                blocked: {
                  const: false,
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
                matches: {
                  type: "array",
                  maxItems: 0,
                },
              },
              required: ["blocked", "confidence", "matches"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: {
                blocked: {
                  const: true,
                },
                category: {
                  type: "string",
                  enum: ["hate", "harassment", "sexual", "violence", "spam"],
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: {
                        type: "string",
                        enum: ["hate", "harassment", "sexual", "violence", "spam"],
                      },
                      matchedText: {
                        type: "string",
                      },
                      startIndex: {
                        type: "number",
                      },
                      endIndex: {
                        type: "number",
                      },
                    },
                    required: ["category", "matchedText"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["blocked", "category", "confidence", "matches"],
              additionalProperties: false,
            },
          ],
        },
      },
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

    const payload = await response.json();
    const outputText = extractResponsesOutputText(payload);

    if (!outputText) {
      return createAllowResult();
    }

    try {
      return normalizeProviderOutput(JSON.parse(outputText) as unknown) ?? createAllowResult();
    } catch {
      return createAllowResult();
    }
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
