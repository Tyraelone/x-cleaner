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
  debug: false,
  categories: builtInCategories,
  allowlist: Object.freeze([]) as readonly string[],
  blacklist: Object.freeze([]) as readonly string[],
  customKeywords: Object.freeze([]) as readonly string[],
}) satisfies Readonly<Settings>;

function createEmptyList(): string[] {
  return [];
}

function createDefaultCategories(): Settings["categories"] {
  return {
    ...defaultSettings.categories,
  };
}

export function createDefaultSettings(): Settings {
  return {
    ai: {
      enabled: defaultSettings.ai.enabled,
    },
    confidenceThreshold: defaultSettings.confidenceThreshold,
    debug: defaultSettings.debug,
    categories: createDefaultCategories(),
    allowlist: createEmptyList(),
    blacklist: createEmptyList(),
    customKeywords: createEmptyList(),
  };
}
