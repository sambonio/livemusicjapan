// Add a language: drop i18n/<code>.json in place and add it here.
const LANGS = { ja: '日本語', en: 'English' };
const FALLBACK = 'ja';

let lang, t = {}, data, filters = { when: 'all', city: '', genre: '', friendly: false };

function pickLang() {
  try { const saved = localStorage.getItem('lang'); if (LANGS[saved]) return saved; } catch {}
  const browser = (navigator.languages || [navigator.language]).map(l => l.slice(0, 2));
  return browser.find(l => LANGS[l]) || FALLBACK;
}

// Localised field: { ja, en, ... } -> current language, falling back to Japanese
const loc = v => (v && typeof v === 'object') ? (v[lang] || v[FALLBACK]) : v;

async function loadLang(code) {
  lang = code;
  t = await fetch(`i18n/${code}.json`).then(r => r.json());
  document.documentElement.lang = code;
  try { localStorage.setItem('lang', code); } catch {}
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t[el.dataset.i18n]);
  buildFilters();
  render();
}

function buildFilters() {
  document.getElementById('when').innerHTML = ['all', 'today', 'week'].map(k =>
    `<button data-when="${k}" aria-pressed="${filters.when === k}">${t[k]}</button>`).join('');
  const cities = [...new Set(Object.values(data.venues).map(v => v.city))];
  const genres = [...new Set(data.events.map(e => e.genre))];
  const opts = (list, label, sel) => `<option value="">${label}: ${t.all}</option>` +
    list.map(x => `<option value="${x}" ${x === sel ? 'selected' : ''}>${t[x] || x}</option>`).join('');
  document.getElementById('city').innerHTML = opts(cities, t.city, filters.city);
  document.getElementById('genre').innerHTML = opts(genres, t.genre, filters.genre);
}

const isoDate = d => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time

function matches(e) {
  const v = data.venues[e.venue];
  const today = isoDate(new Date());
  const weekEnd = isoDate(new Date(Date.now() + 6 * 864e5));
  if (filters.when === 'today' && e.date !== today) return false;
  if (filters.when === 'week' && (e.date < today || e.date > weekEnd)) return false;
  if (filters.city && v.city !== filters.city) return false;
  if (filters.genre && e.genre !== filters.genre) return false;
  if (filters.friendly && !(v.english && v.cards)) return false;
  return true;
}

function render() {
  const list = document.getElementById('list');
  const events = data.events.filter(matches).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  if (!events.length) { list.innerHTML = `<p class="empty">${t.none}</p>`; return; }
  const dayFmt = new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', weekday: 'short' });
  const yen = new Intl.NumberFormat(lang, { style: 'currency', currency: 'JPY' });
  let html = '', lastDay = '';
  for (const e of events) {
    const v = data.venues[e.venue];
    if (e.date !== lastDay) { html += `<h3 class="day">${dayFmt.format(new Date(e.date + 'T12:00'))}</h3>`; lastDay = e.date; }
    const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address);
    html += `<article class="card">
      <h2>${loc(e.artist)}</h2>
      <p class="venue">${loc(v.name)} · ${loc(v.area)}</p>
      <p class="meta">${t.open} ${e.open} / ${t.start} ${e.start} · ${yen.format(e.price)} + ${t.drink} ${yen.format(e.drink)}</p>
      <p class="meta">${loc(v.station)} · ${t.capacity} ${v.capacity} · <a href="${mapUrl}" target="_blank" rel="noopener">${t.map}</a></p>
      <div class="tags">
        <span class="tag">${t[e.genre] || e.genre}</span>
        ${v.cards ? `<span class="tag good">${t.cards}</span>` : `<span class="tag">${t.cash_only}</span>`}
        ${v.english ? `<span class="tag good">${t.english}</span>` : ''}
      </div>
    </article>`;
  }
  list.innerHTML = html;
}

document.addEventListener('click', e => {
  const w = e.target.closest('[data-when]');
  if (w) { filters.when = w.dataset.when; buildFilters(); render(); }
});
document.getElementById('city').onchange = e => { filters.city = e.target.value; render(); };
document.getElementById('genre').onchange = e => { filters.genre = e.target.value; render(); };
document.getElementById('friendly').onchange = e => { filters.friendly = e.target.checked; render(); };

const langSel = document.getElementById('lang');
langSel.innerHTML = Object.entries(LANGS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
langSel.onchange = e => loadLang(e.target.value);

// Android/desktop Chrome install prompt; iOS uses Share > Add to Home Screen
let deferred;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.getElementById('install').hidden = false; });
document.getElementById('install').onclick = async () => { if (deferred) { deferred.prompt(); deferred = null; } document.getElementById('install').hidden = true; };

const showOffline = () => document.getElementById('offline').hidden = navigator.onLine;
window.addEventListener('online', showOffline);
window.addEventListener('offline', showOffline);

(async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  data = await fetch('data/events.json').then(r => r.json());
  const code = pickLang();
  langSel.value = code;
  await loadLang(code);
  showOffline();
})();
