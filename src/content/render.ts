type CollapseMatchInfo = {
  fingerprint: string;
  title: string;
  reason: string;
};

type CollapseState = {
  placeholder: HTMLElement;
  target: Element;
  fingerprint: string;
};

const TEMP_IGNORE_MS = 5_000;
const ignoredFingerprints = new Map<string, number>();
const collapsedTargets = new WeakMap<HTMLElement, CollapseState>();

function isTemporarilyIgnored(fingerprint: string): boolean {
  const expiresAt = ignoredFingerprints.get(fingerprint);

  if (expiresAt === undefined) {
    return false;
  }

  if (Date.now() >= expiresAt) {
    ignoredFingerprints.delete(fingerprint);
    return false;
  }

  return true;
}

function createPlaceholder(
  ownerDocument: Document,
  matchInfo: CollapseMatchInfo,
): HTMLButtonElement {
  const button = ownerDocument.createElement("button");
  button.type = "button";
  button.textContent = `${matchInfo.title} - click to expand`;
  button.dataset.fingerprint = matchInfo.fingerprint;
  button.dataset.reason = matchInfo.reason;
  button.setAttribute("aria-label", `${matchInfo.title}: ${matchInfo.reason}`);

  return button;
}

function restoreTarget(state: CollapseState): void {
  const { placeholder, target, fingerprint } = state;
  const parent = placeholder.parentNode;

  if (!parent) {
    return;
  }

  ignoredFingerprints.set(fingerprint, Date.now() + TEMP_IGNORE_MS);
  parent.replaceChild(target, placeholder);
  collapsedTargets.delete(target);
}

export function collapseElement(
  target: Element,
  matchInfo: CollapseMatchInfo,
): boolean {
  if (isTemporarilyIgnored(matchInfo.fingerprint)) {
    return false;
  }

  if (collapsedTargets.has(target)) {
    return false;
  }

  const parent = target.parentNode;

  if (!parent) {
    return false;
  }

  const ownerDocument = target.ownerDocument;

  if (!ownerDocument) {
    return false;
  }

  const placeholder = createPlaceholder(ownerDocument, matchInfo);
  const state: CollapseState = {
    placeholder,
    target,
    fingerprint: matchInfo.fingerprint,
  };

  placeholder.addEventListener("click", () => {
    restoreTarget(state);
  });

  collapsedTargets.set(target, state);
  parent.replaceChild(placeholder, target);

  return true;
}

export function clearTemporaryIgnores(): void {
  ignoredFingerprints.clear();
}
