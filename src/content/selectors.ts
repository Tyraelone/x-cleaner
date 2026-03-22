import type { CandidateContent, ContentType } from "../shared/types";

const TWEET_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
const USER_NAME_SELECTOR = '[data-testid="User-Name"]';
const PROFILE_HEADER_SELECTOR = 'header[data-testid="ProfileHeader"]';
const PROFILE_NAME_SELECTOR = '[data-testid="UserName"]';
const PROFILE_NAME_DISPLAY_SELECTOR = '[data-testid="UserNameDisplayName"]';
const PROFILE_NAME_HANDLE_SELECTOR = '[data-testid="UserNameHandle"]';
const PROFILE_BIO_SELECTOR = '[data-testid="UserDescription"]';
const PROFILE_LINK_SELECTOR = 'a[data-testid="UserProfileLink"]';
const HOVER_CARD_SELECTOR = 'div[data-testid="HoverCard"]';
const HOVER_CARD_NAME_SELECTOR = '[data-testid="UserName"]';
const HOVER_CARD_NAME_DISPLAY_SELECTOR = '[data-testid="UserNameDisplayName"]';
const HOVER_CARD_NAME_HANDLE_SELECTOR = '[data-testid="UserNameHandle"]';
const HOVER_CARD_BIO_SELECTOR = '[data-testid="UserDescription"]';
const HOVER_CARD_LINK_SELECTOR = 'a[data-testid="UserProfileLink"]';
const REPLY_CONTAINER_SELECTOR = '[data-testid="reply"]';
const STATUS_LINK_SELECTOR = 'a[href*="/status/"]';

type QueryRoot = Document | Element | DocumentFragment | ShadowRoot;

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function findFirstElement(root: QueryRoot, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = root.querySelector(selector);

    if (element) {
      return element;
    }
  }

  return null;
}

function textFromElement(element: Element | null): string {
  return element ? collapseWhitespace(element.textContent ?? "") : "";
}

function extractHandle(text: string): string | undefined {
  const match = text.match(/@\S+/);

  return match?.[0];
}

function extractNameParts(nameElement: Element | null, scope: "profile" | "hover"): {
  displayName?: string;
  handle?: string;
} {
  if (!nameElement) {
    return {};
  }

  const displaySelector =
    scope === "profile" ? PROFILE_NAME_DISPLAY_SELECTOR : HOVER_CARD_NAME_DISPLAY_SELECTOR;
  const handleSelector =
    scope === "profile" ? PROFILE_NAME_HANDLE_SELECTOR : HOVER_CARD_NAME_HANDLE_SELECTOR;
  const displayName =
    textFromElement(findFirstElement(nameElement, [displaySelector])) ||
    textFromElement(nameElement);
  const handle =
    textFromElement(findFirstElement(nameElement, [handleSelector])) ||
    extractHandle(textFromElement(nameElement));

  return {
    displayName: displayName || undefined,
    handle,
  };
}

function extractUrl(element: Element | null): string | undefined {
  if (!element || element.tagName !== "A") {
    return undefined;
  }

  return (element as HTMLAnchorElement).href || element.getAttribute("href") || undefined;
}

function createCandidate(
  id: string,
  type: ContentType,
  text: string,
  authorHandle?: string,
  url?: string,
): CandidateContent | null {
  const normalizedText = collapseWhitespace(text);

  if (!normalizedText) {
    return null;
  }

  return {
    id,
    type,
    text: normalizedText,
    ...(authorHandle ? { authorHandle } : {}),
    ...(url ? { url } : {}),
  };
}

function extractTweetCandidate(article: Element): CandidateContent | null {
  const text = textFromElement(findFirstElement(article, [TWEET_TEXT_SELECTOR]));
  const nameLink = findFirstElement(article, [USER_NAME_SELECTOR]);
  const statusLink = findFirstElement(article, [STATUS_LINK_SELECTOR]);
  const authorHandle = nameLink ? extractHandle(textFromElement(nameLink)) : undefined;
  const url = extractUrl(statusLink);
  const type = article.closest(REPLY_CONTAINER_SELECTOR) ? "reply" : "post";
  const id = url ?? `tweet:${collapseWhitespace(text)}`;

  return createCandidate(id, type, text, authorHandle, url);
}

function extractProfileCandidate(
  container: Element,
  scope: "profile" | "hover",
): CandidateContent | null {
  const nameElement =
    findFirstElement(
      container,
      [scope === "profile" ? PROFILE_NAME_SELECTOR : HOVER_CARD_NAME_SELECTOR],
    );
  const bioElement =
    findFirstElement(
      container,
      [scope === "profile" ? PROFILE_BIO_SELECTOR : HOVER_CARD_BIO_SELECTOR],
    );
  const link =
    findFirstElement(
      container,
      [scope === "profile" ? PROFILE_LINK_SELECTOR : HOVER_CARD_LINK_SELECTOR],
    );
  const { displayName, handle } = extractNameParts(nameElement, scope);
  const bio = textFromElement(bioElement);
  const authorHandle = handle;
  const text = [displayName, bio].filter(Boolean).join(" ");
  const url = extractUrl(link);
  const id = url ?? `${scope}:${collapseWhitespace(text)}`;

  return createCandidate(id, "profile", text, authorHandle, url);
}

export function extractCandidatesFromRoot(root: QueryRoot): CandidateContent[] {
  const candidates: CandidateContent[] = [];

  for (const article of root.querySelectorAll(TWEET_ARTICLE_SELECTOR)) {
    const candidate = extractTweetCandidate(article);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  for (const header of root.querySelectorAll(PROFILE_HEADER_SELECTOR)) {
    const candidate = extractProfileCandidate(header, "profile");

    if (candidate) {
      candidates.push(candidate);
    }
  }

  for (const hoverCard of root.querySelectorAll(HOVER_CARD_SELECTOR)) {
    const candidate = extractProfileCandidate(hoverCard, "hover");

    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}
