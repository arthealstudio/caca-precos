// Helpers comuns pros scrapers.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Se SCRAPER_API_KEY estiver definida, roteia por proxy residencial (ScraperAPI)
// pra furar o anti-bot de ML/OLX. Grátis até 1000 req/mês — sobra pra caçada diária.
// render=true faz o proxy executar o JS da página (necessário pra OLX/Amazon).
function proxied(url, {render = false} = {}) {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return url;
  const p = new URLSearchParams({
    api_key: key,
    url,
    country_code: 'br',
    render: String(render),
  });
  return `https://api.scraperapi.com/?${p.toString()}`;
}

export async function fetchHtml(url, {timeout = 30000, render = false} = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(proxied(url, {render}), {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'pt-BR,pt;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

// "R$ 1.299,90" -> 1299.9   |  "R$ 89" -> 89
export function parseBRL(text) {
  if (!text) return null;
  const clean = text
    .replace(/[^\d.,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : null;
}
