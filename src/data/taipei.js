// 雙城公開資料整合
//   - 新北市 (data.ntpc.gov.tw): 即時垃圾車 GPS + 路線站點
//   - 台北市 (data.taipei): 僅有排程路線(每站抵達/離開時間),沒公開即時 GPS
//
// 兩家都不回 CORS,dev 全走 vite proxy。正式環境要自建同樣 rewrite 的後端。

import {
  DEFAULT_LOCATION, WASTE_TYPES, WEEKLY, TODAY_IDX,
  GUIDE, DATA_SOURCE,
} from './staticData.js';

const NTPC_BASE = '/api/ntpc';
const NTPC_DATASET_TRUCKS = '28ab4122-60e1-4065-98e5-abccb69aaca6';
const NTPC_DATASET_ROUTES = 'edc3ad26-8ae7-4916-a00b-bc6048d19bf8';

const TPE_BASE = '/api/taipei';
const TPE_DATASET_ROUTES = 'a6e90031-7ec4-4089-afb5-361a4efe7202';

// ── geo utils ─────────────────────────────────────────────
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateEta(distanceKm) {
  return Math.max(1, Math.round((distanceKm / 15) * 60));
}

// 把任一 Date 拆成「Asia/Taipei」當地的 year/month/day/hour/minute/second。
// 所有班次時刻、是否過期、是否跨日都以 Taipei 為準,避免使用者本機時區干擾。
export function taipeiParts(date = new Date()) {
  // sv-SE locale 給 "YYYY-MM-DD HH:mm:ss" 格式,方便拆
  const s = date.toLocaleString('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const [d, t] = s.split(' ');
  const [year, month, day] = d.split('-').map(Number);
  const [hour, minute, second] = t.split(':').map(Number);
  return { year, month, day, hour, minute, second };
}

function deriveStatus(timeStr) {
  const parsed = Date.parse(timeStr.replace(/\//g, '-'));
  if (Number.isNaN(parsed)) return 'scheduled';
  const ageMin = (Date.now() - parsed) / 60000;
  if (ageMin < 2) return 'approaching';
  if (ageMin < 5) return 'enroute';
  return 'scheduled';
}

function inferAccepts() {
  return ['general', 'food'];
}

// HHMM "1630" → minutes-since-midnight 990
function hhmmToMinutes(hhmm) {
  const s = String(hhmm).padStart(4, '0');
  return parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(2), 10);
}

// ── fetchers ──────────────────────────────────────────────
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.json();
}

// 新北市即時垃圾車
async function fetchNtpcTrucks() {
  const url = `${NTPC_BASE}/api/datasets/${NTPC_DATASET_TRUCKS}/json?page=0&size=1000`;
  const rows = await fetchJson(url);
  return rows
    .filter((r) => r.longitude && r.latitude)
    .map((r) => ({
      id: `NT-${r.lineid}-${r.car}`,
      route: `${r.cityname} ${r.lineid}`,
      currentStop: r.location,
      accepts: inferAccepts(),
      latlng: { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) },
      status: deriveStatus(r.time),
      car: r.car,
      cityname: r.cityname,
      lineid: r.lineid,
      time: r.time,
      source: 'ntpc',
      realtime: true,
    }));
}

// 新北市站點 (lazy: 3.4MB / 11s,只有地址搜尋會用)
export async function fetchNtpcStops() {
  const url = `${NTPC_BASE}/api/datasets/${NTPC_DATASET_ROUTES}/json?page=0&size=5000`;
  const rows = await fetchJson(url);
  return rows
    .filter((r) => r.longitude && r.latitude && r.name)
    .map((r) => ({
      id: `NT-${r.lineid}-${r.rank}`,
      name: r.name,
      city: r.city,
      village: r.village,
      linename: r.linename,
      time: r.time,
      latlng: { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) },
      source: 'ntpc',
    }));
}

