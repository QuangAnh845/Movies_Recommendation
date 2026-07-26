require('dotenv').config();
const amqplib = require('amqplib');
const { MongoClient } = require('mongodb');

const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI);

async function startBatchWorker() {
    try {
        await client.connect();
        // XÓA dữ liệu cũ đi để làm lại từ đầu cho sạch
        const collection = client.db('MovieBigData').collection('UserRatings');
        await collection.deleteMany({ userId: { $regex: "^ML_" } }); 
        console.log("✅ Đã dọn dẹp dữ liệu cũ. Kết nối MongoDB thành công!");

        const connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'movie_ratings_queue';
        
        await channel.assertQueue(queueName, { durable: true });
        
        // Cho phép hứng 1000 tin nhắn cùng lúc
        channel.prefetch(1000); 
        console.log(`[*] Worker ĐANG CHẠY CHẾ ĐỘ BATCH (Gom lô 1000 dòng). Nhấn CTRL+C để thoát.`);

        let batch = [];

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                batch.push({ msgObject: msg, data: JSON.parse(msg.content.toString()) });

                // Khi gom đủ 1000 bản ghi, đẩy lên Database 1 LẦN DUY NHẤT
                if (batch.length >= 1000) {
                    const docsToInsert = batch.map(b => b.data);
                    await collection.insertMany(docsToInsert);
                    
                    // Xác nhận với RabbitMQ là đã làm xong cả ngàn tin nhắn
                    batch.forEach(b => channel.ack(b.msgObject));
                    
                    console.log(`[Worker] 🚀 ĐÃ LƯU MỘT LÔ 1000 ĐÁNH GIÁ LÊN MÂY!`);
                    batch = []; // Reset giỏ hàng
                }
            }
        });

    } catch (error) {
        console.error("Lỗi Worker:", error);
    }
}

startBatchWorker();
