# DISPATCH — Explorer Survey 3

## Mission
Khảo sát phân tích kiến trúc tham chiếu từ `c:\Users\leemi\Desktop (PC)\Projects\adk-recipes` và đánh giá ràng buộc phần cứng mục tiêu (CPU Core i5 + GPU NVIDIA RTX 4050 6GB VRAM) để chuẩn bị cho thiết kế Preprocessing Module và Reasoning Harness.

## Key Constraints & Instructions
- BẮT BUỘC đọc file gốc: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md`.
- TUYỆT ĐỐI KHÔNG VIẾT HOẶC CHẠY MÃ CODE (No code writing or execution). Dùng `read_file` trực tiếp.
- Thư mục làm việc: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`.
- Thư mục trạng thái của bạn: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_3`.
- Khảo sát các mẫu thiết kế và skills trong `c:\Users\leemi\Desktop (PC)\Projects\adk-recipes`:
  1. Cấu trúc ADK recipe chuẩn (manifest.yaml, pyproject.toml, agent.py, app_utils, fast_api_app.py, reasoning engine adapter).
  2. Các mẫu agentic workflow, chain-of-thought, prompt templates, tools/services integration.
- Phân tích chi tiết ràng buộc phần cứng máy chủ mục tiêu: CPU Core i5 (6-14 cores tùy thế hệ), GPU RTX 4050 Laptop/Desktop (6GB VRAM, GDDR6, ~96-bit bus):
  1. Giới hạn VRAM khả dụng (6GB): phân tích kích thước model khả thi (SLMs 3B-4B Q4/Q8, 7B/8B Q4_K_M hoặc AWQ/GPTQ, tính toán KV cache cho context 2k/4k/8k tokens, CUDA overhead ~0.8GB).
  2. Phân tích CPU RAM, CPU offloading, serving framework (vLLM, Ollama, llama.cpp, TGI, ONNX Runtime).
  3. Đánh giá thông lượng (throughput tokens/s) và độ trễ (latency P50, P95, P99) với các tác vụ phân tích lừa đảo theo thời gian thực vs batch.
  4. Đề xuất kiến trúc đa tầng (Hybrid Multi-Tier Architecture): Tier 1 (Rule-based / regex / heuristic / lightweight embedding on CPU) + Tier 2 (Quantized SLM/LLM local reasoning on RTX 4050) + Tier 3 (Optional Cloud API fallback if needed).
- Báo cáo kết quả ra `handoff.md` trong thư mục trạng thái của bạn với các bảng tính toán VRAM/RAM cụ thể và kiến trúc tham chiếu ADK rõ ràng.
