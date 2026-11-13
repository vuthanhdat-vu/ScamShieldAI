// Complete test suite with all fixes

function preprocessDenoise(text) {
  let result = text;
  const evasionDetected = [];

  // 0. Placeholder protection check: verify [MONEY], [NUMBER], [TIME] present
  const originalPlaceholders = text.match(/\[(MONEY|NUMBER|TIME)\]/g) || [];

  // Step 1: Strip Zero-Width and Invisible Characters BEFORE NFKC
  // (Prevents \u3164 and \uFFA0 from decomposing to \u1160)
  // Codepoints: \u200B-\u200F, \uFEFF, \u3164, \uFFA0, \u1160, \u00AD, \u202A-\u202E, \u2060-\u2069, \u180E
  const reInvisible = /[\u200B-\u200F\uFEFF\u3164\uFFA0\u1160\u00AD\u202A-\u202E\u2060-\u2069\u180E]/gu;
  if (reInvisible.test(result)) {
    evasionDetected.push('ZERO_WIDTH_SPACE');
    result = result.replace(reInvisible, '');
  }

  // Step 2: Unicode Normalization (NFKC then NFC)
  const beforeNorm = result;
  result = result.normalize('NFKC').normalize('NFC');
  if (result !== beforeNorm) {
    evasionDetected.push('UNICODE_NORMALIZATION');
  }

  // Double-check invisible chars in case NFKC produced any
  result = result.replace(reInvisible, '');

  // Step 3: Explicit Mathematical Monospace Transcoding (Defense-in-depth)
  const beforeMath = result;
  result = result.replace(/[\u{1D670}-\u{1D689}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D670 + 0x41));
  result = result.replace(/[\u{1D68A}-\u{1D6A3}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D68A + 0x61));
  result = result.replace(/[\u{1D7F6}-\u{1D7FF}]/gu, c => String.fromCodePoint(c.codePointAt(0) - 0x1D7F6 + 0x30));
  if (result !== beforeMath) {
    evasionDetected.push('MATH_MONOSPACE_FONT');
  }

  // Step 4: Spaced-out Broken URL Reconstruction
  // 4a. Fix scheme
  const schemeRegex = /\b(https?)\s*[:\.,]\s*\/\s*\//gi;
  if (schemeRegex.test(result)) {
    evasionDetected.push('RECONSTRUCTED_SPACED_URL');
    result = result.replace(schemeRegex, '$1://');
  }
  // 4b. Fix space after scheme
  const postSchemeRegex = /(https?:\/\/)\s+([a-zA-Z0-9\[])/gi;
  if (postSchemeRegex.test(result)) {
    evasionDetected.push('RECONSTRUCTED_SPACED_URL');
    result = result.replace(postSchemeRegex, '$1$2');
  }
  // 4c. Fix spaced-out domain dots (e.g. domain .com or domain . com . vn)
  const spacedDotRegex = /([a-zA-Z0-9\-]+)(?:\s+\.|\.\s+|\s+\.\s+)([a-zA-Z0-9\-]+)/gi;
  let prevUrl;
  do {
    prevUrl = result;
    result = result.replace(spacedDotRegex, (match, p1, p2) => {
      evasionDetected.push('RECONSTRUCTED_SPACED_URL');
      return `${p1}.${p2}`;
    });
  } while (result !== prevUrl);

  // Step 5: Protect special acronyms before stutter compression:
  // 'cccd' has 3 'c's. Temporarily protect it so it isn't crushed to 'cd'!
  result = result.replace(/(?<![\p{L}\p{N}])c{3,4}d(?![\p{L}\p{N}])/giu, '__VAULT_CAN_CUOC__');

  // Step 6: Character Stuttering / Repetition Compression
  // 6a. Alternating case stuttering: c1 C1 -> c1 (e.g., NhHậẬnN -> Nhận)
  const alternatingCaseRegex = /([a-zA-Z\u00C0-\u1EF9])\1/gi;
  result = result.replace(alternatingCaseRegex, (match) => {
    const c1 = match[0];
    const c2 = match[1];
    if (c1.toLowerCase() === c2.toLowerCase() && c1 !== c2) {
      evasionDetected.push('STUTTERING_ALTERNATING_CASE');
      return c1;
    }
    return match;
  });

  // 6b. Repetition >= 3 identical characters case-insensitively -> 1 (e.g. NNNN -> N, LLL -> L, nnNNN -> n)
  const repeat3Regex = /([a-zA-Z\u00C0-\u1EF9])\1{2,}/giu;
  if (repeat3Regex.test(result)) {
    evasionDetected.push('CHARACTER_STUTTERING');
    result = result.replace(repeat3Regex, (match, p1) => p1);
  }

  // 6c. Double accented vowels (ââ, êê, ôô, ơơ, ưư) -> single vowel
  const doubleAccentVowel = /([âêôơưÂÊÔƠƯ])\1/giu;
  if (doubleAccentVowel.test(result)) {
    evasionDetected.push('CHARACTER_STUTTERING');
    result = result.replace(doubleAccentVowel, '$1');
  }

  // 6d. Non-letter repetition >= 3 -> 1
  result = result.replace(/([^a-zA-Z\u00C0-\u1EF9])\1{2,}/gu, '$1');

  // Restore protected cccd
  result = result.replace(/__VAULT_CAN_CUOC__/g, 'cccd');

  // Step 7: Telex Typo Repair
  // 7a. dd -> đ, DD -> Đ
  result = result.replace(/(?<![\p{L}\p{N}])dd/giu, 'đ').replace(/(?<![\p{L}\p{N}])DD/gu, 'Đ');
  // 7b. aa -> â, ee -> ê
  result = result.replace(/aa/g, 'â').replace(/AA/g, 'Â').replace(/ee/g, 'ê').replace(/EE/g, 'Ê');
  // 7c. oo -> ô, BUT preserve natural Vietnamese words: xoong, boong, coong, moong
  result = result.replace(/(?<![\p{L}\p{N}])(x|b|c|m)oong(?![\p{L}\p{N}])/giu, '__VAULT_$1_VAULT__');
  result = result.replace(/oo/g, 'ô').replace(/OO/g, 'Ô');
  result = result.replace(/__VAULT_([xXbBcCmM])_VAULT__/g, (m, p1) => `${p1.toLowerCase()}oong`);

  // Step 8: Vietnamese SMS Slang Dictionary Normalization
  // Use Unicode lookarounds (?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])
  const slangReplacements = [
    // Multi-word first
    [/(?<![\p{L}\p{N}])so\s*tk(?![\p{L}\p{N}])/giu, 'số tài khoản'],
    [/(?<![\p{L}\p{N}])tai\s*khoan(?![\p{L}\p{N}])/giu, 'tài khoản'],
    [/(?<![\p{L}\p{N}])can\s*cuoc(?![\p{L}\p{N}])/giu, 'căn cước công dân'],
    [/(?<![\p{L}\p{N}])chuyen\s*khoan(?![\p{L}\p{N}])/giu, 'chuyển khoản'],
    [/(?<![\p{L}\p{N}])ngan\s*hang(?![\p{L}\p{N}])/giu, 'ngân hàng'],
    [/(?<![\p{L}\p{N}])so\s*dien\s*thoai(?![\p{L}\p{N}])/giu, 'số điện thoại'],

    // Financial / Account
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

    // Administrative / Authority
    [/(?<![\p{L}\p{N}])dvc(?![\p{L}\p{N}])/giu, 'dịch vụ công'],
    [/(?<![\p{L}\p{N}])bca(?![\p{L}\p{N}])/giu, 'Bộ Công An'],
    [/(?<![\p{L}\p{N}])vneid(?![\p{L}\p{N}])/giu, 'VNeID'],

    // Common SMS conversational words
    // 'k' preceded by digits is thousand ([MONEY]), NOT 'không'!
    // E.g. '500k' -> preserve!
    [/(?<![\p{N}]\s*)(?<![\p{L}\p{N}])(ko|k|kh|khong|hổng)(?![\p{L}\p{N}])(?!\s*k\b)/giu, 'không'],
    [/(?<![\p{L}\p{N}])(dc|đc)(?![\p{L}\p{N}])/giu, 'được'],
    // Single letter pronouns when clearly standalone
    [/(?<![\p{L}\p{N}])ng(?![\p{L}\p{N}])/giu, 'người'],
  ];

  for (const [regex, replacement] of slangReplacements) {
    result = result.replace(regex, replacement);
  }

  // Step 9: Final Placeholder Preservation Assertion
  const finalPlaceholders = result.match(/\[(MONEY|NUMBER|TIME)\]/g) || [];
  if (originalPlaceholders.length !== finalPlaceholders.length) {
    throw new Error(`CRITICAL INTEGRITY FAILURE: Placeholders altered! Expected ${originalPlaceholders.length}, got ${finalPlaceholders.length}`);
  }

  return {
    cleanedText: result,
    evasionFlags: [...new Set(evasionDetected)],
  };
}

// Test Suite
const testCases = [
  {
    name: 'Zero-width & Hangul filler attack',
    input: 'c\u200Bo\u200Bn\u200Bg\u200B \u200Ba\u200Bn \u3164b\uFFA0a\u00ADn\u202Ek yêu cầu chuyển [MONEY]',
    expectedSubstring: 'cong an bank yêu cầu chuyển [MONEY]',
  },
  {
    name: 'Mathematical monospace typewriter font',
    input: 'Truy cập 𝚔𝚢𝚑𝚐𝚜𝚕𝚟𝚊𝚘 để nhận [MONEY]',
    expectedSubstring: 'Truy cập kyhgslvao để nhận [MONEY]',
  },
  {
    name: 'Character stuttering & alternating case',
    input: 'NhHậẬnNLLLuUôônnNNN [MONEY] trước 16h',
    expectedSubstring: 'NhậnLuôn [MONEY] trước 16h',
  },
  {
    name: 'Vietnamese natural double vowel preservation (xoong)',
    input: 'Cái xoong này giá [MONEY]',
    expectedSubstring: 'Cái xoong này giá [MONEY]',
  },
  {
    name: 'Spaced-out broken URL reconstruction',
    input: 'Truy cập http : // techcom-rewards-vn .com .vn để cập nhật cccd',
    expectedSubstring: 'http://techcom-rewards-vn.com.vn để cập nhật căn cước công dân',
  },
  {
    name: 'Telex typo repair & Slang normalization',
    input: 'ddang nhap tk vneid va nhap mk de xacthuc, neu k se bi khoa',
    expectedSubstring: 'đang nhap tài khoản VNeID va nhap mật khẩu de xác thực, neu không se bi khoa',
  },
  {
    name: 'Money suffix k preservation vs slang k',
    input: 'ck 500k qua stk 12345678, em k biet',
    expectedSubstring: 'chuyển khoản 500k qua số tài khoản 12345678, em không biet',
  },
  {
    name: 'Placeholders intact guarantee',
    input: 'Số tiền [MONEY] vào lúc [TIME] mã số [NUMBER]',
    expectedSubstring: 'Số tiền [MONEY] vào lúc [TIME] mã số [NUMBER]',
  },
];

console.log('--- RUNNING TEST SUITE ---');
let allPass = true;
testCases.forEach((tc, idx) => {
  const output = preprocessDenoise(tc.input);
  console.log(`Test ${idx + 1}: ${tc.name}`);
  console.log(`  Input:    "${tc.input}"`);
  console.log(`  Output:   "${output.cleanedText}"`);
  console.log(`  Evasions: [${output.evasionFlags.join(', ')}]`);
  const pass = output.cleanedText.includes(tc.expectedSubstring);
  console.log(`  Status:   ${pass ? 'PASS' : 'FAIL'}\n`);
  if (!pass) allPass = false;
});
console.log('All tests passed?', allPass);
