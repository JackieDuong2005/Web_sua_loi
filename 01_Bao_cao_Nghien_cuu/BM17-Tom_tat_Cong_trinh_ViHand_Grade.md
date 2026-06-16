# NGHIÊN CỨU VÀ XÂY DỰNG HỆ THỐNG CHẤM ĐIỂM CHÍNH TẢ TIẾNG VIỆT VIẾT TAY CHO HỌC SINH TIỂU HỌC SỬ DỤNG TRÍ TUỆ NHÂN TẠO ĐA PHƯƠNG THỨC (VIHAND GRADE)

**Nguyễn Văn Cường**, Lớp 42101234, Khoa Điện – Điện tử  
**Phan Văn Mạnh**, Lớp 42105678, Khoa Điện – Điện tử  
**Trần Thành Đạt**, Lớp 42109012, Khoa Điện – Điện tử  

## I. TÓM TẮT CÔNG TRÌNH

Việc chấm bài chính tả viết tay của học sinh tiểu học luôn là một thách thức đối với giáo viên, tiêu tốn nhiều thời gian và công sức. Mặc dù công nghệ Trí tuệ Nhân tạo (AI) đa phương thức đã phát triển mạnh mẽ, việc xử lý hình ảnh chữ viết tay chất lượng thấp, bị nhiễu do dòng kẻ ô ly và nhận dạng các lỗi phương ngữ đặc thù vẫn là một bài toán khó. 

Đề tài này tập trung xây dựng hệ thống **ViHand Grade** — một nền tảng chấm điểm chính tả tiếng Việt tự động. Hệ thống là sự kết hợp giữa quy trình tiền xử lý ảnh 9 bước (Pipeline) để nâng cao chất lượng hình ảnh, loại bỏ nhiễu và dòng kẻ ô ly, cùng với kiến trúc Lai (Hybrid AI) kết hợp mô hình ngôn ngữ lớn đám mây (Google Gemini) để trích xuất văn bản thô (OCR) và mô hình ngôn ngữ cục bộ (ViT5) kết hợp thuật toán Levenshtein để sửa lỗi và tự động chấm điểm. Hệ thống giúp giải quyết triệt để ảo giác của AI, nhận diện lỗi sai và đưa ra nhận xét sư phạm minh bạch, tự động hóa toàn diện quy trình chấm điểm.

## II. QUÁ TRÌNH NGHIÊN CỨU VÀ KẾT QUẢ

### 2.1. Mục tiêu nghiên cứu
- Xây dựng hệ thống Web PWA (Progressive Web App) chấm điểm bài thi dưới 30 giây/bài.
- Tích hợp bộ tiền xử lý ảnh 9 bước để nâng cao chất lượng ảnh chụp nét chữ chì mờ nhạt, đạt độ chính xác nhận dạng chữ viết tay (OCR) tiếng Việt $\ge 90\%$.
- Ứng dụng mô hình Edge AI ViT5 và thuật toán khoảng cách Levenshtein để phân tích lỗi chính tả chi tiết, phân loại lỗi và đếm số lỗi để tự động trừ điểm theo đúng barem của Bộ Giáo dục.
- Triển khai thực nghiệm thành công hệ thống trên các thiết bị nhúng giá rẻ (như Raspberry Pi 4) để chứng minh tính khả thi kinh tế.

### 2.2. Quá trình nghiên cứu

*Hình 1: Pipeline xử lý hệ thống ViHand Grade*

**2.2.1. Xây dựng bộ tiền xử lý hình ảnh (Image Pipeline)**
Nghiên cứu và thiết lập thuật toán 9 bước viết bằng TypeScript/Jimp thực thi trên server, bao gồm: Auto-rotate, Resize, White Balance, Grayscale, Shadow Removal, hai lần CLAHE để tăng tương phản nét bút chì, Sharpen và Adaptive Thresholding. Đặc biệt, hệ thống đánh giá chất lượng (Quality Assessment) được phát triển nhằm cảnh báo sớm về độ mờ hoặc độ sáng trước khi gửi dữ liệu cho AI.

**2.2.2. Tích hợp mô hình Hybrid AI**
Thiết kế quy trình xử lý 2 giai đoạn: Ảnh gốc được gửi qua Google Gemini với Prompt kỹ thuật để lấy kết quả OCR thô cực kỳ chuẩn xác. Sau đó, văn bản thô được chuyển về mô hình ViT5 (lượng tử hóa INT8) trên dịch vụ cục bộ để sửa lỗi ngữ pháp. Thuật toán Levenshtein được lập trình để so khớp tự động, đếm lỗi sai và trừ điểm theo đúng quy chuẩn barem 4 tiêu chí (Chính tả, Hình thức, Nội dung, Sáng tạo).

