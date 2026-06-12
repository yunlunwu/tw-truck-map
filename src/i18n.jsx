import { createContext, useCallback, useContext, useState } from 'react';

// Lightweight i18n. The Traditional-Chinese source string is the key, so wrapping
// a label is just t('中文'); missing keys fall back to the Chinese (no crash).
// Interpolation: t('附近 {n} 班', { n }) — placeholders work in both languages.

export const LANGS = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
];

// Australian-English translations of every UI string. Taipei place names and
// real addresses are intentionally left in Chinese (they're real-world data).
const EN = {
  // — App shell / settings —
  '設定': 'Settings',
  '外觀': 'Appearance',
  '淺色': 'Light',
  '深色': 'Dark',
  '資訊密度': 'Density',
  '舒適': 'Comfortable',
  '緊湊': 'Compact',
  '語言': 'Language',
  '位置': 'Location',
  '自動 (GPS)': 'Auto (GPS)',
  '台北車站': 'Taipei Station',
  '新北永和': 'Yonghe',
  '新北板橋': 'Banqiao',
  '無法載入垃圾車資料': "Couldn't load truck data",
  '重新載入': 'Reload',
  '載入中…': 'Loading…',
  '台北垃圾車地圖': 'Taipei Rubbish Truck Map',
  '即時追蹤 · 資料來源 新北市政府環保局': 'Live tracking · Source: New Taipei City EPB',
  '即時同步中': 'Live sync',

  // — Shared: ETA units / filter / tab bar —
  '靠站': 'At stop',
  '目前位置': 'Current location',
  '最後上報': 'last report',
  '分鐘': 'min',
  '現在': 'Now',
  '即將抵達': 'arriving',
  '預計抵達': 'arrival',
  '明': 'Tmrw',
  '資料來源': 'Source',
  '全部': 'All',
  '即時 (新北)': 'Live (New Taipei)',
  '排程 (台北)': 'Scheduled (Taipei)',
  '廢棄物類型': 'Waste type',
  '重設': 'Reset',
  '完成': 'Done',
  '地圖': 'Map',
  '時刻': 'Times',
  '搜尋': 'Search',
  '收藏': 'Saved',
  '分類': 'Guide',

  // — Waste types / weekdays / guide (from staticData, via localizeData) —
  '一般垃圾': 'General rubbish',
  '資源回收': 'Recycling',
  '廚餘': 'Food waste',
  '一': 'Mon', '二': 'Tue', '三': 'Wed', '四': 'Thu', '五': 'Fri', '六': 'Sat', '日': 'Sun',
  '一般垃圾(專用垃圾袋)': 'General rubbish (council bags)',
  '必須使用專用垃圾袋': 'Must use council-approved rubbish bags',
  '洗淨、瀝乾、壓扁後分類投入': 'Rinse, drain, flatten, then sort',
  '瀝乾水分,分「養豬、菜、加熱」二類': 'Drain well; split into pig-feed and compost',
  '廢紙、衛生紙': 'Paper & tissues',
  '保鮮膜': 'Cling wrap',
  '口罩': 'Face masks',
  '吸管': 'Straws',
  '菸蒂': 'Cigarette butts',
  '嬰兒尿布': 'Nappies',
  '紙類': 'Paper',
  '塑膠瓶': 'Plastic bottles',
  '鐵鋁罐': 'Tins & cans',
  '玻璃瓶': 'Glass bottles',
  '乾淨紙容器': 'Clean paper containers',
  '小家電': 'Small appliances',
  '生、熟食': 'Raw & cooked food',
  '果皮': 'Fruit peel',
  '菜葉': 'Vegetable scraps',
  '茶葉渣': 'Tea leaves',
  '咖啡渣': 'Coffee grounds',
  '剩飯剩菜': 'Leftovers',
  '新北市政府環保局 · data.ntpc.gov.tw': 'New Taipei City EPB · data.ntpc.gov.tw',

  // — Schedule screen —
  '我的位置': 'My location',
  '今日收集時刻': "Today's collection times",
  '下一班即將抵達': 'Next truck arriving',
  '即時': 'Live',
  '分鐘後': 'min away',
  '提前 5 分鐘提醒我': 'Remind me 5 min before',
  '目前沒有即將抵達的垃圾車': 'No trucks arriving soon',
  '今日其餘班次': "Rest of today's runs",
  '04/21 週二': '21/04 Tue',
  '靠站中 ': 'At stop ',
  '預計 ': 'Approx ',
  '停收': 'No run',
  '本週收集日': 'This week',
  '資料來源:': 'Source: ',
  '最後更新 ': 'Last updated ',
  ' 分': ' min',

  // — Search screen —
  '地址搜尋': 'Address search',
  '輸入行政區、路線或車牌': 'Enter suburb, route or number plate',
  '清除': 'Clear',
  '搜尋半徑': 'Search radius',
  ' 公里': ' km',
  '點選設為搜尋中心': 'Tap to set as centre',
  '中心': 'Centre',
  '依距離排序': 'Sorted by distance',
  '排程': 'Scheduled',
  '最近搜尋': 'Recent searches',
  '以「{loc}」為中心 · ': 'Centred on "{loc}" · ',
  '地址配對 · {n} 筆': 'Address matches · {n}',
  '附近車輛 · {n} 班': 'Nearby trucks · {n}',
  '找不到符合「{q}」的車輛 · 可調大半徑或清除關鍵字': 'No trucks match "{q}" · widen the radius or clear the search',
  '半徑 {r} 公里內目前沒有運行中的垃圾車': 'No active trucks within {r} km',

  // — Favourites screen —
  '收藏地點': 'Saved places',
  '常用地點的收集時刻': 'Collection times for your places',
  '新增': 'Add',
  '地址無法解析,無法計算距離': "Address couldn't be resolved — no distance",
  '最近 {n} km · ': 'Nearest {n} km · ',
  '看附近車輛 →': 'See nearby trucks →',
  '刪除「{name}」?': 'Delete "{name}"?',
  '刪除': 'Delete',
  '還沒有收藏地點。按右上角「新增」加入常去的地方。': 'No saved places yet. Tap "Add" (top right) to add the spots you visit often.',
  '新增常用地點': 'Add a place',
  '住家、公司、學校… 隨時查看收集時刻': 'Home, work, school… check collection times anytime',

  // — Guide screen —
  '分類指南': 'Sorting guide',
  '什麼垃圾該上哪一台車': 'Which truck takes what',
  '如何辨識垃圾車': 'How to spot the trucks',
  '黃色車身為': 'The yellow truck is the ',
  '一般垃圾車': 'general rubbish truck',
  ',後方通常跟隨': ', usually followed by the ',
  '資源回收車': 'recycling truck',
  '。': '. ',
  '由清潔隊員如行收取,分「養豬」、「菜」、「加熱」桶。': ' is collected by hand into pig-feed and compost bins.',

  // — Desktop dashboard —
  '輸入地址 / 路名 / 行政區 (目前位置:{loc})': 'Address / road / suburb (current: {loc})',
  '回到目前位置': 'Back to current location',
  '載入完整地址資料中…': 'Loading full address data…',
  '找不到符合「{q}」的地址': 'No addresses match "{q}"',
  '請稍等地址資料載入': 'Please wait for address data to load',
  '即時 · {time} 更新': 'Live · updated {time}',
  '顯示中:{name}': 'Showing: {name}',
  '返回目前位置': 'Back to current location',
  '關閉': 'Close',
  '刷新資料': 'Refresh',
  '刷新中…': 'Refreshing…',
  '台北市・data.taipei': 'Taipei City · data.taipei',
  '新北市・data.ntpc': 'New Taipei · data.ntpc',
  '下一班 · 即將抵達您的位置': 'Next · arriving near you',
  '附近垃圾車': 'Nearby trucks',
  ' 班 · 依距離排序': ' · sorted by distance',
  '篩選': 'Filter',
  '沒有符合篩選條件的車輛。': 'No trucks match the filters.',
  '重設篩選': 'Reset filters',
  '此車已收工或資料已舊 · 點擊仍可聚焦到位置': 'Off duty or stale data · click to focus its location',
  '點擊將地圖聚焦到此車輛位置': 'Click to focus the map on this truck',
  '本週收集日 · 我的位置': 'This week · my location',
  '資料來源:{src} · 最後更新 {time}': 'Source: {src} · last updated {time}',
  '還沒收藏 · 點右上角新增': 'No saved places · add one (top right)',
  '點擊將地圖聚焦到此地點': 'Click to focus the map here',

  // — Map screen —
  '搜尋地址或地標…': 'Search address or landmark…',
  '查看': 'View',
  '即時 · {n} 輛運行中': 'Live · {n} running',
  '目前無運行中的垃圾車,可能為離峰時段。': 'No trucks running right now — likely off-peak.',

  // — Map markers (map-gl) —
  '一般': 'General',
  '回收': 'Recycling',
  '下一站': 'Next stop',
  '分': 'min',

  // — Add-favourite modal —
  '地址無法解析座標,仍已新增;請確認地址或稍後編輯。': "Couldn't geocode the address — added anyway; check it or edit later.",
  '新增失敗': 'Add failed',
  '新增收藏地點': 'Add saved place',
  '名稱(例如:家、公司)': 'Name (e.g. Home, Work)',
  '家': 'Home',
  '地址': 'Address',
  '會自動用 OpenStreetMap 反查座標來計算距離。地址越完整越準。': 'We use OpenStreetMap to geocode the address for distance — the fuller the address, the better.',
  '取消': 'Cancel',
  '查詢地址中…': 'Looking up…',
};

