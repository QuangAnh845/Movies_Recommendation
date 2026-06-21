const amqplib = require('amqplib');
const { MongoClient } = require('mongodb');

// DÁN CHUỖI KẾT NỐI MONGODB ATLAS CỦA BẠN VÀO ĐÂY
const mongoURI = "mongodb://quanganh8405:quanganh8405@ac-qrsjhnd-shard-00-00.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-01.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-02.r1fok8g.mongodb.net:27017/?ssl=true&replicaSet=atlas-zlqtil-shard-0&authSource=admin&appName=Crawler";
const client = new MongoClient(mongoURI);

async function startWorker() {
    try {
        await client.connect();
        // Tạo bảng mới tên là 'TMDB_Movies'
        const collection = client.db('MovieBigData').collection('TMDB_Movies');
        console.log("✅ Đã kết nối MongoDB Atlas (Bảng: TMDB_Movies)!");

        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'tmdb_movies_queue'; // Phải khớp với tên bên Producer
        
        await channel.assertQueue(queueName, { durable: true });
        channel.prefetch(10); 

        console.log(`[*] Worker đang chờ dữ liệu TMDB...`);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const movie = JSON.parse(msg.content.toString());
                
                // Lưu vào Database (Sử dụng updateOne với upsert để tránh lưu trùng lặp phim nếu chạy lại)
                await collection.updateOne(
                    { tmdb_id: movie.tmdb_id }, // Tìm theo ID của TMDB
                    { $set: movie },            // Cập nhật thông tin
                    { upsert: true }            // Nếu chưa có thì chèn mới
                );
                
                console.log(`[Worker] 💾 Đã lưu vào kho: ${movie.title}`);
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error("Lỗi Worker:", error);
    }
}

startWorker();