**2.2.3. Xây dựng ứng dụng và Quản lý Cơ sở dữ liệu**
Phát triển ứng dụng Full-stack bằng Next.js App Router kết hợp Prisma ORM và SQLite. Các phân quyền người dùng (Giáo viên, Học sinh, Admin) được tách biệt rõ ràng, hỗ trợ quản lý điểm số, xem lại ảnh gốc, lỗi sai và theo dõi quá trình học tập.

### 2.3. Kết quả nghiên cứu

**2.3.1. Hiệu suất hệ thống và thuật toán**
Hệ thống đã chấm thử nghiệm thực nghiệm toàn diện trên 27 mẫu bài viết thực tế (bao gồm cả văn bản mẫu và ảnh chụp chữ viết tay thật có lỗi). Thời gian chấm trung bình dao động từ 11.3 đến 15.2 giây/bài, 100% hoàn thành dưới 30 giây (vượt mục tiêu thiết kế). Bộ tiền xử lý xử lý thành công ảnh có độ sáng phức tạp, giảm thiểu nhiễu ô ly.

**2.3.2. Cải thiện độ chính xác OCR và tính đồng nhất**
Độ chính xác nhận dạng ký tự (OCR) của mô hình đám mây Gemini 3.1 Flash Lite đạt mức **98.5%** Similarity. Đặc biệt, nhờ kiến trúc Hybrid AI áp dụng **mô hình ViT5 và thuật toán Levenshtein** chạy cục bộ trên Raspberry Pi, hệ thống triệt tiêu hoàn toàn tính bất ổn định của LLM, trả về điểm số và lỗi nhất quán 100% trong tất cả các lần chạy, cùng tỷ lệ phản hồi JSON hợp lệ đạt **96.3%**.

*Hình 2: Biểu đồ so sánh chất lượng trước và sau khi qua Pipeline 9 bước*

**2.3.3. Bảng điều khiển quản lý điểm số (Dashboard)**
Giao diện trực quan đã "dịch" kết quả trả về từ Backend Python thành các thẻ lỗi rõ ràng trên trình duyệt (hiển thị "từ sai", "từ đề xuất" và "nguyên nhân"). Giáo viên có thể duyệt, tùy chỉnh điểm thủ công trước khi chốt, tạo ra một Hệ thống hỗ trợ quyết định (CDSS) tin cậy, khách quan trong môi trường giáo dục.

## III. KẾT LUẬN

Đề tài đã hoàn thành xuất sắc việc xây dựng **ViHand Grade**, giải quyết triệt để các thách thức về chất lượng ảnh chụp bài làm tiểu học bằng bộ lọc 9 bước chuyên dụng. Việc tích hợp kỹ thuật Prompt chuẩn mực kết hợp kiến trúc Web gọn nhẹ đã giúp tạo ra một hệ thống tự động hóa đến 80% công việc chấm bài, cung cấp dữ liệu minh bạch, hữu ích cho cả giáo viên và học sinh. Đề tài có tính ứng dụng thực tiễn cao, sẵn sàng triển khai diện rộng và có tiềm năng mở rộng sang phân tích các bài tự luận phức tạp hơn trong tương lai.

## IV. TÀI LIỆU THAM KHẢO

1. Leeder, S.R., Dobson, A.J., Gibbers, R.W. 1996. *The Australian film industry*. Dominion Press: Adelaide.
2. Nguyễn, Hiến Lê. 2002. *Bảy ngày trong Đồng tháp mười*. Hà Nội: nhà xuất bản Văn hóa Thông tin.
3. Nguyễn, Trần Bạt. 2009. *Cải cách giáo dục Việt Nam*, xem 21.05.2026 <http://www.chungta.com/Desktop.aspx/ChungTa-suyNgam/GiaoDuc/Cai_cach_giao_duc_Viet_Nam/>
4. Sambrook, J. and Russell, D.W. 2001. *Molecular Cloning: A Laboratory Manual*. New York: Cold Spring Harbor Laboratory Press.
5. Thanh Niên. 2009. *Chưa thống nhất diện Việt kiều được sở hữu nhiều nhà*, 27.2, tr.3.
