import { matchLocalRules } from "./rules";
import { normalizeText } from "./text";
import type {
  CandidateContent,
  ClassificationDecision,
  RuleMatch,
  Settings,
} from "./types";

export interface AiClassificationResult {
  blocked: boolean;
  category?: ClassificationDecision["category"];
  confidence: number;
  matches: RuleMatch[];
}

export type ClassifyWithAi = (
  candidate: CandidateContent,
  settings: Settings,
) => Promise<AiClassificationResult | null | undefined> | AiClassificationResult | null | undefined;

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

function createDecision(
  decision: Omit<ClassificationDecision, "blocked" | "confidence" | "matches" | "source"> &
    Pick<ClassificationDecision, "blocked" | "confidence" | "matches" | "source">,
): ClassificationDecision {
  return decision;
}

export async function classifyCandidate(
  candidate: CandidateContent,
  settings: Settings,
  classifyWithAi: ClassifyWithAi,
): Promise<ClassificationDecision> {
  if (isHandleListed(candidate, settings.allowlist)) {
    return createDecision({
      blocked: false,
      confidence: 1,
      matches: [],
      source: "allowlist",
    });
  }

  if (isHandleListed(candidate, settings.blacklist)) {
    return createDecision({
      blocked: true,
      confidence: 1,
      matches: [],
      source: "blacklist",
    });
  }

  const localMatch = matchLocalRules(candidate.text, settings);

  if (localMatch) {
    return createDecision({
      blocked: true,
      category: localMatch.category,
      confidence: 1,
      matches: [localMatch],
      source: "local",
    });
  }

  if (!settings.ai.enabled) {
    return createDecision({
      blocked: false,
      confidence: 0,
      matches: [],
      source: "local",
    });
  }

  const aiResult = await classifyWithAi(candidate, settings);

  if (!aiResult) {
    return createDecision({
      blocked: false,
      confidence: 0,
      matches: [],
      source: "ai",
    });
  }

  const blocked = aiResult.blocked && aiResult.confidence >= settings.confidenceThreshold;
  const decision: ClassificationDecision = {
    blocked,
    confidence: aiResult.confidence,
    matches: aiResult.matches,
    source: "ai",
  };

  if (aiResult.category !== undefined) {
    decision.category = aiResult.category;
  }

  return decision;
}
