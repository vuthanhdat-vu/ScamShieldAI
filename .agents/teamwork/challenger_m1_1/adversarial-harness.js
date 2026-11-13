const path = require('node:path');
const { PaddleTesseractOcrProvider } = require('../../BE_codex/dist/ocr/paddle-tesseract-ocr.provider');
const { OcrService } = require('../../BE_codex/dist/ocr/ocr.service');

const results = {
  passed: 0,
  failed: 0,
  findings: [],
  details: {}
};

function recordTest(suite, testName, passed, details = {}) {
  if (!results.details[suite]) {
    results.details[suite] = [];
  }
  const entry = { testName, passed, details };
  results.details[suite].push(entry);
  if (passed) {
    results.passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    results.failed++;
    console.log(`  [FAIL] ${testName}`, details);
    results.findings.push({ suite, testName, details });
  }
}

const paddle = new PaddleTesseractOcrProvider();
const fakeEngine = { processImages: async () => ({ turns: [], fullTranscript: '', imageCount: 0 }) };
const fakeMetadata = { processImages: async () => ({ turns: [], fullTranscript: '', imageCount: 0 }) };
const ocrService = new OcrService(fakeEngine, fakeMetadata);

console.log('=== STARTING ADVERSARIAL STRESS HARNESS ===\n');

// -------------------------------------------------------------
// 1. Boundary Value Testing on UI Geometry Filtering
// -------------------------------------------------------------
console.log('--- 1. Boundary Value Testing: UI Geometry & Size Filtering ---');
const H = 1000;
// Cutoffs: yHeaderCutoff = Math.floor(0.082 * 1000) = 82
// Cutoffs: yFooterCutoff = Math.floor(0.915 * 1000) = 915

// Test 1.1: ymin = 82px (exact boundary) -> should PASS
const boxY82 = [100, 82, 300, 200];
const resY82 = paddle.filterSystemBars([boxY82], H);
recordTest('1. Geometry Filtering', 'ymin = 82px (exact header cutoff) should be retained', resY82.length === 1, { output: resY82 });

// Test 1.2: ymin = 81px (1px below boundary) -> should be EXCLUDED
const boxY81 = [100, 81, 300, 200];
const resY81 = paddle.filterSystemBars([boxY81], H);
recordTest('1. Geometry Filtering', 'ymin = 81px (inside header band) should be excluded', resY81.length === 0, { output: resY81 });

// Test 1.3: ymax = 915px (exact footer cutoff) -> should PASS
const boxY915 = [100, 800, 300, 915];
const resY915 = paddle.filterSystemBars([boxY915], H);
recordTest('1. Geometry Filtering', 'ymax = 915px (exact footer cutoff) should be retained', resY915.length === 1, { output: resY915 });

// Test 1.4: ymax = 916px (1px into footer band) -> should be EXCLUDED
const boxY916 = [100, 800, 300, 916];
const resY916 = paddle.filterSystemBars([boxY916], H);
recordTest('1. Geometry Filtering', 'ymax = 916px (inside footer band) should be excluded', resY916.length === 0, { output: resY916 });

// Test 1.5: Box dimensions: width=10, height=8 (exact threshold) -> PASS
const boxExactSize = [100, 100, 110, 108]; // w=10, h=8
const resExactSize = paddle.filterSystemBars([boxExactSize], H);
recordTest('1. Geometry Filtering', 'width=10, height=8 (exact size threshold) should be retained', resExactSize.length === 1, { output: resExactSize });

// Test 1.6: Box dimensions: width=9, height=8 -> EXCLUDE
const boxW9 = [100, 100, 109, 108]; // w=9, h=8
const resW9 = paddle.filterSystemBars([boxW9], H);
recordTest('1. Geometry Filtering', 'width=9, height=8 should be excluded', resW9.length === 0, { output: resW9 });

