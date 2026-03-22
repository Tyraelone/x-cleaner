# X Cleaner Design

## Goal

Build a Chrome extension for `x.com` that reduces exposure to low-quality or harmful content by detecting and collapsing posts, replies, usernames, and profile bio text that match anti-intellectual, hateful, or user-defined filtering rules. The first release should work out of the box with local rules and optionally let advanced users connect their own AI provider for higher-quality classification.

## Non-Goals

- Deleting content from X or modifying server-side data
- Attempting to perfectly understand context, sarcasm, or coded speech
- Building a moderation dashboard, analytics backend, or shared cloud service
- Supporting browsers other than Chrome in the first release

## User Experience

When the user browses `x.com`, the extension watches newly rendered content in timelines, replies, hover cards, and profile pages. If a post or profile-related text matches configured filters, the extension replaces the visible content area with a collapsed placeholder such as "Filtered by X Cleaner, click to expand." The user can always expand the item locally to inspect it.

The extension should include an options page where the user can:

- Enable or disable built-in categories
- Adjust filtering sensitivity
- Add custom keywords or phrases
- Maintain blacklists and allowlists for accounts
- Turn AI enhancement on or off
- Enter an API key and choose a supported AI provider

The first release should favor reversibility and low surprise:

- Default action is collapse, not hide permanently
- Allowlisted accounts are never filtered
- AI should only auto-collapse when confidence is high enough
- Users can temporarily ignore a single match from the page UI

## Architecture

The extension should use Manifest V3 and be split into four focused areas:

1. `content script`
Reads X page DOM, extracts candidate text blocks, applies UI updates, and listens for newly inserted content with a `MutationObserver`.

2. `background service worker`
Owns cross-tab state, AI request orchestration, request throttling, and caching coordination when page scripts ask for uncertain classifications.

3. `classifier`
Runs a two-stage decision flow:
- local rule engine for fast deterministic matches
- optional AI classifier for unclear borderline cases

4. `options page`
Provides configuration UI and persists settings in Chrome storage.

This split keeps DOM-coupled logic inside the page, keeps secrets and network logic out of the content script, and allows local-only usage when the user does not configure AI.

## Detection Targets

The first release should inspect three classes of content:

1. Posts and replies
- Main timeline tweets
- Detail-page replies
- Recommended conversation items that reuse tweet markup

2. Account identity text
- Display name
- Username handle

3. Profile text
- Profile bio on user pages
- Bio or summary text shown in account hover cards when feasible

If a DOM surface cannot be read reliably without brittle scraping, the implementation should skip it rather than introducing breakage-prone selectors. The priority order is posts/replies first, then names, then profile text.

## Classification Flow

Every candidate item should be normalized into a shared structure:

- `contentType`: post, reply, displayName, handle, profileBio
- `accountId`: inferred handle when available
- `text`: extracted text content
- `context`: optional nearby metadata such as whether the item is inside a profile page

Decision flow:

1. Check allowlist
- If the account is allowlisted, do not filter.

2. Check account blacklist
- If the account is blacklisted, collapse immediately.

3. Run local rule engine
- Match built-in anti-intellectual and hate-speech patterns
- Match custom keywords and phrases
- Produce a rule result with category and reason

4. Decide whether AI is needed
- If local rules are strong enough, return a local match
- If local rules are inconclusive and AI is enabled, send a compact request to the background worker

5. Run AI classification
- The model should return structured category labels and confidence
- Only collapse automatically above the configured confidence threshold

6. Cache result
- Cache by stable content fingerprint for the session to avoid repeated work

7. Render outcome
- Collapse and attach a reversible "click to expand" affordance
- Optionally expose why the content was filtered in a lightweight label or tooltip

## Built-In Categories

The first release should support:

- Anti-intellectual or proudly ignorant rhetoric
- Hate speech, dehumanization, or group-targeted abuse
- Aggressive insults or harassment patterns
- User-defined custom keywords and phrases
- User-defined blacklisted accounts

The built-in taxonomy should stay small in v1. We should not add many niche categories until the core pipeline is stable.

## Local Rule Engine

The local engine should be simple, transparent, and editable:

- Phrase and keyword lists grouped by category
- Optional regex support for advanced custom rules
- Per-category enable/disable switches
- A small normalization pass for casing, repeated punctuation, and basic whitespace cleanup

Rules should return structured reasons instead of a bare boolean so the UI can explain why something was filtered.

## AI Enhancement

AI is optional and user-supplied. The extension should not require any remote service to function.

AI behavior requirements:

- Disabled by default
- User brings their own API key
- Requests are sent only for ambiguous content not already decided by local rules
- Prompts request classification only, not rewriting or summarization
- Responses should be parsed into strict labels plus confidence
- Failures, rate limits, or malformed responses should degrade gracefully back to local-only behavior

The implementation should support a minimal provider abstraction so additional providers can be added later without rewriting the classifier pipeline.

## UI Behavior

Collapsed content should:

- Preserve enough layout to avoid large page jumps
- Show a short explanation such as filtered category or account blacklist match
- Be expandable with one click
- Avoid expanding automatically after rerenders

For posts and replies, the placeholder should replace the text region while keeping the surrounding tweet container stable when possible. For usernames or bio text, a lighter overlay or inline replacement is acceptable if full replacement would damage layout.

## Storage

Use `chrome.storage.sync` for lightweight user preferences that should travel with the browser profile when possible:

- enabled categories
- sensitivity and confidence thresholds
- custom keywords
- blacklisted and allowlisted accounts
- selected AI provider

Use `chrome.storage.local` for larger or more sensitive state:

- API key
- local classification cache
- temporary ignore state if persisted beyond the current page

## Error Handling

The extension must fail quietly and safely:

- If selectors stop matching after an X DOM change, unaffected surfaces should continue working
- If AI requests fail, the extension should continue with local rules only
- If configuration is missing or corrupted, reset to safe defaults instead of blocking page rendering
- If text extraction is empty or uncertain, skip filtering for that node

## Privacy and Security

- Keep API keys in extension storage only
- Never send content to AI unless the user explicitly enables AI
- Minimize transmitted text to the relevant snippet only
- Do not log raw filtered content unless a future debug mode is explicitly added

## Testing Strategy

The implementation plan should cover:

- unit tests for normalization and rule matching
- unit tests for classifier decision flow
- tests for storage-backed settings handling
- DOM-level tests for collapse and expand behavior
- at least one manual verification checklist against a real `x.com` page

Because X changes DOM structure frequently, selector logic should be isolated and tested with representative fixtures where possible.

## First Release Scope

Included in v1:

- Chrome Manifest V3 extension scaffold
- Filtering for posts, replies, display names, handles, and profile bios where reliably detectable
- Built-in local categories for anti-intellectual and hate/abuse content
- Custom keyword rules
- Blacklist and allowlist account management
- Reversible collapse UI
- Optional AI classification with user-supplied API key
- Basic options page

Excluded from v1:

- Synced moderation lists between users
- Cloud backend or telemetry service
- Rich analytics or filter history dashboard
- Multi-browser packaging
- Fine-grained per-surface styling customization

## Open Implementation Constraints Resolved

The approved decisions for planning are:

- default filter action: collapse and allow manual expand
- architecture direction: local rules first, optional AI enhancement
- coverage scope: posts, replies, usernames, and profile bio text

This spec is intentionally sized for a single implementation plan and a first working release, not a full moderation platform.
