const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

let botStatus = false;
let activeAccount = process.env.MO_TRADER_MAIN || null;
let accessToken = process.env.CTRADER_ACCESS_TOKEN; // from Render env vars
let refreshToken = process.env.CTRADER_REFRESH_TOKEN; // for refreshing token if needed

// ✅ Helper: refresh access token if expired
async function refreshAccessToken() {
    try {
        console.log('🔄 Refreshing access token...');
        const res = await axios.post('https://api.ctrader.com/oauth/token', {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: process.env.CTRADER_CLIENT_ID,
            client_secret: process.env.CTRADER_CLIENT_SECRET
        });
        accessToken = res.data.access_token;
        console.log('✅ Token refreshed successfully.');
    } catch (err) {
        console.error('❌ Failed to refresh token:', err.response?.data || err.message);
    }
}

// ✅ Place Order Function
async function placeOrder(symbol, volume, side) {
    if (!activeAccount) {
        console.error('❌ No active account selected!');
        return;
    }

    try {
        console.log(`📤 Sending order: ${side} ${volume} ${symbol}`);
        console.log(`🔗 Endpoint: https://api.ctrader.com/connect/trading/v1/orders`);
        
        const response = await axios.post(
            `https://api.ctrader.com/connect/trading/v1/orders`,
            {
                accountId: activeAccount,
                symbolName: symbol,
                volume,
                tradeSide: side,
                orderType: "MARKET"
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        console.log('✅ Trade executed successfully:', response.data);
        return response.data;
    } catch (err) {
        console.error('❌ Trade error:', err.response?.data || err.message);

        // If unauthorized, try refreshing token once
        if (err.response && err.response.status === 401) {
            await refreshAccessToken();
            return placeOrder(symbol, volume, side);
        }
    }
}

// ---------- API ROUTES ----------
app.get('/status', (req, res) => {
    res.json({
        botStatus,
        dailyPL: 0,
        activeTrades: 0,
        winRate: 0,
        breakLevel: 0
    });
});

app.post('/start', (req, res) => {
    botStatus = true;
    console.log('🤖 Bot started');
    res.json({ success: true });
});

app.post('/stop', (req, res) => {
    botStatus = false;
    console.log('🛑 Bot stopped');
    res.json({ success: true });
});

app.post('/account_config', (req, res) => {
    const { accounts, activeAccount: selected } = req.body;
    activeAccount = selected;
    console.log(`✅ Active account set to: ${activeAccount}`);
    res.json({ success: true, activeAccount });
});

app.post('/set_symbols', (req, res) => {
    console.log('📊 Symbols updated:', req.body.symbols);
    res.json({ success: true });
});

app.post('/full_margin', (req, res) => {
    console.log('⚡ Full margin mode toggled.');
    res.json({ success: true });
});

// Example endpoint to test trade
app.post('/trade', async (req, res) => {
    const { symbol, volume, side } = req.body;
    const result = await placeOrder(symbol, volume, side);
    res.json(result || { success: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
