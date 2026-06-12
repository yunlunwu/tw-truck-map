import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { fetchTaipeiData, reverseGeocode, getCachedTaipeiData, getSkeletonTaipeiData, ensureNtpcStops } from './data/taipei.js';
import { DEFAULT_LOCATION, LOCATION_PRESETS } from './data/staticData.js';
import { TaipeiDataProvider } from './data/DataContext.jsx';
import { theme, TabBar, Icon } from './components/shared.jsx';
import { MapScreen } from './components/map-screen.jsx';
import { DesktopDashboard } from './components/desktop-dashboard.jsx';
import { useLang, localizeData, LANGS } from './i18n.jsx';

// Manual location override (for viewing Taiwan from abroad). Persisted so it sticks.
const LOC_OVERRIDE_KEY = 'locationOverride';
function readLocationOverride() {
  try {
    const o = JSON.parse(localStorage.getItem(LOC_OVERRIDE_KEY));
    return o && typeof o.lat === 'number' && typeof o.lng === 'number' ? o : null;
  } catch { return null; }
}

// Secondary tabs aren't the first screen — lazy-load them so they stay out of
// the initial bundle (smaller, faster first paint). They load when first opened.
const ScheduleScreen = lazy(() => import('./components/other-screens.jsx').then((m) => ({ default: m.ScheduleScreen })));
const SearchScreen = lazy(() => import('./components/other-screens.jsx').then((m) => ({ default: m.SearchScreen })));
const FavoritesScreen = lazy(() => import('./components/other-screens.jsx').then((m) => ({ default: m.FavoritesScreen })));
const GuideScreen = lazy(() => import('./components/other-screens.jsx').then((m) => ({ default: m.GuideScreen })));

