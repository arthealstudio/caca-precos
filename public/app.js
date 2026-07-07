const brl = (n) =>
  n == null ? '—' : n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

function sparkline(series) {
  const pts = series.filter((s) => s.price != null);
  if (pts.length < 2) return '<div class="spark" style="color:var(--muted);font-size:12px">sem histórico ainda</div>';
  const w = 300, h = 40, pad = 2;
  const prices = pts.map((p) => p.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || 1;
  const step = (w - pad * 2) / (pts.length - 1);
  const d = pts
    .map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - ((p.price - min) / span) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return `<svg class="spark" width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/>
  </svg>`;
}

function card(p) {
  const cheapest = p.items[0] || null;
  const cur = cheapest ? cheapest.price : null;
  const isDeal = cur != null && cur <= p.target;
  const good = isDeal ? 'good' : '';
  const items = p.items
    .slice(0, 6)
    .map(
      (it) => `<li>
        <a href="${it.url}" target="_blank" title="${it.title}">${it.title}</a>
        <span class="p">${brl(it.price)} <span class="tag ${it.condition}">${it.condition}</span></span>
      </li>`
    )
    .join('');

  return `<article class="card ${isDeal ? 'deal' : ''}">
    <h2>${p.label} ${isDeal ? '🎯' : ''}</h2>
    <div class="target">Alvo: ${brl(p.target)} · fontes: ${p.sources.join(', ')}</div>
    <div class="prices">
      <div class="price-block"><div class="label">Melhor agora</div><div class="val ${good}">${brl(cur)}</div></div>
      <div class="price-block"><div class="label">Menor já visto</div><div class="val">${brl(p.allTimeMin?.price)}</div></div>
    </div>
    ${sparkline(p.series)}
    <ul class="items">${items || '<li style="color:var(--muted)">nenhum resultado — rode a caçada</li>'}</ul>
  </article>`;
}

// Modo server (local, com botão) OU modo estático (GitHub Pages, lê dashboard.json)
let staticMode = false;
async function fetchData() {
  try {
    const r = await fetch('/api/data');
    if (r.ok) return await r.json();
  } catch (_) {
    /* sem backend -> cai pro estático */
  }
  staticMode = true;
  const r = await fetch('data/dashboard.json', {cache: 'no-store'});
  return await r.json();
}

async function load() {
  const data = await fetchData();
  document.getElementById('grid').innerHTML = data.products.map(card).join('');
  if (staticMode) document.getElementById('huntBtn').style.display = 'none';

  const lr = data.lastRun;
  const st = document.getElementById('status');
  if (lr.running) st.textContent = 'caçando agora…';
  else if (lr.at) st.textContent = 'última caçada: ' + new Date(lr.at).toLocaleString('pt-BR');
  else st.textContent = 'nunca rodou';

  const srcs = data.lastRun.sourceStatus || {};
  document.getElementById('sources').innerHTML =
    'Fontes: ' +
    Object.entries(srcs)
      .map(([name, s]) =>
        s.error
          ? `<span class="src-err">${name}: ${s.error}</span>`
          : `<span class="src-ok">${name}: ${s.count} itens</span>`
      )
      .join(' · ') || 'sem dados de fonte';

  document.getElementById('huntBtn').disabled = lr.running;
}

document.getElementById('huntBtn').addEventListener('click', async () => {
  document.getElementById('huntBtn').disabled = true;
  await fetch('/api/hunt', {method: 'POST'});
  setTimeout(load, 1500);
});

load();
setInterval(load, 8000); // auto-refresh
