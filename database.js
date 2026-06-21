const { MongoClient } = require('mongodb');
const fs = require('fs');

// BẠN HÃY DÁN CHUỖI KẾT NỐI VÀO ĐÂY (Nhớ đổi <password> thành mật khẩu thật)
const uri = "mongodb://quanganh8405:quanganh8405@ac-qrsjhnd-shard-00-00.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-01.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-02.r1fok8g.mongodb.net:27017/?ssl=true&replicaSet=atlas-zlqtil-shard-0&authSource=admin&appName=Crawler";

// Tạo client kết nối
const client = new MongoClient(uri);

async function uploadData() {
    try {
        console.log("Đang kết nối tới MongoDB Atlas...");
        await client.connect();
        console.log("Kết nối thành công!");

        // Tạo (hoặc chọn) Database tên là 'BigDataProject' và Collection 'Books'
        const database = client.db('BigDataProject');
        const collection = database.collection('Books');

        // Đọc dữ liệu từ file JSON bạn đã cào ở bước trước
        console.log("Đang đọc file books_data.json...");
        const rawData = fs.readFileSync('books_data.json', 'utf-8');
        const books = JSON.parse(rawData);

        // Đẩy toàn bộ dữ liệu lên database
        console.log(`Bắt đầu đẩy ${books.length} bản ghi lên mây...`);
        const result = await collection.insertMany(books);
        
        console.log(`Tuyệt vời! Đã chèn thành công ${result.insertedCount} cuốn sách vào Database.`);

    } catch (error) {
        console.error("Đã xảy ra lỗi:", error);
    } finally {
        // Luôn nhớ đóng kết nối khi hoàn thành
        await client.close();
        console.log("Đã đóng kết nối.");
    }
}

uploadData();
