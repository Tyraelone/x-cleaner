import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
});
