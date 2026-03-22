import type { Settings } from "./types";

export const builtInCategories = Object.freeze({
  hate: true,
  harassment: true,
  sexual: true,
  violence: true,
  spam: true,
} as const);

export const defaultConfidenceThreshold = 0.8;

export const defaultSettings = Object.freeze({
  ai: Object.freeze({
    enabled: false,
  }),
  confidenceThreshold: defaultConfidenceThreshold,
  categories: builtInCategories,
  allowlist: Object.freeze([]) as readonly string[],
  blacklist: Object.freeze([]) as readonly string[],
  customKeywords: Object.freeze([]) as readonly string[],
}) satisfies Readonly<Settings>;

export function createDefaultSettings(): Settings {
  return {
    ai: {
      enabled: defaultSettings.ai.enabled,
    },
    confidenceThreshold: defaultSettings.confidenceThreshold,
    categories: {
      ...defaultSettings.categories,
    },
    allowlist: [],
    blacklist: [],
    customKeywords: [],
  };
}
