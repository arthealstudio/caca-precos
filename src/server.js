// Servidor do dashboard + agendador diário embutido.
// `npm start` -> sobe o site e agenda a caçada.
import express from 'express';
import cron from 'node-cron';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {hunt} from './hunt.js';
import {loadHistory, buildDashboardPayload} from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// estado da última caçada, em memória, pra o dashboard mostrar status das fontes
let lastRun = {at: null, running: false, sourceStatus: {}, deals: []};

app.use(express.static(join(__dirname, '..', 'public')));

// API: melhores preços atuais + histórico + mínimos
app.get('/api/data', (req, res) => {
  const payload = buildDashboardPayload();
  // sobrepõe o status ao vivo da última caçada em memória
  payload.lastRun = {
    at: lastRun.at || payload.lastRun.at,
    running: lastRun.running,
    sourceStatus: lastRun.sourceStatus,
  };
  res.json(payload);
});

// dispara caçada manual pelo botão do dashboard
app.post('/api/hunt', async (req, res) => {
  if (lastRun.running) return res.status(409).json({error: 'já rodando'});
  runHunt();
  res.json({started: true});
});

async function runHunt() {
  lastRun.running = true;
  try {
    const r = await hunt();
    lastRun = {at: r.runAt, running: false, sourceStatus: r.sourceStatus, deals: r.deals};
  } catch (e) {
    console.error('[hunt] erro:', e.message);
    lastRun.running = false;
  }
}

app.listen(PORT, () => {
  console.log(`\n🛒 Caça-Preços no ar: http://localhost:${PORT}`);
});

// Agenda: todo dia às 09:00 (horário do servidor). Ajuste o cron se quiser.
cron.schedule('0 9 * * *', () => {
  console.log('[cron] disparando caçada diária...');
  runHunt();
});

// roda uma vez ao subir (se nunca rodou hoje)
const hist = loadHistory();
const last = hist.runs[hist.runs.length - 1];
const hoje = new Date().toDateString();
if (!last || new Date(last.at).toDateString() !== hoje) {
  console.log('[boot] nenhuma caçada hoje — rodando agora...');
  runHunt();
}
