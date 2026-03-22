import type { Settings } from "./types";

export const builtInCategories = {
  hate: true,
  harassment: true,
  sexual: true,
  violence: true,
  spam: true,
} as const;

export const defaultConfidenceThreshold = 0.8;

export const defaultAllowlist: string[] = [];
export const defaultBlacklist: string[] = [];
export const defaultCustomKeywords: string[] = [];

export const defaultSettings: Settings = {
  ai: {
    enabled: false,
  },
  confidenceThreshold: defaultConfidenceThreshold,
  categories: {
    hate: builtInCategories.hate,
    harassment: builtInCategories.harassment,
    sexual: builtInCategories.sexual,
    violence: builtInCategories.violence,
    spam: builtInCategories.spam,
  },
  allowlist: defaultAllowlist,
  blacklist: defaultBlacklist,
  customKeywords: defaultCustomKeywords,
};
