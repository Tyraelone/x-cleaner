# Multilingual Local Rules Expansion Design

## Goal

Expand the local rule tables so the extension can more reliably block clearly abusive or hateful content in both Chinese and English, while keeping false positives manageable.

## Scope

This round expands built-in local matching only. It does not add a new settings UI, new categories, or AI-dependent behavior.

The expanded rules will cover:

- anti-intellectual and anti-learning insults
- direct harassment and profanity
- hate and exclusion language

## Rule Strategy

Keep the current three source groups in `/Users/duanziyu/Documents/x-cleaner/src/shared/rules.ts`:

- `antiIntellectual`
- `hate`
- `harassment`

Within those groups, expand the built-in keyword lists with high-confidence Chinese and English phrases that are common in real abuse patterns.

Use two matching tiers conceptually:

- strong phrases: obvious slurs, exclusion phrases, and direct abuse that should match directly
- weak phrases: borderline words that should only be added when they are still specific enough to avoid obvious false positives

This round will implement only high-confidence additions. We will avoid broad generic words that are common in normal conversation.

## Category Direction

### antiIntellectual

Add phrases that attack intelligence, learning, reading, rational thinking, or education in a clearly contemptuous way.

Examples of acceptable additions:

- Chinese: `反智`, `读书读傻了`, `书呆子`, `没脑子`, `低智`, `脑残`
- English: `brain dead`, `smooth brain`, `room temperature iq`, `npc brain`

Avoid neutral words like `academic`, `educated`, or `naive`.

### hate

Add phrases that express exclusion, dehumanization, ethnic or national hostility, or explicit removal language.

Examples of acceptable additions:

- Chinese: `滚出去`, `滚回你的国家`, `低等民族`, `劣等人`, `把他们都清除掉`
- English: `go back to your country`, `subhuman`, `wipe them out`, `send them back`

Avoid broad geopolitical or nationality words by themselves.

### harassment

Add direct insults, profanity, and targeted personal abuse that are commonly used as attacks.

Examples of acceptable additions:

- Chinese: `傻狗`, `贱人`, `狗东西`, `废物`, `脑瘫`, `智障`, `蠢货`, `傻逼`
- English: `moron`, `loser`, `piece of trash`, `shut up`, `idiot`, `stupid`

Avoid highly ambiguous slang unless paired with stronger context.

## Matching Behavior

Continue using the Unicode-aware matcher introduced in `/Users/duanziyu/Documents/x-cleaner/src/shared/rules.ts`.

Expected behavior:

- Chinese phrases can still match when spaces are inserted between characters
- English phrases can still match when punctuation is inserted to evade simple matching
- custom keywords continue to use the same matcher
- existing categories and return shape remain unchanged

## Testing

Add or expand unit tests in `/Users/duanziyu/Documents/x-cleaner/tests/shared/rules.test.ts` to cover:

- added Chinese anti-intellectual phrases
- added Chinese harassment phrases
- added Chinese hate phrases
- added English harassment and hate phrases
- evasion with punctuation and inserted whitespace
- a small number of non-match cases for obviously neutral text

## Risks

- Overly broad Chinese insult terms can create false positives in quoted or reclaimed language
- Generic English slang can hit normal joking or unrelated discussion

To manage this, prefer phrases and obvious insults over single highly ambiguous tokens.
