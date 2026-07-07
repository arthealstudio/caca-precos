// AliExpress — placeholder plugável.
// Página é 100% JS (precisa navegador headless) e tem anti-bot forte.
// Rota real: Actor pago (Apify AliExpress Scraper) via ENV ALIEXPRESS_SCRAPER_URL
// Enquanto não configurar, avisa honestamente.
const NAME = 'aliexpress';

export async function scrape(query) {
  if (!process.env.ALIEXPRESS_SCRAPER_URL) {
    throw new Error('AliExpress não configurado — precisa Actor/proxy headless (ver README)');
  }
  const res = await fetch(
    `${process.env.ALIEXPRESS_SCRAPER_URL}?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error(`AliExpress scraper HTTP ${res.status}`);
  const data = await res.json();
  return (data || []).map((d) => ({
    source: NAME,
    title: d.title,
    price: Number(d.price),
    url: d.url,
    condition: d.condition || 'novo',
    query,
    scrapedAt: new Date().toISOString(),
  }));
}

export default {name: NAME, scrape};
