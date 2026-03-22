import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { extractCandidatesFromRoot } from "../../src/content/selectors";

function loadFixture(name: string): HTMLElement {
  const path = resolve(
    process.cwd(),
    "tests/content/fixtures",
    `${name}.html`,
  );
  const dom = new JSDOM(
    `<!doctype html><body>${readFileSync(path, "utf8")}</body>`,
  );
  return dom.window.document.body;
}

describe("extractCandidatesFromRoot", () => {
  it("extracts a timeline tweet", () => {
    const root = loadFixture("timeline-tweet");

    expect(extractCandidatesFromRoot(root)).toEqual([
      {
        id: "https://x.com/alice/status/111",
        type: "post",
        text: "Hello from the timeline!",
        authorHandle: "@alice",
        url: "https://x.com/alice/status/111",
      },
    ]);
  });

  it("extracts a reply item", () => {
    const root = loadFixture("reply-item");

    expect(extractCandidatesFromRoot(root)).toEqual([
      {
        id: "https://x.com/bob/status/222",
        type: "reply",
        text: "I agree with this reply.",
        authorHandle: "@bob",
        url: "https://x.com/bob/status/222",
      },
    ]);
  });

  it("extracts a profile header with bio", () => {
    const root = loadFixture("profile-header");

    expect(extractCandidatesFromRoot(root)).toEqual([
      {
        id: "https://x.com/carol",
        type: "profile",
        text: "Carol Chen Writer, builder, and coffee enthusiast.",
        authorHandle: "@carol",
        url: "https://x.com/carol",
      },
    ]);
  });

  it("extracts a hover card with display name and bio", () => {
    const root = loadFixture("hover-card");

    expect(extractCandidatesFromRoot(root)).toEqual([
      {
        id: "https://x.com/dee",
        type: "profile",
        text: "Dee Park Public speaker and product designer.",
        authorHandle: "@dee",
        url: "https://x.com/dee",
      },
    ]);
  });
});
