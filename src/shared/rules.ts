import type { FilterCategory, RuleMatch, Settings } from "./types";
import { normalizeText } from "./text";

type LocalRuleSource = "antiIntellectual" | "hate" | "harassment";

interface LocalRuleTable {
  source: LocalRuleSource;
  category: FilterCategory;
  keywords: readonly string[];
}

export interface LocalRuleResult extends RuleMatch {
  reason: string;
}

const localRuleTables: readonly LocalRuleTable[] = [
  {
    source: "antiIntellectual",
    category: "harassment",
    keywords: ["anti intellectual", "brain dead", "idiot"],
  },
  {
    source: "hate",
    category: "hate",
    keywords: ["violent slur", "hate speech", "slur"],
  },
  {
    source: "harassment",
    category: "harassment",
    keywords: ["idiot", "stupid", "shut up"],
  },
];

function matchKeywords(
  normalizedText: string,
  keywords: readonly string[],
): string | null {
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (normalizedKeyword && normalizedText.includes(normalizedKeyword)) {
      return keyword;
    }
  }

  return null;
}

export function matchLocalRules(
  text: string,
  settings: Settings,
): LocalRuleResult | null {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return null;
  }

  for (const table of localRuleTables) {
    if (!settings.categories[table.category]) {
      continue;
    }

    const matchedText = matchKeywords(normalizedText, table.keywords);

    if (matchedText) {
      return {
        category: table.category,
        matchedText,
        reason: `matched ${table.source} keyword`,
      };
    }
  }

  for (const keyword of settings.customKeywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword || !settings.categories.harassment) {
      continue;
    }

    if (normalizedText.includes(normalizedKeyword)) {
      return {
        category: "harassment",
        matchedText: keyword,
        reason: "matched custom keyword",
      };
    }
  }

  return null;
}
