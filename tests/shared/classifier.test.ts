import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../../src/shared/defaults";
import { classifyCandidate } from "../../src/shared/classifier";

describe("classifyCandidate", () => {
  it("allows allowlisted accounts before blacklist or local matches", async () => {
    const classifyWithAi = vi.fn();

    const decision = await classifyCandidate(
      {
        id: "post-1",
        type: "post",
        text: "you are an idiot and this is suspicious",
        authorHandle: "@FriendlyUser",
      },
      {
        ...defaultSettings,
        allowlist: ["friendlyuser"],
        blacklist: ["friendlyuser"],
      },
      classifyWithAi,
    );

    expect(decision).toEqual({
      blocked: false,
      confidence: 1,
      matches: [],
      source: "allowlist",
    });
    expect(classifyWithAi).not.toHaveBeenCalled();
  });

  it("collapses blacklisted accounts with blacklist source", async () => {
    const classifyWithAi = vi.fn();

    const decision = await classifyCandidate(
      {
        id: "post-2",
        type: "reply",
        text: "nothing to see here",
        authorHandle: "@SpammyUser",
      },
      {
        ...defaultSettings,
        blacklist: ["spammyuser"],
      },
      classifyWithAi,
    );

    expect(decision).toEqual({
      blocked: true,
      confidence: 1,
      matches: [],
      source: "blacklist",
    });
    expect(classifyWithAi).not.toHaveBeenCalled();
  });

  it("returns a local-only non-blocking decision when AI is disabled", async () => {
    const classifyWithAi = vi.fn();

    const decision = await classifyCandidate(
      {
        id: "post-3",
        type: "post",
        text: "something neutral",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: false,
        },
      },
      classifyWithAi,
    );

    expect(decision).toEqual({
      blocked: false,
      confidence: 0,
      matches: [],
      source: "local",
    });
    expect(classifyWithAi).not.toHaveBeenCalled();
  });

  it("returns a non-blocking ai decision when classifyWithAi returns null or undefined", async () => {
    const nullClassifier = vi.fn().mockResolvedValue(null);
    const undefinedClassifier = vi.fn().mockResolvedValue(undefined);

    const nullDecision = await classifyCandidate(
      {
        id: "post-4",
        type: "post",
        text: "a totally neutral post",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: true,
        },
      },
      nullClassifier,
    );

    const undefinedDecision = await classifyCandidate(
      {
        id: "post-5",
        type: "post",
        text: "a totally neutral post",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: true,
        },
      },
      undefinedClassifier,
    );

    expect(nullDecision).toEqual({
      blocked: false,
      confidence: 0,
      matches: [],
      source: "ai",
    });
    expect(undefinedDecision).toEqual({
      blocked: false,
      confidence: 0,
      matches: [],
      source: "ai",
    });
  });

  it("only calls AI when local rules are inconclusive and AI is enabled", async () => {
    const classifyWithAi = vi.fn().mockResolvedValue({
      blocked: true,
      category: "spam",
      confidence: 0.95,
      matches: [],
    });

    const blockedByLocalRules = await classifyCandidate(
      {
        id: "post-3",
        type: "post",
        text: "you are an idiot",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: true,
        },
      },
      classifyWithAi,
    );

    expect(blockedByLocalRules).toMatchObject({
      blocked: true,
      source: "local",
      category: "harassment",
    });
    expect(classifyWithAi).not.toHaveBeenCalled();

    classifyWithAi.mockClear();

    const aiDecision = await classifyCandidate(
      {
        id: "post-4",
        type: "post",
        text: "a totally neutral post",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: true,
        },
      },
      classifyWithAi,
    );

    expect(classifyWithAi).toHaveBeenCalledTimes(1);
    expect(classifyWithAi).toHaveBeenCalledWith(
      {
        id: "post-4",
        type: "post",
        text: "a totally neutral post",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: true,
        },
      },
    );
    expect(aiDecision).toEqual({
      blocked: true,
      category: "spam",
      confidence: 0.95,
      matches: [],
      source: "ai",
    });
  });

  it("does not block when AI confidence is below the threshold", async () => {
    const classifyWithAi = vi.fn().mockResolvedValue({
      blocked: true,
      category: "spam",
      confidence: 0.4,
      matches: [],
    });

    const decision = await classifyCandidate(
      {
        id: "post-5",
        type: "post",
        text: "another neutral post",
      },
      {
        ...defaultSettings,
        ai: {
          enabled: true,
        },
        confidenceThreshold: 0.8,
      },
      classifyWithAi,
    );

    expect(decision).toEqual({
      blocked: false,
      confidence: 0.4,
      matches: [],
      source: "ai",
    });
    expect(decision).not.toHaveProperty("category");
  });
});
