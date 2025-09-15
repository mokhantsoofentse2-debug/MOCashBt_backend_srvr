const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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

// ------------------- Token Management -------------------
let accessToken = process.env.CTRADER_ACCESS_TOKEN;
const refreshToken = process.env.CTRADER_REFRESH_TOKEN;
const clientId = process.env.CTRADER_CLIENT_ID;
const clientSecret = process.env.CTRADER_CLIENT_SECRET;

async function refreshAccessToken() {
    if (!refreshToken || !clientId || !clientSecret) {
        console.error("❌ Missing refresh token or client credentials in environment variables.");
        return false;
    }

    console.log("🔄 Refreshing cTrader access token...");
    try {
        const response = await fetch("https://api.spotware.com/connect/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("❌ Failed to refresh token:", data);
            return false;
        }

        accessToken = data.access_token;
        console.log("✅ Access token refreshed successfully!");
        return true;
    } catch (err) {
        console.error("❌ Error refreshing token:", err.message);
        return false;
    }
}

// ------------------- Utility: Place Trade -------------------
async function placeTrade(account, symbol, volume = 1000, side = 'BUY') {
    if (!accessToken) {
        console.error("❌ No access token available, attempting refresh...");
        const refreshed = await refreshAccessToken();
        if (!refreshed) return;
    }

    const payload = {
        accountId: account.accountNumber,
        symbol,
        volume,
        side,
        type: 'MARKET'
    };

    console.log("📤 Trade Payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch('https://demo-openapi.spotware.com/connect/trading', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.status === 401) {
            console.log("🔄 Token expired, refreshing and retrying trade...");
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return placeTrade(account, symbol, volume, side); // retry trade
            }
        }

        if (!response.ok) {
            console.error(`❌ Trade failed for ${account.accountNumber}:`, data);
        } else {
            console.log(`✅ Trade success for ${account.accountNumber}:`, data);
        }
    } catch (err) {
        console.error(`❌ Trade error for ${account.accountNumber}:`, err.message);
    }
}

// ------------------- Routes -------------------
app.get('/status', (req, res) => {
    res.json({ botStatus, dailyPL, activeTrades, winRate, breakLevel });
});

app.post('/start', async (req, res) => {
    botStatus = true;
    console.log('🤖 Bot started');

    if (activeAccount && symbols.length > 0) {
        const account = accounts.find(acc => acc.name === activeAccount);
        if (account) {
            await placeTrade(account, symbols[0]);
        } else {
            console.log("⚠️ No matching account found for activeAccount:", activeAccount);
        }
    }

    res.json({ success: true });
});

app.post('/stop', (req, res) => {
    botStatus = false;
    console.log('🛑 Bot stopped');
    res.json({ success: true });
});

app.post('/account_config', (req, res) => {
    const { accounts: accs, activeAccount: active } = req.body;
    if (accs) accounts = accs;
    if (active) activeAccount = active;
    console.log('✅ Active account set to:', activeAccount);
    res.json({ success: true });
});

app.post('/set_symbols', (req, res) => {
    const { symbols: newSymbols } = req.body;
    if (newSymbols) symbols = newSymbols;
    console.log('📊 Symbols updated:', symbols);
    res.json({ success: true });
});

app.post('/full_margin', (req, res) => {
    fullMargin = !fullMargin;
    console.log('⚡ Full margin mode:', fullMargin);
    res.json({ success: true, fullMargin });
});

// ------------------- Simulation -------------------
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
    console.log(`🚀 Backend server running on port ${PORT}`);
});
