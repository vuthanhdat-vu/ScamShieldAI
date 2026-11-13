import os
import json

recycle_user = r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001"
source_files = [
    os.path.join(recycle_user, "$RZHVDC4", "core.json"),  # Từ thiện (5)
    os.path.join(recycle_user, "$RE8HT4Y", "core.json"),  # Tiền ảo (3)
    os.path.join(recycle_user, "$R8GJX7X", "core.json"),  # Đặt bàn ăn (10)
    os.path.join(recycle_user, "$ROWKDB9", "core.json"),  # Đặt phòng (10)
    os.path.join(recycle_user, "$RCTS04X", "core.json"),  # CCCD (10)
]

all_source_convs = []
for p in source_files:
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
        all_source_convs.extend(data)

print(f"Total source convs in Recycle Bin: {len(all_source_convs)}")

merged_path = r"data_demo\conservations.json"
with open(merged_path, "r", encoding="utf-8") as f:
    merged_data = json.load(f)

print(f"Total merged convs in conservations.json: {len(merged_data)}")

assert len(all_source_convs) == len(merged_data) == 38

mismatches = 0
for idx in range(38):
    src = all_source_convs[idx]
    mrg = merged_data[idx]
    
    assert mrg["id"] == idx + 1
    src_diag = src["dialogue"]
    mrg_diag = mrg["dialogue"]
    
    if len(src_diag) != len(mrg_diag):
        print(f"Turn count mismatch at conv {idx+1}: src={len(src_diag)}, mrg={len(mrg_diag)}")
        mismatches += 1
        continue
        
    for t_idx in range(len(src_diag)):
        st = src_diag[t_idx]
        mt = mrg_diag[t_idx]
        if st["role"] != mt["role"] or st["content"] != mt["content"]:
            print(f"Turn mismatch at conv {idx+1}, turn {t_idx}")
            mismatches += 1

if mismatches == 0:
    print("FIDELITY 100%: conservations.json is a genuine, perfect transformation of source core.json files!")
else:
    print(f"FAIL: {mismatches} mismatches found!")
