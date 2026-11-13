# BÁO CÁO KHẢO SÁT DỮ LIỆU EDA (NON-CODING)
## Khảo sát Chuyên sâu 3 Tập Dữ liệu: `dataset_url.csv`, `full_dataset.csv`, và `sample.csv`
**Dự án**: ScamShieldAI  
**Tác nhân thực hiện**: Explorer Survey 2  
**Thư mục trạng thái**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2`  
**Phương pháp**: Khảo sát khám phá dữ liệu trực quan 100% không viết hoặc chạy mã code (Strictly Non-Coding EDA qua công cụ `read_file`).

---

## 1. OBSERVATION (Quan sát Trực tiếp & Dẫn chứng Cụ thể)

### 1.1. Tổng quan Định dạng, Kích thước và Bảng thuộc tính Kỹ thuật
Qua việc đọc và khảo sát cấu trúc vật lý của 3 file trong thư mục `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo`, các đặc tính kỹ thuật định dạng được xác định như sau:

| Tên File | Phần mở rộng | Kích thước xấp xỉ | Số dòng text | Dấu phân cách | Encoding | Cấu trúc Header / Số cột | Phân bố Nhãn (Label Distribution) |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `dataset_url.csv` | `.csv` | ~2.40 MB | 53,117 | Dấu phẩy `,` | UTF-8 / ASCII | `channel,label,url_norm` (3 cột) | • Phishing: 36,706 (69.11%)<br>• Benign: 16,410 (30.89%) |
| `full_dataset.csv` | `.csv` | ~482 KB | 4,492 | Dấu phẩy `,` | UTF-8 | `message_id,date,message,label` (4 cột) | • Benign (0): ~3,610 dòng text (~80%)<br>• Phishing (1): ~881 dòng text (~20%) |
| `sample.csv` | `.csv` | ~102 KB | 773 | Dấu phẩy `,` | UTF-8 / ASCII | `text,label` (2 cột) | • Phishing: 772 dòng (100.0%)<br>• Benign: 0 dòng (0.0%) |

---

### 1.2. Khảo sát Chuyên sâu: `dataset_url.csv`

#### A. Cấu trúc Cột và Giá trị Trường
- Header (dòng 1): `channel,label,url_norm`.
- Trường `channel`: Đa số mang giá trị `url`, tuy nhiên xuất hiện giá trị dị biệt `social` (ví dụ: dòng 1062: `social,phishing,http://nganhangfb.com`; dòng 1213: `social,phishing,http://facebook.com/107303501643290`; dòng 1214: `social,phishing,http://facebook.com/103657147872917`).
- Trường `label`: Phân loại dạng chuỗi ký tự (`phishing` hoặc `benign`).
- Trường `url_norm`: Chuỗi URL đã được chuẩn hóa sơ bộ (bỏ fragment/param phụ ở một số nguồn, nhưng ở nguồn khác vẫn giữ nguyên query string phức tạp).

#### B. Phân bố Cấu trúc & Cách thức Tổ chức Dữ liệu (Block Organization)
File không được xáo trộn ngẫu nhiên (shuffled) mà được ghép từ 3 khối (blocks) độc lập rõ rệt:
1. **Khối Phishing 1** (Dòng 2 đến dòng 2588 — gồm 2,587 dòng): Toàn bộ là nhãn `phishing`. Tập trung các URL lừa đảo nhắm vào hạ tầng dịch vụ tài chính, thương mại, chính phủ Việt Nam.
   - Dòng 2: `url,phishing,http://tiktokshopseller-vn.com`
   - Dòng 2588: `url,phishing,http://dichvuvinaphone.vn`
2. **Khối Benign** (Dòng 2589 đến dòng 18998 — gồm 16,410 dòng): Toàn bộ là nhãn `benign`.
   - Dòng 2589: `url,benign,http://mst.gov.vn`
   - Dòng 10000: `url,benign,https://sldtbxh.hanam.gov.vn`
   - Dòng 18998: `url,benign,http://flyer.vn`
3. **Khối Phishing 2** (Dòng 18999 đến dòng 53117 — gồm 34,119 dòng): Toàn bộ là nhãn `phishing`, được chia thành 2 tiểu khối:
   - *Tiểu khối 3a (Dòng 18999 đến dòng 19294)*: 296 URLs quốc tế với cấu trúc đường dẫn dài, giao diện clone, dịch vụ hosting PaaS/Serverless.
     - Dòng 18999: `url,phishing,https://divansh-chaurasiya.github.io/netflix-clone-website`
     - Dòng 19294: `url,phishing,https://divansh-chaurasiya.github.io/netflix-clone/`
   - *Tiểu khối 3b (Dòng 19295 đến dòng 53117)*: 33,823 URLs được sắp xếp theo thứ tự bảng chữ cái tuyệt đối (Alphabetical order) từ `0` đến `z`:
     - Dòng 19295: `url,phishing,http://0.watch-video.net`
     - Dòng 20000: `url,phishing,http://6665131.net`
     - Dòng 30000: `url,phishing,http://rutthetindungmpos247.com`
     - Dòng 40000: `url,phishing,http://www.ek882.com`
     - Dòng 50000: `url,phishing,http://www.vayvnq.com`
     - Dòng 53117: `url,phishing,http://zzzmmm.co`

