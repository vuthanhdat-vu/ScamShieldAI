/**
 * Text Cleaning & Adversarial De-obfuscation Engine for Vietnamese ScamShield AI.
 * Implements PREPROCESSING_DESIGN.md §3:
 * - Zero-width & invisible character stripping
 * - Unicode NFKC & NFC normalization
 * - Mathematical monospace font transcoding
 * - Spaced-out broken URL reconstruction
 * - Phonotactic un-stuttering with acronym vaulting
 * - Telex typo repair with natural double vowel protection
 * - Vietnamese SMS slang normalization with Unicode lookaround boundaries
 * - Risk-preserving stopword retention
 * - Placeholder 100% intact preservation
 */

export const RE_INVISIBLE_CHARS =
  /[\u200B-\u200F\uFEFF\u3164\uFFA0\u1160\u00AD\u202A-\u202E\u2060-\u2069\u180E]/gu;

export const RISK_PRESERVED_STOPWORDS: readonly string[] = [
  'nếu',
  'thì',
  'mà',
  'do đó',
  'vì vậy',
  'cho nên',
  'kẻo',
  'ngay',
  'ngay lập tức',
  'phải',
  'trước',
  'trong',
  'hạn chót',
  'khẩn cấp',
  'lập tức',
  'nhanh',
  'khóa',
  'chặn',
  'phạt',
  'thu hồi',
  'cưỡng chế',
  'truy tố',
  'hủy',
];

export interface DenoiseResult {
  cleanedText: string;
  adversarialEvasionDetected: boolean;
  evasionDetails: string[];
}

/**
 * Strips invisible, zero-width spaces, and directional formatting characters.
 */
export function stripInvisibleChars(text: string): string {
  return text.replace(RE_INVISIBLE_CHARS, '');
}

/**
 * Transcodes mathematical monospace typewriter characters to standard ASCII.
 * Uppercase Monospace: U+1D670-U+1D689 -> A-Z (0x41-0x5A)
 * Lowercase Monospace: U+1D68A-U+1D6A3 -> a-z (0x61-0x7A)
 * Digits Monospace:    U+1D7F6-U+1D7FF -> 0-9 (0x30-0x39)
 */
export function transcodeMathMonospace(text: string): string {
  return text
    .replace(/[\u{1D670}-\u{1D689}]/gu, (c) =>
      String.fromCodePoint(c.codePointAt(0)! - 0x1d670 + 0x41),
    )
    .replace(/[\u{1D68A}-\u{1D6A3}]/gu, (c) =>
      String.fromCodePoint(c.codePointAt(0)! - 0x1d68a + 0x61),
    )
    .replace(/[\u{1D7F6}-\u{1D7FF}]/gu, (c) =>
      String.fromCodePoint(c.codePointAt(0)! - 0x1d7f6 + 0x30),
    );
}

/**
 * Reconstructs spaced-out broken URLs adversarial attempts.
 * Handles schemes (http : //), post-scheme spaces, and spaced domain dots.
 */
