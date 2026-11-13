import json

with open('notebooks/chat_ocr_pipeline.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

with open('.agents/teamwork/spec_miner_m1_1/notebook_dump.txt', 'w', encoding='utf-8') as out:
    for i, cell in enumerate(nb['cells']):
        out.write(f"==================== CELL {i} ({cell['cell_type']}) ====================\n")
        out.write(''.join(cell['source']))
        out.write("\n\n")

print("Dumped", len(nb['cells']), "cells successfully.")