// Test 1.7: Box dimensions: width=10, height=7 -> EXCLUDE
const boxH7 = [100, 100, 110, 107]; // w=10, h=7
const resH7 = paddle.filterSystemBars([boxH7], H);
recordTest('1. Geometry Filtering', 'width=10, height=7 should be excluded', resH7.length === 0, { output: resH7 });

// Test 1.8: Inverted coordinates: xmin > xmax or ymin > ymax
const boxInverted = [200, 200, 100, 100]; // w=-100, h=-100
const resInverted = paddle.filterSystemBars([boxInverted], H);
recordTest('1. Geometry Filtering', 'Inverted coordinates (negative w/h) should be excluded', resInverted.length === 0, { output: resInverted });

// Test 1.9: Negative coordinates: [-50, -20, 100, 200]
const boxNegative = [-50, -20, 100, 200]; // ymin = -20 < 82
const resNegative = paddle.filterSystemBars([boxNegative], H);
recordTest('1. Geometry Filtering', 'Negative ymin should be excluded', resNegative.length === 0, { output: resNegative });


// -------------------------------------------------------------
// 2. Box Merging Stress Testing
// -------------------------------------------------------------
console.log('\n--- 2. Box Merging Stress Testing ---');
// Test 2.1: Horizontal gap = 35px (exact threshold) -> MERGED
const boxM1 = [100, 200, 200, 250];
const boxM2 = [235, 200, 350, 250]; // gap = 235 - 200 = 35px
const resGap35 = paddle.mergeHorizontalBoxes([boxM1, boxM2], 1000);
recordTest('2. Box Merging', 'Horizontal gap exactly 35px should be merged into 1 box', resGap35.length === 1 && resGap35[0][0] === 100 && resGap35[0][2] === 350, { output: resGap35 });

// Test 2.2: Horizontal gap = 36px (1px above threshold) -> NOT MERGED
const boxM3 = [236, 200, 350, 250]; // gap = 236 - 200 = 36px
const resGap36 = paddle.mergeHorizontalBoxes([boxM1, boxM3], 1000);
recordTest('2. Box Merging', 'Horizontal gap exactly 36px should NOT be merged (2 boxes)', resGap36.length === 2, { output: resGap36 });

// Test 2.3: Overlapping horizontal boxes (negative gap, e.g. b[0] = 190, curr[2] = 200, gap = -10px) -> MERGED
const boxOverlapH = [190, 200, 300, 250];
const resOverlapH = paddle.mergeHorizontalBoxes([boxM1, boxOverlapH], 1000);
recordTest('2. Box Merging', 'Horizontally overlapping boxes (gap = -10px) should be merged', resOverlapH.length === 1 && resOverlapH[0][0] === 100 && resOverlapH[0][2] === 300, { output: resOverlapH });

// Test 2.4: Vertical overlap when ydiff > 10px.
// ref = [100, 100, 200, 200] (h = 100)
// b1 has ydiff = 40 (> 10px).
// b1 = [220, 140, 320, 240] (ymin = 140, ymax = 240, h = 100).
// yOverlap = min(200, 240) - max(100, 140) = 200 - 140 = 60px.
// minH = 100px. 60px > 0.5 * 100 (60% overlap > 50%) -> should be grouped on same line and merged!
const boxLine1A = [100, 100, 200, 200];
const boxLine1B = [220, 140, 320, 240]; // overlap 60px (60%), gap = 20px
const resOverlap60 = paddle.mergeHorizontalBoxes([boxLine1A, boxLine1B], 1000);
recordTest('2. Box Merging', 'Vertical overlap 60% (> 50%) with ydiff > 10 should merge', resOverlap60.length === 1, { output: resOverlap60 });

// Test 2.5: Vertical overlap exact 50% vs 49% when ydiff > 10px:
// bExact50 = [220, 150, 320, 250] -> overlap = 200 - 150 = 50px. 50 > 0.5 * 100 is 50 > 50 which is FALSE!
// Notice code has: yOverlap > 0.5 * minH. Strict inequality!
const boxLine1Exact50 = [220, 150, 320, 250]; // overlap = 50px = exactly 50%
const resExact50 = paddle.mergeHorizontalBoxes([boxLine1A, boxLine1Exact50], 1000);
// It should not group into same line because yOverlap is not strictly > 50, and |150-100| = 50 > 10.
recordTest('2. Box Merging', 'Vertical overlap exactly 50% (strict >) with ydiff > 10 should NOT group into same line', resExact50.length === 2, { output: resExact50 });

