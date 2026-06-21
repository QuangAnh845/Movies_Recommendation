import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app) # Cho phép Frontend và Node.js gọi API không bị chặn

# Kết nối MongoDB Atlas
MONGO_URI = "mongodb://quanganh8405:quanganh8405@ac-qrsjhnd-shard-00-00.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-01.r1fok8g.mongodb.net:27017,ac-qrsjhnd-shard-00-02.r1fok8g.mongodb.net:27017/?ssl=true&replicaSet=atlas-zlqtil-shard-0&authSource=admin&appName=Crawler"
client = MongoClient(MONGO_URI)
db = client['MovieBigData']
collection = db['UserRatings']

@app.route('/recommend/<target_user>', methods=['GET'])
def get_recommendations(target_user):
    try:
        # 1. Lấy toàn bộ dữ liệu từ MongoDB về
        data = list(collection.find({}, {'_id': 0}))
        if not data:
            return jsonify({"success": True, "recommendations": []})
            
        df = pd.DataFrame(data)
        
        # 2. MÀNG LỌC DỌN RÁC: Ép kiểu tuyệt đối để loại bỏ dữ liệu rác dạng Object/Dict
        if 'userId' not in df.columns or 'movieId' not in df.columns or 'rating' not in df.columns:
            return jsonify({"success": True, "recommendations": []})
            
        df['userId'] = df['userId'].astype(str)
        df['movieId'] = df['movieId'].astype(str)
        df['rating'] = pd.to_numeric(df['rating'], errors='coerce').fillna(0)
        
        # Nếu user nhập vào chưa từng tồn tại trong DB, trả về mảng rỗng
        if target_user not in df['userId'].values:
            return jsonify({"success": True, "recommendations": []})

        # 3. Lập ma trận xoay Người dùng - Phim (User-Item Matrix)
        matrix = df.pivot_table(index='userId', columns='movieId', values='rating').fillna(0)
        
        # 4. Tính toán độ tương đồng Cosine
        user_sim = cosine_similarity(matrix)
        sim_df = pd.DataFrame(user_sim, index=matrix.index, columns=matrix.index)
        
        # Lấy ra top 5 người dùng có gu giống nhất (bỏ qua chính mình)
        nguoi_giong_nhat = sim_df[target_user].sort_values(ascending=False)[1:6]
        
        phim_da_xem = matrix.loc[target_user]
        phim_chua_xem = phim_da_xem[phim_da_xem == 0].index
        
        # 5. Dự đoán điểm số cho các phim chưa xem
        du_doan = {}
        for phim in phim_chua_xem:
            tong_diem = sum(do_tuong_dong * matrix.loc[u, phim] for u, do_tuong_dong in nguoi_giong_nhat.items() if matrix.loc[u, phim] > 0)
            tong_mau = sum(do_tuong_dong for u, do_tuong_dong in nguoi_giong_nhat.items() if matrix.loc[u, phim] > 0)
            if tong_mau > 0:
                du_doan[phim] = tong_diem / tong_mau
                
        # Sắp xếp lấy top 3 phim có điểm dự đoán cao nhất
        top_phim = sorted(du_doan.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Chuẩn hóa định dạng trả về cho Node.js API Gateway
        results = [{"movieId": phim_id, "predicted_rating": round(diem, 2)} for phim_id, diem in top_phim]
        
        return jsonify({"success": True, "recommendations": results})

    except Exception as e:
        print(f"❌ Lỗi AI Server: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)