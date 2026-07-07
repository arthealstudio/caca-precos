# 🛒 Caça-Preços

Monitora preços de produtos (lentes, microfones, monitores) todo dia e avisa no WhatsApp quando cai abaixo do alvo ou bate o menor preço já visto.

## O que faz

- Roda scrapers em várias lojas 1x/dia (ou no botão "Caçar agora")
- Guarda histórico de preço por produto (JSON, sem banco)
- Dashboard web mostra melhor preço atual, menor histórico e gráfico
- Alerta no WhatsApp (grátis via CallMeBot) quando acha promoção

## Fontes

| Loja | Status | Como funciona |
|------|--------|---------------|
| **Mercado Livre** | ✅ funciona | scraping da página de listagem |
| **OLX** | ⚠️ pode bloquear | lê JSON da página; Cloudflare às vezes barra |
| **Amazon BR** | 🔌 plugável | precisa API de afiliado OU Actor pago (ver abaixo) |
| **AliExpress** | 🔌 plugável | precisa Actor/proxy headless (ver abaixo) |

## Instalar

```bash
npm install
```

## Rodar

```bash
npm start        # sobe o dashboard em http://localhost:3000 + agenda caçada diária 09:00
npm run hunt     # roda uma caçada agora no terminal (sem site)
```

## Configurar produtos

Edite `data/products.json`. Cada produto:

```json
{
  "id": "lente-50mm",
  "label": "Lente 50mm f1.8",
  "queries": ["lente 50mm f1.8", "50mm 1.8 usada"],
  "targetPrice": 900,
  "sources": ["mercadolivre", "olx"]
}
```

- `queries`: termos de busca (quanto mais específico, menos lixo)
- `targetPrice`: dispara alerta quando o melhor preço fica <= esse valor
- `sources`: quais lojas caçar pra esse produto

## Alerta no WhatsApp (CallMeBot, grátis)

1. Adicione o contato **+34 644 51 95 23** no seu WhatsApp
2. Mande a mensagem: `I allow callmebot to send me messages`
3. O bot responde com sua **apikey**
4. Defina as variáveis de ambiente antes de rodar:

```powershell
$env:WHATSAPP_PHONE  = "5551999998888"   # seu número, só dígitos, com DDI 55
$env:WHATSAPP_APIKEY = "123456"
npm start
```

Sem essas variáveis, o sistema roda normal mas só mostra promoção no site (não manda zap).

## Ativar Amazon / AliExpress

Essas lojas bloqueiam scraping direto. Rota recomendada: um Actor da Apify
(ou seu próprio proxy) que receba `?q=termo` e devolva `[{title, price, url, condition}]`.
Depois aponte por ENV:

```powershell
$env:AMAZON_SCRAPER_URL     = "https://seu-endpoint/amazon"
$env:ALIEXPRESS_SCRAPER_URL = "https://seu-endpoint/ali"
```

## Deixar 24/7 GRÁTIS (GitHub Actions + Pages) — recomendado

Não precisa servidor ligado. O GitHub roda a caçada sozinho todo dia, commita o
histórico e publica o dashboard. Zero custo, não dorme, não perde histórico.

**Passos (uma vez só):**

1. Crie um repositório no GitHub e dê push:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/caca-precos.git
   git push -u origin main
   ```
2. No repo: **Settings → Pages → Source: GitHub Actions**
3. No repo: **Settings → Secrets and variables → Actions → New repository secret**, crie:
   - `SCRAPER_API_KEY` — chave da ScraperAPI (fura o anti-bot de ML/OLX)
   - `WHATSAPP_PHONE` — seu número, ex `5551999998888`
   - `WHATSAPP_APIKEY` — chave do CallMeBot
4. **Actions → caca-precos → Run workflow** pra testar na hora (senão espera 09:00)

Dashboard fica em `https://SEU_USUARIO.github.io/caca-precos/`.
Alerta cai no WhatsApp quando acha promoção. Histórico incolumne no repo.

> Sem `SCRAPER_API_KEY` o Action roda mas os scrapers de ML/OLX voltam vazios
> (IP do GitHub é datacenter, bloqueado). A chave da ScraperAPI é o que faz funcionar.

## Rodar 24/7 alternativo (VPS/Railway)

Se preferir servidor de verdade: `npm start` roda dashboard + cron embutido.
Use `pm2 start src/server.js` num VPS. Render/Railway free dormem — não recomendo
pro cron diário.

## Horário da caçada

No `src/server.js`, linha do `cron.schedule('0 9 * * *', ...)`. Formato cron padrão.
