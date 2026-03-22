import type { CandidateContent, ContentType } from "../shared/types";

const TWEET_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';
const USER_NAME_SELECTOR = '[data-testid="User-Name"]';
const PROFILE_NAME_SELECTOR = '[data-testid="UserName"]';
const USER_DESCRIPTION_SELECTOR = '[data-testid="UserDescription"]';
const HOVER_CARD_SELECTOR = '[data-testid="HoverCard"]';
const REPLY_CONTAINER_SELECTOR = '[data-testid="reply"]';
const PROFILE_LINK_SELECTOR = 'a[href^="https://x.com/"]';
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

function extractNameParts(nameElement: Element | null): {
  displayName?: string;
  handle?: string;
} {
  if (!nameElement) {
    return {};
  }

  const spans = Array.from(nameElement.querySelectorAll("span")).map((span) =>
    textFromElement(span),
  );
  const displayName = spans[0] || textFromElement(nameElement);
  const handle = spans.find((spanText) => spanText.startsWith("@")) ?? extractHandle(textFromElement(nameElement));

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

function extractProfileCandidate(root: QueryRoot, container: Element): CandidateContent | null {
  const nameElement = findFirstElement(container, [PROFILE_NAME_SELECTOR]);
  const bioElement = findFirstElement(container, [USER_DESCRIPTION_SELECTOR]);
  const link = findFirstElement(container, [PROFILE_LINK_SELECTOR]);
  const { displayName, handle } = extractNameParts(nameElement);
  const bio = textFromElement(bioElement);
  const authorHandle = handle;
  const text = [displayName, bio].filter(Boolean).join(" ");
  const url = extractUrl(link);
  const id = url ?? `profile:${collapseWhitespace(text)}`;

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

  for (const bioElement of root.querySelectorAll(USER_DESCRIPTION_SELECTOR)) {
    const section = bioElement.closest("section");

    if (!section || section.closest(HOVER_CARD_SELECTOR)) {
      continue;
    }

    if (!section.querySelector(PROFILE_NAME_SELECTOR)) {
      continue;
    }

    const candidate = extractProfileCandidate(root, section);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  for (const hoverCard of root.querySelectorAll(HOVER_CARD_SELECTOR)) {
    const candidate = extractProfileCandidate(root, hoverCard);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}
