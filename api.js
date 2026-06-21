const express = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CẤU HÌNH HỆ THỐNG
const TMDB_API_KEY = '550b538ce5133e3ab123c36ad7f786ca'; 
const MONGO_URI = "mongodb://quanganh8405:quanganh8405@ac-qrsjhnd-shard-00-00.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-01.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-02.r1fok8g.mongodb.net:27017/?ssl=true&replicaSet=atlas-zlqtil-shard-0&authSource=admin&appName=Crawler";
const client = new MongoClient(MONGO_URI);

async function connectDB() {
    try {
        await client.connect();
        console.log("🚀 Đã kết nối thành công tới cơ sở dữ liệu MongoDB Atlas!");
    } catch (err) {
        console.error("❌ Lỗi kết nối MongoDB:", err.message);
    }
}
connectDB();

// ========================================================
// 1. API LẤY LỊCH SỬ ĐÁNH GIÁ (GU CỦA BẠN) - CÓ LỌC RÁC & LAZY LOAD
// ========================================================
app.get('/api/users/:userId/history', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Lấy 5 đánh giá cao nhất và LOẠI BỎ tận gốc dữ liệu dạng Object bẩn [object Object]
        const ratings = await client.db('MovieBigData').collection('UserRatings')
            .find({ 
                userId: userId,
                movieId: { $not: { $type: "object" } } 
            })
            .sort({ rating: -1 })
            .limit(5)
            .toArray();

        if (ratings.length === 0) {
            return res.status(200).json({ success: true, data: [], message: "Khán giả chưa có lịch sử đánh giá sạch" });
        }

        const movieIds = ratings.map(r => parseInt(r.movieId));
        const moviesInDb = await client.db('MovieBigData').collection('TMDB_Movies')
            .find({ tmdb_id: { $in: movieIds } }).toArray();

        // Duyệt luồng tải lười nếu thiếu thông tin tên phim
        const history = await Promise.all(ratings.map(async (r) => {
            const mId = parseInt(r.movieId);
            let movieDetail = moviesInDb.find(m => m.tmdb_id === mId);

            if (!movieDetail) {
                try {
                    console.log(`[Lịch sử] Khách ${userId} từng xem phim ID ${mId} mà kho thiếu, đang đi lấy từ TMDB...`);
                    const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${mId}?api_key=${TMDB_API_KEY}&language=vi-VN`);
                    movieDetail = {
                        tmdb_id: tmdbRes.data.id,
                        title: tmdbRes.data.title
                    };
                    // Lưu đệm lại vào DB
                    await client.db('MovieBigData').collection('TMDB_Movies').updateOne(
                        { tmdb_id: movieDetail.tmdb_id },
                        { $set: movieDetail },
                        { upsert: true }
                    );
                } catch (err) {
                    return { title: `Phim mã ID ${mId}`, rating: r.rating };
                }
            }
            return { title: movieDetail.title, rating: r.rating };
        }));

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error("Lỗi lấy lịch sử:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================================
// 2. API LẤY PHIM AI GỢI Ý - CÓ LAZY LOAD & LỌC BỎ PHIM ẨN DANH (NULL)
// ========================================================
app.get('/api/users/:userId/recommendations', async (req, res) => {
    const userId = req.params.userId;
    try {
        // Gọi sang server Python AI
        const aiResponse = await axios.get(`http://127.0.0.1:5000/recommend/${userId}`);
        
        if (aiResponse.data.success) {
            const recommendations = aiResponse.data.recommendations;
            const movieIds = recommendations.map(r => parseInt(r.movieId));

            const moviesInDb = await client.db('MovieBigData').collection('TMDB_Movies')
                .find({ tmdb_id: { $in: movieIds } }).toArray();

            const finalResult = await Promise.all(recommendations.map(async r => {
                let movieDetail = moviesInDb.find(m => m.tmdb_id === parseInt(r.movieId));

                if (!movieDetail) {
                    try {
                        console.log(`[Gợi ý] Kho thiếu phim ID ${r.movieId}, đang phi ngựa sang TMDB lấy...`);
                        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${r.movieId}?api_key=${TMDB_API_KEY}&language=vi-VN`);
                        
                        movieDetail = {
                            tmdb_id: tmdbRes.data.id,
                            title: tmdbRes.data.title,
                            poster_url: tmdbRes.data.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbRes.data.poster_path}` : null
                        };
                        // Lưu đệm lưu kho vào DB
                        await client.db('MovieBigData').collection('TMDB_Movies').updateOne(
                            { tmdb_id: movieDetail.tmdb_id },
                            { $set: movieDetail },
                            { upsert: true }
                        );
                    } catch (err) {
                        console.log(`⚠️ Bỏ qua phim ID ${r.movieId} vì TMDB không tồn tại bộ phim này (Lỗi 404).`);
                        return null; // Trả về null để tí dùng màng lọc loại bỏ
                    }
                }

                return {
                    movieId: r.movieId,
                    predicted_rating: r.predicted_rating,
                    title: movieDetail.title,
                    poster_url: movieDetail.poster_url || "https://via.placeholder.com/500x750?text=No+Poster",
                    tmdb_url: `https://www.themoviedb.org/movie/${r.movieId}` // Đường link sâu chuyển hướng TMDB
                };
            }));
            
            // TRIỆT TIÊU "PHIM ẨN DANH": Lọc bỏ toàn bộ các bộ phim bị null khỏi danh sách trả về
            const cleanResult = finalResult.filter(m => m !== null);
            
            res.status(200).json({ success: true, data: cleanResult });
        } else {
            res.status(400).json({ success: false, message: "AI không thể tính toán đưa ra gợi ý" });
        }
    } catch (error) {
        console.error("Lỗi kết nối liên tầng mạng:", error.message);
        res.status(500).json({ success: false, message: "Hệ thống máy chủ AI đang bận bảo trì" });
    }
});

app.listen(3000, () => {
    console.log("🚀 API Gateway đang chạy mượt mà tại địa chỉ: http://localhost:3000");
});