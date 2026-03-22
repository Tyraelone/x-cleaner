import type { CandidateContent, FilterCategory, RuleMatch, Settings } from "./types";

export const REQUEST_AI_CLASSIFICATION = "request-ai-classification";
export const RAW_AI_CLASSIFICATION_RESULT = "raw-ai-classification-result";

export interface AiClassificationRequestPayload {
  requestId: string;
  candidate: CandidateContent;
  settings: Settings;
}

export interface RawAiClassificationResponsePayload {
  requestId: string;
  blocked: boolean;
  category?: FilterCategory;
  confidence: number;
  matches: RuleMatch[];
}

export interface AiClassificationRequestMessage {
  type: typeof REQUEST_AI_CLASSIFICATION;
  payload: AiClassificationRequestPayload;
}

export interface RawAiClassificationResultMessage {
  type: typeof RAW_AI_CLASSIFICATION_RESULT;
  payload: RawAiClassificationResponsePayload;
}
