/* =========================================================================
   Flight Globe — Phase 1
   globe.gl による地球儀 + ダミー機体 + Apple風UIの骨格。
   Phase 2 以降で OpenSky / adsbdb の実データに差し替える。
   ========================================================================= */

// ---- ダミー空港（Phase 4 で実データ化） ---------------------------------
const AIRPORTS = {
  HND: { name: '東京/羽田',  iata: 'HND', lat: 35.5494, lng: 139.7798 },
  NRT: { name: '成田',       iata: 'NRT', lat: 35.7720, lng: 140.3929 },
  LAX: { name: 'ロサンゼルス', iata: 'LAX', lat: 33.9416, lng: -118.4085 },
  JFK: { name: 'ニューヨーク', iata: 'JFK', lat: 40.6413, lng: -73.7781 },
  LHR: { name: 'ロンドン',    iata: 'LHR', lat: 51.4700, lng: -0.4543 },
  CDG: { name: 'パリ',        iata: 'CDG', lat: 49.0097, lng: 2.5479 },
  SIN: { name: 'シンガポール', iata: 'SIN', lat: 1.3644, lng: 103.9915 },
  SYD: { name: 'シドニー',    iata: 'SYD', lat: -33.9399, lng: 151.1753 },
  DXB: { name: 'ドバイ',      iata: 'DXB', lat: 25.2532, lng: 55.3657 },
  FRA: { name: 'フランクフルト', iata: 'FRA', lat: 50.0379, lng: 8.5622 },
};

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

// 大円上の点（t: 0=出発, 1=到着）
function greatCircle(a, b, t) {
  const φ1 = toRad(a.lat), λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat), λ2 = toRad(b.lng);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));
  if (d === 0) return { lat: a.lat, lng: a.lng };
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

// a から b への方位（度・0=北, 時計回り）
function bearing(a, b) {
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const θ = Math.atan2(
    Math.sin(Δλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  );
  return (toDeg(θ) + 360) % 360;
}

// 機体の現在位置と機首方位を p.t / p.dir から更新
function planeState(p) {
  const cur = greatCircle(p.origin, p.destination, p.t);
  const ahead = Math.min(0.999, Math.max(0.001, p.t + p.dir * 0.004));
  const nxt = greatCircle(p.origin, p.destination, ahead);
  p.lat = cur.lat;
  p.lng = cur.lng;
  p.track = bearing(cur, nxt); // 進行方向の局所方位
}

// ---- ダミー機体を生成 ---------------------------------------------------
const AIRLINES = [
  { code: 'JAL', name: '日本航空' }, { code: 'ANA', name: '全日本空輸' },
  { code: 'UAL', name: 'ユナイテッド航空' }, { code: 'BAW', name: 'ブリティッシュ・エアウェイズ' },
  { code: 'AFR', name: 'エールフランス' }, { code: 'SIA', name: 'シンガポール航空' },
  { code: 'UAE', name: 'エミレーツ航空' }, { code: 'DLH', name: 'ルフトハンザ' },
];
const COUNTRIES = ['Japan', 'United States', 'United Kingdom', 'France', 'Singapore', 'Germany', 'UAE', 'Australia'];
const CODES = Object.keys(AIRPORTS);

function makeDummies(n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    let o = CODES[(i * 3) % CODES.length];
    let d = CODES[(i * 7 + 2) % CODES.length];
    if (o === d) d = CODES[(i * 7 + 3) % CODES.length];
    const al = AIRLINES[i % AIRLINES.length];
    const p = {
      id: 'DUMMY' + i,
      callsign: al.code + (100 + i * 7),
      airline: al.name,
      country: COUNTRIES[i % COUNTRIES.length],
      origin: AIRPORTS[o],
      destination: AIRPORTS[d],
      alt: 9000 + ((i * 733) % 3500),          // m
      velocity: 210 + ((i * 37) % 60),          // m/s
      t: ((i * 0.137) % 0.8) + 0.1,             // 経路上の進捗
      dir: 1,                                   // 進行方向（往復）
      dt: 0.00018 + ((i * 37) % 60) * 1e-6,     // 1フレームあたりの進み（速度依存）
      lat: 0, lng: 0, track: 0,
    };
    planeState(p);
    list.push(p);
  }
  return list;
}

const ALL_PLANES = makeDummies(24);
let selected = null;
let hovered = null;

// ---- globe.gl セットアップ ----------------------------------------------
const world = Globe()(document.getElementById('globe'))
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
  .showAtmosphere(true)
  .atmosphereColor('#5ac8fa')
  .atmosphereAltitude(0.16)
  .htmlElementsData([])
  .htmlLat('lat')
  .htmlLng('lng')
  .htmlAltitude(0.012)
  .htmlElement(planeEl)
  .arcsData([])
  .arcColor((a) => a.preview ? 'rgba(90,200,250,0.35)' : 'rgba(90,200,250,0.9)')
  .arcAltitudeAutoScale(0.4)
  .arcStroke(0.6)
  .arcDashLength(0.5)
  .arcDashGap(0.25)
  .arcDashAnimateTime(3500);

world.pointOfView({ lat: 25, lng: 140, altitude: 2.5 }, 0);

// 自動回転
const controls = world.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.enableDamping = true;

// リサイズ追従
function fit() { world.width(window.innerWidth).height(window.innerHeight); }
window.addEventListener('resize', fit);
fit();

