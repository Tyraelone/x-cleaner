import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getApiKey,
  getSettings,
  mergeWithDefaults,
  saveApiKey,
  saveSettings,
} from "../../src/shared/storage";

function createChromeStorageMock(options: {
  syncGet?: () => Promise<Record<string, unknown>>;
  syncSet?: (value: Record<string, unknown>) => Promise<void>;
  localGet?: () => Promise<Record<string, unknown>>;
  localSet?: (value: Record<string, unknown>) => Promise<void>;
} = {}) {
  return {
    storage: {
      sync: {
        get:
          options.syncGet ??
          vi.fn().mockResolvedValue({}),
        set:
          options.syncSet ??
          vi.fn().mockResolvedValue(undefined),
      },
      local: {
        get:
          options.localGet ??
          vi.fn().mockResolvedValue({}),
        set:
          options.localSet ??
          vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}

describe("mergeWithDefaults", () => {
  it("fills missing nested settings with defaults", () => {
    const merged = mergeWithDefaults({ ai: { enabled: true } });
    expect(merged.ai.enabled).toBe(true);
    expect(merged.categories.hate).toBe(true);
  });

  it("ignores malformed nested values", () => {
    const merged = mergeWithDefaults({
      ai: "oops" as unknown as never,
      confidenceThreshold: Number.NaN,
      categories: "bad" as unknown as never,
      allowlist: ["ok", 1 as unknown as string],
      blacklist: "bad" as unknown as never,
      customKeywords: null as unknown as never,
    });

    expect(merged.ai.enabled).toBe(false);
    expect(merged.confidenceThreshold).toBe(0.8);
    expect(merged.categories.hate).toBe(true);
    expect(merged.allowlist).toEqual([]);
    expect(merged.blacklist).toEqual([]);
    expect(merged.customKeywords).toEqual([]);
  });
});

describe("getSettings", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns defaults when storage is empty", async () => {
    vi.stubGlobal("chrome", createChromeStorageMock());

    const settings = await getSettings();
    expect(settings.ai.enabled).toBe(false);
  });

  it("merges nested categories from persisted values", async () => {
    vi.stubGlobal(
      "chrome",
      createChromeStorageMock({
        syncGet: vi.fn().mockResolvedValue({
          settings: {
            categories: {
              hate: false,
            },
          },
        }),
      }),
    );

    const settings = await getSettings();

    expect(settings.categories.hate).toBe(false);
    expect(settings.categories.spam).toBe(true);
  });

  it("falls back safely for malformed sync payloads", async () => {
    vi.stubGlobal(
      "chrome",
      createChromeStorageMock({
        syncGet: vi.fn().mockResolvedValue({
          settings: {
            ai: "oops",
            confidenceThreshold: Number.POSITIVE_INFINITY,
            categories: {
              hate: "nope",
            },
            allowlist: ["ok", 1],
            blacklist: null,
            customKeywords: {},
          },
        }),
      }),
    );

    const settings = await getSettings();

    expect(settings.ai.enabled).toBe(false);
    expect(settings.confidenceThreshold).toBe(0.8);
    expect(settings.categories.hate).toBe(true);
    expect(settings.allowlist).toEqual([]);
    expect(settings.blacklist).toEqual([]);
    expect(settings.customKeywords).toEqual([]);
  });

  it("returns defaults when storage is unavailable", async () => {
    const settings = await getSettings();

    expect(settings.ai.enabled).toBe(false);
    expect(settings.categories.spam).toBe(true);
  });
});

describe("saveSettings", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves previously saved values when saving a patch", async () => {
    const persisted = {
      ai: {
        enabled: true,
        model: "gpt-4o-mini",
      },
      confidenceThreshold: 0.65,
      categories: {
        hate: false,
        harassment: true,
        sexual: false,
        violence: true,
        spam: false,
      },
      allowlist: ["existing"],
      blacklist: ["blocked"],
      customKeywords: ["alpha"],
    };
    const set = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal(
      "chrome",
      createChromeStorageMock({
        syncGet: vi.fn().mockResolvedValue({ settings: persisted }),
        syncSet: set,
      }),
    );

    await saveSettings({
      categories: { hate: true },
      blacklist: ["updated"],
    });

    expect(set).toHaveBeenCalledWith({
      settings: {
        ai: {
          enabled: true,
          model: "gpt-4o-mini",
        },
        confidenceThreshold: 0.65,
        categories: {
          hate: true,
          harassment: true,
          sexual: false,
          violence: true,
          spam: false,
        },
        allowlist: ["existing"],
        blacklist: ["updated"],
        customKeywords: ["alpha"],
      },
    });
  });

  it("does not let malformed direct patch values erase persisted settings", async () => {
    const persisted = {
      ai: {
        enabled: true,
        model: "gpt-4o-mini",
      },
      confidenceThreshold: 0.65,
      categories: {
        hate: false,
        harassment: true,
        sexual: false,
        violence: true,
        spam: false,
      },
      allowlist: ["existing"],
      blacklist: ["blocked"],
      customKeywords: ["alpha"],
    };
    const set = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal(
      "chrome",
      createChromeStorageMock({
        syncGet: vi.fn().mockResolvedValue({ settings: persisted }),
        syncSet: set,
      }),
    );

    await saveSettings({
      allowlist: "bad" as unknown as string[],
      ai: "oops" as unknown as never,
      confidenceThreshold: Number.NaN,
    });

    expect(set).toHaveBeenCalledWith({
      settings: persisted,
    });
  });
});

describe("api key storage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips through local storage", async () => {
    const localState: Record<string, unknown> = {};
    const localGet = vi.fn().mockImplementation(async () => ({ ...localState }));
    const localSet = vi.fn().mockImplementation(async (value: Record<string, unknown>) => {
      Object.assign(localState, value);
    });

    vi.stubGlobal(
      "chrome",
      createChromeStorageMock({
        localGet,
        localSet,
      }),
    );

    await saveApiKey("secret-key");

    expect(localSet).toHaveBeenCalledWith({ apiKey: "secret-key" });
    expect(await getApiKey()).toBe("secret-key");
  });

  it("returns null when local storage is unavailable", async () => {
    const apiKey = await getApiKey();

    expect(apiKey).toBeNull();
  });
});
