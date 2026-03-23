// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { clearTemporaryIgnores, collapseElement } from "../../src/content/render";

describe("temporary ignore tracking", () => {
  it("can be cleared after a temporary ignore is set", () => {
    document.body.innerHTML = `<div id="target"><span>bad content</span></div>`;
    const target = document.getElementById("target") as HTMLElement;
    const matchInfo = {
      fingerprint: "post:ignore",
      title: "Filtered post",
      reason: "keyword match",
    };

    collapseElement(target, matchInfo);
    document.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(collapseElement(target, matchInfo)).toBe(false);

    clearTemporaryIgnores();

    expect(collapseElement(target, matchInfo)).toBe(true);
  });
});

describe("collapseElement", () => {
  it("replaces the target with a styled expandable fold card", () => {
    document.body.innerHTML = `<div id="target"><span>bad content</span></div>`;
    const target = document.getElementById("target") as HTMLElement;

    collapseElement(target, {
      fingerprint: "post:1",
      title: "Filtered post",
      reason: "keyword match",
    });

    const trigger = document.querySelector("button");

    expect(trigger).not.toBeNull();
    expect(trigger?.className).toContain("x-cleaner-fold-card");
    expect(document.body.textContent).toContain("Filtered post");
    expect(document.body.textContent).toContain("Expand to review");
    expect(document.body.textContent).toContain("keyword match");
    expect(document.body.querySelector("#target")).toBeNull();
  });

  it("restores the original element when the placeholder is clicked", () => {
    document.body.innerHTML = `<div id="target"><span>bad content</span></div>`;
    const target = document.getElementById("target") as HTMLElement;

    collapseElement(target, {
      fingerprint: "post:2",
      title: "Filtered post",
      reason: "keyword match",
    });

    const trigger = document.querySelector("button");

    expect(trigger).not.toBeNull();
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.body.querySelector("#target")).toBe(target);
    expect(document.body.textContent).toContain("bad content");
    expect(document.body.textContent).toContain("Fold again");
  });

  it("does not immediately collapse the same fingerprint again after expand", () => {
    document.body.innerHTML = `<div id="target"><span>bad content</span></div>`;
    const target = document.getElementById("target") as HTMLElement;
    const matchInfo = {
      fingerprint: "post:3",
      title: "Filtered post",
      reason: "keyword match",
    };

    collapseElement(target, matchInfo);
    document.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    collapseElement(target, matchInfo);

    expect(document.body.querySelector("#target")).toBe(target);
    expect(document.body.textContent).toContain("bad content");
    expect(document.body.textContent).not.toContain("Expand to review");
  });

  it("lets users fold the same content again after expanding it", () => {
    document.body.innerHTML = `<div id="target"><span>bad content</span></div>`;
    const target = document.getElementById("target") as HTMLElement;
    const matchInfo = {
      fingerprint: "post:4",
      title: "Filtered post",
      reason: "keyword match",
    };

    collapseElement(target, matchInfo);
    document.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const foldAgain = document.querySelector('[data-action="collapse"]');

    expect(foldAgain).not.toBeNull();
    foldAgain?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.body.querySelector("#target")).toBeNull();
    expect(document.body.textContent).toContain("Expand to review");
  });
});
