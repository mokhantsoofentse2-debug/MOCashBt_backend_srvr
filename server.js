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
        const response = await axios.post('https://openapi.spotware.com/connect/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: CTRADER_REFRESH_TOKEN,
            client_id: CTRADER_CLIENT_ID,
            client_secret: CTRADER_CLIENT_SECRET
        }));

        ctraderAccessToken = response.data.access_token;
        console.log('🔄 Refreshed Access Token successfully!');
    } catch (err) {
        console.error('❌ Failed to refresh access token:', err.response?.data || err.message);
    }
}

// ------------------- cTrader Trade Function -------------------
async function openCtraderTrade(symbol, volume = 1000, type = 'Buy') {
    for (let acc of tradingAccounts) {
        try {
            const response = await axios.post(
                `https://openapi.spotware.com/connect/trading/v1/accounts/${acc.accountNumber}/orders`,
                {
                    symbolId: symbol, // needs to be the numeric symbol ID from cTrader Open API
                    orderType: 'MARKET',
                    tradeSide: type.toUpperCase(), // BUY or SELL
                    volume: volume, // in cTrader, volume = lot size in units (100,000 = 1 lot for forex)
                },
                { headers: { Authorization: `Bearer ${ctraderAccessToken}` } }
            );
            console.log(`✅ Trade opened for ${symbol} on account ${acc.accountNumber}`, response.data);
        } catch (err) {
            if (err.response?.status === 401) {
                console.log('⚠️ Access token expired. Refreshing...');
                await refreshAccessToken();
                return openCtraderTrade(symbol, volume, type); // retry after refresh
            }
            console.error(`❌ Error opening trade for ${symbol} on account ${acc.accountNumber}:`, err.response?.data || err.message);
        }
    }
}
