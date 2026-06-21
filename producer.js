const axios = require('axios');
const cheerio = require('cheerio');
const amqplib = require('amqplib');

async function scrapeAndPublish() {
    try {
        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queueName = 'books_queue';
        
        await channel.assertQueue(queueName, { durable: true });
        console.log('Đang cào dữ liệu từ website...');
        
        const { data } = await axios.get('http://books.toscrape.com/');
        const $ = cheerio.load(data);

        $('article.product_pod').each((index, element) => {
            const title = $(element).find('h3 a').attr('title');
            const priceText = $(element).find('.price_color').text();
            const price = parseFloat(priceText.replace('£', ''));

            if (title && !isNaN(price)) {
                const bookData = { title: title.trim(), price: price };
                
                // Bắn tin nhắn vào RabbitMQ
                channel.sendToQueue(queueName, Buffer.from(JSON.stringify(bookData)), {
                    persistent: true
                });
                console.log(`[Producer] Đã gửi vào Queue: ${bookData.title}`);
            }
        });

        setTimeout(() => {
            connection.close();
            console.log('Đã hoàn thành việc gửi dữ liệu lên hàng đợi!');
        }, 500);

    } catch (error) {
        console.error('Lỗi Producer:', error.message);
    }
}

scrapeAndPublish();