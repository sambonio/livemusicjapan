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
  document.getElementById('source').textContent = data.sample ? t.sample :
    `${t.source} ${new Intl.DateTimeFormat(code, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.updated))}`;
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

// Sample data only: move the gigs so the first one is today, so the demo never runs empty
function shiftSampleDates() {
  const first = data.events.map(e => e.date).sort()[0];
  const offset = new Date(isoDate(new Date()) + 'T12:00') - new Date(first + 'T12:00');
  for (const e of data.events) e.date = isoDate(new Date(new Date(e.date + 'T12:00').getTime() + offset));
}

function matches(e) {
  const v = data.venues[e.venue];
  const today = isoDate(new Date());
  const weekEnd = isoDate(new Date(Date.now() + 6 * 864e5));
  if (e.date < today) return false;
  if (filters.when === 'today' && e.date !== today) return false;
  if (filters.when === 'week' && (e.date < today || e.date > weekEnd)) return false;
  if (filters.city && v.city !== filters.city) return false;
  if (filters.genre && e.genre !== filters.genre) return false;
  // Card payment is often unknown for real venues, so English support alone counts
  if (filters.friendly && !(v.english && v.cards !== false)) return false;
  return true;
}

// Listings come from venue websites, so never insert their text as HTML
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function render() {
  const list = document.getElementById('list');
  const events = data.events.filter(matches).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  if (!events.length) { list.innerHTML = `<p class="empty">${t.none}</p>`; return; }
  const dayFmt = new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', weekday: 'short' });
  const yen = new Intl.NumberFormat(lang, { style: 'currency', currency: 'JPY' });
  let html = '', lastDay = '';
  for (const e of events) {
    const v = data.venues[e.venue];
    if (e.date !== lastDay) { html += `<h3 class="day">${dayFmt.format(new Date(e.date + 'T12:00'))}</h3>`; lastDay = e.date; }
    const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address || v.name.en || v.name.ja);
    const title = loc(e.title);
    const timesText = [e.open && `${t.open} ${e.open}`, e.start && e.start !== e.open && `${t.start} ${e.start}`].filter(Boolean).join(' / ');
    const priceText = e.price != null ? yen.format(e.price) + (e.drink ? ` + ${t.drink} ${yen.format(e.drink)}` : '') : '';
    const place = [loc(v.station), v.capacity && `${t.capacity} ${v.capacity}`].filter(Boolean).map(esc).join(' · ');
    html += `<article class="card">
      <h2>${esc(loc(e.artist))}</h2>
      ${title && title !== loc(e.artist) ? `<p class="subtitle">${esc(title)}</p>` : ''}
      <p class="venue">${esc(loc(v.name))} · ${esc(loc(v.area))}</p>
      <p class="meta">${[timesText, priceText].filter(Boolean).map(esc).join(' · ')}</p>
      <p class="meta">${place} · <a href="${esc(mapUrl)}" target="_blank" rel="noopener">${t.map}</a>${e.url ? ` · <a href="${esc(e.url)}" target="_blank" rel="noopener">${t.details}</a>` : ''}</p>
      <div class="tags">
        <span class="tag">${esc(t[e.genre] || e.genre)}</span>
        ${e.soldOut ? `<span class="tag bad">${t.sold_out}</span>` : ''}
        ${v.cards === true ? `<span class="tag good">${t.cards}</span>` : v.cards === false ? `<span class="tag">${t.cash_only}</span>` : ''}
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
  // Real listings collected daily from venue sites; ?sample shows the demo data
  const sample = new URLSearchParams(location.search).has('sample');
  data = await fetch(sample ? 'data/events.json' : 'data/live-events.json').then(r => r.json());
  if (data.sample) shiftSampleDates();
  const code = pickLang();
  langSel.value = code;
  await loadLang(code);
  showOffline();
})();
