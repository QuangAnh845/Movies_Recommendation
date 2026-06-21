const amqplib = require('amqplib');
const { MongoClient } = require('mongodb');

// DÁN CHUỖI KẾT NỐI MONGODB VÀO ĐÂY
const mongoURI = "mongodb://quanganh8405:quanganh8405@ac-qrsjhnd-shard-00-00.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-01.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-02.r1fok8g.mongodb.net:27017/?ssl=true&replicaSet=atlas-zlqtil-shard-0&authSource=admin&appName=Crawler";
const client = new MongoClient(mongoURI);

async function startWorker() {
    try {
        await client.connect();
        const collection = client.db('BigDataProject').collection('Books');
        console.log("Đã kết nối MongoDB Atlas!");

        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'books_queue';
        
        await channel.assertQueue(queueName, { durable: true });
        channel.prefetch(1); // Chỉ xử lý 1 tin nhắn mỗi lần để chống nghẽn

        console.log(`[*] Worker đang chờ dữ liệu mới. Nhấn CTRL+C để thoát.`);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const book = JSON.parse(msg.content.toString());
                
                console.log(`[Worker] Đang nhận và lưu vào DB: ${book.title}`);
                await collection.insertOne(book);
                
                // Báo cho RabbitMQ biết đã lưu xong để xóa tin nhắn
                channel.ack(msg);
            }
        });

    } catch (error) {
        console.error("Lỗi Worker:", error);
    }
}

startWorker();