// Test 2.6: Vertical overlap 51% (51px):
const boxLine1_51 = [220, 149, 320, 249]; // overlap = 200 - 149 = 51px > 50
const res51 = paddle.mergeHorizontalBoxes([boxLine1A, boxLine1_51], 1000);
recordTest('2. Box Merging', 'Vertical overlap 51% (> 50%) with ydiff > 10 SHOULD group into same line and merge', res51.length === 1, { output: res51 });

// Test 2.7: Negative coordinates in box merging:
const boxNegA = [-100, 100, -20, 150];
const boxNegB = [-10, 100, 50, 150]; // gap = -10 - (-20) = 10px <= 35
const resNegMerge = paddle.mergeHorizontalBoxes([boxNegA, boxNegB], 1000);
recordTest('2. Box Merging', 'Boxes with negative coordinates and gap=10px should merge properly', resNegMerge.length === 1 && resNegMerge[0][0] === -100 && resNegMerge[0][2] === 50, { output: resNegMerge });

// Test 2.8: Chain of 5 boxes on same line within 35px gaps:
const chain = [
  [0, 100, 50, 140],
  [60, 100, 110, 140], // gap 10
  [130, 100, 180, 140], // gap 20
  [210, 100, 260, 140], // gap 30
  [290, 100, 350, 140]  // gap 30
];
const resChain = paddle.mergeHorizontalBoxes(chain, 1000);
recordTest('2. Box Merging', 'Chain of 5 adjacent boxes within 35px should merge into single 0..350 box', resChain.length === 1 && resChain[0][0] === 0 && resChain[0][2] === 350, { output: resChain });


// -------------------------------------------------------------
// 3. Reading Order Sorting Stress Testing
// -------------------------------------------------------------
console.log('\n--- 3. Reading Order Sorting Stress Testing ---');
// Test 3.1: Multiple boxes with identical y coordinates:
// Boxes at y=200: x=600, x=100, x=350
const bSameY1 = [600, 200, 750, 240];
const bSameY2 = [100, 200, 250, 240];
const bSameY3 = [350, 200, 500, 240];
const resSameY = paddle.sortReadingOrder([bSameY1, bSameY2, bSameY3], 1000);
recordTest('3. Reading Order', 'Identical y coordinates sorted strictly left-to-right (100, 350, 600)',
  resSameY.length === 3 && resSameY[0][0] === 100 && resSameY[1][0] === 350 && resSameY[2][0] === 600,
  { output: resSameY }
);

// Test 3.2: Zig-zag arrangement across 2 lines:
// Line 1: (100, 100), (500, 100)
// Line 2: (100, 200), (500, 200)
// Input scrambled: Line 2 right, Line 1 right, Line 2 left, Line 1 left
const zL1R = [500, 100, 700, 140];
const zL1L = [100, 100, 300, 140];
const zL2R = [500, 200, 700, 240];
const zL2L = [100, 200, 300, 240];
const resZigZag = paddle.sortReadingOrder([zL2R, zL1R, zL2L, zL1L], 1000);
recordTest('3. Reading Order', 'Zig-zag arrangement correctly sorted line-by-line then left-to-right',
  resZigZag[0][0] === 100 && resZigZag[0][1] === 100 &&
  resZigZag[1][0] === 500 && resZigZag[1][1] === 100 &&
  resZigZag[2][0] === 100 && resZigZag[2][1] === 200 &&
  resZigZag[3][0] === 500 && resZigZag[3][1] === 200,
  { output: resZigZag }
);

