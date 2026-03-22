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

  it("matches built-in chinese hate keywords", () => {
    const result = matchLocalRules("这种人都该滚回你的国家去", defaultSettings);

    expect(result).toMatchObject({
      category: "hate",
      matchedText: "滚回你的国家",
      reason: "matched hate keyword",
    });
  });

  it("matches built-in english phrases when punctuation is used to evade simple matching", () => {
    const result = matchLocalRules("what a brain...dead take", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "brain dead",
      reason: "matched antiIntellectual keyword",
    });
  });

  it("matches custom chinese keywords even when whitespace is inserted", () => {
    const settings = {
      ...defaultSettings,
      customKeywords: ["低智言论"],
    };

    const result = matchLocalRules("这就是低 智 言论", settings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "低智言论",
      reason: "matched custom keyword",
    });
  });

  it("matches chinese anti-intellectual phrases beyond the initial seed list", () => {
    const result = matchLocalRules("你真是读书读傻了", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "读书读傻了",
      reason: "matched antiIntellectual keyword",
    });
  });

  it("matches english anti-intellectual slang", () => {
    const result = matchLocalRules("only a smooth brain would post this", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "smooth brain",
      reason: "matched antiIntellectual keyword",
    });
  });

  it("matches chinese harassment profanity", () => {
    const result = matchLocalRules("你这个狗东西别说话", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "狗东西",
      reason: "matched harassment keyword",
    });
  });

  it("matches english harassment insults", () => {
    const result = matchLocalRules("you are a piece of trash", defaultSettings);

    expect(result).toMatchObject({
      category: "harassment",
      matchedText: "piece of trash",
      reason: "matched harassment keyword",
    });
  });

  it("matches chinese exclusion language", () => {
    const result = matchLocalRules("这些人都给我滚出去", defaultSettings);

    expect(result).toMatchObject({
      category: "hate",
      matchedText: "滚出去",
      reason: "matched hate keyword",
    });
  });

  it("matches english exclusion language", () => {
    const result = matchLocalRules("we should send them back", defaultSettings);

    expect(result).toMatchObject({
      category: "hate",
      matchedText: "send them back",
      reason: "matched hate keyword",
    });
  });

  it("does not match neutral discussion about learning", () => {
    const result = matchLocalRules("this academic paper is hard to read", defaultSettings);

    expect(result).toBeNull();
  });
});
