// Scraper da OLX. A página embute um JSON em window.__NEXT_DATA__ com os anúncios.
// OBS: OLX usa proteção anti-bot (Cloudflare). Pode retornar 403 sem proxy —
// nesse caso o scraper devolve [] e o dashboard mostra "bloqueado".
import * as cheerio from 'cheerio';
import {fetchHtml} from './util.js';

const NAME = 'olx';

function buildUrl(query) {
  return `https://www.olx.com.br/brasil?q=${encodeURIComponent(query.trim())}`;
}

export async function scrape(query) {
  const url = buildUrl(query);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const raw = $('#__NEXT_DATA__').first().text();
  if (!raw) return [];

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }

  // caminho típico dos anúncios; navegamos defensivamente
  const ads =
    json?.props?.pageProps?.ads ||
    json?.props?.pageProps?.listingProps?.adList ||
    [];

  const items = [];
  for (const ad of ads) {
    const priceNum = Number(String(ad.price || '').replace(/[^\d]/g, ''));
    if (!ad.subject || !priceNum || !ad.url) continue;
    items.push({
      source: NAME,
      title: ad.subject,
      price: priceNum,
      url: ad.url,
      condition: 'usado',
      query,
      scrapedAt: new Date().toISOString(),
    });
  }
  return items;
}

export default {name: NAME, scrape};