// Test 3.3: Staircase drift challenge:
// What happens if every box is 8px lower than previous?
// Threshold for H=1000 is max(12, floor(8)) = 12px.
// If box 1 is y=100, box 2 is y=108, box 3 is y=116, box 4 is y=124, box 5 is y=132, box 6 is y=140...
// Box i has diff 8px from box i-1 (<= 12px).
// Does the algorithm chain ALL boxes across 100px+ height into one line and sort by x?
const driftBoxes = [
  [800, 100, 900, 130],
  [600, 108, 700, 138],
  [400, 116, 500, 146],
  [200, 124, 300, 154],
  [50,  132, 150, 162],
];
const resDrift = paddle.sortReadingOrder(driftBoxes, 1000);
// Because each adjacent diff is 8 <= 12, currentLine keeps appending!
// Then sorted by x! So [50, 132], [200, 124], [400, 116], [600, 108], [800, 100].
// Let's observe this behavior.
recordTest('3. Reading Order', 'Drift chain (steps <= 12px) grouped into single line and sorted by x',
  resDrift[0][0] === 50 && resDrift[4][0] === 800,
  { output: resDrift.map(b => ({ x: b[0], y: b[1] })) }
);


// -------------------------------------------------------------
// 4. Speaker Attribution Stress Testing
// -------------------------------------------------------------
console.log('\n--- 4. Speaker Attribution Stress Testing ---');
const W = 1000;

// Test 4.1: Centered chip at exact 15% center deviation:
// Center = 500. Deviation = 15% * 1000 = 150px.
// xCenter = 500 - 150 = 350.
// Let width = 200 (< 600).
// xmin = 350 - 100 = 250. xmax = 350 + 100 = 450.
// leftDist = 250 > 180, rightDist = 1000 - 450 = 550 > 180.
// Condition: Math.abs(350 - 500) = 150 <= 0.15 * 1000 (150 <= 150) -> TRUE!
const chipExact15 = [250, 100, 450, 140];
const spkExact15 = paddle.classifySpeaker(chipExact15, W);
recordTest('4. Speaker Attribution', 'Centered box at exact 15% deviation should be "system"', spkExact15 === 'system', { speaker: spkExact15 });

// Test 4.2: Box at 15.1% center deviation:
// xCenter = 500 - 151 = 349.
// xmin = 249, xmax = 449.
// Math.abs(349 - 500) = 151 > 150 -> FAILS system check!
// Next: rightDist = 551 (not < 100).
// leftDist = 249 (not < 180).
// Fallback: leftDist (249) < rightDist (551) -> 'peer'!
const chipDev151 = [249, 100, 449, 140];
const spkDev151 = paddle.classifySpeaker(chipDev151, W);
recordTest('4. Speaker Attribution', 'Box at 15.1% deviation should fail system check and fallback to "peer"', spkDev151 === 'peer', { speaker: spkDev151 });

// Test 4.3: Right margin at exact 10% (rightDist = 100px):
// User check condition: rightDist < 0.10 * W (rightDist < 100).
// If rightDist is EXACTLY 100: xmax = 900.
// Let leftDist = 500 (> 150). box = [500, 100, 900, 150].
// rightDist = 100. Is 100 < 100? FALSE!
// Does it match peer? leftDist (500) < 180 is FALSE.
// Goes to fallback: leftDist < rightDist ? 500 < 100 (false) -> 'user'!
const userExact10 = [500, 100, 900, 150];
const spkExact10 = paddle.classifySpeaker(userExact10, W);
recordTest('4. Speaker Attribution', 'Right margin at exact 10% (100px) falls through to fallback "user"', spkExact10 === 'user', { speaker: spkExact10 });

// Test 4.4: Right margin at 9.9% (rightDist = 99px):
// rightDist < 100 is TRUE, leftDist = 500 > 150 is TRUE -> 'user' via primary rule!
const user99 = [500, 100, 901, 150];
const spk99 = paddle.classifySpeaker(user99, W);
recordTest('4. Speaker Attribution', 'Right margin at 99px (< 10%) matches primary rule "user"', spk99 === 'user', { speaker: spk99 });

