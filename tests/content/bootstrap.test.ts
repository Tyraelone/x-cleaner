import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REQUEST_AI_CLASSIFICATION } from "../../src/shared/messages";

type Candidate = {
  id: string;
  type: "post" | "reply" | "quote" | "profile" | "message";
  text: string;
  authorHandle?: string;
  url?: string;
  displayName?: string;
  bio?: string;
};

type ObserverRecord = {
  target: Node;
  options: MutationObserverInit;
};

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = [];

  callback: MutationCallback;
  records: ObserverRecord[] = [];

  constructor(callback: MutationCallback) {
    this.callback = callback;
    FakeMutationObserver.instances.push(this);
  }

  observe(target: Node, options: MutationObserverInit): void {
    this.records.push({ target, options });
  }

  disconnect(): void {}

  trigger(addedNodes: Node[]): void {
    this.callback(
      [
        {
          addedNodes,
        } as MutationRecord,
      ],
      this as unknown as MutationObserver,
    );
  }
}

function fixture(name: string): string {
  return readFileSync(
    resolve(process.cwd(), "tests/content/fixtures", `${name}.html`),
    "utf8",
  );
}

function createDom(markup: string): JSDOM {
  return new JSDOM(`<!doctype html><body>${markup}</body>`);
}

async function loadBootstrap() {
  vi.resetModules();
  return import("../../src/content/index");
}

