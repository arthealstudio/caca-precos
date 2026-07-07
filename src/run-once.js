// Caçada manual: `npm run hunt`
import {hunt} from './hunt.js';

hunt().then((r) => {
  console.log('\n=== RESUMO ===');
  console.log('Fontes:', JSON.stringify(r.sourceStatus, null, 2));
  console.log('Promoções:', r.deals.length);
  process.exit(0);
});
