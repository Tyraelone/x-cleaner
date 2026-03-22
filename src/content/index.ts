import { extractCandidatesFromRoot } from "./selectors";
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

  function recordCandidate(candidate: CandidateContent): void {
    const fingerprint = fingerprintCandidate(candidate);

    if (seenFingerprints.has(fingerprint)) {
      return;
    }

    seenFingerprints.add(fingerprint);
    onCandidate(candidate);
  }

  function scanRoot(node: RootNode): void {
    for (const candidate of extractCandidatesFromRoot(node)) {
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