function TweaksPanel({ dark, setDark, density, setDensity, locOverride, chooseLocation, visible, onClose }) {
  const { lang, setLang, t: tr } = useLang();
  if (!visible) return null;
  const t = theme(dark);
  const samePreset = (p) => locOverride && Math.abs(locOverride.lat - p.lat) < 1e-6 && Math.abs(locOverride.lng - p.lng) < 1e-6;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 200,
      width: 260, borderRadius: 18, padding: 16,
      background: dark ? 'rgba(26,34,32,0.98)' : 'rgba(255,255,255,0.98)',
      border: `0.5px solid ${t.border}`,
      boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
      fontFamily: "'Noto Sans TC', 'Inter', system-ui",
      color: t.text,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: t.textMuted }}>
          {tr('設定')}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: t.textMuted, fontSize: 18, lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 6 }}>{tr('外觀')}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ k: false, l: '淺色' }, { k: true, l: '深色' }].map(o => (
          <button key={o.l} onClick={() => setDark(o.k)} style={{
            flex: 1, padding: '8px', borderRadius: 10,
            background: dark === o.k ? t.accent : 'transparent',
            color: dark === o.k ? '#fff' : t.text,
            border: `1px solid ${dark === o.k ? t.accent : t.border}`,
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>{tr(o.l)}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 6 }}>{tr('資訊密度')}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ k: 'comfortable', l: '舒適' }, { k: 'compact', l: '緊湊' }].map(o => (
          <button key={o.k} onClick={() => setDensity(o.k)} style={{
            flex: 1, padding: '8px', borderRadius: 10,
            background: density === o.k ? t.accent : 'transparent',
            color: density === o.k ? '#fff' : t.text,
            border: `1px solid ${density === o.k ? t.accent : t.border}`,
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>{tr(o.l)}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 6 }}>{tr('語言')}</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {LANGS.map(o => (
          <button key={o.id} onClick={() => setLang(o.id)} style={{
            flex: 1, padding: '8px', borderRadius: 10,
            background: lang === o.id ? t.accent : 'transparent',
            color: lang === o.id ? '#fff' : t.text,
            border: `1px solid ${lang === o.id ? t.accent : t.border}`,
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>{o.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginBottom: 6 }}>{tr('位置')}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => chooseLocation(null)} style={{
          flex: '1 0 100%', padding: '8px', borderRadius: 10,
          background: !locOverride ? t.accent : 'transparent',
          color: !locOverride ? '#fff' : t.text,
          border: `1px solid ${!locOverride ? t.accent : t.border}`,
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        }}>{tr('自動 (GPS)')}</button>
        {LOCATION_PRESETS.map(p => {
          const active = samePreset(p);
          return (
            <button key={p.id} onClick={() => chooseLocation(p)} style={{
              flex: '1 0 28%', padding: '8px 4px', borderRadius: 10,
              background: active ? t.accent : 'transparent',
              color: active ? '#fff' : t.text,
              border: `1px solid ${active ? t.accent : t.border}`,
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            }}>{tr(p.name)}</button>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(false);
  const [density, setDensity] = useState('comfortable');
  const [tab, setTab] = useState('map');
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 手動覆蓋的地點(人在國外時用);null = 用 GPS 自動定位。
  const [locOverride, setLocOverride] = useState(readLocationOverride);
  const initialLoc = locOverride || DEFAULT_LOCATION;
  // 初次 paint 先用 localStorage cache;沒 cache 就用空骨架,讓 UI 立刻出來(不卡 loading)
  const [data, setData] = useState(
    () => getCachedTaipeiData(initialLoc) || getSkeletonTaipeiData(initialLoc)
  );
  // 目前最佳已知位置;資料的距離/排序都以這個 decorate,geolocation/手動設定回來後更新
  const locRef = useRef(initialLoc);
  const [fetchError, setFetchError] = useState(null);
  const [userLocation, setUserLocation] = useState(initialLoc);
  const [geoState, setGeoState] = useState(locOverride ? 'manual' : 'pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  // 點收藏地點後設定;null 表示用使用者當前 GPS 位置
  const [focusedLocation, setFocusedLocation] = useState(null);
  // 附近垃圾車的篩選條件
  //   source: 'all' | 'realtime' | 'scheduled' (新北即時 vs 台北排程)
  //   types : 允許的廢棄物類型 (truck.accepts 必須至少命中一個)
  const [truckFilter, setTruckFilter] = useState({
    source: 'all',
    types: ['general', 'recycle', 'food'],
  });

  useEffect(() => {
    let cancelled = false;

    // 用「目前最佳位置」重新 decorate 已抓回的 raw cache(便宜,純算距離+排序,不重抓)
    const redecorate = () => {
      const d = getCachedTaipeiData(locRef.current);
      if (d && !cancelled) setData(d);
    };

    // 1) 立刻開始抓資料 —— 不等 geolocation。先用 DEFAULT_LOCATION,位置回來再 redecorate。
    const cached = getCachedTaipeiData(locRef.current);
    if (cached) setData(cached);
    fetchTaipeiData(locRef.current)
      .then(() => {
        if (cancelled) return;
        redecorate(); // 用最新位置(geolocation 可能已更新 locRef)重新處理剛抓回的 raw
        setFetchError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e.message || String(e);
        if (cached) console.warn('background refresh failed:', msg);
        else setFetchError(msg);
      });

    // 2) 沒有手動覆蓋地點時,才平行取得 geolocation;回來後只做便宜的 redecorate,不重抓網路。
    if (locOverride) {
      setGeoState('manual');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: '目前位置',
          };
          locRef.current = loc;
          setUserLocation(loc);
          setGeoState('granted');
          redecorate();
          // 反查地址 — 不 block 主流程,拿到後再覆蓋 name
          reverseGeocode(loc).then((addr) => {
            if (cancelled || !addr) return;
            const withName = { ...loc, name: addr };
            locRef.current = withName;
            setUserLocation(withName);
            setData((prev) => (prev ? { ...prev, userLocation: withName } : prev));
          });
        },
        () => { if (!cancelled) setGeoState('denied'); },
        { timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setGeoState('unavailable');
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 設定面板選地點:preset = 釘到台灣某點(覆蓋 GPS);null = 改回 GPS 自動定位。
  const chooseLocation = (preset) => {
    setFocusedLocation(null);
    if (preset) {
      const loc = { lat: preset.lat, lng: preset.lng, name: preset.name };
      try { localStorage.setItem(LOC_OVERRIDE_KEY, JSON.stringify(loc)); } catch { /* ignore */ }
      setLocOverride(loc);
      locRef.current = loc;
      setUserLocation(loc);
      setGeoState('manual');
      // 資料同一份(全台北/新北),換中心只要便宜地重算距離+排序
      const d = getCachedTaipeiData(loc);
      if (d) setData(d);
      else fetchTaipeiData(loc).then(setData).catch(() => {});
      return;
    }
    // 改回自動:清掉覆蓋,重新要一次 GPS
    try { localStorage.removeItem(LOC_OVERRIDE_KEY); } catch { /* ignore */ }
    setLocOverride(null);
    if (!navigator.geolocation) { setGeoState('unavailable'); return; }
    setGeoState('pending');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: '目前位置' };
        locRef.current = loc;
        setUserLocation(loc);
        setGeoState('granted');
        const d = getCachedTaipeiData(loc);
        if (d) setData(d);
        reverseGeocode(loc).then((addr) => {
          if (!addr) return;
          const withName = { ...loc, name: addr };
          locRef.current = withName;
          setUserLocation(withName);
          setData((prev) => (prev ? { ...prev, userLocation: withName } : prev));
        });
      },
      () => setGeoState('denied'),
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // 刷新:不清掉既有 data,畫面照常呈現舊的,拉到新的再替換。
  // 失敗時只有在初次載入還沒成功時才進 fatal error 畫面。
  const reloadData = () => {
    setIsRefreshing(true);
    fetchTaipeiData(userLocation)
      .then((d) => {
        setData(d);
        setFetchError(null);
      })
      .catch((e) => {
        const msg = e.message || String(e);
        if (!data) setFetchError(msg); // 初載失敗才致命
        else console.warn('refresh failed:', msg);
      })
      .finally(() => setIsRefreshing(false));
  };

  // SearchScreen 第一次掛載時呼叫:lazy 抓 NTPC stops 並 merge 進 data
  const ensureStops = () => {
    if (data?.stopsFull) return; // 已經有完整 stops 了
    ensureNtpcStops()
      .then((ntpcStops) => {
        setData((prev) => prev ? {
          ...prev,
          stops: [...ntpcStops, ...prev.stops.filter((s) => s.source !== 'ntpc')],
          stopsFull: true,
        } : prev);
      })
      .catch((e) => console.warn('lazy stops fetch failed:', e?.message));
  };

  const { t: tr } = useLang();
  const t = theme(dark);
  const bg = dark ? '#07100D' : '#EAE6DC';
  const heroText = dark ? '#F2EFE8' : '#111816';
  const heroMuted = dark ? 'rgba(242,239,232,0.58)' : 'rgba(17,24,22,0.55)';

  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const isDesktop = vw >= 1200;

  if (fetchError) {
    return (
      <div style={{
        minHeight: '100vh', background: bg, color: heroText,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{tr('無法載入垃圾車資料')}</div>
          <div style={{ fontSize: 13, color: heroMuted, marginBottom: 16 }}>{fetchError}</div>
          <button onClick={reloadData} style={{
            padding: '10px 20px', borderRadius: 999,
            background: '#0F7B5A', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>{tr('重新載入')}</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        minHeight: '100vh', background: bg, color: heroMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 500,
      }}>
        {tr('載入中…')}
      </div>
    );
  }

  const renderScreen = () => {
    switch (tab) {
      case 'map':      return <MapScreen dark={dark} setTab={setTab} density={density}/>;
      case 'schedule': return <div className="phone-scroll" style={{ position: 'absolute', inset: 0 }}><ScheduleScreen dark={dark} density={density}/></div>;
      case 'search':   return <div className="phone-scroll" style={{ position: 'absolute', inset: 0 }}><SearchScreen dark={dark} density={density}/></div>;
      case 'fav':      return <div className="phone-scroll" style={{ position: 'absolute', inset: 0 }}><FavoritesScreen dark={dark} density={density} setTab={setTab}/></div>;
      case 'guide':    return <div className="phone-scroll" style={{ position: 'absolute', inset: 0 }}><GuideScreen dark={dark}/></div>;
      default:         return null;
    }
  };

  const phoneLayout = (
    <div style={{
      position: 'fixed', inset: 0, background: t.bg, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <Suspense fallback={
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: t.textMuted, fontSize: 13 }}>
            {tr('載入中…')}
          </div>
        }>
          {renderScreen()}
        </Suspense>
      </div>
      <TabBar tab={tab} setTab={setTab} dark={dark} inline/>
    </div>
  );

  const desktopLayout = (
    <div style={{
      minHeight: '100vh', background: bg, color: heroText,
      padding: '28px 40px 40px', transition: 'background 0.25s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1440, margin: '0 auto 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: dark ? 'linear-gradient(135deg,#0F7B5A,#0C6449)' : 'linear-gradient(135deg,#0F7B5A,#14997A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(15,123,90,0.25)',
          }}>
            {Icon.truck('#fff')}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.1 }}>
              {tr('台北垃圾車地圖')}
            </div>
            <div style={{ fontSize: 11.5, color: heroMuted, marginTop: 2, fontWeight: 500 }}>
              {tr('即時追蹤 · 資料來源 新北市政府環保局')}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '7px 12px', borderRadius: 999,
            background: dark ? 'rgba(79,190,149,0.14)' : '#E8F3EE',
            color: dark ? '#4FBE95' : '#0F7B5A',
            fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#2BA66F', boxShadow: '0 0 0 3px rgba(43,166,111,0.2)', animation: 'pulse 2s infinite' }}/>
            {tr('即時同步中')}
          </div>
          <div style={{
            padding: '7px 12px', borderRadius: 999,
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(17,24,22,0.05)',
            color: heroMuted, fontSize: 11.5, fontWeight: 600,
          }}>
            {data.userLocation.name}
          </div>
          <button onClick={() => setTweaksOpen(v => !v)} style={{
            padding: '7px 12px', borderRadius: 999,
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(17,24,22,0.05)',
            color: heroMuted, fontSize: 11.5, fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}>{tr('設定')}</button>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        <DesktopDashboard dark={dark} density={density}/>
      </div>
    </div>
  );

  const view = localizeData(data, tr);
  const localizedUserLocation = { ...userLocation, name: tr(userLocation.name) };

  return (
    <TaipeiDataProvider value={{ ...view, userLocation: localizedUserLocation, geoState, reloadData, isRefreshing, focusedLocation, setFocusedLocation, searchQuery, setSearchQuery, setTab, ensureStops, truckFilter, setTruckFilter }}>
      <Fragment>
        {isDesktop ? desktopLayout : phoneLayout}
        {!isDesktop && (
          <button onClick={() => setTweaksOpen(v => !v)} style={{
            position: 'fixed', bottom: 90, left: 16, zIndex: 150,
            width: 40, height: 40, borderRadius: 999,
            background: dark ? 'rgba(26,34,32,0.92)' : 'rgba(255,255,255,0.95)',
            color: t.text,
            border: `0.5px solid ${t.border}`, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, backdropFilter: 'blur(14px) saturate(180%)',
            WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          }}>⚙</button>
        )}
        <TweaksPanel
          dark={dark} setDark={setDark}
          density={density} setDensity={setDensity}
          locOverride={locOverride} chooseLocation={chooseLocation}
          visible={tweaksOpen} onClose={() => setTweaksOpen(false)}/>
      </Fragment>
    </TaipeiDataProvider>
  );
}

export default App;
