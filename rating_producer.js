const amqplib = require('amqplib');

async function streamRatings() {
    try {
        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'movie_ratings_queue'; // Tên hàng đợi mới
        
        await channel.assertQueue(queueName, { durable: true });
        console.log('🚀 Đang khởi động hệ thống luồng dữ liệu đánh giá phim...');

        // Danh sách phim giả định (ID từ M01 đến M50)
        const movies = Array.from({ length: 50 }, (_, i) => `M${(i + 1).toString().padStart(2, '0')}`);
        
        // Hàm tạo dữ liệu ngẫu nhiên liên tục
        setInterval(() => {
            // Giả lập ID người dùng từ U001 đến U500
            const randomUserId = `U${Math.floor(Math.random() * 500) + 1}`.padStart(4, '0');
            const randomMovieId = movies[Math.floor(Math.random() * movies.length)];
            const randomRating = Math.floor(Math.random() * 5) + 1; // Điểm 1-5 sao

            const ratingData = {
                userId: randomUserId,
                movieId: randomMovieId,
                rating: randomRating,
                timestamp: new Date().toISOString()
            };

            // Bắn tin nhắn vào RabbitMQ
            channel.sendToQueue(queueName, Buffer.from(JSON.stringify(ratingData)), {
                persistent: true
            });
            
            console.log(`[Producer] 📤 Tài khoản ${ratingData.userId} vừa chấm ${ratingData.rating}⭐ cho phim ${ratingData.movieId}`);
        }, 100); // Tốc độ: Cứ 0.1 giây lại có 1 lượt đánh giá mới (10 messages/giây)

    } catch (error) {
        console.error('Lỗi Producer:', error.message);
    }
}

streamRatings();