// Test 4.5: Left margin at exact 18% (leftDist = 180px):
// Peer check condition: leftDist < 0.18 * W (leftDist < 180) && rightDist > 120.
// If leftDist is EXACTLY 180: xmin = 180.
// Let xmax = 600, so rightDist = 400 (> 120).
// leftDist < 180 is 180 < 180 which is FALSE!
// Does it match system? center = 390. deviation = 110 <= 150. width = 420 < 600.
// leftDist > 180: 180 > 180 is FALSE! So system check is FALSE!
// Does it match user? rightDist = 400 (not < 100).
// Fallback: leftDist (180) < rightDist (400) -> 'peer'!
const peerExact18 = [180, 100, 600, 150];
const spkExact18 = paddle.classifySpeaker(peerExact18, W);
recordTest('4. Speaker Attribution', 'Left margin at exact 18% (180px) falls through to fallback "peer"', spkExact18 === 'peer', { speaker: spkExact18 });

// Test 4.6: Left margin at 17.9% (leftDist = 179px):
// leftDist = 179 < 180 is TRUE, rightDist = 400 > 120 is TRUE -> 'peer' via primary rule!
const peer179 = [179, 100, 600, 150];
const spk179 = paddle.classifySpeaker(peer179, W);
recordTest('4. Speaker Attribution', 'Left margin at 179px (< 18%) matches primary rule "peer"', spk179 === 'peer', { speaker: spk179 });

// Test 4.7: Perfectly symmetric box centered with margins = 100px (not system because margins not > 180):
// box = [100, 100, 900, 150]. leftDist = 100, rightDist = 100.
// leftDist < rightDist is 100 < 100 (false) -> returns 'user'!
const symmetricBox = [100, 100, 900, 150];
const spkSymmetric = paddle.classifySpeaker(symmetricBox, W);
recordTest('4. Speaker Attribution', 'Symmetric box (leftDist === rightDist) falls to "user"', spkSymmetric === 'user', { speaker: spkSymmetric });


// -------------------------------------------------------------
// 5. Levenshtein Multi-Shot Stitching Stress Testing
// -------------------------------------------------------------
console.log('\n--- 5. Levenshtein Multi-Shot Stitching Stress Testing ---');

// Test 5.1: calculateCer with 0-length strings
const cerEmptyEmpty = ocrService.calculateCer('', '');
recordTest('5. Levenshtein & Stitching', 'CER of two empty strings is 0', cerEmptyEmpty === 0, { cer: cerEmptyEmpty });

const cerEmptyNonEmpty = ocrService.calculateCer('', 'abc');
recordTest('5. Levenshtein & Stitching', 'CER of empty and non-empty string is 1', cerEmptyNonEmpty === 1, { cer: cerEmptyNonEmpty });

const cerNonEmptyEmpty = ocrService.calculateCer('abc', '');
recordTest('5. Levenshtein & Stitching', 'CER of non-empty and empty string is 1', cerNonEmptyEmpty === 1, { cer: cerNonEmptyEmpty });

// Test 5.2: CER threshold at exactly 0.18 vs 0.19
// Construct string length 100:
// sBase: 100 'a's
// s18Diff: 18 'x's + 82 'a's -> Levenshtein distance = 18, CER = 18 / 100 = 0.1800
const sBase = 'a'.repeat(100);
const s18Diff = 'x'.repeat(18) + 'a'.repeat(82);
const cer18 = ocrService.calculateCer(sBase, s18Diff);
recordTest('5. Levenshtein & Stitching', 'CER of 18/100 diffs is exactly 0.18', Math.abs(cer18 - 0.18) < 1e-6, { cer: cer18 });

// s19Diff: 19 'x's + 81 'a's -> Levenshtein distance = 19, CER = 19 / 100 = 0.1900
const s19Diff = 'x'.repeat(19) + 'a'.repeat(81);
const cer19 = ocrService.calculateCer(sBase, s19Diff);
recordTest('5. Levenshtein & Stitching', 'CER of 19/100 diffs is exactly 0.19', Math.abs(cer19 - 0.19) < 1e-6, { cer: cer19 });

