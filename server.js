const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

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

// ------------------- Load Environment Variables -------------------
const ctraderClientId = process.env.CTRADER_CLIENT_ID;
const ctraderClientSecret = process.env.CTRADER_CLIENT_SECRET;
const ctraderRefreshToken = process.env.CTRADER_REFRESH_TOKEN;
let ctraderAccessToken = process.env.CTRADER_ACCESS_TOKEN || '';

const tradingAccounts = [
    {
        name: "MO_TRADER_MAIN",
        accountNumber: process.env.MO_TRADER_MAIN
    }
];
console.log("✅ Loaded Trading Accounts:", tradingAccounts);

// ------------------- Helper: Refresh Access Token -------------------
async function refreshAccessToken() {
    try {
        console.log('🔄 Attempting to refresh access token...');
        const response = await axios.post('https://api.ctrader.com/connect/token', null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: ctraderRefreshToken,
                client_id: ctraderClientId,
                client_secret: ctraderClientSecret
            }
        });
        ctraderAccessToken = response.data.access_token;
        console.log('✅ Access token refreshed successfully!');
        return true;
    } catch (err) {
        console.error('❌ Failed to refresh token:', err.response?.data || err.message);
        return false;
    }
}

// ------------------- Routes -------------------

// GET /status
app.get('/status', (req, res) => {
    res.json({ botStatus, dailyPL, activeTrades, winRate, breakLevel });
});

// POST /start
app.post('/start', (req, res) => {
    botStatus = true;
    console.log('🚀 Bot started');
    res.json({ success: true });
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
    console.log('✅ Account config updated:', accounts, activeAccount);
    res.json({ success: true });
});

// POST /set_symbols
app.post('/set_symbols', (req, res) => {
    const { symbols: newSymbols } = req.body;
    if (newSymbols) symbols = newSymbols;
    console.log('✅ Symbols updated:', symbols);
    res.json({ success: true });
});

// POST /full_margin
app.post('/full_margin', (req, res) => {
    fullMargin = !fullMargin;
    console.log('⚡ Full margin mode:', fullMargin);
    res.json({ success: true, fullMargin });
});

// ------------------- Diagnostic Route -------------------
app.get('/test-ctrader', async (req, res) => {
    try {
        console.log('🔍 Testing cTrader API connectivity...');
        const accNum = tradingAccounts[0].accountNumber;
        const response = await axios.get(
            `https://api.ctrader.com/connect/trading/v1/accounts/${accNum}/symbols`,
            { headers: { Authorization: `Bearer ${ctraderAccessToken}` } }
        );
        console.log('✅ Successfully fetched symbols:', response.data?.symbols?.slice(0, 5));
        res.json({ success: true, sampleSymbols: response.data.symbols.slice(0, 5) });
    } catch (err) {
        if (err.response?.status === 401) {
            console.log('⚠️ Token expired — refreshing...');
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                console.log('🔁 Retrying symbol fetch with new token...');
                return res.redirect('/test-ctrader');
            }
        }
        console.error('❌ Failed to connect to cTrader:', err.response?.data || err.message);
        res.status(500).json({ success: false, error: err.response?.data || err.message });
    }
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
