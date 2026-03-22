import { describe, expect, it } from "vitest";
import { defaultSettings } from "../../src/shared/defaults";
import { matchLocalRules } from "../../src/shared/rules";

describe("matchLocalRules", () => {
  it("matches built-in hate keywords", () => {
    const result = matchLocalRules(
      "they keep saying go back to your country",
      defaultSettings,
    );
    expect(result?.category).toBe("hate");
  });

  it("matches custom keywords", () => {
    const settings = {
      ...defaultSettings,
      customKeywords: ["brainrot take"],
    };

    const result = matchLocalRules("what a BRAINROT    TAKE!!!", settings);
    expect(result?.reason).toContain("custom");
  });

  it("does not match a disabled category", () => {
    const settings = {
      ...defaultSettings,
      categories: {
        ...defaultSettings.categories,
        hate: false,
      },
    };

    const result = matchLocalRules(
      "they keep saying go back to your country",
      settings,
    );

    expect(result).toBeNull();
    expect(defaultSettings.categories.hate).toBe(true);
  });

  it("routes anti-intellectual matches to harassment with source-specific reason", () => {
    const result = matchLocalRules("what a brain dead idea", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "brain dead",
      reason: "matched antiIntellectual keyword",
    });
  });

  it("prefers the first matching table when multiple rules could match", () => {
    const result = matchLocalRules("idiot", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "idiot",
      reason: "matched antiIntellectual keyword",
    });
  });
});