// 台北市排程站點 —— data.taipei 每頁上限 1000,4015 筆要分頁
// 先抓第 1 頁拿到 count,後續分頁平行抓 (序列 5×6s → 平行 ~6s)
async function fetchTaipeiCityRoutes() {
  const pageSize = 1000;
  const url = (offset) =>
    `${TPE_BASE}/api/v1/dataset/${TPE_DATASET_ROUTES}?scope=resourceAquire&limit=${pageSize}&offset=${offset}`;
  const first = await fetchJson(url(0));
  const total = first.result.count;
  const restOffsets = [];
  for (let offset = pageSize; offset < total; offset += pageSize) restOffsets.push(offset);
  const restPages = await Promise.all(restOffsets.map((off) => fetchJson(url(off))));
  const all = [first.result.results, ...restPages.map((p) => p.result.results)].flat();
  return all.filter((r) => r.經度 && r.緯度 && r.地點);
}

// 從台北排程資料衍生出:
//   stops: 以「地點」去重
//   scheduledTrucks: 每台車 (車號+路線+車次) 找下一個尚未過的抵達時間
function deriveFromTaipeiRoutes(rows) {
  // 全部以 Taipei 在地時間為準 (排程資料就是 Taipei 時間)
  const tpe = taipeiParts();
  const nowMin = tpe.hour * 60 + tpe.minute;

  // 站點去重
  const stopMap = new Map();
  for (const r of rows) {
    const key = `TP-${r.行政區}-${r.地點}`;
    if (!stopMap.has(key)) {
      stopMap.set(key, {
        id: key,
        name: r.地點,
        city: r.行政區,
        village: r.里別,
        linename: r.路線,
        time: r.抵達時間,
        latlng: { lat: parseFloat(r.緯度), lng: parseFloat(r.經度) },
        source: 'taipei',
      });
    }
  }

  // 每台車找「當前或下一個」站:
  //   離開時間 < Taipei 現在 → 今天這段過了,把它視為「明天同時刻」(arrMin += 1440)
  //   抵達時間 ≤ 現在 ≤ 離開時間 → 目前靠站中 (at_stop)
  //   抵達時間 > 現在 → 即將到達
  // 取每 (車號+路線+車次) 離我們最「近」的那筆 (含跨日 wrap 後的最小 arrMin)
  const truckMap = new Map();
  for (const r of rows) {
    let arrMin = hhmmToMinutes(r.抵達時間);
    let leaveMin = hhmmToMinutes(r.離開時間);
    if (leaveMin < nowMin) {
      arrMin += 1440;   // 整段已過 → 視為明天同樣時刻
      leaveMin += 1440;
    }
    const key = `TP-${r.車號}-${r.路線}-${r.車次}`;
    const existing = truckMap.get(key);
    if (!existing || existing._arrMin > arrMin) {
      truckMap.set(key, { ...r, _arrMin: arrMin, _leaveMin: leaveMin });
    }
  }

  const scheduledTrucks = [...truckMap.values()].map((r) => {
    const arrMin = r._arrMin;
    const leaveMin = r._leaveMin;
    const atStop = arrMin <= nowMin && nowMin <= leaveMin;
    const eta = atStop ? 0 : Math.max(0, arrMin - nowMin);
    // arrMin 可能 ≥ 1440 (跨日 wrap),顯示時 mod 1440 取回 HH:MM
    const arrShow = arrMin % 1440;
    const leaveShow = leaveMin % 1440;
    const hh = String(Math.floor(arrShow / 60)).padStart(2, '0');
    const mm = String(arrShow % 60).padStart(2, '0');
    const leaveHh = String(Math.floor(leaveShow / 60)).padStart(2, '0');
    const leaveMm = String(leaveShow % 60).padStart(2, '0');
    return {
      id: `TP-${r.車號}-${r.路線}-${r.車次}`,
      route: `${r.行政區} ${r.路線}`,
      currentStop: r.地點,
      accepts: inferAccepts(),
      latlng: { lat: parseFloat(r.緯度), lng: parseFloat(r.經度) },
      status: atStop ? 'at_stop' : 'scheduled',
      atStop,
      car: r.車號,
      cityname: r.行政區,
      lineid: r.路線,
      time: atStop
        ? `靠站中 ${hh}:${mm}–${leaveHh}:${leaveMm}`
        : `預計 ${hh}:${mm}`,
      source: 'taipei',
      realtime: false,
      scheduledArriveMin: eta,
    };
  });

  return { stops: [...stopMap.values()], scheduledTrucks };
}

