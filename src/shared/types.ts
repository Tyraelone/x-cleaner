export type ContentType = "post" | "reply" | "quote" | "profile" | "message";

export type FilterCategory =
  | "hate"
  | "harassment"
  | "sexual"
  | "violence"
  | "spam";

export interface CandidateContent {
  id: string;
  type: ContentType;
  text: string;
  authorHandle?: string;
  url?: string;
}

export interface AiConfig {
  enabled: boolean;
  model?: string;
}

export interface Settings {
  ai: AiConfig;
  confidenceThreshold: number;
  categories: Record<FilterCategory, boolean>;
  allowlist: string[];
  blacklist: string[];
  customKeywords: string[];
}

export type SettingsPatch = {
  ai?: Partial<AiConfig>;
  confidenceThreshold?: number;
  categories?: Partial<Record<FilterCategory, boolean>>;
  allowlist?: string[];
  blacklist?: string[];
  customKeywords?: string[];
};

export interface RuleMatch {
  category: FilterCategory;
  matchedText: string;
  startIndex?: number;
  endIndex?: number;
}

export type ClassificationSource = "allowlist" | "blacklist" | "local" | "ai";

interface AllowlistedDecision {
  blocked: false;
  source: "allowlist";
  confidence: number;
  matches: [];
}

interface NonBlockingDecision {
  blocked: false;
  source: "local" | "ai";
  confidence: number;
  matches: [];
}

interface BlacklistedDecision {
  blocked: true;
  source: "blacklist";
  confidence: number;
  matches: [];
}

interface BlockedRuleDecision {
  blocked: true;
  source: "local" | "ai";
  category: FilterCategory;
  confidence: number;
  matches: RuleMatch[];
}

export type ClassificationDecision =
  | AllowlistedDecision
  | NonBlockingDecision
  | BlacklistedDecision
  | BlockedRuleDecision;
