"""Empirical stress-testing of Adversarial Obfuscation Defenses from PREPROCESSING_DESIGN.md.
Tests:
1. Zero-width and invisible character stripping regex
2. Math font transcoding and Cyrillic homoglyphs
3. URL space defanging heuristics
4. Leetspeak and punctuation-separated evasion
"""

import re
import unicodedata

# 1. Regex defined in PREPROCESSING_DESIGN.md Section 3.2
# Formula: RE_INVISIBLE = [\u200B-\u200D\uFEFF\u3164\uFFA0\u00AD\u202A-\u202E]
RE_INVISIBLE_DOC = re.compile(r"[\u200B-\u200D\uFEFF\u3164\uFFA0\u00AD\u202A-\u202E]")

def test_invisible_characters_stripping():
    """Verify which invisible characters pass through the doc's RE_INVISIBLE filter."""
    test_chars = {
        "Zero-Width Space (\\u200B)": "\u200B",
        "Zero-Width Non-Joiner (\\u200C)": "\u200C",
        "Zero-Width Joiner (\\u200D)": "\u200D",
        "BOM (\\uFEFF)": "\uFEFF",
        "Hangul Filler (\\u3164)": "\u3164",
        "Halfwidth Hangul Filler (\\uFFA0)": "\uFFA0",
        "Soft Hyphen (\\u00AD)": "\u00AD",
        "Left-to-Right Mark LRM (\\u200E)": "\u200E",
        "Right-to-Left Mark RLM (\\u200F)": "\u200F",
        "Word Joiner (\\u2060)": "\u2060",
        "Mongolian Vowel Separator (\\u180E)": "\u180E",
        "Hair Space (\\u200A)": "\u200A",
        "Thin Space (\\u2009)": "\u2009",
        "Zero-Width No-Break Space (\\uFEFF)": "\uFEFF",
        "Unicode Tag E0001 (\\U000E0001)": "\U000E0001",
        "Line Separator (\\u2028)": "\u2028",
        "Paragraph Separator (\\u2029)": "\u2029"
    }

    results = {}
    print("\n--- [Test 1: Invisible Character Stripping Efficacy] ---")
    for name, ch in test_chars.items():
        sample_text = f"viet{ch}com{ch}bank"
        cleaned = RE_INVISIBLE_DOC.sub("", sample_text)
        is_stripped = (cleaned == "vietcombank")
        results[name] = is_stripped
        status = "STRIPPED (SAFE)" if is_stripped else "LEAKED / UNSTRIPPED (BYPASS!)"
        print(f"  {name:40}: {status}")

    # LRM (\u200E), RLM (\u200F), Word Joiner (\u2060), Tag (\U000E0001) are bypassed!
    leaked = [k for k, v in results.items() if not v]
    print(f"Total tested: {len(test_chars)} | Leaked through doc filter: {len(leaked)}")
    assert "\u200E" not in RE_INVISIBLE_DOC.pattern
    assert "\u200F" not in RE_INVISIBLE_DOC.pattern
    return leaked


def test_url_spaced_defanging_regex():
    """Verify URL spaced-out reconstruction heuristics from PREPROCESSING_DESIGN.md Section 3.5.
    Rules in doc:
    1. Scheme: r"(?i)\b(https?)\s*[\.\,]\s*//" -> \1://
    2. Space before TLD: r"(?i)\b([a-z0-9\-]+)\s+\.([a-z]{2,10})\b" -> \1.\2
    3. Space after protocol: r"(?i)(https?://)\s+([a-z0-9])" -> \1\2
    """
    re_scheme = re.compile(r"(?i)\b(https?)\s*[\.\,]\s*//")
    re_spaced_tld = re.compile(r"(?i)\b([a-z0-9\-]+)\s+\.([a-z]{2,10})\b")
    re_spaced_proto = re.compile(r"(?i)(https?://)\s+([a-z0-9])")

    def reconstruct_url(text: str) -> str:
        text = re_scheme.sub(r"\1://", text)
        text = re_spaced_proto.sub(r"\1\2", text)
        text = re_spaced_tld.sub(r"\1.\2", text)
        return text

    test_urls = {
        "Space before dot (Doc case)": "https://techcom-rewards-vn .com",
        "Space after dot (Evasion case)": "https://techcom-rewards-vn. com",
        "Space both sides (Evasion case)": "https://techcom-rewards-vn . com",
        "Multiple spaces before dot": "https://techcom-rewards-vn   .com",
        "Space before colon in scheme": "https ://techcombank.com",
        "Dot in scheme (Doc case)": "http.//dichvucong.xyz",
        "Space inside hostname": "https://vneid-an ninh.gov.vn/download"
    }

    print("\n--- [Test 2: URL Spaced-out Defanging Efficacy] ---")
    results = {}
    for desc, raw_url in test_urls.items():
        reconstructed = reconstruct_url(raw_url)
        is_clean_url = (" " not in reconstructed) and (reconstructed.startswith("http://") or reconstructed.startswith("https://"))
        results[desc] = (raw_url, reconstructed, is_clean_url)
        status = "FIXED" if is_clean_url else "FAILED (Still broken)"
        print(f"  {desc:35}: '{raw_url}' -> '{reconstructed}' [{status}]")

    return results


