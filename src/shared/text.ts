const repeatedPunctuation = /([!?.,;:])\1+/g;
const whitespace = /\s+/g;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(repeatedPunctuation, "$1")
    .replace(whitespace, " ")
    .trim();
}

export function fingerprintText(text: string): string {
  return normalizeText(text);
}
