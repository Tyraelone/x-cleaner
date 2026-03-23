import { extractCandidatesFromRoot, isCandidateContainer } from "./selectors";
import { collapseElement } from "./render";
import { classifyCandidate, type RawAiClassificationResult } from "../shared/classifier";
import { createDebugLogger } from "../shared/debug";
import { getSettings } from "../shared/storage";
import { fingerprintText } from "../shared/text";
import {
  RAW_AI_CLASSIFICATION_RESULT,
  REQUEST_AI_CLASSIFICATION,
  type RawAiClassificationResultMessage,
} from "../shared/messages";
import type {
  CandidateContent,
  ClassificationDecision,
  ClassificationSource,
  FilterCategory,
  Settings,
} from "../shared/types";

type RootNode = ParentNode & {
  querySelectorAll(selectors: string): NodeListOf<Element>;
};

interface MutationObserverLike {
  observe(target: Node, options: MutationObserverInit): void;
  disconnect?: () => void;
}

interface ChromeRuntimeLike {
  runtime?: {
    sendMessage?: (message: unknown) => Promise<unknown>;
  };
}

export interface StartContentExtractionOptions {
  root?: RootNode;
  onCandidate?: (candidate: CandidateContent) => void;
  observerFactory?: (callback: MutationCallback) => MutationObserverLike;
}

const candidateElements = new Map<string, Set<Element>>();
let activeSettingsPromise: Promise<Settings> | null = null;

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

function getCategoryTitle(category: FilterCategory): string {
  return `Filtered ${category}`;
}

function getCollapseTitle(decision: ClassificationDecision): string {
  if (decision.source === "blacklist") {
    return "Filtered account";
  }

  return getCategoryTitle(decision.category);
}

function getDecisionReason(
  category: FilterCategory | undefined,
  source: ClassificationSource,
): string {
  if (source === "blacklist") {
    return "Blacklisted account";
  }

  if (source === "ai") {
    return "AI review flagged this content";
  }

  if (category) {
    return `Matched ${category} filter`;
  }

  return "Matched a local filter";
}

async function getActiveSettings(): Promise<Settings> {
  activeSettingsPromise ??= getSettings();
  return activeSettingsPromise;
}

async function requestAiClassification(
  candidate: CandidateContent,
  settings: Settings,
): Promise<RawAiClassificationResult | null> {
  const debugLog = createDebugLogger("content", settings);
  try {
    const chromeApi = globalThis as typeof globalThis & { chrome?: ChromeRuntimeLike };
    const sendMessage = chromeApi.chrome?.runtime?.sendMessage;

    if (!sendMessage) {
      debugLog("send-message-missing", {
        candidateId: candidate.id,
      });
      return null;
    }

    const requestId = `${candidate.id}:${Date.now()}`;
    debugLog("send-message", {
      candidateId: candidate.id,
      requestId,
      provider: settings.ai.provider ?? "openai",
    });

    const response = (await sendMessage({
      type: REQUEST_AI_CLASSIFICATION,
      payload: {
        requestId,
        candidate,
        settings,
      },
    })) as RawAiClassificationResultMessage | null;

    if (!response || response.type !== RAW_AI_CLASSIFICATION_RESULT) {
      debugLog("send-message-invalid-response", {
        candidateId: candidate.id,
        requestId,
      });
      return null;
    }

    const { requestId: _requestId, ...result } = response.payload;
    debugLog("send-message-response", {
      candidateId: candidate.id,
      requestId,
      blocked: result.blocked,
      confidence: result.confidence,
    });
    return result;
  } catch {
    return null;
  }
}

async function processCandidate(candidate: CandidateContent): Promise<void> {
  const settings = await getActiveSettings();
  const debugLog = createDebugLogger("content", settings);
  debugLog("candidate-seen", {
    candidateId: candidate.id,
    fingerprint: fingerprintCandidate(candidate),
    textLength: candidate.text.length,
  });
  const decision = await classifyCandidate(candidate, settings, requestAiClassification);

  debugLog("candidate-decision", {
    candidateId: candidate.id,
    blocked: decision.blocked,
    source: decision.source,
    confidence: decision.confidence,
    category: "category" in decision ? decision.category : undefined,
  });

  if (!decision.blocked || decision.source === "allowlist") {
    debugLog("candidate-skipped-collapse", {
      candidateId: candidate.id,
      source: decision.source,
    });
    return;
  }

  const fingerprint = fingerprintCandidate(candidate);
  const firstMatch = decision.matches[0];

  collapseTrackedCandidate(fingerprint, {
    title: getCollapseTitle(decision),
    reason: getDecisionReason(firstMatch?.category, decision.source),
  });

  debugLog("candidate-collapsed", {
    candidateId: candidate.id,
    source: decision.source,
    category: decision.category,
    matchedText: firstMatch?.matchedText,
  });
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
  const onCandidate = options.onCandidate ?? ((candidate) => {
    void processCandidate(candidate);
  });
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
