const axios = require('axios');
const amqplib = require('amqplib');

// BẠN DÁN API KEY CỦA TMDB VÀO ĐÂY
const TMDB_API_KEY = '550b538ce5133e3ab123c36ad7f786ca'; 
const TOTAL_PAGES = 50; // Số trang muốn cào (50 trang x 20 phim = 1000 phim)

// Kỹ thuật Big Data: Hàm tạo độ trễ để tránh bị khóa API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTMDBAndPublish() {
    try {
        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'tmdb_movies_queue'; 
        
        await channel.assertQueue(queueName, { durable: true });
        console.log(`🎬 Bắt đầu chiến dịch kéo ${TOTAL_PAGES} trang dữ liệu từ TMDB...`);

        // Vòng lặp lật từng trang
        for (let page = 1; page <= TOTAL_PAGES; page++) {
            try {
                console.log(`⏳ Đang gọi API Trang ${page}...`);
                
                // Thay đổi số trang động ở cuối URL
                const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=vi-VN&page=${page}`;
                const response = await axios.get(url);
                const movies = response.data.results;

                for (const movie of movies) {
                    const movieData = {
                        tmdb_id: movie.id,
                        title: movie.title,
                        original_title: movie.original_title,
                        overview: movie.overview,
                        release_date: movie.release_date,
                        vote_average: movie.vote_average,
                        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
                    };

                    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(movieData)), {
                        persistent: true
                    });
                }
                
                console.log(`✅ Đã gửi xong 20 phim của Trang ${page}`);
                
                // Bắt buộc: Nghỉ 0.5 giây trước khi cào trang tiếp theo
                await delay(500);

            } catch (pageError) {
                // Nếu một trang bị lỗi (ví dụ rớt mạng), báo lỗi nhưng vẫn cào tiếp trang sau
                console.error(`❌ Lỗi ở trang ${page}:`, pageError.message);
            }
        }

        console.log('🎉 Đã hoàn thành chiến dịch thu thập! Vui lòng chờ 2 giây để đóng kết nối.');
        setTimeout(() => {
            connection.close();
        }, 2000);

    } catch (error) {
        console.error('Lỗi khởi động Producer:', error.message);
    }
}

fetchTMDBAndPublish();
