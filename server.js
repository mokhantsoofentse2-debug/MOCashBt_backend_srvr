const express = require('express');
const cors = require('cors');
const axios = require('axios');
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
const CTRADER_SERVER = process.env.CTRADER_SERVER;
const CTRADER_PASSWORD = process.env.CTRADER_PASSWORD;

// ✅ Collect all trading accounts dynamically
const tradingAccounts = Object.keys(process.env)
  .filter((key) => key.startsWith('MO_TRADER_'))
  .map((key) => ({
    name: key,
    accountNumber: process.env[key]
  }));

console.log('✅ Loaded Trading Accounts:', tradingAccounts);

// ------------------- Refresh Token Logic -------------------
async function refreshAccessToken() {
    try {
        console.log('🔄 Attempting to refresh access token...');
        const response = await axios.post(
            'https://openapi.spotware.com/connect/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: CTRADER_REFRESH_TOKEN,
                client_id: CTRADER_CLIENT_ID,
                client_secret: CTRADER_CLIENT_SECRET
            })
        );

        ctraderAccessToken = response.data.access_token;
        console.log('✅ Access token refreshed successfully!');
        return true;
    } catch (err) {
        console.error('❌ Failed to refresh access token:', err.response?.data || err.message);
        return false;
    }
}

// ------------------- cTrader Trade Function -------------------
async function openCtraderTrade(symbol, volume = 1000, type = 'BUY') {
    for (let acc of tradingAccounts) {
        try {
            const response = await axios.post(
                `https://openapi.spotware.com/connect/trading/v1/accounts/${acc.accountNumber}/orders`,
                {
                    symbolId: symbol,      // This must be a numeric symbol ID
                    orderType: 'MARKET',
                    tradeSide: type,       // BUY or SELL
                    volume: volume         // cTrader volume in units (e.g. 100000 = 1 lot for FX)
                },
                { headers: { Authorization: `Bearer ${ctraderAccessToken}` } }
            );
            console.log(`✅ Trade opened for ${symbol} on account ${acc.accountNumber}`, response.data);
        } catch (err) {
            if (err.response?.status === 401) {
                console.log('⚠️ Access token expired, refreshing...');
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    console.log('🔁 Retrying trade after token refresh...');
                    return openCtraderTrade(symbol, volume, type);
                } else {
                    console.error('❌ Could not refresh token, skipping trade.');
                }
            } else {
                console.error(`❌ Trade error for ${acc.accountNumber}:`, err.response?.data || err.message);
            }
        }
    }
}

// ------------------- Routes -------------------

// GET /status
app.get('/status', (req, res) => {
    res.json({
        botStatus,
        dailyPL,
        activeTrades,
        winRate,
        breakLevel,
        tradingAccounts: tradingAccounts.map(a => a.accountNumber)
    });
});

// POST /start
app.post('/start', async (req, res) => {
    botStatus = true;
    console.log('🚀 Bot started');
    if (symbols.length > 0) {
        for (let symbol of symbols) {
            await openCtraderTrade(symbol, 1000, 'BUY');
        }
    } else {
        console.log('⚠️ No symbols selected. No trades opened.');
    }
    res.json({ success: true, tradingAccounts });
});

// POST /stop
app.post('/stop', (req, res) => {
    botStatus = false;
    console.log('🛑 Bot stopped');
    res.json({ success: true });
});

// POST /account_config
app.post('/account_config', (req, res) => {
    const { accounts: accs, activeAccount: active } = req.body;
    if (accs) accounts = accs;
    if (active) activeAccount = active;
    console.log('📊 Account config updated:', accounts, activeAccount);
    res.json({ success: true });
});

// POST /set_symbols
app.post('/set_symbols', (req, res) => {
    const { symbols: newSymbols } = req.body;
    if (newSymbols) symbols = newSymbols;
    console.log('📈 Symbols updated:', symbols);
    res.json({ success: true });
});

// POST /full_margin
app.post('/full_margin', (req, res) => {
    fullMargin = !fullMargin;
    console.log('💥 Full margin mode:', fullMargin);
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
    console.log(`✅ Backend server running on port ${PORT}`);
});
