import json
from pathlib import Path
import collections

p = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\images\metadata.json")
with open(p, "r", encoding="utf-8") as f:
    meta = json.load(f)

print(f"Total cases in metadata.json: {len(meta)}")

label_by_platform = collections.defaultdict(lambda: collections.Counter())
themes_by_label = collections.defaultdict(lambda: collections.Counter())

for m in meta:
    cid = m["case_id"]
    lbl = m["expected_label"]
    fn = Path(m["image_path"]).name
    plat = "unknown"
    for p_name in ["zalo", "messenger", "imessage", "sms"]:
        if p_name in fn.lower():
            plat = p_name
            break
    label_by_platform[plat][lbl] += 1
    
    # check content topic
    full_text = " ".join(t["text"] for t in m.get("turns", [])).lower()
    topic = "Khác"
    if any(k in full_text for k in ["đầu tư", "lãi suất", "tiền ảo", "sinh lời", "chứng khoán"]):
        topic = "Đầu tư tài chính / Tiền ảo"
    elif any(k in full_text for k in ["đặt bàn", "nhà hàng", "bistro", "tiệc"]):
        topic = "Đặt bàn ăn / Nhà hàng"
    elif any(k in full_text for k in ["phòng", "khách sạn", "booking", "resort"]):
        topic = "Đặt phòng khách sạn"
    elif any(k in full_text for k in ["cccd", "định danh", "vneid", "công an"]):
        topic = "Mạo danh cơ quan / CCCD"
    elif any(k in full_text for k in ["otp", "mã xác thực", "ngân hàng", "tài khoản", "khoá"]):
        topic = "Ngân hàng / OTP / Cảnh báo"
    elif any(k in full_text for k in ["bạn bè", "hẹn hò", "chào", "ăn trưa", "cà phê"]):
        topic = "Trò chuyện thường ngày (Safe)"
    elif any(k in full_text for k in ["cước", "khuyến mại", "data", "nạp thẻ"]):
        topic = "Dịch vụ viễn thông"
    
    themes_by_label[lbl][topic] += 1

print("\n--- Platform vs Expected Label Matrix ---")
for plat, counts in label_by_platform.items():
    print(f"{plat:<12}: DANGER={counts['DANGER']:2d}, SUSPICIOUS={counts['SUSPICIOUS']:2d}, SAFE={counts['SAFE']:2d} | Total={sum(counts.values()):2d}")

print("\n--- Expected Label vs Topic Matrix ---")
for lbl, topics in themes_by_label.items():
    print(f"\nLabel [{lbl}]: Total={sum(topics.values())}")
    for top, cnt in topics.most_common():
        print(f"  {top:<35}: {cnt}")
