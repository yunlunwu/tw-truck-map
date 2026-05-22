import { Children, cloneElement, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTaipeiData } from '../data/DataContext.jsx';
import { parseNtpcTime, taipeiParts } from '../data/taipei.js';

// 10 分鐘以內顯示「N 分鐘」;超過 10 分鐘改顯示 24 小時制預計抵達時間。
// 所有時刻都換算成 Asia/Taipei 在地時間 (資料來源就是台北/新北的時刻,使用者人在哪裡都應顯示 Taipei 時間)。
// 跨日 (今天以外) 會自動帶上日期前綴:明天 → 「明 HH:MM」,更遠 → 「MM/DD HH:MM」。
// 對 realtime (NTPC) 車而言,forward ETA 本來就是亂猜,
//   呼叫端傳 opts.reportedAt (車的 GPS 上報時間字串) → 顯示「HH:MM 最後上報」
// 回傳 { value, unit } 讓呼叫端套到既有的「大數字 + 小單位」版面
export function formatEta(etaMin, opts = {}) {
  if (opts.atStop) return { value: '靠站', unit: '目前位置', mode: 'now' };
  if (opts.reportedAt) {
    const dt = parseNtpcTime(opts.reportedAt);
    if (dt) {
      const p = taipeiParts(dt);
      const hh = String(p.hour).padStart(2, '0');
      const mm = String(p.minute).padStart(2, '0');
      return { value: `${hh}:${mm}`, unit: '最後上報', mode: 'reported' };
    }
    return { value: '—', unit: '最後上報', mode: 'empty' };
  }
  if (etaMin == null || Number.isNaN(etaMin)) return { value: '—', unit: '分鐘', mode: 'empty' };
  if (etaMin === 0) return { value: '現在', unit: '即將抵達', mode: 'now' };
  if (etaMin <= 10) return { value: String(etaMin), unit: '分鐘', mode: 'minutes' };
  const now = new Date();
  const arrival = new Date(now.getTime() + etaMin * 60000);
  // 把 now / arrival / tomorrow 都換到 Taipei 時區的日曆切片再比
  const tpeNow = taipeiParts(now);
  const tpeArr = taipeiParts(arrival);
  const tpeTmr = taipeiParts(new Date(now.getTime() + 86400000));
  const sameDay = tpeNow.year === tpeArr.year && tpeNow.month === tpeArr.month && tpeNow.day === tpeArr.day;
  const isTomorrow = !sameDay
    && tpeTmr.year === tpeArr.year && tpeTmr.month === tpeArr.month && tpeTmr.day === tpeArr.day;
  const hh = String(tpeArr.hour).padStart(2, '0');
  const mm = String(tpeArr.minute).padStart(2, '0');
  let value = `${hh}:${mm}`;
  if (!sameDay) {
    if (isTomorrow) {
      value = `明 ${hh}:${mm}`;
    } else {
      const mo = String(tpeArr.month).padStart(2, '0');
      const dy = String(tpeArr.day).padStart(2, '0');
      value = `${mo}/${dy} ${hh}:${mm}`;
    }
  }
  return { value, unit: '預計抵達', mode: 'clock' };
}


export const theme = (dark) => ({
  bg: dark ? '#0E1412' : '#F5F3EE',
  surface: dark ? '#1A2220' : '#FFFFFF',
  surface2: dark ? '#232D2A' : '#FAF8F3',
  border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,22,0.08)',
  divider: dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,22,0.06)',
  text: dark ? '#F2EFE8' : '#111816',
  textMuted: dark ? 'rgba(242,239,232,0.62)' : 'rgba(17,24,22,0.58)',
  textDim: dark ? 'rgba(242,239,232,0.38)' : 'rgba(17,24,22,0.38)',
  accent: '#0F7B5A',
  accentSoft: dark ? 'rgba(15,123,90,0.20)' : '#E8F3EE',
  accentText: dark ? '#4FBE95' : '#0F7B5A',
  warn: '#B85C2E',
  chip: dark ? 'rgba(255,255,255,0.07)' : 'rgba(17,24,22,0.045)',
  mapBg: dark ? '#111917' : '#E8E3D7',
  mapRoad: dark ? '#2A3633' : '#FFFFFF',
  mapRoadMinor: dark ? '#1E2725' : '#F0EBDE',
  mapPark: dark ? '#16221D' : '#D8E4CE',
  mapWater: dark ? '#1A2A34' : '#BFD4DC',
});

