import json
from pathlib import Path

p = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\conservations.json")
with open(p, "r", encoding="utf-8") as f:
    convs = json.load(f)

print(f"Total conversations: {len(convs)}")

for c in convs:
    cid = c["id"]
    t0 = c["dialogue"][0]["content"]
    t1 = c["dialogue"][1]["content"] if len(c["dialogue"]) > 1 else ""
    turns = len(c["dialogue"])
    
    # Analyze topic
    full_text = " ".join(t["content"] for t in c["dialogue"]).lower()
    cat = "Khác"
    if any(k in full_text for k in ["từ thiện", "quyên góp", "bão lũ", "đồng bào", "miền trung", "hành trình yêu thương", "trẻ em vùng cao"]):
        cat = "Lừa đảo từ thiện"
    elif any(k in full_text for k in ["đầu tư", "tiền ảo", "chứng khoán", "lãi suất", "sàn", "tiền số", "lợi nhuận", "nạp tiền"]):
        cat = "Lừa đảo đầu tư tài chính / tiền ảo"
    elif any(k in full_text for k in ["bàn ăn", "nhà hàng", "dmaris", "tiệc", "đặt bàn", "món ăn"]):
        cat = "Lừa đảo đặt bàn ăn"
    elif any(k in full_text for k in ["khách sạn", "đặt phòng", "resort", "villa", "voucher", "combo du lịch"]):
        cat = "Lừa đảo đặt phòng khách sạn"
    elif any(k in full_text for k in ["cccd", "định danh", "vneid", "mức 2", "công an", "căn cước"]):
        cat = "Lừa đảo định danh CCCD / VNeID"
    
    print(f"ID {cid:02d} | Turns: {turns:02d} | Cat: {cat:<35} | Preview: {t0[:60]}...")
