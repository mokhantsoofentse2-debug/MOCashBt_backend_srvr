const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' })); // allow all domains to connect
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
app.post('/start', (req, res) => {
    botStatus = true;
    console.log('Bot started');
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
// Optional: simulate stats for demo
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
