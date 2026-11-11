export const TEXT_CHARACTER_LIMIT = 5000;

export function countContractCharacters(text: string) {
  // Match the backend DTO's validator.js length rules, including emoji presentation selectors.
  const surrogatePairs = text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0;
  const presentationSequences = text.match(/[^\uFE0E\uFE0F][\uFE0E\uFE0F]/g)?.length ?? 0;
  return text.length - surrogatePairs - presentationSequences;
}

export function validateAnalysisText(draft: string) {
  const text = draft.trim();
  const length = countContractCharacters(text);
  const error = length === 0 ? 'empty' : length > TEXT_CHARACTER_LIMIT ? 'tooLong' : null;

  return { text, length, error };
}
