import XRegExp from "xregexp";
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
    keywords: [
      "anti intellectual",
      "brain dead",
      "idiot",
      "smooth brain",
      "room temperature iq",
      "npc brain",
      "反智",
      "没脑子",
      "脑残",
      "低智",
      "读书读傻了",
      "书呆子",
    ],
  },
  {
    source: "hate",
    category: "hate",
    keywords: [
      "go back to your country",
      "subhuman people",
      "send them back",
      "wipe them out",
      "subhuman",
      "滚回你的国家",
      "滚出去",
      "低等人",
      "低等民族",
      "劣等人",
      "把他们都清除掉",
    ],
  },
  {
    source: "harassment",
    category: "harassment",
    keywords: [
      "idiot",
      "stupid",
      "shut up",
      "moron",
      "loser",
      "piece of trash",
      "闭嘴",
      "蠢货",
      "傻逼",
      "傻狗",
      "贱人",
      "狗东西",
      "废物",
      "脑瘫",
      "智障",
    ],
  },
];

const unicodeLetterOrNumber = XRegExp("\\p{L}|\\p{N}");
const hanCharacter = XRegExp("\\p{Script=Han}");
const unicodeSeparatorPattern = String.raw`(?:[\p{Z}\p{P}\p{S}]|_)+`;
const optionalUnicodeSeparatorPattern = String.raw`(?:[\p{Z}\p{P}\p{S}]|_)*`;

function isLetterOrNumber(value: string): boolean {
  return XRegExp.test(value, unicodeLetterOrNumber);
}

function getKeywordSegments(normalizedKeyword: string): string[] {
  const whitespaceSegments = normalizedKeyword.split(/\s+/).filter(Boolean);

  if (whitespaceSegments.length > 1) {
    return whitespaceSegments;
  }

  if (!XRegExp.test(normalizedKeyword, hanCharacter)) {
    return whitespaceSegments;
  }

  return Array.from(normalizedKeyword).filter((segment) => segment.trim().length > 0);
}

function buildKeywordPattern(keyword: string): RegExp | null {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return null;
  }

  const segments = getKeywordSegments(normalizedKeyword);

  if (segments.length === 0) {
    return null;
  }

  const escapedSegments = segments.map((segment) => XRegExp.escape(segment));
  const usesHanMatching = XRegExp.test(normalizedKeyword, hanCharacter);
  const body = escapedSegments.join(
    usesHanMatching ? optionalUnicodeSeparatorPattern : unicodeSeparatorPattern,
  );
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const usesWordBoundaries = !usesHanMatching;
  const prefix =
    usesWordBoundaries && isLetterOrNumber(firstSegment[0] ?? "")
      ? String.raw`(?<![\p{L}\p{N}])`
      : "";
  const suffix =
    usesWordBoundaries && isLetterOrNumber(lastSegment[lastSegment.length - 1] ?? "")
      ? String.raw`(?![\p{L}\p{N}])`
      : "";

  return XRegExp(`${prefix}${body}${suffix}`, "iu");
}

function matchKeywords(
  normalizedText: string,
  keywords: readonly string[],
): string | null {
  for (const keyword of keywords) {
    const pattern = buildKeywordPattern(keyword);

    if (pattern && XRegExp.test(normalizedText, pattern)) {
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

  for (const keyword of settings.customKeywords) {
    if (!keyword || !settings.categories.harassment) {
      continue;
    }

    if (matchKeywords(normalizedText, [keyword])) {
      return {
        category: "harassment",
        matchedText: keyword,
        reason: "matched custom keyword",
      };
    }
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

  return null;
}
