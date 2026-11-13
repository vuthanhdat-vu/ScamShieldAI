import os
import json
import csv
import collections
from pathlib import Path
import pandas as pd
from PIL import Image

BASE_DIR = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI")
DATA_DEMO = BASE_DIR / "data_demo"

output = {}

# ==========================================
# 1. CONVERSATIONS DEEP DIVE
# ==========================================
conv_file = DATA_DEMO / "conservations.json"
with open(conv_file, "r", encoding="utf-8") as f:
    convs = json.load(f)

# Inspect categories by searching keywords in conversations
cat_keywords = {
    "Lừa đảo từ thiện": ["từ thiện", "ủng hộ", "quyên góp", "hoàn cảnh khó khăn", "bệnh nhi", "đồng bào"],
    "Lừa đảo đầu tư tiền ảo": ["tiền ảo", "sàn", "tiền số", "lợi nhuận", "đầu tư", "chứng khoán", "lãi suất", "nạp tiền", "rút tiền"],
    "Lừa đảo đặt bàn ăn": ["bàn ăn", "nhà hàng", "tiệc", "đặt bàn", "món ăn", "bistro", "rượu vang", "báo giá"],
    "Lừa đảo đặt phòng khách sạn": ["khách sạn", "đặt phòng", "resort", "villa", "voucher", "homestay", "combo du lịch"],
    "Lừa đảo định danh cccd": ["căn cước", "cccd", "định danh", "vneid", "mức 2", "công an", "bộ công an", "phường", "cập nhật"]
}

conv_stats = []
turn_lengths_per_conv = []
for c in convs:
    cid = c["id"]
    dialogue = c["dialogue"]
    turn_lengths_per_conv.append(len(dialogue))
    all_text = " ".join(t["content"] for t in dialogue).lower()
    
    # check matched categories
    matched = []
    for cat, kws in cat_keywords.items():
        if any(kw in all_text for kw in kws):
            matched.append(cat)
    conv_stats.append({
        "id": cid,
        "turns": len(dialogue),
        "matched_cat": matched,
        "first_turn": dialogue[0],
        "roles": [t["role"] for t in dialogue]
    })

print("=== CONVERSATIONS SUMMARY ===")
print(f"Total conversations: {len(convs)}")
print(f"Turns count distribution: min={min(turn_lengths_per_conv)}, max={max(turn_lengths_per_conv)}, mean={sum(turn_lengths_per_conv)/len(turn_lengths_per_conv):.2f}")
turn_dist = collections.Counter(turn_lengths_per_conv)
print(f"Turn count frequencies: {sorted(turn_dist.items())}")

# Check role alternating pattern
alternating_count = 0
for c in convs:
    roles = [t["role"] for t in c["dialogue"]]
    alt = all(roles[i] != roles[i+1] for i in range(len(roles)-1))
    if alt:
        alternating_count += 1
print(f"Strictly alternating roles: {alternating_count}/{len(convs)}")

# Sample conversation 1 & 38
print("\n--- Sample Conv 1 (First 3 turns) ---")
for t in convs[0]["dialogue"][:3]:
    print(f"[{t['role']}]: {t['content'][:100]}...")

print("\n--- Sample Conv 38 (First 3 turns) ---")
for t in convs[-1]["dialogue"][:3]:
    print(f"[{t['role']}]: {t['content'][:100]}...")


# ==========================================
# 2. DATASET_URL_SAMPLED.CSV DEEP DIVE
# ==========================================
df_url = pd.read_csv(DATA_DEMO / "dataset_url_sampled.csv")
print("\n=== DATASET_URL_SAMPLED SUMMARY ===")
print("Channels:", dict(df_url["channel"].value_counts()))
print("Labels:", dict(df_url["label"].value_counts()))
print("Pattern Groups:", dict(df_url["pattern_group"].value_counts()))

# Inspect TLDs and protocols
def get_protocol(url):
    if "://" in url:
        return url.split("://")[0]
    return "none"

df_url["protocol"] = df_url["url_norm"].apply(get_protocol)
print("Protocol distribution:")
print(df_url.groupby(["label", "protocol"]).size())

def get_tld(url):
    domain = url.split("://")[-1].split("/")[0].split("?")[0].split(":")[0]
    parts = domain.split(".")
    if len(parts) >= 2:
        return "." + ".".join(parts[-2:]) if len(parts[-1]) <= 3 and len(parts[-2]) <= 3 else "." + parts[-1]
    return "other"

df_url["tld"] = df_url["url_norm"].apply(get_tld)
print("\nTop 10 TLDs in Phishing:")
print(df_url[df_url["label"]=="phishing"]["tld"].value_counts().head(10))
print("\nTop 10 TLDs in Benign:")
print(df_url[df_url["label"]=="benign"]["tld"].value_counts().head(10))

