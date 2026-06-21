const fs = require('fs');
const csv = require('csv-parser');
const amqplib = require('amqplib');

const idMap = new Map(); 

async function startDataPipeline() {
    try {
        console.log("1. Đang tải từ điển ánh xạ ID...");
        await new Promise((resolve) => {
            fs.createReadStream('links.csv')
                .pipe(csv())
                .on('data', (row) => {
                    if (row.tmdbId) idMap.set(row.movieId, row.tmdbId);
                })
                .on('end', resolve);
        });

        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'movie_ratings_queue'; 
        await channel.assertQueue(queueName, { durable: true });

        console.log("2. Bắt đầu đẩy dữ liệu người dùng thật (ratings.csv)...");
        let count = 0;

        fs.createReadStream('ratings.csv')
            .pipe(csv())
            .on('data', (row) => {
                // ĐÃ SỬA: Dùng .get() để đối chiếu ID
                const tmdbId = idMap.get(row.movieId); 

                if (tmdbId) {
                    const ratingData = {
                        userId: `ML_${row.userId}`,
                        movieId: tmdbId,
                        rating: parseFloat(row.rating),
                        timestamp: row.timestamp
                    };

                    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(ratingData)), { persistent: true });
                    count++;
                }
            })
            .on('end', () => {
                console.log(`🎉 Đã đọc xong! Đã đẩy vào luồng ${count} đánh giá.`);
                console.log("⏳ Đang chờ 10 giây để đảm bảo tin nhắn không bị kẹt ở vòi nước trước khi ngắt kết nối...");
                // Tăng thời gian chờ lên 10 giây để xả hết dữ liệu vào RabbitMQ
                setTimeout(() => connection.close(), 10000); 
            });

    } catch (error) {
        console.error("Lỗi Pipeline:", error);
    }
}

startDataPipeline();