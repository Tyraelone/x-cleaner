import { createDefaultSettings } from "./defaults";
import type { Settings, SettingsPatch } from "./types";

const settingsStorageKey = "settings";
const apiKeyStorageKey = "apiKey";

interface ChromeStorageArea {
  get(keys?: null | string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

interface ChromeStorageLike {
  storage: {
    local: ChromeStorageArea;
    sync: ChromeStorageArea;
  };
}

function getChromeStorageArea(
  area: keyof ChromeStorageLike["storage"],
): ChromeStorageArea | null {
  const chromeApi = globalThis as typeof globalThis & { chrome?: ChromeStorageLike };
  const storageArea = chromeApi.chrome?.storage[area];

  return storageArea ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function sanitizeSettingsPatch(value: unknown): SettingsPatch {
  if (!isRecord(value)) {
    return {};
  }

  const patch: SettingsPatch = {};

  if (isRecord(value.ai)) {
    const aiPatch: SettingsPatch["ai"] = {};

    if (typeof value.ai.enabled === "boolean") {
      aiPatch.enabled = value.ai.enabled;
    }

    if (
      value.ai.provider === "mock" ||
      value.ai.provider === "openai" ||
      value.ai.provider === "ark"
    ) {
      aiPatch.provider = value.ai.provider;
    }

    if (typeof value.ai.model === "string") {
      aiPatch.model = value.ai.model;
    }

    if (Object.keys(aiPatch).length > 0) {
      patch.ai = aiPatch;
    }
  }

  if (
    typeof value.confidenceThreshold === "number" &&
    Number.isFinite(value.confidenceThreshold)
  ) {
    patch.confidenceThreshold = value.confidenceThreshold;
  }

  if (typeof value.debug === "boolean") {
    patch.debug = value.debug;
  }

  if (isRecord(value.categories)) {
    const categories: NonNullable<SettingsPatch["categories"]> = {};

    for (const category of Object.keys(createDefaultSettings().categories) as Array<
      keyof Settings["categories"]
    >) {
      if (typeof value.categories[category] === "boolean") {
        categories[category] = value.categories[category];
      }
    }

    if (Object.keys(categories).length > 0) {
      patch.categories = categories;
    }
  }

  if (isStringArray(value.allowlist)) {
    patch.allowlist = [...value.allowlist];
  }

  if (isStringArray(value.blacklist)) {
    patch.blacklist = [...value.blacklist];
  }

  if (isStringArray(value.customKeywords)) {
    patch.customKeywords = [...value.customKeywords];
  }

  return patch;
}

function mergeSettings(base: Settings, patch: SettingsPatch): Settings {
  return mergeWithDefaults({
    ai: {
      ...base.ai,
      ...(patch.ai ?? {}),
    },
    confidenceThreshold: patch.confidenceThreshold ?? base.confidenceThreshold,
    debug: patch.debug ?? base.debug,
    categories: {
      ...base.categories,
      ...(patch.categories ?? {}),
    },
    allowlist: patch.allowlist ?? base.allowlist,
    blacklist: patch.blacklist ?? base.blacklist,
    customKeywords: patch.customKeywords ?? base.customKeywords,
  });
}

function extractStoredSettings(record: Record<string, unknown>): unknown {
  return record[settingsStorageKey];
}

export function mergeWithDefaults(partialSettings: unknown = {}): Settings {
  const defaults = createDefaultSettings();
  const sanitizedPatch = sanitizeSettingsPatch(partialSettings);

  return {
    ai: {
      ...defaults.ai,
      ...(sanitizedPatch.ai ?? {}),
    },
    confidenceThreshold:
      sanitizedPatch.confidenceThreshold ?? defaults.confidenceThreshold,
    debug: sanitizedPatch.debug ?? defaults.debug,
    categories: {
      ...defaults.categories,
      ...(sanitizedPatch.categories ?? {}),
    },
    allowlist: [...(sanitizedPatch.allowlist ?? defaults.allowlist)],
    blacklist: [...(sanitizedPatch.blacklist ?? defaults.blacklist)],
    customKeywords: [...(sanitizedPatch.customKeywords ?? defaults.customKeywords)],
  };
}

export async function getSettings(): Promise<Settings> {
  const storageArea = getChromeStorageArea("sync");

  if (!storageArea) {
    return createDefaultSettings();
  }

  try {
    const rawSettings = await storageArea.get(settingsStorageKey);
    return mergeWithDefaults(
      isRecord(rawSettings) ? extractStoredSettings(rawSettings) : undefined,
    );
  } catch {
    return createDefaultSettings();
  }
}

export async function saveSettings(settings: SettingsPatch): Promise<void> {
  const storageArea = getChromeStorageArea("sync");

  if (!storageArea) {
    return;
  }

  const currentSettings = await getSettings();
  const sanitizedPatch = sanitizeSettingsPatch(settings);
  const mergedSettings = mergeSettings(currentSettings, sanitizedPatch);

  try {
    await storageArea.set({
      [settingsStorageKey]: mergedSettings,
    });
  } catch {
    // Ignore storage write failures so callers can continue safely.
  }
}

export async function getApiKey(): Promise<string | null> {
  const storageArea = getChromeStorageArea("local");

  if (!storageArea) {
    return null;
  }

  try {
    const stored = await storageArea.get(apiKeyStorageKey);
    const apiKey = stored[apiKeyStorageKey];

    return typeof apiKey === "string" && apiKey.length > 0 ? apiKey : null;
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  const storageArea = getChromeStorageArea("local");

  if (!storageArea) {
    return;
  }

  try {
    await storageArea.set({
      [apiKeyStorageKey]: key,
    });
  } catch {
    // Ignore storage write failures so callers can continue safely.
  }
}