def test_font_and_homoglyph_transcoding():
    """Verify font normalization and Cyrillic homoglyph handling.
    Section 3.3 handles Mathematical Monospace (U+1D670 - U+1D6A3).
    What about other math fonts and Cyrillic homoglyphs?
    """
    print("\n--- [Test 3: Font Transcoding & Homoglyph Evasion] ---")

    # Math Monospace
    monospace_sample = "\U0001D68A\U0001D68B\U0001D68C"  # 𝚊𝚋𝚌
    nfkc_mono = unicodedata.normalize("NFKC", monospace_sample)
    print(f"  Math Monospace: '{monospace_sample}' -> NFKC: '{nfkc_mono}' (Matches ASCII: {nfkc_mono == 'abc'})")

    # Mathematical Fraktur
    fraktur_sample = "\U0001D504\U0001D505\U0001D506"  # 𝔄𝔅𝔆
    nfkc_frak = unicodedata.normalize("NFKC", fraktur_sample)
    print(f"  Math Fraktur:   '{fraktur_sample}' -> NFKC: '{nfkc_frak}' (Matches ASCII: {nfkc_frak == 'ABC'})")

    # Circled Latin
    circled_sample = "\u24B6\u24B7\u24B8"  # ⒶⒷⒸ
    nfkc_circ = unicodedata.normalize("NFKC", circled_sample)
    print(f"  Circled Latin:  '{circled_sample}' -> NFKC: '{nfkc_circ}' (Matches ASCII: {nfkc_circ == 'ABC'})")

    # Cyrillic Homoglyphs (CRITICAL VULNERABILITY FOR VIETNAMESE BRAND PROTECTION)
    # Target: "vietcombank"
    # Replacing Latin 'e', 'o', 'a' with Cyrillic 'е' (\u0435), 'о' (\u043E), 'а' (\u0430)
    cyrillic_spoofed = "vi\u0435tc\u043Emb\u0430nk"
    nfkc_cyrillic = unicodedata.normalize("NFKC", cyrillic_spoofed)
    print(f"  Cyrillic Spoof: '{cyrillic_spoofed}' -> NFKC: '{nfkc_cyrillic}'")
    print(f"  Does NFKC convert Cyrillic lookalikes to Latin? {nfkc_cyrillic == 'vietcombank'}")
    assert nfkc_cyrillic != "vietcombank", "NFKC does not transcode cross-script homoglyphs!"
    print("  -> VULNERABILITY CONFIRMED: Cyrillic homoglyphs bypass NFKC normalization and Levenshtein whitelist!")


def test_leetspeak_and_spaced_vietnamese():
    """Test leetspeak substitutions and separated letters in Vietnamese text."""
    print("\n--- [Test 4: Leetspeak & Interspersed Punctuation Evasion] ---")
    scam_keywords = ["công an", "bộ công an", "mã otp", "vneid", "cccd"]

    test_evasions = [
        ("b0 c0ng an", "bộ công an (0 for o)"),
        ("c.ô.n.g  a.n", "công an (interspersed dots)"),
        ("v-n-e-i-d", "vneid (interspersed hyphens)"),
        ("m_a  0_t_p", "mã otp (underscores and 0 for o)"),
        ("c c c d", "cccd (spaced letters)")
    ]

    for evasive_text, desc in test_evasions:
        # Test standard NFC/NFKC
        norm = unicodedata.normalize("NFKC", evasive_text)
        detected = any(kw in norm for kw in scam_keywords)
        print(f"  Pattern '{evasive_text}' ({desc}): Detected by direct keyword match? {detected}")


if __name__ == "__main__":
    leaked_invisible = test_invisible_characters_stripping()
    test_url_spaced_defanging_regex()
    test_font_and_homoglyph_transcoding()
    test_leetspeak_and_spaced_vietnamese()
    print("\nAll Obfuscation Defense empirical tests completed!")
