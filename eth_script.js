
const symbol = 'ETHUSDT';
const waitingSeconds = 10;  // Change to 10 seconds
const rsiThreshold = 31;
const intervals = ['15m', '1h', '4h', '1d'];

async function fetchData(symbol, interval) {
    const baseUrl = 'https://api.binance.com/api/v3/klines';
    const params = new URLSearchParams({
        symbol: symbol,
        interval: interval,
        limit: 1000
    });
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();
    return data.map(candle => ({
        timestamp: new Date(candle[0]),
        close: parseFloat(candle[4])
    }));
}

async function fetchBitcoinPrice() {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
    const data = await response.json();
    const price = parseFloat(data.price);
    document.getElementById('bitcoinPrice').innerText = `Price: $${price.toFixed(2)}`;
    return price;
}

function calculateRSI(data, period = 14) {
    if (data.length < period) {
        return Array(data.length).fill(NaN);
    }
    let gains = [];
    let losses = [];
    for (let i = 1; i < period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(change));
        }
    }
    let avgGain = gains.reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    let rsis = [100 - 100 / (1 + avgGain / avgLoss)];
    for (let i = period; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgGain / avgLoss;
        rsis.push(100 - 100 / (1 + rs));
    }
    return rsis;
}

async function processInterval(symbol, interval, rsiPeriod, rsiThreshold) {
    const data = await fetchData(symbol, interval);
    const rsi = calculateRSI(data, rsiPeriod);
    const lastRSI = rsi[rsi.length - 1];
    const message = `RSI (${interval}): ${lastRSI.toFixed(2)}`;
    console.log(message);

    document.getElementById(`output${interval}`).innerText += message + '\n';

    if (lastRSI < rsiThreshold && interval == '4h') {
        alert(`RSI Alert! ${message}`);
        sendEmail(`RSI in ${interval}`, message);
    }

    // renderChart(data, rsi, interval);
}

function renderChart(data, rsi, interval) {
    const ctx = document.getElementById(`rsiChart${interval}`).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.slice(14).map(d => d.timestamp),
            datasets: [{
                label: `RSI (${interval})`,
                data: rsi.slice(14),
                borderColor: 'blue',
                fill: false,
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    }
                }
            }
        }
    });
}

function sendEmail(subject, message) {
    console.log(`Email sent: ${subject} - ${message}`);
}

async function main() {
    try {
        
        while (true) {
            document.getElementById('bitcoinPrice').innerText = ''; // Clear previous output
            document.getElementById('output4h').innerText = ''; 
            document.getElementById('output1h').innerText = ''; 
            document.getElementById('output15m').innerText = ''; 
            document.getElementById('output1d').innerText = '';
        
            await fetchBitcoinPrice(); // Fetch and display Bitcoin price initially
            
            for (const interval of intervals) {
                await processInterval(symbol, interval, 14, rsiThreshold);
            }
            
            console.log(`Waiting for ${waitingSeconds} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitingSeconds * 1000)); // Wait for 10 seconds now
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.addEventListener('DOMContentLoaded', main);
