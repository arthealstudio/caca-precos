// Orquestrador: roda os scrapers pra cada produto/query, filtra relevância,
// grava histórico e dispara alerta de promoção.
import {loadProducts, recordRun, saveDashboard} from './store.js';
import {SCRAPERS} from './scrapers/index.js';
import {notifyDeals} from './notify.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Mantém só itens cujo título casa com metade+ das palavras-chave da query.
// Evita que um acessório barato entre como "melhor preço".
function isRelevant(title, query) {
  const tokens = norm(query)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return true;
  const t = norm(title);
  const hits = tokens.filter((tok) => t.includes(tok)).length;
  return hits / tokens.length >= 0.5;
}

export async function hunt({onLog = console.log} = {}) {
  const products = loadProducts();
  const results = {}; // productId -> [items]
  const sourceStatus = {}; // source -> {ok, count, error}

  for (const product of products) {
    const bucket = [];
    const seen = new Set();

    for (const source of product.sources) {
      const scraper = SCRAPERS[source];
      if (!scraper) continue;
      sourceStatus[source] ||= {ok: 0, error: null, count: 0};

      for (const query of product.queries) {
        try {
          const items = await scraper.scrape(query);
          const relevant = items.filter((it) => isRelevant(it.title, query));
          for (const it of relevant) {
            const key = it.url;
            if (seen.has(key)) continue;
            seen.add(key);
            bucket.push(it);
          }
          sourceStatus[source].ok++;
          sourceStatus[source].count += relevant.length;
          onLog(`[${product.id}] ${source} "${query}" -> ${relevant.length} itens`);
        } catch (e) {
          sourceStatus[source].error = e.message;
          onLog(`[${product.id}] ${source} "${query}" -> ERRO: ${e.message}`);
        }
        await sleep(1200); // educado com os servidores
      }
    }

    // ordena por preço asc, guarda top 20 por produto
    bucket.sort((a, b) => a.price - b.price);
    results[product.id] = bucket.slice(0, 20);
  }

  const {runAt, deals} = recordRun(results);
  saveDashboard(sourceStatus); // pré-computa o JSON que o site estático (Pages) lê
  onLog(`Caçada concluída ${runAt} — ${deals.length} promoção(ões) detectada(s)`);

  if (deals.length) await notifyDeals(deals);

  return {runAt, results, deals, sourceStatus};
}