beforeEach(() => {
  FakeMutationObserver.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("content bootstrap", () => {
  it("scans candidates on startup", async () => {
    const dom = createDom(fixture("timeline-tweet"));
    const processed: Candidate[] = [];

    const { startContentExtraction } = await loadBootstrap();

    startContentExtraction({
      root: dom.window.document.body,
      onCandidate: (candidate) => processed.push(candidate as Candidate),
      observerFactory: (callback) => new FakeMutationObserver(callback),
    });

    expect(processed).toEqual([
      {
        id: "https://x.com/alice/status/111",
        type: "post",
        text: "Hello from the timeline!",
        authorHandle: "@alice",
        url: "https://x.com/alice/status/111",
      },
    ]);
    expect(FakeMutationObserver.instances).toHaveLength(1);
    expect(FakeMutationObserver.instances[0].records).toHaveLength(1);
  });

  it("rescans when an added node is itself a candidate root", async () => {
    const dom = createDom("");
    const processed: Candidate[] = [];
    const { startContentExtraction } = await loadBootstrap();

    startContentExtraction({
      root: dom.window.document.body,
      onCandidate: (candidate) => processed.push(candidate as Candidate),
      observerFactory: (callback) => new FakeMutationObserver(callback),
    });

    const hoverDom = createDom(fixture("hover-card"));
    const hoverCard = hoverDom.window.document.body.firstElementChild as Element;

    FakeMutationObserver.instances[0].trigger([hoverCard]);

    expect(processed).toEqual([
      {
        id: "https://x.com/dee",
        type: "profile",
        text: "Dee Park Public speaker and product designer.",
        authorHandle: "@dee",
        url: "https://x.com/dee",
        displayName: "Dee Park",
        bio: "Public speaker and product designer.",
      },
    ]);
  });

  it("rescans ancestor containers when a candidate is assembled incrementally", async () => {
    const dom = createDom(fixture("profile-header-shell"));
    const processed: Candidate[] = [];
    const { startContentExtraction } = await loadBootstrap();

    startContentExtraction({
      root: dom.window.document.body,
      onCandidate: (candidate) => processed.push(candidate as Candidate),
      observerFactory: (callback) => new FakeMutationObserver(callback),
    });

    const header = dom.window.document.body.firstElementChild as HTMLElement;
    const name = dom.window.document.createElement("div");
    name.setAttribute("data-testid", "UserName");
    name.innerHTML = `
      <span data-testid="UserNameDisplayName">Carol Chen</span>
      <span data-testid="UserNameHandle">@carol</span>
    `;
    const bio = dom.window.document.createElement("div");
    bio.setAttribute("data-testid", "UserDescription");
    bio.textContent = "Writer, builder, and coffee enthusiast.";
    const link = dom.window.document.createElement("a");
    link.setAttribute("data-testid", "UserProfileLink");
    link.href = "https://x.com/carol";
    link.textContent = "Profile";

    header.append(name, bio, link);

    FakeMutationObserver.instances[0].trigger([name, bio, link]);

    expect(processed).toEqual([
      {
        id: "https://x.com/carol",
        type: "profile",
        text: "Carol Chen Writer, builder, and coffee enthusiast.",
        authorHandle: "@carol",
        url: "https://x.com/carol",
        displayName: "Carol Chen",
        bio: "Writer, builder, and coffee enthusiast.",
      },
    ]);
  });

  it("suppresses duplicate candidates by fingerprint", async () => {
    const dom = createDom(fixture("profile-header"));
    const processed: Candidate[] = [];
    const { startContentExtraction } = await loadBootstrap();

    startContentExtraction({
      root: dom.window.document.body,
      onCandidate: (candidate) => processed.push(candidate as Candidate),
      observerFactory: (callback) => new FakeMutationObserver(callback),
    });

    const duplicateDom = createDom(fixture("profile-header"));
    const duplicateHeader = duplicateDom.window.document.body.firstElementChild as Element;

    FakeMutationObserver.instances[0].trigger([duplicateHeader]);

    expect(processed).toEqual([
      {
        id: "https://x.com/carol",
        type: "profile",
        text: "Carol Chen Writer, builder, and coffee enthusiast.",
        authorHandle: "@carol",
        url: "https://x.com/carol",
        displayName: "Carol Chen",
        bio: "Writer, builder, and coffee enthusiast.",
      },
    ]);
  });

  it("collapses all connected targets for the same fingerprint in the active document", async () => {
    const dom = createDom(fixture("timeline-tweet"));
    const { collapseTrackedCandidate, startContentExtraction } = await loadBootstrap();

    startContentExtraction({
      root: dom.window.document.body,
      observerFactory: (callback) => new FakeMutationObserver(callback),
    });

    const originalArticle = dom.window.document.body.firstElementChild as Element;
    const duplicateArticle = originalArticle.cloneNode(true) as Element;
    dom.window.document.body.appendChild(duplicateArticle);

    FakeMutationObserver.instances[0].trigger([duplicateArticle]);

    expect(
      collapseTrackedCandidate("post|hello from the timeline!|@alice|https://x.com/alice/status/111", {
        title: "Filtered post",
        reason: "keyword match",
      }),
    ).toBe(true);

    expect(dom.window.document.querySelectorAll("button")).toHaveLength(2);
  });

  it("sends ai classification requests and collapses matching content when ai is enabled", async () => {
    const dom = createDom(fixture("timeline-tweet"));
    const sendMessage = vi.fn().mockImplementation(async (message: unknown) => {
      expect(message).toMatchObject({
        type: REQUEST_AI_CLASSIFICATION,
        payload: {
          candidate: {
            text: "Hello from the timeline!",
          },
        },
      });

      return {
        type: "raw-ai-classification-result",
        payload: {
          requestId: "request-1",
          blocked: true,
          category: "spam",
          confidence: 0.95,
          matches: [
            {
              category: "spam",
              matchedText: "hello",
            },
          ],
        },
      };
    });

    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("MutationObserver", FakeMutationObserver as unknown as typeof MutationObserver);
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage,
      },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({
            settings: {
              ai: {
                enabled: true,
                provider: "mock",
              },
            },
          }),
          set: vi.fn(),
        },
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn(),
        },
      },
    });

    await loadBootstrap();
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

    expect(dom.window.document.querySelector("button")).toBeTruthy();
    expect(dom.window.document.body.textContent).toContain("Filtered spam");
    expect(dom.window.document.body.textContent).toContain("AI review flagged this content");
    expect(dom.window.document.body.textContent).not.toContain("hello");
  });

  it("collapses blacklisted content through the bootstrap classification flow", async () => {
    const dom = createDom(fixture("timeline-tweet"));

    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("MutationObserver", FakeMutationObserver as unknown as typeof MutationObserver);
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn(),
      },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({
            settings: {
              ai: {
                enabled: false,
              },
              blacklist: ["alice"],
            },
          }),
          set: vi.fn(),
        },
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn(),
        },
      },
    });

    await loadBootstrap();

    expect(dom.window.document.querySelector("button")).toBeTruthy();
    expect(dom.window.document.body.textContent).toContain("Expand to review");
  });

  it("ignores invalidated extension context errors from ai messaging", async () => {
    const dom = createDom(fixture("timeline-tweet"));
    const sendMessage = vi
      .fn()
      .mockRejectedValue(new Error("Extension context invalidated."));

    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("MutationObserver", FakeMutationObserver as unknown as typeof MutationObserver);
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage,
      },
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({
            settings: {
              ai: {
                enabled: true,
                provider: "mock",
              },
            },
          }),
          set: vi.fn(),
        },
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn(),
        },
      },
    });

    await expect(loadBootstrap()).resolves.toBeTruthy();
    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));

    expect(dom.window.document.querySelector(".x-cleaner-fold-card")).toBeNull();
    expect(dom.window.document.body.textContent).toContain("Hello from the timeline!");
  });
});
