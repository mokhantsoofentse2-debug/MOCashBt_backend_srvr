const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let botStatus = 'off';
let symbols = [];

app.get('/status', (req, res) => {
  res.json({ botStatus, symbols });
});

app.post('/set_symbols', (req, res) => {
  const { symbols: newSymbols } = req.body;
  if (!Array.isArray(newSymbols)) return res.status(400).json({ status: 'Invalid symbols' });
  symbols = newSymbols;
  res.json({ status: 'Symbols updated: ' + symbols.join(',') });
});

app.post('/bot_toggle', (req, res) => {
  const { action } = req.body;
  if (action !== 'on' && action !== 'off') return res.status(400).json({ status: 'Invalid action' });
  botStatus = action;
  res.json({ status: 'Bot turned ' + botStatus.toUpperCase() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
