// Alerta no WhatsApp via CallMeBot (grátis).
// Setup 1x: adicione o número do bot +34 644 51 95 23 (ver README), mande a mensagem
// que ele pede, e ele devolve sua apikey. Depois defina as ENV:
//   WHATSAPP_PHONE  -> seu número com DDI, só dígitos (ex: 5551999998888)
//   WHATSAPP_APIKEY -> a chave que o bot mandou
function fmtBRL(n) {
  return n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

export function buildMessage(deals) {
  const linhas = deals.map((d) => {
    const tag = d.hitTarget ? '🎯 abaixo do alvo' : '📉 menor preço já visto';
    const de = d.prevMin ? ` (antes ${fmtBRL(d.prevMin)})` : '';
    return `• ${d.product}: ${fmtBRL(d.price)} ${tag}${de}\n  ${d.item.title}\n  ${d.item.url}`;
  });
  return `🛒 Caça-Preços achou promoção!\n\n${linhas.join('\n\n')}`;
}

export async function sendWhatsApp(text) {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_APIKEY;
  if (!phone || !apikey) {
    console.log('[notify] WhatsApp não configurado (WHATSAPP_PHONE/APIKEY). Pulando envio.');
    return false;
  }
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`);
    console.log('[notify] WhatsApp enviado.');
    return true;
  } catch (e) {
    console.error('[notify] Falha ao enviar WhatsApp:', e.message);
    return false;
  }
}

export async function notifyDeals(deals) {
  if (!deals.length) return;
  await sendWhatsApp(buildMessage(deals));
}