// Test 5.3: Deduplication with CER = 0.18 (should deduplicate)
const turnsCer18 = [
  { speaker: 'peer', text: sBase, imageIndex: 0, confidence: 0.9 },
  { speaker: 'peer', text: s18Diff, imageIndex: 1, confidence: 0.9 },
  { speaker: 'peer', text: 'Novel turn after overlap', imageIndex: 1, confidence: 0.9 }
];
const stitchedCer18 = ocrService.stitchMultiShotTurns(turnsCer18);
recordTest('5. Levenshtein & Stitching', 'Turns with CER <= 0.18 deduplicated across shots', stitchedCer18.length === 2 && stitchedCer18[1].text === 'Novel turn after overlap', { length: stitchedCer18.length });

// Test 5.4: Non-deduplication with CER = 0.19 (should retain as novel turn)
const turnsCer19 = [
  { speaker: 'peer', text: sBase, imageIndex: 0, confidence: 0.9 },
  { speaker: 'peer', text: s19Diff, imageIndex: 1, confidence: 0.9 },
  { speaker: 'peer', text: 'Novel turn after overlap', imageIndex: 1, confidence: 0.9 }
];
const stitchedCer19 = ocrService.stitchMultiShotTurns(turnsCer19);
recordTest('5. Levenshtein & Stitching', 'Turns with CER = 0.19 (> 0.18) treated as novel turns', stitchedCer19.length === 3, { length: stitchedCer19.length });

// Test 5.5: Strings with identical substrings:
// Scenario A: Viewport truncated turn repair:
// Shot 0: "Chuyển tiền vào stk" (truncated)
// Shot 1: "Chuyển tiền vào stk 1903456789" (full text)
const turnsTruncatedRepair = [
  { speaker: 'peer', text: 'Chuyển tiền vào stk', imageIndex: 0, confidence: 0.8 },
  { speaker: 'peer', text: 'Chuyển tiền vào stk 1903456789', imageIndex: 1, confidence: 0.95 },
  { speaker: 'user', text: 'Đã nhận', imageIndex: 1, confidence: 0.9 }
];
const stitchedTruncated = ocrService.stitchMultiShotTurns(turnsTruncatedRepair);
recordTest('5. Levenshtein & Stitching', 'Truncated turn repaired with longer text and updated in place',
  stitchedTruncated.length === 2 && stitchedTruncated[0].text === 'Chuyển tiền vào stk 1903456789',
  { turns: stitchedTruncated.map(t => t.text) }
);

// Scenario B: Shot 1 has full text, Shot 2 has bottom truncated fragment:
// Shot 0: "Chuyển tiền vào stk 1903456789" (full text)
// Shot 1: "1903456789" (fragment visible at top of screenshot)
// existingTurn.text.includes(newTurn.text) -> should drop fragment!
const turnsFragmentDrop = [
  { speaker: 'peer', text: 'Chuyển tiền vào stk 1903456789', imageIndex: 0, confidence: 0.95 },
  { speaker: 'peer', text: '1903456789', imageIndex: 1, confidence: 0.8 }, // fragment
  { speaker: 'user', text: 'Tôi đã chuyển rồi', imageIndex: 1, confidence: 0.9 }
];
const stitchedFragment = ocrService.stitchMultiShotTurns(turnsFragmentDrop);
recordTest('5. Levenshtein & Stitching', 'Fragment substring of existing turn dropped as duplicate',
  stitchedFragment.length === 2 && stitchedFragment[0].text === 'Chuyển tiền vào stk 1903456789' && stitchedFragment[1].text === 'Tôi đã chuyển rồi',
  { turns: stitchedFragment.map(t => t.text) }
);

