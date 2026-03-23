import { matchLocalRules } from "./rules";
import { normalizeText } from "./text";
import type {
  CandidateContent,
  ClassificationDecision,
  FilterCategory,
  RuleMatch,
  Settings,
} from "./types";

export type RawAiClassificationResult =
  | {
      blocked: false;
      confidence: number;
      matches: [];
      category?: never;
    }
  | {
      blocked: true;
      category: FilterCategory;
      confidence: number;
      matches: RuleMatch[];
    };

export type ClassifyWithAi = (
  candidate: CandidateContent,
  settings: Settings,
) => Promise<RawAiClassificationResult | null | undefined> | RawAiClassificationResult | null | undefined;

function normalizeHandle(handle: string): string {
  return normalizeText(handle).replace(/^@+/, "");
}

function isHandleListed(
  candidate: CandidateContent,
  list: readonly string[],
): boolean {
  if (!candidate.authorHandle) {
    return false;
  }

  const normalizedHandle = normalizeHandle(candidate.authorHandle);

  return list.some((entry) => normalizeHandle(entry) === normalizedHandle);
}

export async function classifyCandidate(
  candidate: CandidateContent,
  settings: Settings,
  classifyWithAi: ClassifyWithAi,
): Promise<ClassificationDecision> {
  if (isHandleListed(candidate, settings.allowlist)) {
    return {
      blocked: false,
      confidence: 1,
      matches: [],
      source: "allowlist",
    };
  }

  if (isHandleListed(candidate, settings.blacklist)) {
    return {
      blocked: true,
      confidence: 1,
      matches: [],
      source: "blacklist",
    };
  }

  if (!settings.ai.enabled) {
    const localMatch = matchLocalRules(candidate.text, settings);

    if (localMatch) {
      return {
        blocked: true,
        category: localMatch.category,
        confidence: 1,
        matches: [localMatch],
        source: "local",
      };
    }

    return {
      blocked: false,
      confidence: 0,
      matches: [],
      source: "local",
    };
  }

  const aiResult = await classifyWithAi(candidate, settings);

  if (aiResult) {
    if (!aiResult.blocked || aiResult.confidence < settings.confidenceThreshold) {
      return {
        blocked: false,
        confidence: aiResult.confidence,
        matches: [],
        source: "ai",
      };
    }

    return {
      blocked: true,
      category: aiResult.category,
      confidence: aiResult.confidence,
      matches: aiResult.matches,
      source: "ai",
    };
  }

  const localMatch = matchLocalRules(candidate.text, settings);

  if (localMatch) {
    return {
      blocked: true,
      category: localMatch.category,
      confidence: 1,
      matches: [localMatch],
      source: "local",
    };
  }

  return {
    blocked: false,
    confidence: 0,
    matches: [],
    source: "ai",
  };
}
