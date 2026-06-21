const amqplib = require('amqplib');
const { MongoClient } = require('mongodb');

// DÁN CHUỖI KẾT NỐI MONGODB ATLAS CỦA BẠN VÀO ĐÂY
const mongoURI = "mongodb://quanganh8405:quanganh8405@ac-qrsjhnd-shard-00-00.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-01.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-02.r1fok8g.mongodb.net:27017/?ssl=true&replicaSet=atlas-zlqtil-shard-0&authSource=admin&appName=Crawler";
const client = new MongoClient(mongoURI);

async function startWorker() {
    try {
        await client.connect();
        // Tạo một Collection mới tên là 'UserRatings'
        const collection = client.db('MovieBigData').collection('UserRatings');
        console.log("✅ Đã kết nối MongoDB Atlas (Database: MovieBigData)!");

        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'movie_ratings_queue';
        
        await channel.assertQueue(queueName, { durable: true });
        
        // Cấu hình cho phép Worker xử lý 50 tin nhắn cùng lúc để tăng tốc
        channel.prefetch(50); 

        console.log(`[*] Worker đang chờ dữ liệu đánh giá. Nhấn CTRL+C để thoát.`);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const ratingData = JSON.parse(msg.content.toString());
                
                // Lưu vào Database
                await collection.insertOne(ratingData);
                console.log(`[Worker] 💾 Đã lưu DB: ${ratingData.userId} -> ${ratingData.movieId} (${ratingData.rating} sao)`);
                
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error("Lỗi Worker:", error);
    }
}

startWorker();