// Scenario C: Novel short turn that happens to be a substring of prior long turn:
// Shot 0: Turn 1 (peer): "Công việc online nhập liệu tại nhà lương cao"
//         Turn 2 (user): "Tôi muốn tham gia"
// Shot 1: Turn 1 (user): "Tôi muốn tham gia" (overlap)
//         Turn 2 (peer): "nhập liệu" (novel short turn)
// Does the algorithm keep "nhập liệu"?
// Notice: for Turn 2 of Shot 1, Turn 1 was overlap, so k=1 is novel because it compares with lookback!
// In lookback: last turns of fullConversation are Turn 1 (peer: "Công việc...") and Turn 2 (user: "Tôi muốn tham gia").
// When k=1 ("nhập liệu", peer), existingTurn with speaker === 'peer' is Turn 1 ("Công việc online nhập liệu...")!
// "Công việc online nhập liệu...".includes("nhập liệu") is TRUE!
// Will "nhập liệu" be considered duplicate and DROPPED?!
const turnsSubstringTrap = [
  { speaker: 'peer', text: 'Công việc online nhập liệu tại nhà lương cao', imageIndex: 0, confidence: 0.9 },
  { speaker: 'user', text: 'Tôi muốn tham gia', imageIndex: 0, confidence: 0.9 },
  // Shot 1
  { speaker: 'user', text: 'Tôi muốn tham gia', imageIndex: 1, confidence: 0.9 }, // overlap duplicate
  { speaker: 'peer', text: 'nhập liệu', imageIndex: 1, confidence: 0.95 }, // novel short turn
  { speaker: 'peer', text: 'Cần nạp phí 200k', imageIndex: 1, confidence: 0.9 }
];
const stitchedTrap = ocrService.stitchMultiShotTurns(turnsSubstringTrap);
console.log('Stitched Trap Result:', stitchedTrap.map(t => `${t.speaker}: ${t.text}`));
const trapDropped = !stitchedTrap.some(t => t.text === 'nhập liệu');
recordTest('5. Levenshtein & Stitching',
  'CRITICAL CHECK: Does existingTurn.includes(newTurn) incorrectly drop novel short word "nhập liệu"?',
  !trapDropped, // We want it NOT dropped!
  { trapDropped, turns: stitchedTrap.map(t => `${t.speaker}: ${t.text}`) }
);

// Test 5.6: Lookback boundary (> 3 turns)
// When overlap occurs beyond 3 turns ago, it won't be seen by lookback
const turnsLookback = [
  { speaker: 'peer', text: 'Turn 1', imageIndex: 0, confidence: 0.9 },
  { speaker: 'user', text: 'Turn 2', imageIndex: 0, confidence: 0.9 },
  { speaker: 'peer', text: 'Turn 3', imageIndex: 0, confidence: 0.9 },
  { speaker: 'user', text: 'Turn 4', imageIndex: 0, confidence: 0.9 },
  // Shot 1 has Turn 1 repeated (index 0, which is > 3 turns behind end of shot 0)
  { speaker: 'peer', text: 'Turn 1', imageIndex: 1, confidence: 0.9 },
  { speaker: 'user', text: 'Turn 5', imageIndex: 1, confidence: 0.9 }
];
const stitchedLookback = ocrService.stitchMultiShotTurns(turnsLookback);
recordTest('5. Levenshtein & Stitching', 'Lookback window bounded to last 3 turns (older identical turns in shot 1 are treated as novel)',
  stitchedLookback.length === 6,
  { length: stitchedLookback.length }
);

// Test 5.7: Empty or single-shot input
const emptyResult = ocrService.stitchMultiShotTurns([]);
recordTest('5. Levenshtein & Stitching', 'Empty turns returns empty array', emptyResult.length === 0);

const singleShot = [{ speaker: 'peer', text: 'Hello', imageIndex: 0, confidence: 1 }];
const singleResult = ocrService.stitchMultiShotTurns(singleShot);
recordTest('5. Levenshtein & Stitching', 'Single turn returns identical array', singleResult.length === 1 && singleResult[0].text === 'Hello');

console.log('\n=== ADVERSARIAL STRESS HARNESS SUMMARY ===');
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Findings count: ${results.findings.length}`);