// Initial language: English by default. The only thing that changes it is a
// choice the user saved earlier (Settings toggle) in localStorage.
function detectInitialLang() {
  try {
    const saved = localStorage.getItem('langChoice');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return 'en';
}

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (s) => s });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  // Manual choice from the Settings toggle — persist it.
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('langChoice', l); } catch { /* ignore */ }
  }, []);

  const t = (key, vars) => {
    let s = lang === 'en' && EN[key] != null ? EN[key] : key;
    if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

// Translate the static data labels (waste types, guide, weekdays, source) in one
// place, so components can keep rendering d.wasteTypes[x].label etc. untouched.
export function localizeData(data, t) {
  if (!data) return data;
  const wasteTypes = {};
  for (const k in (data.wasteTypes || {})) {
    wasteTypes[k] = { ...data.wasteTypes[k], label: t(data.wasteTypes[k].label) };
  }
  const guide = (data.guide || []).map((g) => ({
    ...g,
    title: t(g.title),
    rule: t(g.rule),
    items: (g.items || []).map((it) => t(it)),
  }));
  const weekly = (data.weekly || []).map((w) => ({ ...w, day: t(w.day) }));

  // Scheduled trucks carry a Chinese time prefix ("靠站中 …" / "預計 …"); swap it
  // for the localized prefix. Real-time GPS timestamps have no prefix, so this
  // is a no-op for them.
  const fixTime = (s) =>
    typeof s === 'string' ? s.replace('靠站中 ', t('靠站中 ')).replace('預計 ', t('預計 ')) : s;
  const trucks = (data.trucks || []).map((tk) => (tk.time ? { ...tk, time: fixTime(tk.time) } : tk));
  const scheduleToday = (data.scheduleToday || []).map((s) => (s.time ? { ...s, time: fixTime(s.time) } : s));

  return {
    ...data,
    wasteTypes,
    guide,
    weekly,
    trucks,
    scheduleToday,
    dataSource: t(data.dataSource),
  };
}
