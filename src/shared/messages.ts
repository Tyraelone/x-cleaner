import type { RawAiClassificationResult } from "./classifier";
import type { CandidateContent, Settings } from "./types";

export const REQUEST_AI_CLASSIFICATION = "request-ai-classification";
export const RAW_AI_CLASSIFICATION_RESULT = "raw-ai-classification-result";

export interface AiClassificationRequestPayload {
  requestId: string;
  candidate: CandidateContent;
  settings?: Settings;
}

export type RawAiClassificationResponsePayload = RawAiClassificationResult & {
  requestId: string;
};

export interface AiClassificationRequestMessage {
  type: typeof REQUEST_AI_CLASSIFICATION;
  payload: AiClassificationRequestPayload;
}

export interface RawAiClassificationResultMessage {
  type: typeof RAW_AI_CLASSIFICATION_RESULT;
  payload: RawAiClassificationResponsePayload;
}

export type AiClassificationMessage =
  | AiClassificationRequestMessage
  | RawAiClassificationResultMessage;