// ---- 機体の HTML アイコン ------------------------------------------------
function planeEl(d) {
  // 外側ラッパー = globe.gl が位置決めに使う（transform を毎フレーム上書きする）。
  // 内側 = 機首方位の回転専用。分離しないと回転が消える。
  const wrap = document.createElement('div');
  wrap.className = 'plane-wrap';
  const inner = document.createElement('div');
  inner.className = 'plane';
  inner.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2c-.62 0-1.12 1-1.12 2.24v5.02L2.5 13.6v1.68l8.38-2.44v4.6l-2.24 1.62v1.3L12 20.5l3.36.86v-1.3l-2.24-1.62v-4.6l8.38 2.44V13.6l-8.38-4.34V4.24C13.12 3 12.62 2 12 2z"/>' +
    '</svg>';
  inner.style.transform = `rotate(${d.track}deg)`;
  wrap.appendChild(inner);
  d.__wrap = wrap;
  d.__inner = inner;
  wrap.addEventListener('click', (e) => { e.stopPropagation(); selectPlane(d); });
  wrap.addEventListener('mouseenter', () => { hovered = d; showTip(d); buildArcs(); });
  wrap.addEventListener('mousemove', moveTip);
  wrap.addEventListener('mouseleave', () => { hovered = null; hideTip(); buildArcs(); });
  return wrap;
}

// ---- ホバー用ツールチップ + 航路弧プレビュー ---------------------------
const tip = document.createElement('div');
tip.id = 'tip';
tip.className = 'glass';
document.body.appendChild(tip);

function showTip(d) {
  tip.innerHTML =
    `<strong>${d.callsign}</strong><span>${d.origin.iata} → ${d.destination.iata}</span>`;
  tip.classList.add('show');
}
function moveTip(e) {
  tip.style.left = (e.clientX + 16) + 'px';
  tip.style.top = (e.clientY + 16) + 'px';
}
function hideTip() { tip.classList.remove('show'); }

function arcFor(d, preview) {
  return {
    startLat: d.origin.lat, startLng: d.origin.lng,
    endLat: d.destination.lat, endLng: d.destination.lng,
    preview,
  };
}
function buildArcs() {
  const arcs = [];
  if (selected) arcs.push(arcFor(selected, false));
  if (hovered && (!selected || hovered.id !== selected.id)) arcs.push(arcFor(hovered, true));
  world.arcsData(arcs);
}

// ---- 描画更新（フィルタ・上限を反映） -----------------------------------
const $ = (id) => document.getElementById(id);

function currentList() {
  const q = $('search').value.trim().toLowerCase();
  const limit = parseInt($('limit').value, 10);
  let list = ALL_PLANES;
  if (q) list = list.filter(p =>
    p.callsign.toLowerCase().includes(q) || p.country.toLowerCase().includes(q));
  return list.slice(0, limit);
}

function applyHighlight() {
  for (const p of ALL_PLANES) {
    if (!p.__wrap) continue;
    p.__wrap.classList.toggle('selected', !!selected && selected.id === p.id);
    p.__wrap.classList.toggle('dim', !!selected && selected.id !== p.id);
  }
}

function render() {
  const list = currentList();
  world.htmlElementsData(list);
  applyHighlight();
  $('count').textContent = `${list.length} 機を表示中`;
}

// ---- アニメーション: 大円航路上を往復で飛ばす --------------------------
function tick() {
  for (const p of ALL_PLANES) {
    p.t += p.dir * p.dt;
    if (p.t >= 0.97) { p.t = 0.97; p.dir = -1; }
    else if (p.t <= 0.03) { p.t = 0.03; p.dir = 1; }
    planeState(p);
    if (p.__inner) p.__inner.style.transform = `rotate(${p.track}deg)`;
  }
  render(); // 位置を反映（globe.gl が座標を読み直して再配置）
  requestAnimationFrame(tick);
}

// ---- 機体選択 → 詳細カード + 航路弧 -------------------------------------
function selectPlane(d) {
  selected = d;
  $('cCallsign').textContent = d.callsign;
  $('cAirline').textContent = d.airline;
  $('cFrom').textContent = d.origin.iata;
  $('cFromName').textContent = d.origin.name;
  $('cTo').textContent = d.destination.iata;
  $('cToName').textContent = d.destination.name;
  $('cAlt').textContent = (d.alt / 1000).toFixed(1) + ' km';
  $('cSpd').textContent = Math.round(d.velocity * 3.6) + ' km/h';
  $('cTrk').textContent = Math.round(d.track) + '°';
  $('cCountry').textContent = d.country;

  buildArcs();

  $('card').classList.add('open');
  $('card').setAttribute('aria-hidden', 'false');
  render(); // ハイライト/薄暗を反映
}

function closeCard() {
  selected = null;
  $('card').classList.remove('open');
  $('card').setAttribute('aria-hidden', 'true');
  buildArcs();
  render();
}

// ---- UI 配線 -------------------------------------------------------------
$('cardClose').addEventListener('click', closeCard);

$('search').addEventListener('input', render);

$('limit').addEventListener('input', (e) => {
  $('limitVal').textContent = e.target.value;
  render();
});

$('rotate').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const on = !btn.classList.contains('on');
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-checked', String(on));
  controls.autoRotate = on;
});

// 背景クリックで選択解除
world.onGlobeClick(closeCard);

// ---- 起動 ---------------------------------------------------------------
render();
requestAnimationFrame(tick); // アニメーション開始
$('status').textContent = `ダミー ${ALL_PLANES.length} 機が飛行中 · Phase 1`;