// ── cache (stale-while-revalidate via localStorage) ──────
// raw 快取:純抓回來的 record list,跟 userLocation 無關。
// userLocation 變了不用重抓,只 re-decorate。
const CACHE_KEY = 'tw-truck-map:raw:v1';
const CACHE_HARD_MAX_AGE_MS = 60 * 60 * 1000; // 1h 之後寧可重抓

function readRawCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_HARD_MAX_AGE_MS) return null;
    return { ts, data };
  } catch { return null; }
}

function writeRawCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    // localStorage 滿了 / 隱私模式之類,失敗就算了
    console.warn('cache write failed:', e?.message);
  }
}

function mergeNtpcStopsIntoCache(ntpcStops) {
  const cur = readRawCache();
  if (!cur) return;
  writeRawCache({ ...cur.data, ntpcStops });
}

// ── public API ────────────────────────────────────────────
// 初次載入:NTPC trucks + Taipei routes (平行)。NTPC stops 拖到搜尋時才抓。
async function fetchRawTaipeiData() {
  // Taipei 排程失敗不應炸掉整個 app (例如該 API 偶爾掛),fall back 只拿 NTPC
  const [ntpcTrucks, taipeiRoutes] = await Promise.all([
    fetchNtpcTrucks(),
    fetchTaipeiCityRoutes().catch((err) => {
      console.warn('Taipei API failed:', err);
      return [];
    }),
  ]);
  const { stops: taipeiStops, scheduledTrucks: taipeiTrucks } =
    deriveFromTaipeiRoutes(taipeiRoutes);
  return { ntpcTrucks, taipeiTrucks, taipeiStops, ntpcStops: null };
}

function processRaw(raw, userLocation) {
  const allTrucks = [...raw.ntpcTrucks, ...raw.taipeiTrucks].map((tr) => {
    const distance = haversineKm(userLocation, tr.latlng);
    // 新北即時: eta = 距離/速度; 台北排程: eta = 排程到達時間
    const eta = tr.realtime
      ? estimateEta(distance)
      : tr.scheduledArriveMin;
    return {
      ...tr,
      eta,
      distance: Math.round(distance * 10) / 10,
    };
  });
  allTrucks.sort((a, b) => a.distance - b.distance);

  const stops = raw.ntpcStops
    ? [...raw.ntpcStops, ...raw.taipeiStops]
    : raw.taipeiStops;

  const nearest3 = allTrucks.slice(0, 3);
  const scheduleToday = nearest3.map((tr) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + tr.eta);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return {
      time: `${hh}:${mm}`,
      types: tr.accepts,
      route: tr.route,
      eta: tr.eta,
      atStop: tr.atStop || false,
      status: tr.atStop ? 'at_stop' : 'upcoming',
    };
  });

  return {
    userLocation,
    trucks: allTrucks,
    stops,
    stopsFull: Boolean(raw.ntpcStops), // SearchScreen 可拿來顯示「載入中」
    scheduleToday,
    lastUpdated: new Date().toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' }),
    dataSource: DATA_SOURCE,
    wasteTypes: WASTE_TYPES,
    weekly: WEEKLY,
    todayIdx: TODAY_IDX,
    guide: GUIDE,
  };
}

// 同步讀 cache (給初次 paint 用,如果有的話)。回傳 processed data 或 null。
export function getCachedTaipeiData(userLocation = DEFAULT_LOCATION) {
  const cached = readRawCache();
  return cached ? processRaw(cached.data, userLocation) : null;
}

export async function fetchTaipeiData(userLocation = DEFAULT_LOCATION) {
  const raw = await fetchRawTaipeiData();
  // 保留上次抓過的 ntpcStops (如果還在 cache 裡的話)
  const existing = readRawCache();
  if (existing?.data?.ntpcStops) raw.ntpcStops = existing.data.ntpcStops;
  writeRawCache(raw);
  return processRaw(raw, userLocation);
}

