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

// 出発→到着 の経路上の点を求める（大円補間）
function interpolate(a, b, t) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(a.lat), λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat), λ2 = toRad(b.lng);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));
  if (d === 0) return { lat: a.lat, lng: a.lng, track: 0 };
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const lng = toDeg(Math.atan2(y, x));
  // 機首方位（到着地への初期方位）
  const θ = Math.atan2(
    Math.sin(λ2 - λ1) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  );
  return { lat, lng, track: (toDeg(θ) + 360) % 360 };
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
    const t = ((i * 0.137) % 0.8) + 0.1; // 経路上の進捗
    const pos = interpolate(AIRPORTS[o], AIRPORTS[d], t);
    list.push({
      id: 'DUMMY' + i,
      callsign: al.code + (100 + i * 7),
      airline: al.name,
      country: COUNTRIES[i % COUNTRIES.length],
      origin: AIRPORTS[o],
      destination: AIRPORTS[d],
      lat: pos.lat,
      lng: pos.lng,
      alt: 9000 + ((i * 733) % 3500),      // m
      velocity: 210 + ((i * 37) % 60),      // m/s
      track: pos.track,
    });
  }
  return list;
}

const ALL_PLANES = makeDummies(24);
let selected = null;

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
  .arcColor(() => 'rgba(90,200,250,0.75)')
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
  const el = document.createElement('div');
  el.className = 'plane';
  el.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">' +
    '<path d="M12 2l1.5 7.5L22 12l-8.5 2.5L12 22l-1.5-7.5L2 12l8.5-2.5z" transform="rotate(0 12 12)"/>' +
    '<path d="M12 3l1 8 8 1-8 1-1 8-1-8-8-1 8-1z"/></svg>';
  el.style.transform = `rotate(${d.track}deg)`;
  el.style.pointerEvents = 'auto';
  if (selected && selected.id === d.id) el.classList.add('selected');
  else if (selected) el.classList.add('dim');
  el.addEventListener('click', (e) => { e.stopPropagation(); selectPlane(d); });
  return el;
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

function render() {
  const list = currentList();
  world.htmlElementsData(list);
  $('count').textContent = `${list.length} 機を表示中`;
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

  world.arcsData([{
    startLat: d.origin.lat, startLng: d.origin.lng,
    endLat: d.destination.lat, endLng: d.destination.lng,
  }]);

  $('card').classList.add('open');
  $('card').setAttribute('aria-hidden', 'false');
  render(); // ハイライト/薄暗を反映
}

function closeCard() {
  selected = null;
  $('card').classList.remove('open');
  $('card').setAttribute('aria-hidden', 'true');
  world.arcsData([]);
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
$('status').textContent = `ダミー ${ALL_PLANES.length} 機を表示中 · Phase 1`;
