/* Regression suite for the Hindu Panchanga Calculator (index.html).
 *
 * Per the project CONSTITUTION, this must pass before every commit.
 * Run with:  npm test   (or: node test/regression.js)
 * Requires jsdom (a devDependency): npm install
 *
 * The app is a single self-contained index.html; this harness loads it into a
 * real DOM (jsdom), exercises the pure astronomy/jyotisha functions and the
 * interactive Sky-tab behaviours, and asserts known-good values from
 * Shri B.V. Raman's Muhurtha, Meeus, and earlier verification against the
 * SVBF-2026 calendar. It also fails on ANY runtime error and on undefined/NaN
 * leaks in rendered output.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  const s = String((e.detail && e.detail.stack) || e.message || e);
  if (!s.includes('getContext')) errors.push('jsdomError: ' + s); // canvas favicon is expected
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(HTML, { runScripts: 'dangerously', url: 'http://localhost/index.html', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
const doc = window.document;
const ev = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const X = window.eval.bind(window); // reach script-scoped `let` bindings (LOC, etc.)

let pass = 0, fail = 0;
const check = (name, cond, info = '') => { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (info ? '  ' + info : '')); } };
const sec = name => console.log('\n' + name);
const cellOverlays = id => doc.getElementById(id).querySelectorAll('.csign .csign-ref').length;

// ── Astronomy ───────────────────────────────────────────────
sec('Astronomy');
// Meeus worked example: Moon longitude at JDE 2448724.5 ≈ 133.162659° (±0.01°)
check('mlong Meeus example', Math.abs(window.mlong(2448724.5) - 133.162659) < 0.01, `(got ${window.mlong(2448724.5).toFixed(4)})`);
check('ayan ~24.2° in 2026', Math.abs(window.ayan(window.jd(new Date(2026,0,1,12,0,0))) - 24.2) < 0.2);
check('compassDir(NaN) safe', window.compassDir(NaN) === '—');
check('eclToHor finite at 89°N', (() => { const h = window.eclToHor(100, 5, 2461000, 89, -75); return Number.isFinite(h.alt) && Number.isFinite(h.az); })());
check('findRiseTime NaN-safe', window.findRiseTime(() => NaN, 2461000, 24) === null);

// ── Nakshatra / pada ────────────────────────────────────────
sec('Nakshatra & pada');
check('0° → Ashwini pada 1', window.nakAndPada(0).nIdx === 0 && window.nakAndPada(0).pada === 1);
check('359.99° → Revati pada 4', window.nakAndPada(359.99).nIdx === 26 && window.nakAndPada(359.99).pada === 4);
check('NaN → invalid flag', window.nakAndPada(NaN).invalid === true);

// ── 9-Tara (BV Raman Ch. III) ───────────────────────────────
sec('9-Tara');
{ const t = window.taraInfo(0, 21); check('Aswini→Sravana = Kshema, count 22', t.count === 22 && t.name === 'Kshema'); }
{ const t = window.taraInfo(3, 23); check('Rohini→Satabhisha = Vipat, cycle 3', t.count === 21 && t.name === 'Vipat' && t.cycle === 3); }
{ const ms = window.mitraStars(0); check('Aswini Mitra = Pushya/Anuradha/U.Bhadra', ms.mitra.join(',') === '7,16,25');
  check('Aswini Parama-Mitra = Ashlesha/Jyeshtha/Revati', ms.paramMitra.join(',') === '8,17,26'); }

// ── Ashtakuta (BV Raman Ch. IX) ─────────────────────────────
sec('Ashtakuta');
{ const k = window.ashtakuta(4, 22); check("Raman's Mrigashira×Dhanishtha total < 18", k.total < 18, `(got ${k.total})`);
  check('  Gana 0 (Deva×Rakshasa)', k.gana.score === 0);
  check('  Nadi 0 (same Pitta)', k.nadi.score === 0); }
check('same-nakshatra Nadi exemption → 8', window.ashtakuta(7, 7).nadi.score === 8);
{ let fired = false; outer: for (let b = 0; b < 27; b++) for (let g = 0; g < 27; g++) { if (b===g) continue; for (let pb=1;pb<=4;pb++) for (let pg=1;pg<=4;pg++) if (window.ashtakuta(b,g,pb,pg).nadi.padaException) { fired = true; break outer; } }
  check('pada-Nadi exception fires for some pair', fired); }

// ── Panchaka (BV Raman p.69) ────────────────────────────────
sec('Panchaka');
{ const p = window.panchaka(13, 1, 9, 6); check('tithi13+Sun+Ashlesha+Virgo = 29 → Agni', p.sum === 29 && p.remainder === 2 && p.name === 'Agni Panchaka'); }

// ── Lagna tyajya ────────────────────────────────────────────
sec('Lagna tyajya');
check('Aries 1.5° → Bhujanga', window.lagnaTyajya(1.5) && window.lagnaTyajya(1.5).zone === 'Bhujanga');
check('Gemini 15° → Gridhra', window.lagnaTyajya(2*30+15) && window.lagnaTyajya(2*30+15).zone === 'Gridhra');
check('Aries 5° → clear', window.lagnaTyajya(5) === null);

// ── DST / timezone ──────────────────────────────────────────
sec('Timezone (DST-aware)');
X("LOC.lat=40.598;LOC.lon=-74.611;LOC.tz=-300;LOC.iana='America/New_York';LOC.name='NJ';clearPCache();");
check('NY January → EST −300', X("resolveTz(new Date(2026,0,15))") === -300);
check('NY July → EDT −240', X("resolveTz(new Date(2026,6,15))") === -240);

// ── Custom-location validation ──────────────────────────────
sec('Custom locations');
X(`localStorage.setItem('pcCustomCities', JSON.stringify([
  {name:'Good Town',lat:14.4,lon:79.9},
  {name:'Bad Lat',lat:200,lon:10},
  {name:'Bad IANA',lat:10,lon:10,iana:'Not/AZone'},
  {name:'Nellore',lat:1,lon:1},
  'garbage', null, 42 ]));`);
{ const loaded = X('loadCustomCities()'); const names = loaded.map(c => c.name);
  check('valid kept', names.includes('Good Town'));
  check('bad lat dropped', !names.includes('Bad Lat'));
  check('bad IANA dropped', !names.includes('Bad IANA'));
  check('built-in dup dropped', !names.includes('Nellore')); }
X("localStorage.setItem('pcCustomCities','{not json');");
check('malformed JSON → empty', X('loadCustomCities()').length === 0);

// ── Sky tab: overlay auto-compute + slider ──────────────────
sec('Sky tab — overlays & slider');
doc.getElementById('scat').value = 'marriage'; ev(doc.getElementById('scat'), 'change');
check('participant slots built', !!doc.getElementById('pstar0') && !!doc.getElementById('pstar1'));
doc.getElementById('pbd0').value = '1990-06-15'; doc.getElementById('pbt0').value = '14:30';
const cityEl = doc.getElementById('pbc0'); cityEl.value = 'Delhi'; ev(cityEl, 'change'); // auto-compute, no button
check('overlay auto-computed', window.getParticipantMoments().length === 1);
check('overlay bodies in D-1 cells', cellOverlays('sky-d1') > 0, `(got ${cellOverlays('sky-d1')})`);
check('overlay bodies in D-N cells', cellOverlays('sky-dn') > 0);
// Bare star pick → scored but no overlay
doc.getElementById('scat').value = 'general'; ev(doc.getElementById('scat'), 'change');
const ps = doc.getElementById('pstar0'); ps.value = '5'; ev(ps, 'change');
check('bare star pick: no overlay', cellOverlays('sky-d1') === 0);
check('bare star pick: still scored', window.getParticipants().length === 1);
// Slider centred on solar noon
doc.getElementById('sky-date').value = '2026-07-04';
const noonMin = X("getSunTimes(new Date(2026,6,4,12,0,0), LOC.lat, LOC.lon).solarNoon");
const p2 = n => String(n).padStart(2, '0');
doc.getElementById('sky-time').value = `${p2(Math.floor(noonMin/60))}:${p2(Math.round(noonMin%60))}`;
window.renderSky();
check('slider ≈ 0 at solar noon', Math.abs(parseInt(doc.getElementById('sky-slider').value, 10)) <= 1);
{ const before = doc.getElementById('sky-d1').innerHTML; const sl = doc.getElementById('sky-slider');
  sl.value = '180'; ev(sl, 'input');
  check('slider drag re-renders chart', doc.getElementById('sky-d1').innerHTML !== before);
  check('slider drag sets time', doc.getElementById('sky-time').value !== `${p2(Math.floor(noonMin/60))}:${p2(Math.round(noonMin%60))}`); }

// ── Search result collapse/expand ───────────────────────────
sec('Search results');
doc.getElementById('scat').value = ''; ev(doc.getElementById('scat'), 'change');
doc.getElementById('ss').value = '2026-07-01'; doc.getElementById('se').value = '2026-07-31'; doc.getElementById('ssc').value = '0';
window.runSearch();
const items = [...doc.querySelectorAll('#sr .res-item')];
check('search produced results', items.length > 0, `(got ${items.length})`);
if (items.length) {
  click(items[Math.min(2, items.length-1)]);
  const vis = [...doc.querySelectorAll('#sr .res-item')].filter(it => it.style.display !== 'none');
  check('selection collapses other results', vis.length === 1);
  window.expandSearchResults();
  check('expand restores list', [...doc.querySelectorAll('#sr .res-item')].filter(it => it.style.display !== 'none').length === items.length);
}

// ── Viewing guide: no NaN/undefined at edge cases ───────────
sec('Viewing guide (edge cases)');
for (const [d, label] of [['2026-06-21','polar summer'], ['2026-12-21','polar winter']]) {
  X("LOC.lat=68.0;LOC.lon=18.0;LOC.tz=60;LOC.iana='Europe/Stockholm';LOC.name='Polar<x>';clearPCache();");
  doc.getElementById('sky-date').value = d; doc.getElementById('sky-time').value = '12:00';
  let ok = true; try { window.renderSky(); } catch (e) { ok = false; errors.push(label + ' render threw: ' + e.message); }
  const v = doc.getElementById('sky-view').innerHTML;
  check(label + ' renders', ok);
  check(label + ' no undefined/NaN', !/undefined|NaN/.test(v), (v.match(/.{40}(undefined|NaN)/) || [''])[0]);
}
check('LOC.name HTML-escaped in panel', !doc.getElementById('panel-sky').innerHTML.includes('Polar<x>'));

// ── Result ──────────────────────────────────────────────────
console.log('\n— runtime errors: ' + (errors.length || 'none'));
errors.slice(0, 8).forEach(e => console.log('   ' + e.slice(0, 300)));
console.log(`\n=== ${pass} passed, ${fail} failed, ${errors.length} runtime errors ===`);
process.exit((fail || errors.length) ? 1 : 0);
