const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure config directory exists
const configDir = path.join(__dirname, 'config');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

// Routes
app.get('/status', (req, res) => {
    res.json({
        botStatus: 'on',
        symbols: ['EURUSD', 'DE30'],
        statistics: {
            dailyPL: '125.50',
            activeTrades: 2,
            winRate: 65,
            breakLevel: 35
        }
    });
});

// Save account configuration
app.post('/account_config', (req, res) => {
    try {
        console.log('Saving account config:', req.body);
        
        fs.writeFileSync(
            path.join(configDir, 'accounts.json'),
            JSON.stringify(req.body, null, 2)
        );
        
        res.json({ status: 'success', message: 'Account configuration saved' });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to save account configuration: ' + error.message 
        });
    }
});

// Get account configuration
app.get('/account_config', (req, res) => {
    try {
        const configPath = path.join(configDir, 'accounts.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({ accounts: [], activeAccount: '' });
        }
    } catch (error) {
        console.error('Load error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to load account configuration' 
        });
    }
});

// Save MQL5 settings
app.post('/mql_settings', (req, res) => {
    try {
        console.log('Saving MQL5 settings:', req.body);
        
        fs.writeFileSync(
            path.join(configDir, 'mql_settings.json'),
            JSON.stringify(req.body, null, 2)
        );
        
        res.json({ status: 'success', message: 'MQL5 settings saved' });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to save MQL5 settings: ' + error.message 
        });
    }
});

// Set symbols
app.post('/set_symbols', (req, res) => {
    try {
        console.log('Setting symbols:', req.body);
        
        fs.writeFileSync(
            path.join(configDir, 'symbols.json'),
            JSON.stringify(req.body, null, 2)
        );
        
        res.json({ status: 'success', symbols: req.body.symbols });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to set symbols' 
        });
    }
});

// Full margin mode
app.post('/full_margin', (req, res) => {
    console.log('Full margin request:', req.body);
    res.json({ status: 'success', message: 'Full margin mode enabled' });
});

// Toggle bot
app.post('/bot_toggle', (req, res) => {
    console.log('Bot toggle request:', req.body);
    res.json({ status: 'success', message: `Bot turned ${req.body.action}` });
});

// Start server
app.listen(PORT, () => {
    console.log(`M.O Cash Bot backend running on port ${PORT}`);
    console.log(`Config directory: ${configDir}`);
});
