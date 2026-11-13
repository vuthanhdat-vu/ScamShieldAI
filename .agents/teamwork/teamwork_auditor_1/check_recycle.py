import os
import hashlib

recycle_user = r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001"
files = {
    "Lừa đảo đặt bàn ăn": os.path.join(recycle_user, "$R8GJX7X", "core.json"),
    "Lừa đảo định danh cccd": os.path.join(recycle_user, "$RCTS04X", "core.json"),
    "Lừa đảo đầu tư tiền ảo": os.path.join(recycle_user, "$RE8HT4Y", "core.json"),
    "Lừa đảo đặt phòng khách sạn": os.path.join(recycle_user, "$ROWKDB9", "core.json"),
    "Lừa đảo từ thiện": os.path.join(recycle_user, "$RZHVDC4", "core.json")
}
expected = {
    "Lừa đảo từ thiện": "3c562881319da340095ab453d2f1f44fef91748739b9c8fc0cd33fb3702cec54",
    "Lừa đảo đầu tư tiền ảo": "65db579fb1949c8042d791940c58ca0429e84f015c7629f42ecb662f3e1a7b01",
    "Lừa đảo đặt bàn ăn": "e34de1f97305109ac8fa05b761c122d7ac7f97d4287f832bc0a818e1a22d06a3",
    "Lừa đảo đặt phòng khách sạn": "a9990d30af433d5298ae842a2d32a6054d5dd6f99588ac2daaadce9049f69acd",
    "Lừa đảo định danh cccd": "e8ce4f69db9ac8831971daed9915a13d558554cf9a79b25ce5d05ee615230939"
}

for name, p in files.items():
    if os.path.exists(p):
        with open(p, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()
        assert h == expected[name], f"Hash mismatch for {name}: {h}"
        print(f"{name}: MATCH {h}")
    else:
        print(f"{name}: NOT FOUND at {p}")
