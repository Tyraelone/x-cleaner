type CollapseMatchInfo = {
  fingerprint: string;
  title: string;
  reason: string;
};

type CollapseState = {
  placeholder: HTMLElement;
  expandedControl: HTMLElement | null;
  target: Element;
  fingerprint: string;
  matchInfo: CollapseMatchInfo;
};

const TEMP_IGNORE_MS = 5_000;
const ignoredFingerprints = new Map<string, number>();
const collapsedTargets = new WeakMap<Element, CollapseState>();

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
  button.className = "x-cleaner-fold-card";
  button.dataset.fingerprint = matchInfo.fingerprint;
  button.dataset.reason = matchInfo.reason;
  button.setAttribute("aria-label", `${matchInfo.title}: ${matchInfo.reason}`);

  const badge = ownerDocument.createElement("span");
  badge.className = "x-cleaner-fold-card__badge";
  badge.textContent = "Collapsed by X Cleaner";

  const title = ownerDocument.createElement("span");
  title.className = "x-cleaner-fold-card__title";
  title.textContent = matchInfo.title;

  const reason = ownerDocument.createElement("span");
  reason.className = "x-cleaner-fold-card__reason";
  reason.textContent = matchInfo.reason;

  const action = ownerDocument.createElement("span");
  action.className = "x-cleaner-fold-card__action";
  action.textContent = "Expand to review";

  Object.assign(button.style, {
    display: "grid",
    width: "100%",
    gap: "6px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid rgba(207, 217, 222, 0.45)",
    background:
      "linear-gradient(135deg, rgba(24, 24, 28, 0.96), rgba(43, 47, 54, 0.92))",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
    color: "#f5f7fa",
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
  });

  Object.assign(badge.style, {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ad1ff",
  });

  Object.assign(title.style, {
    fontSize: "15px",
    fontWeight: "700",
  });

  Object.assign(reason.style, {
    fontSize: "13px",
    lineHeight: "1.4",
    color: "rgba(245, 247, 250, 0.78)",
  });

  Object.assign(action.style, {
    fontSize: "13px",
    fontWeight: "600",
    color: "#7ce0b8",
  });

  button.append(badge, title, reason, action);

  return button;
}

function createExpandedControl(
  ownerDocument: Document,
  matchInfo: CollapseMatchInfo,
): HTMLDivElement {
  const container = ownerDocument.createElement("div");
  container.className = "x-cleaner-expanded-control";

  const summary = ownerDocument.createElement("span");
  summary.textContent = `${matchInfo.title} · ${matchInfo.reason}`;

  const button = ownerDocument.createElement("button");
  button.type = "button";
  button.dataset.action = "collapse";
  button.textContent = "Fold again";

  Object.assign(container.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "8px",
    padding: "8px 10px",
    borderRadius: "12px",
    background: "rgba(29, 155, 240, 0.08)",
    border: "1px solid rgba(29, 155, 240, 0.18)",
    color: "#536471",
    fontSize: "12px",
  });

  Object.assign(button.style, {
    border: "none",
    borderRadius: "999px",
    padding: "6px 10px",
    background: "#1d9bf0",
    color: "#ffffff",
    cursor: "pointer",
    font: "inherit",
    fontWeight: "600",
  });

  container.append(summary, button);
  return container;
}

function restoreTarget(state: CollapseState): void {
  const { placeholder, target, fingerprint } = state;
  const parent = placeholder.parentNode;

  if (!parent) {
    return;
  }

  ignoredFingerprints.set(fingerprint, Date.now() + TEMP_IGNORE_MS);
  parent.replaceChild(target, placeholder);
  const expandedControl = createExpandedControl(target.ownerDocument, state.matchInfo);
  expandedControl
    .querySelector<HTMLButtonElement>('[data-action="collapse"]')
    ?.addEventListener("click", () => {
      collapseExpandedState(state);
    });
  target.parentNode?.insertBefore(expandedControl, target);
  state.expandedControl = expandedControl;
  collapsedTargets.delete(target);
}

function collapseExpandedState(state: CollapseState): void {
  const { expandedControl, target, placeholder, fingerprint } = state;
  const parent = target.parentNode;

  if (expandedControl?.parentNode) {
    expandedControl.parentNode.removeChild(expandedControl);
  }

  if (!parent) {
    return;
  }

  ignoredFingerprints.delete(fingerprint);
  parent.replaceChild(placeholder, target);
  state.expandedControl = null;
  collapsedTargets.set(target, state);
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
    expandedControl: null,
    target,
    fingerprint: matchInfo.fingerprint,
    matchInfo,
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
