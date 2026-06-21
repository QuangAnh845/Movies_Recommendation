const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeBooks() {
    try {
        console.log('Đang tải dữ liệu từ website...');
        // 1. Lấy HTML từ trang web
        const { data } = await axios.get('https://books.toscrape.com/catalogue/page-2.html');
        
        // 2. Load HTML vào Cheerio
        const $ = cheerio.load(data);
        const books = [];

        // 3. Trích xuất dữ liệu (Tìm tất cả các thẻ <article> có class 'product_pod')
        $('article.product_pod').each((index, element) => {
            // Lấy tiêu đề sách (nằm trong thẻ <h3> > <a>, thuộc tính title)
            const title = $(element).find('h3 a').attr('title');
            
            // Lấy giá tiền và làm sạch (bỏ ký tự '£', chuyển thành số)
            const priceText = $(element).find('.price_color').text();
            const price = parseFloat(priceText.replace('£', ''));

            // Thêm vào mảng nếu dữ liệu hợp lệ
            if (title && !isNaN(price)) {
                books.push({
                    id: index + 1,
                    title: title.trim(),
                    price: price
                });
            }
        });

        console.log(`Đã trích xuất thành công ${books.length} cuốn sách.`);

        // 4. Lưu dữ liệu ra file JSON
        fs.writeFileSync('books_data.json', JSON.stringify(books, null, 2), 'utf-8');
        console.log('Đã lưu dữ liệu vào file books_data.json!');

    } catch (error) {
        console.error('Đã xảy ra lỗi trong quá trình cào dữ liệu:', error.message);
    }
}

// Chạy hàm
scrapeBooks();