// 搜尋頁第一次掛載時呼叫:lazy 抓 NTPC stops 並合進 cache
export async function ensureNtpcStops() {
  const cached = readRawCache();
  if (cached?.data?.ntpcStops) return cached.data.ntpcStops; // 已經有了
  const ntpcStops = await fetchNtpcStops();
  mergeNtpcStopsIntoCache(ntpcStops);
  return ntpcStops;
}

// 套用使用者在「附近垃圾車」面板上設定的篩選條件。
//   source: 'all' = 不限;'realtime' = 只看新北即時車;'scheduled' = 只看台北排程車
//   types : 必須與 truck.accepts 至少有一個交集 (空陣列等於藏全部)
export function applyTruckFilter(trucks, filter) {
  if (!filter || !trucks?.length) return trucks || [];
  const { source = 'all', types } = filter;
  const allTypesAllowed = !types || types.length === 3;
  if (source === 'all' && allTypesAllowed) return trucks;
  return trucks.filter((tr) => {
    if (source === 'realtime' && !tr.realtime) return false;
    if (source === 'scheduled' && tr.realtime) return false;
    if (!allTypesAllowed) {
      if (!types || types.length === 0) return false;
      if (!tr.accepts?.some((a) => types.includes(a))) return false;
    }
    return true;
  });
}

// 以任意中心點重算 trucks 的距離 + 排序 + 取前 N / 限制半徑
// realtime 車 eta 要跟著新中心重算;scheduled 車 eta 是排程固定值,不動。
export function trucksNearCenter(trucks, center, { limit = 20, maxKm = Infinity } = {}) {
  if (!center || !trucks?.length) return [];
  return trucks
    .map((tr) => {
      const dist = haversineKm(center, tr.latlng);
      return {
        ...tr,
        distance: Math.round(dist * 10) / 10,
        eta: tr.realtime ? estimateEta(dist) : tr.eta,
      };
    })
    .filter((tr) => tr.distance <= maxKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// ── nearest truck for arbitrary location ─────────────────
// 給定收藏地點的座標,找「最靠近它」的車,並計算從該地點出發的 eta。
//   realtime 車 (NTPC GPS): eta = 距離 ÷ 速度 (越近越快到)
//   scheduled 車 (Taipei): eta = 排程已算好的 minutes-until-arrive
export function nearestTruckForLocation(latlng, trucks) {
  if (!latlng || !trucks?.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const tr of trucks) {
    const d = haversineKm(latlng, tr.latlng);
    if (d < bestDist) { bestDist = d; best = tr; }
  }
  if (!best) return null;
  const distance = Math.round(bestDist * 10) / 10;
  const eta = best.realtime ? estimateEta(bestDist) : best.eta;
  return { truck: best, distance, eta, atStop: best.atStop || false };
}

// ── forward geocoding (address → lat/lng) ─────────────────
export async function forwardGeocode(address) {
  if (!address || !address.trim()) return null;
  try {
    const q = encodeURIComponent(address.trim());
    // countrycodes=tw 限縮台灣範圍,避免打到同名他國地址
    const res = await fetch(
      `/api/geocode/search?format=json&q=${q}&countrycodes=tw&limit=1&accept-language=zh-TW`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
  } catch (err) {
    console.warn('forwardGeocode failed:', err);
    return null;
  }
}

// ── reverse geocoding (Nominatim via proxy) ───────────────
// 把 GPS 反查成中文地址,顯示給使用者看。失敗就回原始座標字串。
export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(
      `/api/geocode/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW&zoom=17`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const a = j.address || {};
    // 拼出 「市 + 區 + 路+號」,避開國家/縣這些粗層級
    const parts = [
      a.city || a.county,
      a.suburb || a.city_district || a.district,
      a.neighbourhood,
      a.road,
      a.house_number,
    ].filter(Boolean);
    return parts.join('') || j.display_name || null;
  } catch (err) {
    console.warn('reverseGeocode failed:', err);
    return null;
  }
}
