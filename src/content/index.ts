import { extractCandidatesFromRoot, isCandidateContainer } from "./selectors";
import { collapseElement } from "./render";
import { fingerprintText } from "../shared/text";
import type { CandidateContent } from "../shared/types";

type RootNode = ParentNode & {
  querySelectorAll(selectors: string): NodeListOf<Element>;
};

interface MutationObserverLike {
  observe(target: Node, options: MutationObserverInit): void;
  disconnect?: () => void;
}

export interface StartContentExtractionOptions {
  root?: RootNode;
  onCandidate?: (candidate: CandidateContent) => void;
  observerFactory?: (callback: MutationCallback) => MutationObserverLike;
}

const candidateElements = new Map<string, Set<Element>>();

function fingerprintCandidate(candidate: CandidateContent): string {
  return [
    candidate.type,
    fingerprintText(candidate.text),
    candidate.authorHandle ?? "",
    candidate.url ?? "",
  ].join("|");
}

function isCandidateNode(node: Node): node is RootNode {
  return "querySelectorAll" in node;
}

function scanAncestorContainers(
  root: RootNode,
  node: Node,
  scanRoot: (node: RootNode) => void,
): void {
  let ancestor = node.parentElement;

  while (ancestor) {
    if (isCandidateContainer(ancestor)) {
      scanRoot(ancestor);
    }

    if (ancestor === root) {
      break;
    }

    ancestor = ancestor.parentElement;
  }
}

function getCandidateElement(node: RootNode, candidate: CandidateContent): Element | null {
  if ("matches" in node && isCandidateContainer(node)) {
    return node;
  }

  if (candidate.type === "post" || candidate.type === "reply") {
    return Array.from(node.querySelectorAll('article[data-testid="tweet"]')).find((element) => {
      const url = candidate.url;

      if (url) {
        return element.querySelector(`a[href="${url}"]`) !== null;
      }

      return element.textContent?.includes(candidate.text) ?? false;
    }) ?? null;
  }

  return Array.from(
    node.querySelectorAll(
      'header[data-testid="ProfileHeader"], div[data-testid="HoverCard"]',
    ),
  ).find((element) => {
    if (candidate.url) {
      return element.querySelector(`a[href="${candidate.url}"]`) !== null;
    }

    return element.textContent?.includes(candidate.text) ?? false;
  }) ?? null;
}

export function collapseTrackedCandidate(
  fingerprint: string,
  matchInfo: {
    title: string;
    reason: string;
  },
): boolean {
  const targets = candidateElements.get(fingerprint);

  if (!targets) {
    return false;
  }

  let collapsedAny = false;

  for (const target of Array.from(targets)) {
    if (!target.isConnected) {
      targets.delete(target);
      continue;
    }

    if (
      collapseElement(target, {
        fingerprint,
        title: matchInfo.title,
        reason: matchInfo.reason,
      })
    ) {
      collapsedAny = true;
    }
  }

  if (targets.size === 0) {
    candidateElements.delete(fingerprint);
  }

  return collapsedAny;
}

function registerCandidateElement(fingerprint: string, target: Element): void {
  const existingTargets = candidateElements.get(fingerprint) ?? new Set<Element>();

  for (const existingTarget of Array.from(existingTargets)) {
    if (!existingTarget.isConnected) {
      existingTargets.delete(existingTarget);
    }
  }

  existingTargets.add(target);
  candidateElements.set(fingerprint, existingTargets);
}

export function startContentExtraction(
  options: StartContentExtractionOptions = {},
): MutationObserverLike | undefined {
  const root =
    options.root ??
    (typeof document === "undefined" ? undefined : document.body);

  if (!root) {
    return undefined;
  }

  const seenFingerprints = new Set<string>();
  const onCandidate = options.onCandidate ?? (() => {});
  const observerFactory =
    options.observerFactory ??
    ((callback) => new MutationObserver(callback) as unknown as MutationObserverLike);

  function recordCandidate(candidate: CandidateContent): boolean {
    const fingerprint = fingerprintCandidate(candidate);

    if (seenFingerprints.has(fingerprint)) {
      return false;
    }

    seenFingerprints.add(fingerprint);
    onCandidate(candidate);
    return true;
  }

  function scanRoot(node: RootNode): void {
    const candidates = extractCandidatesFromRoot(node);

    for (const candidate of candidates) {
      const fingerprint = fingerprintCandidate(candidate);
      const target = getCandidateElement(node, candidate);

      if (target) {
        registerCandidateElement(fingerprint, target);
      }

      recordCandidate(candidate);
    }
  }

  const observer = observerFactory((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!isCandidateNode(node)) {
          continue;
        }

        scanRoot(node);
        scanAncestorContainers(root, node, scanRoot);
      }
    }
  });

  scanRoot(root);

  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  return observer;
}

const globalDocument = typeof document === "undefined" ? undefined : document;

if (globalDocument) {
  if (globalDocument.readyState === "loading") {
    globalDocument.addEventListener(
      "DOMContentLoaded",
      () => {
        startContentExtraction();
      },
      { once: true },
    );
  } else {
    startContentExtraction();
  }
}

export {};
