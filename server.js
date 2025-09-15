const express = require('express');
const cors = require('cors');
const axios = require('axios'); // for cTrader REST API calls
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// ------------------- In-Memory State -------------------
let botStatus = false;
let dailyPL = 0;
let activeTrades = 0;
let winRate = 0;
let breakLevel = 0;
let accounts = [];
let activeAccount = '';
let symbols = [];
let fullMargin = false;

// ------------------- Read Environment Variables -------------------
const CTRADER_CLIENT_ID = process.env.CTRADER_CLIENT_ID;
const CTRADER_CLIENT_SECRET = process.env.CTRADER_CLIENT_SECRET;
let ctraderAccessToken = process.env.CTRADER_ACCESS_TOKEN;
const CTRADER_REFRESH_TOKEN = process.env.CTRADER_REFRESH_TOKEN;
const CTRADER_ACCOUNT_NUMBER = process.env.CTRADER_ACCOUNT_NUMBER;
const CTRADER_SERVER = process.env.CTRADER_SERVER;
const CTRADER_PASSWORD = process.env.CTRADER_PASSWORD;

// ------------------- Initialize cTrader Client -------------------
// This is pseudo-code; replace with your cTrader API methods if using a library
async function openCtraderTrade(symbol, volume = 1, type = 'Buy') {
    try {
        // Example REST API call structure
        const response = await axios.post(
            `https://openapi.spotware.com/ctrader/v1/accounts/${CTRADER_ACCOUNT_NUMBER}/trades`,
            {
                symbol,
                volume,
                type
            },
            {
                headers: {
                    Authorization: `Bearer ${ctraderAccessToken}`
                }
            }
        );
        console.log(`Trade opened for ${symbol}:`, response.data);
    } catch (err) {
        console.error(`Error opening trade for ${symbol}:`, err.message);
    }
}

// Optional: implement token refresh logic here if needed

// ------------------- Routes -------------------

// GET /status
app.get('/status', (req, res) => {
    res.json({
        botStatus,
        dailyPL,
        activeTrades,
        winRate,
        breakLevel
    });
});

// POST /start
app.post('/start', async (req, res) => {
    botStatus = true;
    console.log('Bot started');

    if (symbols.length > 0) {
        for (let symbol of symbols) {
            await openCtraderTrade(symbol, 1, 'Buy'); // adjust type/volume as needed
        }
    }

    res.json({ success: true });
});

// POST /stop
app.post('/stop', (req, res) => {
    botStatus = false;
    console.log('Bot stopped');
    res.json({ success: true });
});

// POST /account_config
app.post('/account_config', (req, res) => {
    const { accounts: accs, activeAccount: active } = req.body;
    if (accs) accounts = accs;
    if (active) activeAccount = active;
    console.log('Account config updated:', accounts, activeAccount);
    res.json({ success: true });
});

// POST /set_symbols
app.post('/set_symbols', (req, res) => {
    const { symbols: newSymbols } = req.body;
    if (newSymbols) symbols = newSymbols;
    console.log('Symbols updated:', symbols);
    res.json({ success: true });
});

// POST /full_margin
app.post('/full_margin', (req, res) => {
    fullMargin = !fullMargin;
    console.log('Full margin mode:', fullMargin);
    res.json({ success: true, fullMargin });
});

// ------------------- Dynamic Simulation -------------------
setInterval(() => {
    if (botStatus) {
        dailyPL += parseFloat((Math.random() * 10 - 5).toFixed(2));
        activeTrades = Math.floor(Math.random() * 5);
        winRate = Math.floor(Math.random() * 100);
        breakLevel = Math.floor(Math.random() * 100);
    }
}, 5000);

// ------------------- Start Server -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
