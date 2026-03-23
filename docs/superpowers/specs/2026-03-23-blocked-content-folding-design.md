# Blocked Content Folding Design

## Goal

Make every `blocked: true` classification collapse by default, keep a manual expand action, and let users fold the content again after expanding it.

## Approved Decisions

- Any blocked decision should collapse by default, regardless of whether the source is `local`, `ai`, or `blacklist`.
- The fold UI should stay reversible.
- Expanded content must expose a manual "fold again" control.
- The folded placeholder should be visually improved compared with the current plain button.

## UX

Blocked items should render as a compact fold card instead of a bare button. The card should show:

- a short title
- the matching reason
- a primary expand action

When the user expands the content, the original DOM node should come back into the page so X layout stays intact. A lightweight inline control should remain attached to the expanded content so the user can fold it again without waiting for a re-scan.

## Implementation Notes

- Keep the rendering logic centered in `src/content/render.ts`.
- Preserve the current tracked-candidate flow in `src/content/index.ts`, but allow blacklist decisions to use the same collapse pipeline as other blocked decisions.
- Replace the temporary ignore behavior so it only prevents immediate automatic re-collapse after a manual expand. It must not block a manual re-collapse action initiated by the user.

## Testing

Add or update tests to cover:

- blacklist decisions participating in collapse
- expand then fold-again behavior on the same target
- refreshed folded-card structure and text hooks
