import { extractCandidatesFromRoot } from "./selectors";
import { fingerprintText } from "../shared/text";
import type { CandidateContent } from "../shared/types";

const seenFingerprints = new Set<string>();

function fingerprintCandidate(candidate: CandidateContent): string {
  return [
    candidate.type,
    fingerprintText(candidate.text),
    candidate.authorHandle ?? "",
    candidate.url ?? "",
  ].join("|");
}

function recordCandidate(candidate: CandidateContent): void {
  const fingerprint = fingerprintCandidate(candidate);

  if (seenFingerprints.has(fingerprint)) {
    return;
  }

  seenFingerprints.add(fingerprint);
}

function scanRoot(root: ParentNode & { querySelectorAll(selectors: string): NodeListOf<Element> }): void {
  for (const candidate of extractCandidatesFromRoot(root)) {
    recordCandidate(candidate);
  }
}

function observeInsertedNodes(root: HTMLElement): void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
          continue;
        }

        scanRoot(node as ParentNode & { querySelectorAll(selectors: string): NodeListOf<Element> });
      }
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });
}

function bootstrap(): void {
  const root = document.body;

  if (!root) {
    return;
  }

  scanRoot(root);
  observeInsertedNodes(root);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

export {};
