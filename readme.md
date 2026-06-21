
# 🍿 Movie Big Data Recommendation Pipeline

## 📑 Tổng quan Hệ thống

Hệ thống khuyến nghị phim cá nhân hóa thời gian thực xây dựng trên nền tảng kiến trúc phân tán Microservices. Dự án tích hợp đường ống dẫn dữ liệu lớn nhằm phân tải luồng tương tác và áp dụng thuật toán Lọc cộng tác (Collaborative Filtering) để dự đoán xu hướng điện ảnh của người dùng.

### Các mắt xích cốt lõi công nghệ:

* **Data Pipeline:** Node.js, `csv-parser`, RabbitMQ Message Broker.
* **Database:** MongoDB Atlas (NoSQL) lưu trữ đám mây.
* **AI Engine (Microservice):** Python, Flask, Pandas, Scikit-Learn.
* **API Gateway & Frontend:** Node.js, Express, Fetch API, HTML5/CSS3 (Dark Mode Netflix).

---

## 🛠️ Yêu cầu Cài đặt Môi trường

Để chạy được toàn bộ hệ thống phân tán này, máy tính của bạn cần được cài đặt sẵn:

1. **Node.js** (Phiên bản v16.x trở lên)
2. **Python** (Phiên bản 3.8 - 3.11)
3. **RabbitMQ Server** (Hoặc tài khoản đám mây trên CloudAMQP)
4. **MongoDB** (Hoặc cụm cơ sở dữ liệu đám mây MongoDB Atlas)

---

## 🚀 Hướng dẫn Triển khai & Chạy Hệ thống

Hệ thống cần được khởi động và chạy song song theo đúng thứ tự 3 bước nghiêm ngặt dưới đây để đảm bảo các Microservices kết nối không bị lỗi ngắt quãng:

### Bước 1: Khởi động bộ não AI Server (Terminal 1)

Cụm máy chủ Python phụ trách việc tải ma trận, tính toán độ tương đồng hình học và xuất kết quả dự đoán điểm số sao cho phim.

1. Mở thư mục chứa mã nguồn Python của dự án.
2. Cài đặt các thư viện tính toán nâng cao bằng lệnh:
```bash

```



pip install pandas scikit-learn flask pymongo dnspython certifi axios

```
3.  Khởi động server Flask:
    ```bash
python ai_server.py

```

```
*(Hệ thống sẽ báo chạy thành công tại địa chỉ API gốc: `http://localhost:5000`)*.

```

### Bước 2: Khởi động Backend API Gateway (Terminal 2)

Máy chủ trung gian đứng lớp phụ trách lọc rác dữ liệu, gọi AI lấy kết quả và liên lạc bên thứ 3 TMDB API để tải lười hình ảnh Poster về phân phối.

1. Mở thêm một Terminal mới độc lập trong VS Code (Terminal 2).
2. Cài đặt các gói thư viện Node.js phụ thuộc:
```bash
npm install express mongodb axios dotenv amqplib csv-parser

```



```
3.  Cấu hình mã khóa cá nhân `TMDB_API_KEY` của bạn vào đầu file `api.js` hoặc file `.env`.
4.  Khởi động Node.js server:
    ```bash
node api.js

```

```
*(Hệ thống sẽ báo cổng kết nối chạy thành công tại địa chỉ: `http://localhost:3000`)*.

```

### Bước 3: Mở Giao diện Dashboard hiển thị (Trình duyệt)

Do phần giao diện sử dụng cơ chế gọi Fetch API bất đồng bộ và kết xuất động thông qua JavaScript tĩnh:

1. Bạn tìm đến tệp tin `index.html` trong thư mục mã nguồn.
2. **Click đúp chuột** vào tệp tin đó để mở trực tiếp trên các trình duyệt phổ thông (Google Chrome, Cốc Cốc, Microsoft Edge,...).
3. Nhập mã định danh khán giả thử nghiệm (Ví dụ: `ML_112` hoặc `ML_1`) vào thanh tìm kiếm.
4. Bấm nút **"Khám Phá Ngay"** để kiểm tra hoạt động.

---

## 🔒 Cơ chế Xử lý Lỗi & Dọn rác Dữ liệu Đặc trưng

Hệ thống tích hợp sẵn các giải pháp Data Cleansing "bọc thép" chống sập hệ thống do dữ liệu bẩn lọt lưới:

* **Xử lý dữ liệu cấu trúc dị dạng `[object Object]`:** API Gateway tự động lọc bỏ các bản ghi rác này ra khỏi danh sách lịch sử bằng toán tử truy vấn `{ $not: { $type: "object" } }` của MongoDB để tránh làm treo ma trận AI.
* **Xử lý Bất đối xứng dữ liệu (Phim ẩn danh):** Khi gặp các mã phim ID cũ không có sẵn dữ liệu đồ họa, Node.js tự động kích hoạt cơ chế *Read-Through Cache*, liên lạc API TMDB mở rộng để đồng bộ cập nhật ngược lại vào MongoDB Atlas.
* **Tích hợp liên kết sâu (Deep Link):** Cho phép bấm trực tiếp vào bất kỳ poster phim nào trên giao diện để mở tab mới hướng thẳng sang trang thông tin chi tiết chính thức của bộ phim đó trên hệ thống TMDB toàn cầu.

---

## 📂 Cấu trúc Thư mục Dự án

```text
├── data/
│   └── ratings.csv          # Tệp dữ liệu thô đầu vào khổng lồ từ MovieLens
├── tmdb_producer.js         # Script trích xuất và phát tán dữ liệu phim lên RabbitMQ
├── batch_worker.js          # Consumer hứng tin nhắn theo lô nạp vào MongoDB
├── ai_server.py             # Microservice AI toán học (Flask Python)
├── api.js                   # Node.js API Gateway & Kết nối trung gian dữ liệu
├── index.html               # Frontend giao diện người dùng hiển thị
└── README.md                # Tệp hướng dẫn sử dụng hệ thống này

```