export function reconstructSpacedUrls(text: string): { text: string; modified: boolean } {
  let res = text;
  let modified = false;

  // 1. Fix malformed scheme: 'http : //', 'https . //', 'http , //'
  const schemeRegex = /\b(https?)\s*[:\.,]\s*\/\s*\//gi;
  if (schemeRegex.test(res)) {
    modified = true;
    res = res.replace(schemeRegex, '$1://');
  }

  // 2. Fix space after scheme: 'http:// domain'
  const postSchemeRegex = /(https?:\/\/)\s+([a-zA-Z0-9\[])/gi;
  if (postSchemeRegex.test(res)) {
    modified = true;
    res = res.replace(postSchemeRegex, '$1$2');
  }

  // 3. Fix spaced-out domain dots: 'domain .com', 'domain . com . vn'
  const spacedDotRegex = /([a-zA-Z0-9\-]+)(?:\s+\.|\.\s+|\s+\.\s+)([a-zA-Z0-9\-]+)/gi;
  let prev;
  do {
    prev = res;
    res = res.replace(spacedDotRegex, (match, p1, p2) => {
      modified = true;
      return `${p1}.${p2}`;
    });
  } while (res !== prev);

  return { text: res, modified };
}

/**
 * Phonotactic un-stuttering: compresses characters repeating >= 3 times,
 * alternating case pairs (NhHậẬnN -> Nhận), and unnatural double vowels.
 * Vaults 'cccd' before 3-letter compression.
 */
export function unStutterText(text: string): { text: string; modified: boolean } {
  let res = text;
  let modified = false;

  // 1. Vault CCCD acronym so 3 'c's are not crushed into 'cd'
  res = res.replace(/(?<![\p{L}\p{N}])c{3,4}d(?![\p{L}\p{N}])/giu, '__VAULT_CAN_CUOC__');

  // 2. Alternating case stuttering: c1 C1 -> c1 (e.g. NhHậẬnN -> Nhận)
  const alternatingCaseRegex = /([a-zA-Z\u00C0-\u1EF9])\1/gi;
  res = res.replace(alternatingCaseRegex, (match) => {
    const c1 = match[0];
    const c2 = match[1];
    if (c1.toLowerCase() === c2.toLowerCase() && c1 !== c2) {
      modified = true;
      return c1;
    }
    return match;
  });

  // 3. Case-insensitive repetition of >= 3 identical letters: LLL -> L, nnNNN -> n
  const repeat3Regex = /([a-zA-Z\u00C0-\u1EF9])\1{2,}/giu;
  if (repeat3Regex.test(res)) {
    modified = true;
    res = res.replace(repeat3Regex, (match, p1) => p1);
  }

  // 4. Double accented vowels (ââ, êê, ôô, ơơ, ưư, ềề, etc.) -> single vowel
  const doubleAccentVowel =
    /([àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ])\1/giu;
  if (doubleAccentVowel.test(res)) {
    modified = true;
    res = res.replace(doubleAccentVowel, '$1');
  }

  // 5. Non-letter repetition >= 3 -> 1 (excluding brackets and whitespace)
  res = res.replace(/([^a-zA-Z0-9\u00C0-\u1EF9\[\]\(\)\s])\1{2,}/gu, '$1');

  // 6. Restore CCCD
  res = res.replace(/__VAULT_CAN_CUOC__/g, 'cccd');

  return { text: res, modified };
}

/**
 * Repairs Telex typos while preserving natural Vietnamese double vowels (xoong, boong, coong, moong).
 */
export function repairTelexTypos(text: string): string {
  let res = text;

  // 1. dd / DD -> đ / Đ
  res = res
    .replace(/(?<![\p{L}\p{N}])dd/giu, 'đ')
    .replace(/(?<![\p{L}\p{N}])DD/gu, 'Đ');

  // 2. aa -> â, ee -> ê
  res = res
    .replace(/aa/g, 'â')
    .replace(/AA/g, 'Â')
    .replace(/ee/g, 'ê')
    .replace(/EE/g, 'Ê');

  // 3. oo -> ô with natural double vowel whitelist protection
  res = res.replace(/(?<![\p{L}\p{N}])(x|b|c|m)oong(?![\p{L}\p{N}])/giu, '__VAULT_$1_VAULT__');
  res = res.replace(/oo/g, 'ô').replace(/OO/g, 'Ô');
  res = res.replace(/__VAULT_([xXbBcCmM])_VAULT__/g, (m, p1) => `${p1.toLowerCase()}oong`);

  return res;
}

/**
 * Vietnamese SMS Slang Dictionary mappings using Unicode lookaround boundaries.
 * (?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u
 */
export const VIETNAMESE_SMS_SLANG_MAP: [RegExp, string][] = [
  // Multi-word phrases first
  [/(?<![\p{L}\p{N}])so\s*tk(?![\p{L}\p{N}])/giu, 'số tài khoản'],
  [/(?<![\p{L}\p{N}])tai\s*khoan(?![\p{L}\p{N}])/giu, 'tài khoản'],
  [/(?<![\p{L}\p{N}])can\s*cuoc(?![\p{L}\p{N}])/giu, 'căn cước công dân'],
  [/(?<![\p{L}\p{N}])chuyen\s*khoan(?![\p{L}\p{N}])/giu, 'chuyển khoản'],
  [/(?<![\p{L}\p{N}])ngan\s*hang(?![\p{L}\p{N}])/giu, 'ngân hàng'],
  [/(?<![\p{L}\p{N}])so\s*dien\s*thoai(?![\p{L}\p{N}])/giu, 'số điện thoại'],

  // Financial / Transactional
  [/(?<![\p{L}\p{N}])stk(?![\p{L}\p{N}])/giu, 'số tài khoản'],
  [/(?<![\p{L}\p{N}])tk(?![\p{L}\p{N}])/giu, 'tài khoản'],
  [/(?<![\p{L}\p{N}])ck(?![\p{L}\p{N}])/giu, 'chuyển khoản'],
  [/(?<![\p{L}\p{N}])nh(?![\p{L}\p{N}])/giu, 'ngân hàng'],
  [/(?<![\p{L}\p{N}])s[đd]t(?![\p{L}\p{N}])/giu, 'số điện thoại'],

  // Identity / Security
  [/(?<![\p{L}\p{N}])cccd(?![\p{L}\p{N}])/giu, 'căn cước công dân'],
  [/(?<![\p{L}\p{N}])cmnd(?![\p{L}\p{N}])/giu, 'căn cước công dân'],
  [/(?<![\p{L}\p{N}])mk(?![\p{L}\p{N}])/giu, 'mật khẩu'],
  [/(?<![\p{L}\p{N}])pass(?![\p{L}\p{N}])/giu, 'mật khẩu'],
  [/(?<![\p{L}\p{N}])pwd(?![\p{L}\p{N}])/giu, 'mật khẩu'],
  [/(?<![\p{L}\p{N}])xacthuc(?![\p{L}\p{N}])/giu, 'xác thực'],

  // Administrative
  [/(?<![\p{L}\p{N}])dvc(?![\p{L}\p{N}])/giu, 'dịch vụ công'],
  [/(?<![\p{L}\p{N}])bca(?![\p{L}\p{N}])/giu, 'Bộ Công An'],
  [/(?<![\p{L}\p{N}])vneid(?![\p{L}\p{N}])/giu, 'VNeID'],

  // Conversational SMS slang
  // Negative lookbehind for digits protects currency suffix (e.g. '500k' preserved)
  [/(?<![\p{N}]\s*)(?<![\p{L}\p{N}])(ko|k|kh|khong|hổng)(?![\p{L}\p{N}])(?!\s*k\b)/giu, 'không'],
  [/(?<![\p{L}\p{N}])(dc|đc)(?![\p{L}\p{N}])/giu, 'được'],
  [/(?<![\p{L}\p{N}])ng(?![\p{L}\p{N}])/giu, 'người'],
];

/**
 * Normalizes Vietnamese SMS slang and abbreviations into standard phrases.
 */
export function normalizeSlang(text: string): string {
  let res = text;
  for (const [regex, replacement] of VIETNAMESE_SMS_SLANG_MAP) {
    res = res.replace(regex, replacement);
  }
  return res;
}

/**
 * Cleans and de-obfuscates text, returning detailed evasion flags.
 */
export function denoiseText(text: string): DenoiseResult {
  if (!text) {
    return { cleanedText: '', adversarialEvasionDetected: false, evasionDetails: [] };
  }

  let current = text;
  const evasionDetails: string[] = [];

  // Step 0: Record initial placeholders
  const initialPlaceholders = text.match(/\[(MONEY|NUMBER|TIME)\]/g) || [];

  // Step 1: Strip zero-width & invisible characters before normalization
  if (RE_INVISIBLE_CHARS.test(current)) {
    evasionDetails.push('ZERO_WIDTH_SPACE');
    current = stripInvisibleChars(current);
  }

  // Step 2: Unicode normalization (NFKC then NFC)
  const beforeNorm = current;
  current = current.normalize('NFKC').normalize('NFC');
  if (current !== beforeNorm) {
    evasionDetails.push('UNICODE_NORMALIZATION');
  }

  // Step 3: Strip any newly decomposed invisible chars (e.g. \u1160)
  current = stripInvisibleChars(current);

  // Step 4: Explicit Mathematical Monospace Transcoding
  const beforeMath = current;
  current = transcodeMathMonospace(current);
  if (current !== beforeMath) {
    evasionDetails.push('MATH_MONOSPACE_FONT');
  }

  // Step 5: Spaced-out broken URL reconstruction
  const urlResult = reconstructSpacedUrls(current);
  if (urlResult.modified) {
    evasionDetails.push('RECONSTRUCTED_SPACED_URL');
    current = urlResult.text;
  }

  // Step 6: Phonotactic un-stuttering
  const stutterResult = unStutterText(current);
  if (stutterResult.modified) {
    evasionDetails.push('CHARACTER_STUTTERING');
    current = stutterResult.text;
  }

  // Step 7: Telex typo repair
  current = repairTelexTypos(current);

  // Step 8: Vietnamese SMS slang normalization with Unicode boundaries
  current = normalizeSlang(current);

  // Step 9: Verify 100% placeholder preservation
  const finalPlaceholders = current.match(/\[(MONEY|NUMBER|TIME)\]/g) || [];
  if (initialPlaceholders.length !== finalPlaceholders.length) {
    throw new Error(
      `CRITICAL INTEGRITY VIOLATION: Placeholder count mismatch! Initial: ${initialPlaceholders.length}, Final: ${finalPlaceholders.length}`,
    );
  }

  return {
    cleanedText: current,
    adversarialEvasionDetected: evasionDetails.length > 0,
    evasionDetails: [...new Set(evasionDetails)],
  };
}

/**
 * Standard cleanText utility returning the normalized cleaned text.
 */
export function cleanText(text: string): string {
  return denoiseText(text).cleanedText;
}
