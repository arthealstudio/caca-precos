// Amazon BR — placeholder plugável.
// Amazon bloqueia scraping agressivamente (CAPTCHA/429). Duas rotas de verdade:
//   1) API oficial "Product Advertising API" (precisa conta de afiliado aprovada)
//   2) Um Actor pago (ex: Apify Amazon Scraper) via ENV AMAZON_SCRAPER_URL
// Enquanto não configurar, avisa honestamente em vez de fingir que funciona.
const NAME = 'amazon';

export async function scrape(query) {
  if (!process.env.AMAZON_SCRAPER_URL) {
    throw new Error(
      'Amazon não configurada — precisa API de afiliado ou proxy/Actor (ver README)'
    );
  }
  // Contrato esperado do endpoint externo: recebe ?q= e devolve
  // [{title, price, url, condition}]
  const res = await fetch(
    `${process.env.AMAZON_SCRAPER_URL}?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error(`Amazon scraper HTTP ${res.status}`);
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