print("\nSample Phishing URLs:")
for u in df_url[df_url["label"]=="phishing"]["url_norm"].head(5):
    print(" ", u)

print("\nSample Benign URLs:")
for u in df_url[df_url["label"]=="benign"]["url_norm"].head(5):
    print(" ", u)


# ==========================================
# 3. SCAM.CSV DEEP DIVE
# ==========================================
df_scam = pd.read_csv(DATA_DEMO / "Scam.csv")
print("\n=== SCAM.CSV DEEP DIVE ===")
print(f"Total rows: {len(df_scam)}")

# Check multiline
with open(DATA_DEMO / "Scam.csv", "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    header = next(reader)
    scam_rows_raw = list(reader)
print(f"CSV raw rows count: {len(scam_rows_raw)} (header={header})")
multiline_scam = [r[0] for r in scam_rows_raw if "\n" in r[0]]
print(f"Multiline records with \\n: {len(multiline_scam)}")

# Linguistic characteristics and scam types
scam_type_kws = {
    "Mạo danh ngân hàng / khoá tài khoản / OTP": ["ngan hang", "ngân hàng", "vietcombank", "vcb", "techcombank", "vietinbank", "bidv", "mb bank", "mbbank", "tài khoản của bạn", "khoa tai khoan", "khóa tài khoản", "xác minh", "smart otp", "biến động"],
    "Việc làm online / Tuyển dụng / Shopee / Tiki": ["tuyển dụng", "tuyen dung", "việc làm", "online", "shopee", "tiki", "hoa hong", "hoa hồng", "nhiệm vụ", "cộng tác viên", "ctv", "thu nhập"],
    "Phạt nguội / Giao thông / Bộ Công An": ["phạt nguội", "phat nguoi", "giao thông", "vi phạm", "công an", "bộ công an", "triệu tập", "biên bản"],
    "Trúng thưởng / Quà tặng / Tri ân": ["trúng thưởng", "tri ân", "quà tặng", "may mắn", "chúc mừng", "nhận quà", "iphone"],
    "Tín dụng / Vay tiền online / Giải ngân": ["vay", "khoản vay", "giải ngân", "lãi suất thấp", "hạn mức", "duyệt vay", "cmnd/cccd"],
    "Cờ bạc / Cá cược / Game bài": ["casino", "tài xỉu", "đặt cược", "nhà cái", "khuyến mãi nạp", "game bài", "nổ hũ"]
}

scam_type_counts = collections.defaultdict(int)
for r in scam_rows_raw:
    txt = r[0].lower()
    for stype, kws in scam_type_kws.items():
        if any(kw in txt for kw in kws):
            scam_type_counts[stype] += 1

print("\nScam types frequency (overlap possible):")
for st, cnt in sorted(scam_type_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {st}: {cnt} ({cnt/len(scam_rows_raw)*100:.1f}%)")

# Obfuscation examples
obfuscation_samples = []
for r in scam_rows_raw:
    txt = r[0]
    if any(c in txt for c in ["k.h.o.a", "v.n", ".com", "zalo.me", "t.me", "bit.ly", "0x"]) or any(char in txt for char in ["..", "--", "__", "  "]):
        if any(w in txt.lower() for w in ["v.c.b", "v-c-b", "b.i.d.v", "k-h-o-a", "x-a-c", "t.e.l.e"]):
            obfuscation_samples.append(txt)

print(f"\nObfuscation samples found: {len(obfuscation_samples)}")
for s in obfuscation_samples[:5]:
    print("  ->", s[:120])

print("\n5 Diverse Scam Samples:")
for i in [0, 100, 300, 700, 1200]:
    if i < len(scam_rows_raw):
        print(f"  Sample #{i}: {repr(scam_rows_raw[i][0][:120])}")


# ==========================================
# 4. NO_SCAM.CSV DEEP DIVE
# ==========================================
with open(DATA_DEMO / "No_scam.csv", "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    header_ns = next(reader)
    noscam_rows_raw = list(reader)

print("\n=== NO_SCAM.CSV DEEP DIVE ===")
print(f"Total rows: {len(noscam_rows_raw)} (header={header_ns})")
multiline_noscam = [r[0] for r in noscam_rows_raw if "\n" in r[0]]
print(f"Multiline records with \\n: {len(multiline_noscam)}")

noscam_type_kws = {
    "Mã OTP / Xác thực bảo mật": ["otp", "mã xác thực", "ma xac thuc", "ma otp", "mã bảo mật", "verification code"],
    "Biến động số dư / Ngân hàng chính thức": ["số dư", "so du", "tai khoan", "tài khoản", "giao dịch", "vnd", "vcb", "bidv", "vietinbank", "mb", "thanh toan thanh cong"],
    "Viễn thông / Cước / Nạp thẻ (Viettel, Mobi, Vina)": ["viettel", "mobifone", "vinaphone", "vietnamobile", "data", "cước", "khuyến mại", "gói cước", "4g", "5g", "nap the"],
    "Thương mại điện tử / Giao hàng / Đơn hàng": ["đơn hàng", "don hang", "giao hàng", "shopee", "lazada", "tiki", "giao thanh cong", "shipper", "tra cứu đơn hàng"],
    "Thông báo dịch vụ y tế / Học tập / Tiện ích": ["tiêm chủng", "học phí", "điện lực", "cấp nước", "học sinh", "trường", "bệnh viện"]
}

noscam_type_counts = collections.defaultdict(int)
for r in noscam_rows_raw:
    txt = r[0].lower()
    for stype, kws in noscam_type_kws.items():
        if any(kw in txt for kw in kws):
            noscam_type_counts[stype] += 1

print("\nNo_scam types frequency (overlap possible):")
for st, cnt in sorted(noscam_type_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {st}: {cnt} ({cnt/len(noscam_rows_raw)*100:.1f}%)")

print("\n5 Diverse No_scam Samples:")
for i in [0, 200, 600, 1100, 1800]:
    if i < len(noscam_rows_raw):
        print(f"  Sample #{i}: {repr(noscam_rows_raw[i][0][:120])}")


# ==========================================
# 5. IMAGES & METADATA DEEP DIVE
# ==========================================
img_dir = DATA_DEMO / "images" / "images"
meta_path = DATA_DEMO / "images" / "metadata.json"
texts_dir = DATA_DEMO / "images" / "texts"

with open(meta_path, "r", encoding="utf-8") as f:
    img_meta = json.load(f)

print("\n=== IMAGES & METADATA DEEP DIVE ===")
print(f"Total metadata records: {len(img_meta)}")
labels = collections.Counter(m["expected_label"] for m in img_meta)
print(f"Expected labels: {dict(labels)}")

# Platforms from filenames / case analysis
platforms = collections.Counter()
themes = collections.Counter()
modes = collections.Counter()

for m in img_meta:
    fn = Path(m["image_path"]).name
    # parse filename: case_xxx_label_platform_mode.ext
    parts = fn.replace(".jpg", "").replace(".png", "").split("_")
    # find platform
    for plat in ["zalo", "telegram", "messenger", "imessage", "sms"]:
        if plat in fn.lower():
            platforms[plat] += 1
            break
    if "dark" in fn.lower():
        modes["dark"] += 1
    elif "light" in fn.lower():
        modes["light"] += 1
    else:
        modes["unknown"] += 1

print(f"Platforms breakdown: {dict(platforms)}")
print(f"Theme modes (light/dark): {dict(modes)}")

# Image properties
img_files = list(img_dir.iterdir())
print(f"Images in directory: {len(img_files)}")
img_sizes = [f.stat().st_size for f in img_files]
print(f"File sizes (bytes): min={min(img_sizes)}, max={max(img_sizes)}, avg={sum(img_sizes)/len(img_sizes):.1f}")

dims = []
formats = collections.Counter()
for f in img_files:
    with Image.open(f) as im:
        dims.append(im.size)
        formats[im.format] += 1

print(f"Formats: {dict(formats)}")
dim_counts = collections.Counter(dims)
print(f"Top 5 Dimensions (W x H): {dim_counts.most_common(5)}")

# Turns in images metadata
turns_per_img = [len(m.get("turns", [])) for m in img_meta]
print(f"Turns in image conversations: min={min(turns_per_img)}, max={max(turns_per_img)}, avg={sum(turns_per_img)/len(turns_per_img):.2f}")

# Speaker breakdown in images metadata
img_speakers = collections.Counter()
for m in img_meta:
    for t in m.get("turns", []):
        img_speakers[t.get("speaker")] += 1
print(f"Speakers breakdown: {dict(img_speakers)}")

# Check correspondence between images, metadata, and texts
img_case_ids = {m["case_id"] for m in img_meta}
text_case_ids = {f.stem for f in texts_dir.iterdir() if f.suffix == ".txt"}
file_case_ids = {Path(m["image_path"]).name.split("_")[0] + "_" + Path(m["image_path"]).name.split("_")[1] for m in img_meta}
print(f"Metadata cases: {len(img_case_ids)}, Text cases: {len(text_case_ids)}, Match: {img_case_ids == text_case_ids}")
