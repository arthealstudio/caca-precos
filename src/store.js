// Persistência simples em JSON. Sem dependência nativa.
// history.json guarda um snapshot por dia/execução, e o mínimo histórico por produto.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const PRODUCTS_FILE = join(DATA_DIR, 'products.json');
const DASHBOARD_FILE = join(DATA_DIR, 'dashboard.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, {recursive: true});
}

export function loadProducts() {
  return JSON.parse(readFileSync(PRODUCTS_FILE, 'utf-8')).products;
}

export function loadHistory() {
  ensureDir();
  if (!existsSync(HISTORY_FILE)) {
    return {runs: [], minByProduct: {}};
  }
  return JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
}

export function saveHistory(history) {
  ensureDir();
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Monta o payload que o dashboard consome (mesma forma no server e no modo estático).
export function buildDashboardPayload() {
  const history = loadHistory();
  const products = loadProducts();
  const latest = history.runs[history.runs.length - 1] || {results: {}, at: null};

  const payload = products.map((p) => {
    const items = latest.results[p.id] || [];
    const min = history.minByProduct[p.id] || null;
    const series = history.runs.map((run) => {
      const arr = run.results[p.id] || [];
      const cheapest = arr.length ? Math.min(...arr.map((i) => i.price)) : null;
      return {at: run.at, price: cheapest};
    });
    return {
      id: p.id,
      label: p.label,
      target: p.targetPrice,
      sources: p.sources,
      items,
      allTimeMin: min,
      series,
    };
  });

  return {products: payload, lastRun: {at: latest.at || null, running: false, sourceStatus: {}}};
}

// Escreve dashboard.json — usado pelo GitHub Pages (site estático, sem backend).
export function saveDashboard(sourceStatus = {}) {
  const payload = buildDashboardPayload();
  payload.lastRun.sourceStatus = sourceStatus;
  writeFileSync(DASHBOARD_FILE, JSON.stringify(payload, null, 2));
  return payload;
}

// Registra o resultado de uma caçada e devolve as promoções detectadas.
// deal = achou preço <= alvo OU abaixo do mínimo histórico do produto.
export function recordRun(results) {
  const history = loadHistory();
  const products = loadProducts();
  const runAt = new Date().toISOString();
  const deals = [];

  for (const product of products) {
    const items = results[product.id] || [];
    if (items.length === 0) continue;

    // melhor (mais barato) achado desta caçada
    const cheapest = items.reduce((a, b) => (b.price < a.price ? b : a));
    const prevMin = history.minByProduct[product.id]?.price ?? Infinity;

    const hitTarget = cheapest.price <= product.targetPrice;
    const beatRecord = cheapest.price < prevMin;

    if (hitTarget || beatRecord) {
      deals.push({
        product: product.label,
        productId: product.id,
        price: cheapest.price,
        prevMin: prevMin === Infinity ? null : prevMin,
        target: product.targetPrice,
        hitTarget,
        beatRecord,
        item: cheapest,
      });
    }

    if (beatRecord) {
      history.minByProduct[product.id] = {
        price: cheapest.price,
        item: cheapest,
        at: runAt,
      };
    }
  }

  history.runs.push({at: runAt, results});
  // mantém só os últimos 120 snapshots pra não inchar
  if (history.runs.length > 120) history.runs = history.runs.slice(-120);

  saveHistory(history);
  return {runAt, deals};
}
