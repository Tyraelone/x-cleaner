import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { extractCandidatesFromRoot } from "../../src/content/selectors";

function createRoot(markup: string): HTMLElement {
  const dom = new JSDOM(`<!doctype html><body>${markup}</body>`);
  return dom.window.document.body;
}

describe("extractCandidatesFromRoot", () => {
  it("extracts a timeline tweet", () => {
    const root = createRoot(`
      <article data-testid="tweet">
        <header>
          <a data-testid="User-Name" href="https://x.com/alice">
            <span>Alice</span>
            <span>@alice</span>
          </a>
        </header>
        <div data-testid="tweetText">Hello from the timeline!</div>
        <a href="https://x.com/alice/status/111"><time datetime="2026-03-22T08:30:00.000Z"></time></a>
      </article>
    `);

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
    const root = createRoot(`
      <div data-testid="reply">
        <article data-testid="tweet">
          <header>
            <a data-testid="User-Name" href="https://x.com/bob">
              <span>Bob</span>
              <span>@bob</span>
            </a>
          </header>
          <div data-testid="tweetText">I agree with this reply.</div>
          <a href="https://x.com/bob/status/222"><time datetime="2026-03-22T09:00:00.000Z"></time></a>
        </article>
      </div>
    `);

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
    const root = createRoot(`
      <section>
        <div data-testid="UserName">
          <span>Carol Chen</span>
          <span>@carol</span>
        </div>
        <div data-testid="UserDescription">Writer, builder, and coffee enthusiast.</div>
        <a href="https://x.com/carol">Profile</a>
      </section>
    `);

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
    const root = createRoot(`
      <div data-testid="HoverCard">
        <div data-testid="UserName">
          <span>Dee Park</span>
          <span>@dee</span>
        </div>
        <div data-testid="UserDescription">Public speaker and product designer.</div>
        <a href="https://x.com/dee">View profile</a>
      </div>
    `);

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
