// Scraper do Mercado Livre. Usa a página de listagem server-renderizada.
import * as cheerio from 'cheerio';
import {fetchHtml, parseBRL} from './util.js';

const NAME = 'mercadolivre';

function buildUrl(query) {
  // lista.mercadolivre.com.br usa hifens no lugar de espaços
  const slug = encodeURIComponent(query.trim().replace(/\s+/g, '-'));
  return `https://lista.mercadolivre.com.br/${slug}`;
}

export async function scrape(query) {
  const url = buildUrl(query);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const items = [];

  // ML muda o markup de tempos em tempos -> tentamos vários seletores de item.
  const cards = $(
    'li.ui-search-layout__item, div.ui-search-result__wrapper, div.poly-card'
  );

  cards.each((_, el) => {
    const card = $(el);

    const title =
      card.find('.poly-component__title, .ui-search-item__title, h2, h3').first().text().trim();

    const link =
      card.find('a.poly-component__title, a.ui-search-link, a.ui-search-item__group__element, a').first().attr('href') || '';

    // preço: pega a primeira fração de preço válida do card
    const priceText = card
      .find('.andes-money-amount__fraction, .price-tag-fraction')
      .first()
      .text()
      .trim();
    const price = parseBRL(priceText);

    const condition = /usad/i.test(card.text()) ? 'usado' : 'novo';

    if (title && price && link.startsWith('http')) {
      items.push({
        source: NAME,
        title,
        price,
        url: link.split('#')[0],
        condition,
        query,
        scrapedAt: new Date().toISOString(),
      });
    }
  });

  return items;
}

export default {name: NAME, scrape};
