import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.CT_API_KEY;
const ACCOUNT_ID = process.env.CT_ACCOUNT_ID;
const BASE_URL = 'https://openapi.spotware.com/connect/trading';

app.use(cors());
app.use(bodyParser.json());

let botStatus = false;
let accounts = [];
let activeAccount = null;

// ---- TRADING ENGINE STATE ----
let openTrades = []; // store open trades with type (outer/inner), SL, entry etc.

// ---- NEW HELPER: Outer & Inner Trade Handling ----
function placeOuterStructureTrade(setup) {
    const trade = {
        id: Date.now(),
        type: 'outer',
        entry: setup.entry,
        sl: setup.isBuy ? setup.low - setup.buffer : setup.high + setup.buffer,
        tp: setup.target,
        active: true,
        candleCount: 0
    };
    openTrades.push(trade);
    return trade;
}

function placeInnerTrade(signal, parentSetup) {
    const trade = {
        id: Date.now(),
        type: 'inner',
        entry: signal.entry,
        sl: signal.sl,
        tp: signal.tp,
        active: true,
        candleCount: 0
    };
    openTrades.push(trade);
    return trade;
}

function updateTradesOnCandleClose() {
    openTrades.forEach(trade => {
        if (!trade.active) return;

        trade.candleCount++;

        if (trade.type === 'inner') {
            if (trade.candleCount === 2) {
                // move SL to breakeven after 2 candles
                trade.sl = trade.entry;
            }
            if (trade.candleCount % 3 === 0) {
                // trail SL every 3 candles to lock profits
                trailInnerTradeSL(trade);
            }
        }
    });
}

function trailInnerTradeSL(trade) {
    // simplistic trailing logic — adjust SL closer to price
    if (trade.tp && trade.entry) {
        const direction = trade.tp > trade.entry ? 'buy' : 'sell';
        if (direction === 'buy') {
            trade.sl = Math.max(trade.sl, trade.entry + (trade.tp - trade.entry) * 0.3);
        } else {
            trade.sl = Math.min(trade.sl, trade.entry - (trade.entry - trade.tp) * 0.3);
        }
    }
}

function checkTargetsAndClose() {
    openTrades.forEach(trade => {
        if (!trade.active) return;
        // pseudo-price check
        const currentPrice = getCurrentPrice(); // implement with your data feed
        if (trade.type === 'outer' && (currentPrice >= trade.tp || currentPrice <= trade.tp)) {
            // close outer trade, then keep SL trail for extra profits
            trade.active = false;
            lockExtraProfits();
        }
    });
}

function lockExtraProfits() {
    // gather all SLs and hold for extended run
    openTrades.forEach(t => {
        if (t.type === 'inner') {
            t.sl = t.sl; // keep as trailing profit lock
        }
    });
}

function getCurrentPrice() {
    // Placeholder for actual price feed connection
    return Math.random() * 100; // mock value
}

// ---- BOT CONTROL ENDPOINTS ----
app.get('/status', (req, res) => {
    res.json({ botStatus, dailyPL: 0, activeTrades: openTrades.length, winRate: 0, breakLevel: 0 });
});

app.post('/start', (req, res) => {
    botStatus = true;
    res.json({ success: true });
});

app.post('/stop', (req, res) => {
    botStatus = false;
    res.json({ success: true });
});

app.post('/account_config', (req, res) => {
    accounts = req.body.accounts;
    activeAccount = req.body.activeAccount;
    res.json({ success: true });
});

app.post('/set_symbols', (req, res) => {
    // handle symbol updates
    res.json({ success: true });
});

app.post('/full_margin', (req, res) => {
    // toggle full margin mode
    res.json({ success: true });
});

// ---- MAIN LOOP ----
setInterval(() => {
    if (!botStatus) return;
    updateTradesOnCandleClose();
    checkTargetsAndClose();
}, 5000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