#### C. Các Thủ đoạn Tinh vi & Đặc trưng Nhận diện Kỹ thuật của URL Lừa đảo
1. **Giao thức mạng (Protocol)**:
   - Ước tính >85% URL lừa đảo sử dụng giao thức không mã hóa `http://` (ví dụ dòng 2, 31, 38, 1208, 19295, 50000).
   - Một số URL lừa đảo tinh vi dùng `https://` thông qua chứng chỉ SSL/TLS miễn phí (Let's Encrypt, Cloudflare) hoặc hạ tầng PaaS (dòng 19001, 19004, 19102).
   - Tồn tại URL khai báo cổng tường minh: Dòng 19103: `https://121z2.catex.at:443/trs/`.
2. **Kỹ thuật Typosquatting & Giả mạo Thương hiệu (Brand Squatting)**:
   - *Ngân hàng & Fintech*: 
     - Dòng 31: `http://vietcombank.asia`
     - Dòng 509: `http://www.vcbdlgrcbonk.com` (biến dạng chữ `vcbdlgrcbonk`)
     - Dòng 536: `http://vietinbank.com.vn-uz.top`
     - Dòng 540: `http://techcombank.vn-iy.life`
     - Dòng 558: `http://www.vpbbank.com` (gấp đôi chữ `b`)
     - Dòng 564: `http://neo.vpbban.com` (thiếu chữ `k`)
     - Dòng 53102: `http://zvietcombank.com` (thêm tiền tố `z`)
     - Dòng 271: `http://vib-town.com`, dòng 282: `http://vib-solution.shop`
   - *Cơ quan Nhà nước, Chính phủ, Công an, Thuế*:
     - Dòng 4: `http://chinhphu2025.com`
     - Dòng 5: `http://dvc.bcavn.cc` (nhại Dịch vụ công Bộ Công an)
     - Dòng 53: `http://cucanninhmang24h.com`
     - Dòng 88: `http://dichvucong.xqrgov.com`
     - Dòng 199: `http://vneid.vieegovn.cc` (nhại VNeID)
     - Dòng 383: `http://gplxgovn.vn` (nhại Giấy phép lái xe)
     - Dòng 19305: `http://0084113.com` (kết hợp mã vùng quốc tế `0084` và số cảnh sát `113`)
   - *Thương mại điện tử & Vận chuyển*:
     - Dòng 21: `http://ctygiaohangtietkiemm1.com`
     - Dòng 30: `http://shopeesallers.com` (sai chính tả `sellers` thành `sallers`)
     - Dòng 54: `http://lazadass.com` (thêm chữ `s`)
     - Dòng 114: `http://viettel-post.cfd`
     - Dòng 150: `http://www.tikifreeship.cc`
   - *Thủ thuật chèn Protocol/Prefix vào Domain Name*:
     - Dòng 19141: `http://htttps-www-roblox.co/users/05754151/profile` (chèn thẳng chuỗi `htttps-www` vào hostname).
3. **Các Đuôi Tên miền (TLDs) Rủi ro cao & Đuôi Quốc gia Kém phổ biến**:
   - Tần suất áp đảo của các TLDs giá rẻ hoặc miễn phí: `.top`, `.cc`, `.xyz`, `.vip`, `.site`, `.shop`, `.online`, `.club`, `.info`, `.live`, `.pro`, `.bond`, `.cfd`, `.icu`, `.today`, `.pw`, `.win`, `.mobi`, `.cam`, `.fit`, `.lol`.
   - Lợi dụng ccTLD nước ngoài giả danh:
     - Dòng 19114: `https://www.roblox.com.bi/...` (Burundi `.bi`)
     - Dòng 19115: `https://www.roblox.com.et/...` (Ethiopia `.et`)
     - Dòng 19117: `https://www.roblox.com.bn/...` (Brunei `.bn`)
     - Dòng 19209: `https://www.roblox.com.mu/...` (Mauritius `.mu`)
4. **Lạm dụng Hạ tầng Đám mây, Máy chủ Serverless & Web Hosting Miễn phí**:
   - Cloudflare Pages: `pages.dev` (Dòng 19004, 19047, 19055, 19109, 19119, 19163, 19170, 19182, 19211, 19242)
   - Vercel: `vercel.app` (Dòng 109, 280, 19014, 19024, 19033, 19052, 19128, 19135, 19234)
   - GitHub Pages: `github.io` (Dòng 18999, 19015, 19018, 19046, 19071, 19076, 19116, 19118, 19120, 19127, 19214, 19228)
   - Webflow: `webflow.io` (Dòng 19013, 19112, 19113, 19121, 19232, 19243)
   - Google Blogspot: `blogspot.com` (Dòng 19005, 19016, 19017, 19026, 19034, 19045, 19056, 19136, 19176, 19183, 19218)
   - PaaS khác: `wasmer.app` (Dòng 19021, 19049, 19054), `onrender.com` (Dòng 19037), `surge.sh` (Dòng 19039), `stormkit.dev` (Dòng 19194-19201), `railway.app` (Dòng 19250: `instagram-phishing-production-24da.up.railway.app`), `weebly.com` (Dòng 139, 1009, 53103).
   - Cloud Storage Buckets: AWS S3 (`s3.us-east-2.amazonaws.com` dòng 19215), Backblaze B2 (`f006.backblazeb2.com` dòng 19164), DigitalOcean Spaces (`digitaloceanspaces.com` dòng 19080).
   - Web3 / InterPlanetary File System (IPFS): `bafkreig...ipfs.dweb.link` (Dòng 19011).
   - Rút gọn link (URL Shorteners): `bitly.cx` (Dòng 19038-19043, 19067-19070, 19137, 19161), `goo.su` (Dòng 19108), `urlto.me` (Dòng 19131), `shorter.gg` (Dòng 19165).
5. **Kỹ thuật Mã hóa & Che giấu Tham số (Obfuscation & Payload Hiding)**:
   - Dòng 19058 chứa chuỗi mã hóa Base64 nhúng trong query string:
     `http://stationnement-antai-gouv-infractions.chp.nu/fr/facture-electronique/dossie/fr-fr/fr/embed?url=ahr0chm6ly9zdgf0aw9ubmvtzw50lwfudgfplwdvdxytaw5mcmfjdglvbnmuy2hwlm51l2zyl2zhy3r1cmutzwxly3ryb25pcxvll2rvc3npzs9mci1mci9mci8vy2fjaguvzxlfdvdieln4vfbsswjjdj8`
   - Dòng 19220 URL giả danh Microsoft dài bất thường:
     `http://microsoft.authorised-support.com/login/hxb7ootfgjz7eksi3cdudx_tqhf3aacy1ueq=5ba==9vfbas1zkvl9nzlvwxlbxzk5qtvfmsvhksk5ws10=/pj3go-7ma-wnrgsl8fola4-lg0urchw1`
   - Dòng 18906 & 18966 (tập Benign) xuất hiện tên miền Tiếng Việt Quốc tế hóa (IDN/Punycode): `http://xn--giadng-lq8b.vn` (gia dụng), `http://xn--qunh-w25a.vn`.

---

### 1.3. Khảo sát Chuyên sâu: `full_dataset.csv`

#### A. Cấu trúc Cột và Sự khác biệt so với Giả định Ban đầu
- Header thực tế gồm 4 cột (thay vì 2 cột như mô tả ban đầu trong yêu cầu): `message_id,date,message,label`.
- Cột `message_id`: Mã định danh tin nhắn có 3 nhóm tiền tố chính: `COM_` (thương mại/viễn thông/spam chung), `TE_` (viễn thông/telecom), `NEW_` (mẫu mới bổ sung).
- Cột `date`: Định dạng ngày tháng kiểu `DD/MM/YYYY` (ví dụ `28/05/2026`, `18/06/2026`) hoặc `D/M/YYYY` (ví dụ `12/7/2026`, `3/8/2026`).
- Cột `message`: Chuỗi văn bản tin nhắn.
- Cột `label`: Giá trị nhị phân số nguyên `0` (tin hợp pháp / benign) và `1` (tin lừa đảo / phishing).

#### B. Hiện tượng Dòng Nhiều Dòng (Multi-line Fields theo RFC 4180)
- Nhiều bản ghi chứa ký tự xuống dòng `\r\n` hoặc `\n` bên trong trường `message` được bao bọc bởi dấu ngoặc kép `""`.
- Ví dụ bản ghi `TE_027` (dòng 3 đến dòng 5) chiếm trọn 3 dòng text:
  ```csv
  TE_027,28/05/2026,"[TB] CMND đăng ký thuê bao của Quý khách đã hết hiệu lực từ [DATE] (theo quy định luật Căn cước). Quý khách vui lòng truy cập https://viettel.vn/doigiayto và cập nhật thông tin CC/CCCD mới nhất hoặc đến cửa hàng giao dịch Viettel để được hỗ trợ.
  Tặng [MONEY] vào tài khoản khuyến mại khi thực hiện online qua My Viettel trước [DATE], ưu đãi cộng vào ngày hôm sau. Chi tiết liên hệ 198 ([MONEY]). Trân trọng.
  ",0
  ```
- Tương tự, bản ghi `COM_088` (dòng 14-17) trải dài qua 4 dòng text:
  ```csv
  COM_088,18/06/2026,"Quy khach dang thuc hien
  Lien ket the/TK Sacombank
  Ma OTP: 587437 hieu luc [TIME]
  Quy khach se MAT TIEN va THONG TIN neu cung cap Ma OTP cho bat ky ai",0
  ```
- **Hệ quả kỹ thuật**: Tổng số dòng text (4,492 dòng) KHÔNG ĐỒNG NGHĨA với tổng số mẫu bản ghi. Bộ parser bắt buộc phải hỗ trợ chuẩn RFC 4180 parsing, không được dùng `readline()` đơn giản.

#### C. Phân bố Nhãn (Class Imbalance)
- Dòng 2 đến dòng 3611: Đại đa số tuyệt đối mang nhãn `0` (benign).
- Dòng 3612 đến dòng 4492: Chuyển sang khối nhãn `1` (phishing) bắt đầu từ `COM_001`.
- Tỷ lệ phân bố nhãn thực tế: Xấp xỉ **80% Benign (nhãn 0)** và **20% Phishing (nhãn 1)**. Đây là tỷ lệ mất cân bằng mẫu đáng kể (tỷ lệ 4:1), đòi hỏi các kỹ thuật điều chỉnh trọng số (class weights) hoặc sampling khi tinh chỉnh/đánh giá mô hình.

#### D. Trùng lặp Đối nghịch & Xung đột Nhãn Trực tiếp (Direct Label Contradictions)
Khảo sát phát hiện những điểm dị biệt và lỗi gán nhãn cực kỳ nghiêm trọng trong `full_dataset.csv`:
1. **Xung đột Thiết bị Ezviz**:
   - Dòng 3598 (`COM_2990`): `Thiết bị [NUMBER] đã bị mở khóa. Liên hệ với tài khoản account@ezviz.com nếu có bất kỳ thắc mắc.,,0` -> **Gán nhãn 0**.
   - Dòng 4463 (`COM_2055`): `Thiết bị [NUMBER] đã bị mở khóa. Liên hệ với tài khoản account@ezviz.com nếu có bất kỳ thắc mắc.,25/07/2026,1` -> **Gán nhãn 1**.
   - *Đánh giá*: Hai bản ghi cùng một nội dung văn bản nhưng bị gán nhãn ngược nhau hoàn toàn.
2. **Xung đột Mẫu Cờ bạc pkwin**:
   - Dòng 3600-3601 (`COM_2991`): `Ban vao ngay pkwin https://m.[NUMBER].com/Account/Register? f=[NUMBER] dang ki tai khoan nhan code [MONEY], nap dau tang 100% trai nghiem casino, no hu hay nhat.,,0` -> **Gán nhãn 0** (Sai nghiêm trọng vì đây rõ ràng là tin nhắn rác cờ bạc).
   - Dòng 4465 (`COM_2057`): Nội dung tương tự gán **nhãn 1**.
3. **Mẫu lừa đảo mạo danh Techcombank bị gán nhãn 0**:
   - Dòng 3581-3582 (`COM_2985`): `[Ngân hàng Techcombank] Thông báo. Ưu đãi có thời hạn!12.[POINT] thưởng thẻ tín dụng của bạn hết hạn hôm nay. Nhận ngay phần thưởng độc quyền của bạn:https://techcombank.shop/com.vn,,0` -> Tên miền `techcombank.shop` rõ ràng là lừa đảo nhưng bị gán nhãn `0`!
   - Trong khi đó, dòng 3617 (`COM_006`) với cú pháp y hệt trỏ về `techcombank.huy-the-visa-vn.com` được gán nhãn `1`.
4. **Mẫu đòi nợ đe dọa bôi nhọ nhân phẩm bị gán nhãn 0**:
   - Dòng 3591-3597 (`COM_2989`): Đòi nợ, đe dọa "THONG BAO NO dia chi noi o, noi lam viec hien tai... bien ban vi pham no" lại bị gán nhãn `0`.
5. **Dòng dữ liệu thiếu trường ngày tháng (Missing Date)**:
   - Các dòng từ 3581 đến 3611 (từ bản ghi `COM_2985` đến `COM_2995`) đều có cột ngày trống rỗng (hai dấu phẩy liền nhau: `COM_2985,,"...",0`).

#### E. Hiện tượng Lộ Dữ liệu Cá nhân Nhạy cảm (PII Leaks) & Che giấu Không triệt để
Dữ liệu sử dụng các token placeholder: `[MONEY]`, `[TIME]`, `[DATE]`, `[NUMBER]`, `[NAME]`, `[POINT]`. Tuy nhiên quá trình che chắn (anonymization) để lọt nhiều thông tin nghiêm trọng:
- Lộ họ tên đầy đủ và ngày sinh: Dòng 3591-3593: `Anh/Chi Le Thi Lan Anh_SN: 30/07/2006_SDT: [NUMBER]` (để lộ rõ tên Lê Thị Lan Anh và ngày sinh 30/07/2006).
- Lộ tên riêng cá nhân: Dòng 4453: `NGUYET ANH LE, Vui long truy cap...`.
- Lộ cấp bậc chức vụ: Dòng 4455: `A là Thiếu tá [NAME] - Cán bộ`.
- Lộ mật khẩu ứng dụng dạng plain-text: Dòng 2035 (`COM_1253`): `Cam on ban da hoan tat kiem tra diem tin dung CIC tren MoMo... Ten dang nhap: [NUMBER], Mat khau: x!{qvB=!C+2+`.
- Mã OTP ngân hàng không được che (để số thô 6 chữ số):
  - Dòng 2: `Ma OTP xac thuc GD la 066595`
  - Dòng 16: `Ma OTP: 587437`
  - Dòng 25: `Ma OTP: 136452`
  - Dòng 2033: `FPT ID Ma OTP cua QK la 253881`.

#### F. Các Chiến thuật Né tránh Bộ lọc (Adversarial Evasion Techniques)
Dữ liệu chứa hàng loạt kỹ thuật tấn công tinh vi nhằm qua mặt các bộ lọc regex / keyword matching truyền thống:
1. **Bộ ký tự Toán học Unicode (Unicode Mathematical Alphanumeric Symbols)**:
   - Dòng 3802 (`COM_1063`): Sử dụng toàn bộ dải ký tự `U+1D670` - `U+1D6A3` (mathematical monospace):  
     `"𝚔𝚢𝚑𝚐𝚜𝚕𝚟𝚊𝚘ㅤ𝚐𝚊𝚖𝚎{𝚂𝚣𝙷𝚈𝚐𝙶𝙳𝚌𝙳)ㅤ𝚌𝚘ㅤ𝚕𝚘𝚌: 𝚟1𝚖8.𝚌𝚘𝚖 ""ㅤ𝚙𝚑𝚊𝚝ㅤ𝚝𝚊𝚒ㅤ𝚋𝚟𝚚𝚙𝚕𝚓",1`  
     Kèm theo khoảng trắng đặc biệt (Hangul Filler `U+3164` / Zero-width space).
2. **Kỹ thuật Lặp Ký tự / Kéo dài Từ (Character Stuttering)**:
   - Dòng 3682: `NhHậẬnNLLLuUôônnNNNggaAayTTámTrRRăămMNNNNgghHHììnNĐĐĐồồnng{Gomapple.com:ThhHắắnnggTThhìBạnnRRúÚtTLLuuônn,1`
   - Dòng 3683: `MMờỜờiVààooCCChHhơƠớii)0kgoogle.com:EEEmTặặnngLLLộỘộccLLuôÔnn...`
   - Dòng 3685: `CCCứỨỨThhoảiIMáÁiliCChHơil]atuapple.com...`
3. **Leetspeak & Biến dạng Brandname / Từ khóa Cấm**:
   - Dòng 4100: `[KU.B_ET]`
   - Dòng 4101: `[789-B.E.T]`
   - Dòng 4102: `[Hj88_M0bj]`
   - Dòng 4103: `[NEW88_Clu6]`
   - Dòng 4104: `[F8BET_Vn]`
   - Dòng 4105: `[SHB.ET]`, `thành vjên`
   - Dòng 4106: `[FUN88-VlP]`
   - Dòng 4115: `[Sh0pee_CTV]`, `j0b`
   - Dòng 4116: `[TlkI-App]`, `l_ink`
   - Dòng 4117: `[TikT0k_Media]`
   - Dòng 4118: `[Y0UTUBE_Vn]`
   - Dòng 4121: `[Vie¢Lam_24h]` (dùng ký tự cent `¢` thay chữ `c`)
   - Dòng 4125: `[J0B_HOT_2026]`
   - Dòng 4130: `[Club_HenHo_Vjp]`.
4. **Chèn Dấu phân cách Ngẫu nhiên và Domain Ký sinh**:
   - Dòng 3801: `"q}CunpyvR.cndgz.link)yTh:uong-G-ui_HVT:ag""Tu:M:aC:OZ^28~N-g,in~To;i_88,N'gh:j-n<duikadjsdlxi>ZALO.Megoogle",1`
   - Dòng 3804: `"Dz)CkTYIqnky.wnyl.bid)YGS""K:h_Ma,i_M:a-K,m;T:u_2:8;K-D,en:8;8,<hjgqueagpnms>-N:ghin_googlecomvn",1`
   - Dòng 3822-3840: Hàng loạt tin nhắn gắn đuôi giả danh `groupsgooglecom`, `bidv.com`, `apple.com` để đánh lừa bộ phân tích URL.
5. **Dữ liệu Rác Tuyệt đối (Pure Random Gibberish)**:
   - Dòng 4481: `COM_2070,25/07/2026,zLhFVQCDieunIkJyezlEnbeJOU.>.> .>385!!2<-<-<-hNjOOwWVrMyUxCoKMaV,1`
   - Dòng 4482: `COM_2071,25/07/2026,"eYSdVQuEPkdviXwuiKRufvEUrm.>. >.>348!!8<-<-<- yAVshTMMqCIwUTzRbxnYhzrBEM",1`
   - Dòng 4484: `COM_2072,25/07/2026,UemVZeLOhgMLCvWpGIEoFlkvdc. >.>.>852!!9<-<-<-VOECJIqgkuSYCYnnBkLsQyWedKQbp,1`
   - Dòng 4485: `COM_2073,25/07/2026,NOFpXwwrjZtPuEQBkmGwACNJir.> .>.>898!!4<-<-<-vwcVjsAbpzxilYCyVlowSBERDIEOt,1`
   - Dòng 4487: `COM_2075,25/07/2026,DuAZjMSxLQeePthAORHkYoatRI.>. >.>751!!325<-<-<-gdGbGCChLQaKBQrhhmoHaHp,1`
   - Dòng 4488: `COM_2076,25/07/2026,LzkgzhpQBDjfuwJuDDZiGleLmU.>. >.>366!!446<-<-<-SauknvutUdkKENUliSwe,1`
6. **Cố tình Chèn Khoảng trắng Phá vỡ Cú pháp URL**:
   - Dòng 4143-4144: `https://techcom-rewards-vn .com` (chèn khoảng trắng trước `.com`)
   - Dòng 3651: `http:// 103.[NUMBER]:[NUMBER]` (chèn khoảng trắng sau `http://`)
   - Dòng 3672: `http.//dichvucong .xyz/DLGAWTBtGW` (thay `:` bằng dấu chấm `.` và chèn khoảng trắng trước `.xyz`).

---

### 1.4. Khảo sát Chuyên sâu: `sample.csv`

#### A. Cấu trúc Cột & Thuộc tính Bản ghi
- Header (dòng 1): `text,label`.
- Tổng cộng 773 dòng text: đúng 1 dòng header + 772 dòng dữ liệu.
- Định dạng dữ liệu: Chuỗi CSV tiêu chuẩn; các dòng có chứa dấu phẩy bên trong được bọc trong ngoặc kép `""`.
- Cột `label`: 100% mang giá trị chuỗi `"phishing"` (772/772 mẫu). Hoàn toàn không có mẫu benign (0%).

#### B. Bản chất Dữ liệu & Cấu trúc Ghép cặp Diễn đạt Tương đương (Paraphrase Pairs)
Toàn bộ `sample.csv` là tập dữ liệu mẫu đơn lẻ (single-turn SMS) được tổng hợp / sinh theo cấu trúc có chủ đích. Điểm đặc thù lớn nhất là **từng kịch bản lừa đảo luôn xuất hiện theo từng cặp diễn ngôn song hành (paraphrase pair)**: một mẫu dùng văn phong hành chính trang trọng (`Kính gửi Quý khách / Quý vị`, `Đề nghị...`) và một mẫu dùng văn phong thông báo khẩn cấp trực diện (`Thông báo:...`, `Vui lòng...`).

*Các minh chứng trực tiếp trích từ file:*
1. **Kịch bản trợ cấp tiền điện**:
   - Dòng 2: `Goi tro cap tien dien danh cho cac gia dinh kho khan vua khoi dong. Gui giay to o http://sim.example.vn/x,phishing`
   - Dòng 3: `Chuong trinh giup do tien dien cho ho ngheo hien mo cua. Ban dang ky bang cach truy cap http://sim.example.vn/x,phishing`
2. **Kịch bản kiểm tra hộ tịch / rà soát dân cư**:
   - Dòng 4: `"Kinh gui Quy vi, chien dich kiem tra ho tich toan quoc doi hoi moi cong dan khai bao lai ma dinh danh. De nghi hoan tat tai http://sim.example.vn/x truoc 16 gio.",phishing`
   - Dòng 5: `"Thong bao: de kien toan ho tich, moi cong dan phai xac minh lai day so dinh danh ca nhan. Vui long hoan thanh truoc 4 gio chieu tai http://sim.example.vn/x.",phishing`
3. **Kịch bản giữ kiện hàng chưa thanh toán**:
   - Dòng 6: `Kien hang chua tra tien cua ban sap bi huy. Bam giu don o http://sim.example.vn/x,phishing`
   - Dòng 7: `Don cua ban chua tra tien nen sap bi go. Giu cho o http://sim.example.vn/x,phishing`
4. **Kịch bản sai sót tờ khai thuế**:
   - Dòng 8: `Thong bao: ban khai thue cua Quy vi khong duoc nhan vi thieu muc bat buoc. De nghi dieu chinh o http://sim.example.vn/x truoc 5 gio chieu.,phishing`
   - Dòng 9: `"Kinh gui Quy vi, ban khai cua ban da bi hoan lai boi mot chi tieu bat buoc dien sai. Sua gap tai http://sim.example.vn/x, han chot 17 gio.",phishing`
5. **Kịch bản lộ lọt mật khẩu tài khoản**:
   - Dòng 772: `"Kinh gui Quy khach, mat khau cua Quy khach xuat hien trong mot danh sach du lieu bi ro ri. De nghi Quy khach doi mat khau tai http://sim.example.vn/x.",phishing`
   - Dòng 773: `Thong bao: chung toi phat hien mat khau cua Quy khach trong mot vu lo du lieu. Vui long thay doi tai http://sim.example.vn/x.,phishing`

#### C. Đặc trưng Ngôn ngữ & URL Định danh Thống nhất
- **100% tiếng Việt không dấu (Unaccented Vietnamese)**: Không có bất kỳ ký tự tiếng Việt có dấu nào trong toàn bộ 772 dòng text. Đây là đặc điểm của tin nhắn SMS Brandname/SMS truyền thống để tiết kiệm độ dài ký tự GSM-7 hoặc né tránh kiểm duyệt nội dung.
- **100% URL dùng chung một Mock Link duy nhất**: Mọi dòng tin nhắn đều trỏ về địa chỉ liên kết mẫu: `http://sim.example.vn/x`.
  - *Ý nghĩa kỹ thuật*: Đặc trưng URL trong `sample.csv` không mang giá trị phân biệt đối với các mô hình phát hiện URL độc hại, mà buộc mô hình phải dựa 100% vào ngữ nghĩa văn bản (Semantic context, Linguistic cues).

#### D. Phân loại Kịch bản Đánh lừa (Scam Archetypes), Thủ đoạn Tâm lý & Call-To-Action (CTA)
1. **Mạo danh Cơ quan Hành chính, Tư pháp & Thuế**:
   - Giấy mời làm việc, triệu tập: Dòng 50, 51, 704, 705.
   - Biên bản vi phạm giao thông / Phạt nguội: Dòng 70, 71.
   - Rà soát dữ liệu căn cước, hộ khẩu, lý lịch tư pháp: Dòng 12, 13, 82, 83, 212, 213, 708, 709.
   - Kê khai và hoàn thuế TNCN: Dòng 34, 35, 78, 79, 142, 143, 156, 157, 220, 221, 724, 725.
2. **Mạo danh Ngân hàng & Tổ chức Tài chính**:
   - Cảnh báo đăng nhập lạ, quẹt thẻ ở nước ngoài: Dòng 16, 17, 28, 29, 130, 131, 148, 149.
   - Bắt buộc cập nhật sinh trắc học khuôn mặt để giao dịch >10 triệu: Dòng 96, 97, 186, 187, 700, 701.
   - Thao túng tâm lý bằng hạn mức thấu chi / Miễn phí trọn đời: Dòng 146, 147, 228, 229, 698, 699.
   - Phí duy trì thẻ / Hoàn phí thường niên: Dòng 280, 281, 288, 289, 760, 761.
3. **Mạo danh Nhà mạng Viễn thông**:
   - Khóa SIM 2 chiều do chưa chuẩn hóa thông tin: Dòng 100, 101, 234, 235, 762, 763.
   - Cảnh báo có lệnh cấp lại thẻ SIM từ thiết bị lạ: Dòng 86, 87, 758, 759.
   - Gói cước sắp hết hạn / Tặng dung lượng data 50GB: Dòng 144, 145, 150, 151, 754, 755.
4. **Mạo danh Đơn vị Vận chuyển (Logistics/COD)**:
   - Kiện hàng bị ách tắc tại hải quan, nộp thuế nhập khẩu: Dòng 42, 43, 306, 307, 752, 753.
   - Bưu kiện COD chưa thanh toán, thu phí lưu kho / giao lại: Dòng 32, 33, 80, 81, 312, 313, 746, 747.
   - Yêu cầu ký chữ ký số / chữ ký điện tử để nhận hàng: Dòng 180, 181, 184, 185, 750, 751.
5. **Mạo danh Mạng xã hội & Nền tảng Số**:
   - Khóa trang/nhóm vì vi phạm bản quyền / tiêu chuẩn cộng đồng: Dòng 26, 27, 52, 53, 114, 115, 194, 195, 226, 227, 764, 765, 768, 769.
   - Lời mời tham gia kiếm tiền từ sáng tạo nội dung: Dòng 174, 175, 196, 197, 770, 771.
6. **Thủ thuật Tâm lý: Tạo áp lực thời gian (Urgency) & Đe dọa Chế tài (Fear Appeal)**:
   - Khống chế thời gian gấp rút: `truoc 16 gio`, `truoc 17h00`, `trong vong 02 tieng`, `trong 12h`, `han chot 18h chieu nay`, `truoc 23h59`, `trong 24 gio toi`.
   - Đe dọa hậu quả pháp lý & tài chính: `keo bi phat`, `keo bi cuong che`, `ap che tai truy thu`, `bi ngat ca hai chieu lien lac`, `tam giu tai khoan`.

---

## 2. LOGIC CHAIN (Chuỗi Suy luận & Đánh giá Kỹ thuật)

1. **Từ Quan sát Cấu trúc Cột và Định dạng Nhãn**:
   - *Suy luận*: 3 tập dữ liệu có cấu trúc lược đồ hoàn toàn không đồng nhất:
     - `dataset_url.csv`: 3 cột, nhãn là chuỗi (`phishing` / `benign`).
     - `full_dataset.csv`: 4 cột, nhãn là số nguyên (`1` / `0`).
     - `sample.csv`: 2 cột, nhãn là chuỗi (`phishing`).
   - *Hệ quả đối với Module Tiền xử lý*: Không thể dùng chung một loader hay parser. Cần thiết kế 3 pipeline tiền xử lý chuyên biệt (Adapter Pattern) để trích xuất và ánh xạ về một Canonical Input Schema thống nhất trước khi cấp cho mô hình suy luận.

2. **Từ Quan sát Hiện tượng Multi-line trong `full_dataset.csv`**:
   - *Suy luận*: Việc trường văn bản chứa `\n` và `\r\n` nằm trong dấu ngoặc kép là hành vi chuẩn theo RFC 4180 nhưng thường làm sập các parser tự viết hoặc các công cụ phân tích dòng đơn giản.
   - *Hệ quả đối với Module Tiền xử lý*: Parser phải sử dụng cơ chế xử lý state-machine (như `csv.reader` với quotechar chuẩn) và chuẩn hóa toàn bộ ký tự ngắt dòng nội dung thành một dấu phân cách nhất quán (ví dụ: thay thế `\n` bằng dấu cách hoặc token `[NL]`).

3. **Từ Quan sát Trùng lặp Đối nghịch (Contradictory Duplicates) trong `full_dataset.csv`**:
   - *Suy luận*: Sự tồn tại của các dòng nội dung giống hệt nhau (như thông báo mở khóa thiết bị Ezviz dòng 3598 và dòng 4463) nhưng lại mang hai nhãn trái ngược (`0` và `1`) chứng tỏ tập dữ liệu chưa qua khử trùng lặp (deduplication) và có độ nhiễu nhãn (label noise) đáng kể ở giai đoạn biên soạn.
   - *Hệ quả đối với Huấn luyện & Đánh giá*: Nếu không làm sạch, mô hình AI sẽ bị phạt điểm oan hoặc học các trọng số xung đột. Bước tiền xử lý bắt buộc phải thực hiện deduplication theo cơ chế băm nội dung (Exact / Fuzzy Content Hash) và loại bỏ hoặc hiệu đính các cặp nhãn mâu thuẫn.

4. **Từ Quan sát Về Phân bố Nhãn (Class Imbalance)**:
   - *Suy luận*: `full_dataset.csv` lệch mạnh về lớp hợp pháp (~80% benign vs ~20% phishing), trong khi `sample.csv` là 100% phishing và `dataset_url.csv` lệch về phishing (69.1% phishing vs 30.9% benign).
   - *Hệ quả đối với Kiến trúc Suy luận*: Mô hình rất dễ bị thiên kiến (bias) nếu chỉ dựa vào xác suất thống kê đơn thuần. Do đó, reasoning harness cần trang bị các câu nhắc định hướng (Prompt Scaffolds / Chain-of-Thought) để phân tích bằng chứng khách quan thay vì dựa vào tần suất từ khóa.

5. **Từ Quan sát Về Kỹ thuật Né tránh (Adversarial Obfuscation) trong `full_dataset.csv`**:
   - *Suy luận*: Kẻ tấn công sử dụng phong phú các thủ thuật: ký tự toán học Unicode (`U+1D670`), ký tự tàng hình (zero-width spaces), lặp chữ (`NhHậẬnN...`), chèn ký tự đặc biệt, và cố ý chèn khoảng trắng làm gãy cấu trúc URL (`techcom-rewards-vn .com`).
   - *Hệ quả đối với Module Tiền xử lý*: Bắt buộc phải có tầng **Text Normalization** cực kỳ mạnh mẽ:
     - Chuẩn hóa Unicode NFKC (để ép các ký tự Mathematical Alphanumeric về ký tự ASCII/Latin chuẩn).
     - Loại bỏ Zero-width spaces (`\u200B`, `\uFEFF`, `\u3164`).
     - Thu gọn chuỗi ký tự lặp (deduplication of character runs).
     - Khôi phục và phát hiện URL bị chèn khoảng trắng hoặc ký tự ngắt trước TLD.

6. **Từ Quan sát Về URL Cố định trong `sample.csv` (`http://sim.example.vn/x`)**:
   - *Suy luận*: Toàn bộ 772 tin nhắn trong `sample.csv` đều gắn kèm link giả lập này. Nếu một mô hình học máy nhìn vào đặc trưng URL, nó sẽ bị hiện tượng học vẹt (spurious correlation - gắn liền `sim.example.vn` với phishing).
   - *Hệ quả đối với Module Tiền xử lý & Thiết kế Input*: Cần tách bạch rõ ràng giữa **Phân tích Ngữ nghĩa Nội dung Văn bản (Text Content Analysis)** và **Phân tích Rủi ro Liên kết (URL Reputation Analysis)**, đồng thời che chắn hoặc trung hòa domain giả lập trong quá trình xử lý đầu vào.

---

## 3. CAVEATS (Phạm vi & Giới hạn Khảo sát)

1. **Ràng buộc Non-Coding**: Khảo sát này được tiến hành 100% bằng việc đọc và phân tích trực tiếp văn bản qua các lệnh đọc file `read_file`, hoàn toàn không viết script hoặc chạy bất kỳ đoạn mã Python / shell nào để tính toán thống kê tự động.
2. **Ước lượng Tỷ lệ Bản ghi Chính xác**: Do `full_dataset.csv` chứa các trường văn bản nhiều dòng (multi-line fields), số lượng bản ghi chính xác có độ lệch nhỏ so với tổng số dòng text vật lý (4,492 dòng). Con số tỷ lệ 80/20 được xác định dựa trên việc định vị chính xác điểm chuyển giao nhãn tại dòng 3612 và khảo sát phân bố mẫu.
3. **Nguồn gốc Tập dữ liệu**: `sample.csv` có đặc tính rõ ràng là tập dữ liệu mẫu được sinh có chủ đích (synthetic / template-augmented dataset) phục vụ kiểm thử đơn biến; trong khi `dataset_url.csv` và `full_dataset.csv` là các tập dữ liệu tổng hợp từ các chiến dịch tấn công thực tế và nhật ký tin nhắn viễn thông tại Việt Nam.

---

## 4. CONCLUSION (Kết luận & Định hướng Thiết kế Kỹ thuật)

### 4.1. Đánh giá Tổng thể Hiện trạng Dữ liệu
1. **Dữ liệu Đa dạng nhưng Dị hợp cao**: 3 nguồn dữ liệu đại diện cho 3 giác cắt hoàn toàn khác nhau của bài toán phòng chống lừa đảo trực tuyến:
   - `dataset_url.csv`: Kho tri thức về hạ tầng độc hại (Domain, TLD, PaaS, Subdomain, Typosquatting).
   - `full_dataset.csv`: Tập dữ liệu đời thực phong phú, phản ánh đầy đủ các chiêu trò tấn công lừa đảo qua tin nhắn viễn thông tại Việt Nam kèm theo các kỹ thuật đối kháng né bộ lọc rất phức tạp, nhưng chứa lỗi nhãn và rò rỉ PII.
   - `sample.csv`: Bộ benchmark chuẩn hóa về các kịch bản lừa đảo qua tin nhắn không dấu kèm mạo danh cơ quan nhà nước / ngân hàng, cấu trúc theo từng cặp diễn ngôn tương đương.
2. **Những "Hố sâu" Kỹ thuật Cần Giải quyết Ngay ở Tầng Tiền xử lý**:
   - Lỗi xung đột nhãn (nhãn 0 và 1 trên cùng một văn bản).
   - Tên miền lừa đảo rõ ràng (`techcombank.shop`) nhưng bị gán nhãn 0.
   - Rò rỉ thông tin cá nhân PII (họ tên, ngày sinh, mật khẩu plain-text).
   - Biến dạng ký tự tinh vi (Mathematical fonts, Zero-width, Stuttering text, broken URLs).

### 4.2. Khuyến nghị Định hướng cho Module Tiền xử lý (Pre-processing Pipeline)
1. **Bộ Tiền xử lý Văn bản Đa tầng (Multi-stage Text Cleaning)**:
   - *Tầng 1 (Encoding & Unicode)*: Chuẩn hóa toàn bộ về UTF-8 và áp dụng chuẩn **Unicode NFKC Normalization** để hóa giải ký tự toán học monospace và font dị biệt.
   - *Tầng 2 (Adversarial De-obfuscation)*: Xóa bỏ khoảng trắng ẩn, un-stuttering các ký tự lặp vô lý, chuyển đổi leetspeak phổ biến về ký tự chuẩn.
   - *Tầng 3 (URL Defanging & Reconstruction)*: Nối lại các URL bị chèn khoảng trắng trước đuôi tên miền (như `.com`, `.top`) để trích xuất đầy đủ địa chỉ web mục tiêu.
   - *Tầng 4 (Data Hygiene & Privacy)*: Rà soát và che chắn bổ sung các chuỗi PII còn sót lại (đặc biệt là mật khẩu, họ tên kèm ngày sinh).
2. **Bộ Trích xuất Đặc trưng URL Chuyên biệt (URL Feature Extractor)**:
   - Bóc tách URL thành các thành phần: Scheme, FQDN, TLD, Subdomain count, Domain Entropy, Path Length, Query parameters.
   - Kiểm tra chéo với cơ sở dữ liệu `dataset_url.csv` và danh sách TLD rủi ro cao (`.top`, `.cc`, `.xyz`, `.vip`, `.shop`).
   - Đánh dấu cờ (flagging) khi phát hiện các dịch vụ lưu trữ đám mây miễn phí (`pages.dev`, `vercel.app`, `webflow.io`, `workers.dev`, `blogspot.com`) đang chạy ứng dụng mạo danh ngân hàng.
3. **Đặc tả Lược đồ Chuẩn hóa Đầu vào (Canonical Input Schema)**:
   - Thống nhất toàn bộ đầu vào về một cấu trúc JSON/Pydantic chung trước khi nạp vào Reasoning Harness:
     ```json
     {
       "source_type": "url | sms_single_turn | chat_message",
       "raw_text": "Chuỗi văn bản gốc",
       "normalized_text": "Chuỗi văn bản sau khi chuẩn hóa NFKC và gỡ rối",
       "extracted_urls": ["Danh sách URL hợp lệ trích xuất được"],
       "url_metadata": {
         "tld": "top",
         "is_free_hosting": true,
         "impersonated_brand": "Vietcombank",
         "entropy_score": 3.85
       },
       "urgency_triggers": ["trước 16 giờ", "khóa tài khoản", "truy thu"],
       "financial_hooks": ["hoàn thuế", "trúng thưởng", "nợ xấu"]
     }
     ```

### 4.3. Khuyến nghị Định hướng cho Reasoning Harness (Tác nhân Suy luận)
1. **Thiết kế Prompt Scaffolds dựa trên Đặc trưng đã Khảo sát**:
   - Do kẻ lừa đảo thường tạo bối cảnh giả danh chính quyền/ngân hàng kết hợp thúc ép thời gian, prompt cần định hướng mô hình qua 4 bước suy luận CoT (Chain-of-Thought):
     - *Bước 1 (Xác thực Thực thể)*: Đối chiếu xem thông điệp có tự xưng là tổ chức lớn (Ngân hàng, Viettel, Công an, Thuế) nhưng lại dùng kênh gửi cá nhân, website tên miền lạ hoặc rút gọn link không.
     - *Bước 2 (Phân tích Động cơ & Đòn tâm lý)*: Nhận diện xem thông điệp có tạo tâm lý sợ hãi (phạt tù, khóa tài khoản, nợ xấu) hoặc tham lam (hoàn tiền, trúng thưởng, tặng quà) không.
     - *Bước 3 (Kiểm tra Kêu gọi Hành động - CTA)*: Có yêu cầu click vào link lạ, cung cấp OTP, mật khẩu, chuyển khoản gấp không.
     - *Bước 4 (Kết luận & Gán mức độ rủi ro)*: Tổng hợp bằng chứng logic trước khi đưa ra phán quyết Phishing hay Benign.
2. **Tối ưu hóa cho Phần cứng Giới hạn (CPU Core i5 & GPU RTX 4050 6GB VRAM)**:
   - Với VRAM 6GB của RTX 4050, mô hình suy luận phù hợp nhất là các dòng SLM lượng tử hóa 4-bit (AWQ / GGUF) kích thước 3B đến 8B parameters (ví dụ: Qwen2.5-7B-Instruct-Q4 hoặc Gemma-2-9B-It-Q4).
   - Module tiền xử lý văn bản và trích xuất regex URL phải chạy hoàn toàn trên CPU (Core i5) để giảm tải và tiết kiệm tài nguyên GPU, chỉ đưa văn bản đã tinh gọn và các gợi ý phân tích (Prompt Hints) vào mô hình ngôn ngữ trên GPU.

---

## 5. VERIFICATION METHOD (Phương pháp Kiểm chứng Độc lập)

Người thẩm định hoặc các tác nhân khác có thể kiểm chứng độc lập toàn bộ các kết luận và dẫn chứng trong báo cáo này thông qua việc thanh tra trực tiếp các tệp tin tại các dòng cụ thể:

1. **Kiểm chứng Cấu trúc Block và Số lượng của `dataset_url.csv`**:
   - Đọc dòng 1: Kiểm tra header `channel,label,url_norm`.
   - Đọc dòng 1062, 1213, 1214: Kiểm tra sự tồn tại của trường `channel = social`.
   - Đọc dòng 2588 và 2589: Xác nhận điểm giao chuyển từ `phishing` sang `benign`.
   - Đọc dòng 18998 và 18999: Xác nhận điểm giao chuyển từ `benign` sang `phishing`.
   - Đọc dòng 19294 và 19295: Xác nhận điểm bắt đầu của chuỗi URL sắp xếp theo bảng chữ cái từ `0` đến `z`.
   - Đọc dòng 53117: Xác nhận dòng cuối cùng `http://zzzmmm.co`.

2. **Kiểm chứng Xung đột Nhãn và Lỗi Dữ liệu trong `full_dataset.csv`**:
   - Đọc dòng 3581-3582 (`COM_2985`): Xác nhận thiếu trường ngày và liên kết lừa đảo `techcombank.shop/com.vn` nhưng gán nhãn `0`.
   - So sánh dòng 3598 (`COM_2990`, nhãn 0) và dòng 4463 (`COM_2055`, nhãn 1): Xác nhận cùng nội dung `Thiết bị [NUMBER] đã bị mở khóa...` bị gán nhãn mâu thuẫn.
   - So sánh dòng 3600-3601 (`COM_2991`, nhãn 0) và dòng 4465 (`COM_2057`, nhãn 1): Xác nhận cùng nội dung cờ bạc `pkwin` bị gán nhãn mâu thuẫn.
   - Đọc dòng 3591-3593 (`COM_2989`): Xác nhận thông tin PII lộ tên `Le Thi Lan Anh` và ngày sinh `30/07/2006`.
   - Đọc dòng 2035 (`COM_1253`): Xác nhận mật khẩu plain-text `x!{qvB=!C+2+`.
   - Đọc dòng 3802 (`COM_1063`): Xác nhận ký tự Unicode Mathematical Monospace `𝚔𝚢𝚑𝚐𝚜𝚕𝚟𝚊𝚘...`.
   - Đọc dòng 4481-4488: Xác nhận các dòng rác ngẫu nhiên `zLhFVQCDieun...`.

3. **Kiểm chứng Cấu trúc Ghép cặp và URL Duy nhất trong `sample.csv`**:
   - Đọc dòng 1: Kiểm tra header `text,label`.
   - Đọc các dòng 2 & 3, 4 & 5, 6 & 7, 772 & 773: Xác nhận tính chất ghép cặp diễn đạt tương đương (paraphrase pairs).
   - Kiểm tra ngẫu nhiên các dòng: Xác nhận 100% tiếng Việt không dấu và toàn bộ URL đều là `http://sim.example.vn/x`.
   - Đọc dòng 773: Xác nhận dòng cuối cùng và 100% nhãn mang giá trị `phishing`.

---
*Báo cáo được hoàn thành theo đúng các ràng buộc nghiêm ngặt: hoàn toàn không viết/chạy code, khảo sát sâu sắc, dẫn chứng cụ thể theo dòng và đáp ứng quy chuẩn Handoff Protocol.*
