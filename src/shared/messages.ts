import type { CandidateContent, FilterCategory, RuleMatch, Settings } from "./types";

export const REQUEST_AI_CLASSIFICATION = "request-ai-classification";
export const AI_CLASSIFICATION_RESULT = "ai-classification-result";

export interface RequestAiClassificationPayload {
  candidate: CandidateContent;
  settings: Settings;
}

export interface AiClassificationResultPayload {
  candidateId: string;
  blocked: boolean;
  category?: FilterCategory;
  confidence: number;
  matches: RuleMatch[];
}

export interface RequestAiClassificationMessage {
  type: typeof REQUEST_AI_CLASSIFICATION;
  payload: RequestAiClassificationPayload;
}

export interface AiClassificationResultMessage {
  type: typeof AI_CLASSIFICATION_RESULT;
  payload: AiClassificationResultPayload;
}