export function WasteChip({ type, size = 'sm', dark = false }) {
  const d = useTaipeiData();
  const T = d.wasteTypes[type];
  const colors = {
    general: { bg: dark ? 'rgba(156,163,175,0.18)' : '#ECEAE4', fg: dark ? '#CBD5D0' : '#4B5563' },
    recycle: { bg: dark ? 'rgba(79,190,149,0.18)' : '#E8F3EE', fg: dark ? '#4FBE95' : '#0F7B5A' },
    food:    { bg: dark ? 'rgba(184,92,46,0.22)' : '#FBEEE4', fg: dark ? '#E39265' : '#B85C2E' },
  }[type];
  const isSm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: isSm ? 4 : 6,
      padding: isSm ? '3px 8px' : '5px 10px',
      borderRadius: 999,
      background: colors.bg, color: colors.fg,
      fontSize: isSm ? 11 : 12.5, fontWeight: 600,
      letterSpacing: 0.2, lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: isSm ? 12 : 14, lineHeight: 1 }}>{T.icon}</span>
      {T.label}
    </span>
  );
}

export const Icon = {
  search: (c = 'currentColor') => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke={c} strokeWidth="1.75"/>
      <path d="M17 17l-3.5-3.5" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  pin: (c = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 16s-5-5-5-9a5 5 0 0110 0c0 4-5 9-5 9z" stroke={c} strokeWidth="1.75" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="1.8" fill={c}/>
    </svg>
  ),
  truck: (c = 'currentColor') => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 6h9v8H2zM11 9h4l2.5 2.5V14H11z" stroke={c} strokeWidth="1.75" strokeLinejoin="round"/>
      <circle cx="5.5" cy="15.5" r="1.5" fill={c}/>
      <circle cx="14.5" cy="15.5" r="1.5" fill={c}/>
    </svg>
  ),
  list: (c = 'currentColor') => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  heart: (c = 'currentColor', fill = 'none') => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill={fill}>
      <path d="M10 17s-6-4-6-9a3.5 3.5 0 016-2.5A3.5 3.5 0 0116 8c0 5-6 9-6 9z" stroke={c} strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
  book: (c = 'currentColor') => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 4h5a3 3 0 013 3v10a2 2 0 00-2-2H4zM16 4h-5a3 3 0 00-3 3v10a2 2 0 012-2h6z" stroke={c} strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (c = 'currentColor') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.25" stroke={c} strokeWidth="1.6"/>
      <path d="M8 4.5V8l2.2 1.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  navigate: (c = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke={c} strokeWidth="1.5"/>
      <circle cx="9" cy="9" r="1.8" fill={c}/>
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  bell: (c = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 13V8a5 5 0 0110 0v5l1.5 1.5h-13z" stroke={c} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M7.5 16a1.6 1.6 0 003 0" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  filter: (c = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 5h12M5 9h8M7 13h4" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  x: (c = 'currentColor') => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  back: (c = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4l-6 5 6 5" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (c = 'currentColor') => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2v10M2 7h10" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  refresh: (c = 'currentColor') => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15.5 9A6.5 6.5 0 1 1 9 2.5" stroke={c} strokeWidth="1.75" strokeLinecap="round"/>
      <path d="M12.5 1.5L15.5 2.5L14.5 5.5" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// 「附近垃圾車」面板上的篩選下拉。anchor 可以是 'right' (桌面,popover 貼右邊) 或 'left'。
// placement 預設 'below'(在按鈕下方),mobile 的 BottomSheet 用 'above' 從按鈕往上開。
export function FilterPopover({ dark, open, onClose, anchor = 'right', placement = 'below' }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const filter = d.truckFilter;
  const setFilter = d.setTruckFilter;
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  if (!open) return null;

  const sources = [
    { id: 'all',       label: '全部' },
    { id: 'realtime',  label: '即時 (新北)' },
    { id: 'scheduled', label: '排程 (台北)' },
  ];
  const typeIds = ['general', 'recycle', 'food'];
  const toggleType = (ty) => {
    const cur = new Set(filter.types || []);
    if (cur.has(ty)) cur.delete(ty); else cur.add(ty);
    setFilter({ ...filter, types: [...cur] });
  };
  const reset = () => setFilter({ source: 'all', types: ['general', 'recycle', 'food'] });

  const posStyle = placement === 'above'
    ? { bottom: 'calc(100% + 6px)' }
    : { top: 'calc(100% + 6px)' };
  const sideStyle = anchor === 'right' ? { right: 0 } : { left: 0 };

  return (
    <div ref={ref} style={{
      position: 'absolute', ...posStyle, ...sideStyle, zIndex: 1200,
      background: t.surface, border: `0.5px solid ${t.border}`,
      borderRadius: 14, padding: 12, minWidth: 220,
      boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(17,24,22,0.14)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
        資料來源
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {sources.map((s) => {
          const active = filter.source === s.id;
          return (
            <button key={s.id} onClick={() => setFilter({ ...filter, source: s.id })} style={{
              flex: 1, padding: '6px 8px', borderRadius: 8,
              background: active ? t.accent : t.surface2,
              color: active ? '#fff' : t.text,
              border: `1px solid ${active ? t.accent : t.border}`,
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{s.label}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
        廢棄物類型
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
        {typeIds.map((ty) => {
          const T = d.wasteTypes[ty];
          const active = (filter.types || []).includes(ty);
          return (
            <button key={ty} onClick={() => toggleType(ty)} style={{
              padding: '5px 10px', borderRadius: 999,
              background: active ? t.accentSoft : t.surface2,
              color: active ? t.accentText : t.textMuted,
              border: `1px solid ${active ? t.accent : t.border}`,
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span>{T.icon}</span>{T.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={reset} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: t.textMuted, fontSize: 11.5, fontWeight: 600, padding: 2, fontFamily: 'inherit',
        }}>重設</button>
        <button onClick={onClose} style={{
          padding: '5px 14px', borderRadius: 999, border: 'none',
          background: t.accent, color: '#fff', fontSize: 11.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>完成</button>
      </div>
    </div>
  );
}

// 給定一個 React 子元素 (single child),hover/focus 時在它附近 portal 出 tooltip。
// 用 portal 飄到 document.body,所以即使 trigger 的祖先有 overflow:hidden 也不會被裁。
//   content : tooltip 顯示的內容 (string 或 React node)
//   side    : 'bottom' (預設) | 'top'
//   delay   : ms,游標停多久後出現 (預設 150ms,避免快速滑過時閃爍)
//   dark    : 配色
export function Tooltip({ children, content, side = 'bottom', delay = 150, dark = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const id = useId();
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const computeCoords = () => {
    const node = triggerRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    setCoords({
      left: r.left + r.width / 2,
      top: side === 'bottom' ? r.bottom + 8 : r.top - 8,
    });
  };

  const show = () => {
    computeCoords();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // hover/focus 中若視窗 resize / scroll 重新計算位置
  useEffect(() => {
    if (!open) return;
    const onChange = () => computeCoords();
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const only = Children.only(children);
  const trigger = cloneElement(only, {
    ref: (node) => {
      triggerRef.current = node;
      const r = only.ref;
      if (typeof r === 'function') r(node);
      else if (r && typeof r === 'object') r.current = node;
    },
    onMouseEnter: (e) => { show(); only.props.onMouseEnter?.(e); },
    onMouseLeave: (e) => { hide(); only.props.onMouseLeave?.(e); },
    onFocus:      (e) => { show(); only.props.onFocus?.(e); },
    onBlur:       (e) => { hide(); only.props.onBlur?.(e); },
    'aria-describedby': open ? id : only.props['aria-describedby'],
  });

  if (typeof document === 'undefined') return trigger;

  return (
    <>
      {trigger}
      {open && content != null && createPortal(
        <div
          role="tooltip"
          id={id}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            transform: side === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            background: dark ? '#0E1412' : '#1F2A26',
            color: '#F2EFE8',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 12, fontWeight: 500, lineHeight: 1.4,
            maxWidth: 320,
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
            pointerEvents: 'none',
            zIndex: 2000,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            fontFamily: "'Noto Sans TC', system-ui, sans-serif",
          }}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}

// 篩選器目前是否與預設不同 (用來決定按鈕顯示 active 樣式)
export function isTruckFilterActive(filter) {
  if (!filter) return false;
  if (filter.source && filter.source !== 'all') return true;
  if (filter.types && filter.types.length !== 3) return true;
  return false;
}

export function TabBar({ tab, setTab, dark, inline = false }) {
  const t = theme(dark);
  const tabs = [
    { id: 'map',      label: '地圖', icon: Icon.pin },
    { id: 'schedule', label: '時刻', icon: Icon.list },
    { id: 'search',   label: '搜尋', icon: Icon.search },
    { id: 'fav',      label: '收藏', icon: Icon.heart },
    { id: 'guide',    label: '分類', icon: Icon.book },
  ];
  return (
    <div style={{
      ...(inline
        ? { position: 'relative', flexShrink: 0 }
        : { position: 'absolute', bottom: 0, left: 0, right: 0 }),
      paddingBottom: inline ? 'env(safe-area-inset-bottom, 12px)' : 34,
      background: dark ? 'rgba(14,20,18,0.88)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: `0.5px solid ${t.border}`,
      zIndex: 30,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-around', alignItems: 'stretch',
        padding: '8px 4px 4px',
      }}>
        {tabs.map(T => {
          const active = tab === T.id;
          const c = active ? t.accentText : t.textMuted;
          return (
            <button key={T.id} onClick={() => setTab(T.id)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 0', color: c, fontFamily: 'inherit',
            }}>
              {T.icon(c)}
              <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 500, letterSpacing: 0.3 }}>{T.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
