import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaipeiData } from '../data/DataContext.jsx';
import { haversineKm, nearestTruckForLocation } from '../data/taipei.js';
import { useFavorites } from '../data/useFavorites.js';
import { theme, WasteChip, Icon, formatEta } from './shared.jsx';
import { AddFavoriteModal } from './AddFavoriteModal.jsx';

export function ScheduleScreen({ dark, density }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const compact = density === 'compact';
  const next = d.scheduleToday[0];
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, overflow: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '62px 20px 0' }}>
        <div style={{ fontSize: 12.5, color: t.textMuted, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          我的位置
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6, marginTop: 4, lineHeight: 1.15 }}>
          今日收集時刻
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: t.textMuted, fontSize: 13 }}>
          {Icon.pin(t.accentText)}
          {d.userLocation.name}
        </div>
      </div>

      <div style={{
        margin: '18px 16px 0',
        borderRadius: 20, overflow: 'hidden',
        background: dark ? 'linear-gradient(135deg, #0F7B5A 0%, #0C6449 100%)' : 'linear-gradient(135deg, #0F7B5A 0%, #14997A 100%)',
        color: '#fff', padding: '18px 20px 20px',
        boxShadow: dark ? 'none' : '0 10px 28px rgba(15,123,90,0.22)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85 }}>
            下一班即將抵達
          </div>
          <div style={{
            padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.18)',
            fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4,
          }}>即時</div>
        </div>
        {(() => {
          const f = formatEta(next.eta, { atStop: next.atStop });
          return (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
              <span style={{
                fontSize: f.mode === 'clock' ? 48 : 64, fontWeight: 800, letterSpacing: -3, lineHeight: 0.9,
                fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
              }}>{f.value}</span>
              <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.9 }}>{f.mode === 'minutes' ? '分鐘後' : f.unit}</span>
              <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{next.time}</span>
            </div>
          );
        })()}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{next.route}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {next.types.map(ty => {
              const T = d.wasteTypes[ty];
              return (
                <span key={ty} style={{
                  fontSize: 11, padding: '3px 7px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.2)', fontWeight: 600,
                }}>{T.icon} {T.label}</span>
              );
            })}
          </div>
        </div>
        <button style={{
          marginTop: 14, width: '100%',
          background: 'rgba(255,255,255,0.18)', border: '0.5px solid rgba(255,255,255,0.25)',
          color: '#fff', borderRadius: 12, padding: '10px',
          fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: 'inherit',
        }}>
          {Icon.bell('#fff')} 提前 5 分鐘提醒我
        </button>
      </div>

      <div style={{ padding: '24px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
          今日其餘班次
        </div>
        <div style={{ fontSize: 12, color: t.textDim }}>04/21 週二</div>
      </div>
      <div style={{
        margin: '0 16px', background: t.surface, borderRadius: 16,
        border: `0.5px solid ${t.border}`, overflow: 'hidden',
      }}>
        {d.scheduleToday.slice(1).map((s, i, arr) => (
          <div key={i} style={{
            padding: compact ? '12px 16px' : '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            borderBottom: i < arr.length - 1 ? `0.5px solid ${t.divider}` : 'none',
          }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: -0.3,
              minWidth: 54, fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
            }}>{s.time}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                {s.route}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {s.types.map(ty => <WasteChip key={ty} type={ty} dark={dark}/>)}
              </div>
            </div>
            {s.eta && (
              <div style={{
                fontSize: 11.5, color: t.textMuted, fontWeight: 600,
                padding: '4px 9px', borderRadius: 999, background: t.chip,
              }}>{s.eta}分</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
          本週收集日
        </div>
      </div>
      <div style={{
        margin: '0 16px', background: t.surface, borderRadius: 16,
        border: `0.5px solid ${t.border}`, padding: '14px 10px',
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
      }}>
        {d.weekly.map((w, i) => {
          const today = i === d.todayIdx;
          const hasAny = w.types.length > 0;
          return (
            <div key={i} style={{
              padding: '8px 4px', textAlign: 'center', borderRadius: 10,
              background: today ? t.accentSoft : 'transparent',
            }}>
              <div style={{
                fontSize: 11.5, fontWeight: 700, color: today ? t.accentText : t.textMuted,
                letterSpacing: 0.5,
              }}>{w.day}</div>
              <div style={{
                marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center',
                minHeight: 42,
              }}>
                {hasAny ? w.types.map(ty => {
                  const color = {
                    general: dark ? '#9CA3AF' : '#6B7280',
                    recycle: '#0F7B5A',
                    food: '#B85C2E',
                  }[ty];
                  return (
                    <span key={ty} style={{
                      width: 8, height: 8, borderRadius: 999, background: color,
                    }}/>
                  );
                }) : (
                  <span style={{ fontSize: 10, color: t.textDim, marginTop: 6 }}>停收</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        margin: '18px 20px 0', padding: '12px 14px',
        background: t.surface2, borderRadius: 12,
        border: `0.5px dashed ${t.border}`,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: 16, color: t.accentText, lineHeight: 1 }}>ⓘ</div>
        <div style={{ fontSize: 11.5, color: t.textMuted, lineHeight: 1.5 }}>
          資料來源:{d.dataSource}<br/>
          最後更新 {d.lastUpdated}
        </div>
      </div>
    </div>
  );
}

export function SearchScreen({ dark, density }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const query = d.searchQuery;
  const setQuery = d.setSearchQuery;
  const [radiusKm, setRadiusKm] = useState(5);
  // searchCenter = null 時以使用者目前位置為中心;選了某個地址後會改成該地址的座標
  const [searchCenter, setSearchCenter] = useState(null);
  const compact = density === 'compact';
  const recents = ['永和區福和路', '板橋區文化路', '八里區龍米路'];

  const inputRef = useRef(null);
  useEffect(() => {
    // 進到搜尋頁時把游標放進輸入框 (mobile 鍵盤可能不會自動跳,但桌機/平板 OK,並提供視覺提示)
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Lazy 抓 NTPC stops (3.4MB) — 只有真的進到搜尋頁才付這個 cost
  useEffect(() => {
    d.ensureStops?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = query.trim();
  const qLower = q.toLowerCase();
  const effectiveCenter = searchCenter?.latlng || d.userLocation;
  const locLabel = searchCenter?.name || d.userLocation?.name || '目前位置';

  // 地址搜尋 —— 把 query 當關鍵字比對 stops gazetteer 的 name/city/village
  const stopMatches = useMemo(() => {
    if (!q || !d.stops) return [];
    const seen = new Set();
    const out = [];
    for (const s of d.stops) {
      const hit =
        (s.name && s.name.includes(q)) ||
        (s.city && s.city.includes(q)) ||
        (s.village && s.village.includes(q));
      if (!hit) continue;
      const key = `${s.city}|${s.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= 6) break;
    }
    return out;
  }, [q, d.stops]);

  // 依 effectiveCenter 重算車輛距離並過濾
  const truckResults = useMemo(() => {
    return d.trucks
      .map((tr) => ({
        ...tr,
        distance: Math.round(haversineKm(effectiveCenter, tr.latlng) * 10) / 10,
      }))
      .filter((tr) => tr.distance <= radiusKm)
      .filter((tr) => {
        if (!qLower) return true;
        return (
          (tr.route && tr.route.toLowerCase().includes(qLower)) ||
          (tr.currentStop && tr.currentStop.toLowerCase().includes(qLower)) ||
          (tr.cityname && tr.cityname.toLowerCase().includes(qLower)) ||
          (tr.car && tr.car.toLowerCase().includes(qLower)) ||
          (tr.lineid && tr.lineid.toLowerCase().includes(qLower))
        );
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30);
  }, [d.trucks, effectiveCenter, radiusKm, qLower]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, overflow: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '32px 20px 0' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: -0.6, lineHeight: 1.15 }}>
          地址搜尋
        </div>
      </div>

      <label style={{
        margin: '14px 16px 0',
        display: 'flex', alignItems: 'center', gap: 10,
        background: t.surface, border: `0.5px solid ${t.border}`,
        borderRadius: 14, padding: '12px 14px',
        cursor: 'text',
      }}>
        {Icon.search(t.textMuted)}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入行政區、路線或車牌"
          autoComplete="off"
          inputMode="search"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 16, color: t.text, fontFamily: 'inherit', minWidth: 0,
          }}/>
        {query && (
          <button onClick={() => setQuery('')} style={{
            background: t.chip, border: 'none', width: 20, height: 20,
            borderRadius: 999, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 0,
            flexShrink: 0,
          }}>{Icon.x(t.textMuted)}</button>
        )}
        <div style={{
          padding: '4px 9px', borderRadius: 7,
          background: t.accentSoft, color: t.accentText,
          fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
          flexShrink: 0,
        }}>{radiusKm} KM</div>
      </label>

      <div style={{ padding: '8px 20px 0', fontSize: 12.5, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {Icon.pin(t.accentText)}
        <span>以「{locLabel}」為中心 · {radiusKm.toFixed(1)} km</span>
        {searchCenter && (
          <button onClick={() => setSearchCenter(null)} style={{
            marginLeft: 6, padding: '2px 8px', borderRadius: 999,
            background: t.chip, color: t.accentText, border: 'none',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>清除</button>
        )}
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, letterSpacing: 0.5 }}>搜尋半徑</span>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 700 }}>{radiusKm.toFixed(1)} 公里</span>
        </div>
        <input type="range" min="0.5" max="10" step="0.5"
          value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: t.accent, cursor: 'pointer' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 10.5, color: t.textDim, fontWeight: 500 }}>
          <span>0.5 km</span><span>10 km</span>
        </div>
      </div>

      {stopMatches.length > 0 && (
        <>
          <div style={{ padding: '22px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
              地址配對 · {stopMatches.length} 筆
            </div>
            <div style={{ fontSize: 11, color: t.textDim, fontWeight: 500 }}>點選設為搜尋中心</div>
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stopMatches.map((s) => {
              const active = searchCenter?.id === s.id;
              return (
                <button key={s.id} onClick={() => setSearchCenter(s)} style={{
                  background: active ? t.accentSoft : t.surface,
                  border: `1px solid ${active ? t.accent : t.border}`,
                  borderRadius: 12, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                    background: t.accentSoft, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>{Icon.pin(t.accentText)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                      {s.city}{s.village ? ' · ' + s.village : ''} {s.linename ? ' · ' + s.linename : ''}
                    </div>
                  </div>
                  {active && (
                    <span style={{ fontSize: 10.5, color: t.accentText, fontWeight: 700 }}>中心</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ padding: '22px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
          附近車輛 · {truckResults.length} 班
        </div>
        <div style={{ fontSize: 11.5, color: t.accentText, fontWeight: 600 }}>依距離排序</div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {truckResults.length === 0 && (
          <div style={{
            padding: '28px 16px', textAlign: 'center',
            background: t.surface, border: `1px dashed ${t.border}`,
            borderRadius: 14, color: t.textMuted, fontSize: 13,
          }}>
            {q
              ? `找不到符合「${query}」的車輛 · 可調大半徑或清除關鍵字`
              : `半徑 ${radiusKm} 公里內目前沒有運行中的垃圾車`}
          </div>
        )}
        {truckResults.map(truck => {
          const primary = truck.accepts[0];
          const primaryColor = {
            general: dark ? '#CBD5D0' : '#4B5563',
            recycle: '#0F7B5A',
            food: '#B85C2E',
          }[primary];
          return (
            <div key={truck.id} style={{
              background: t.surface, border: `0.5px solid ${t.border}`,
              borderRadius: 14, padding: compact ? '11px 14px' : '14px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: {
                  general: dark ? 'rgba(156,163,175,0.18)' : '#ECEAE4',
                  recycle: dark ? 'rgba(79,190,149,0.18)' : '#E8F3EE',
                  food: dark ? 'rgba(184,92,46,0.22)' : '#FBEEE4',
                }[primary],
                color: primaryColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {Icon.truck(primaryColor)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>
                    {truck.route}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1.5px 6px', borderRadius: 4,
                    background: truck.realtime ? '#E8F3EE' : t.chip,
                    color: truck.realtime ? '#0F7B5A' : t.textMuted,
                  }}>{truck.realtime ? '即時' : '排程'}</span>
                  <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600, marginLeft: 'auto' }}>{truck.distance} km</span>
                </div>
                <div style={{
                  fontSize: 12, color: t.textMuted, marginTop: 2, marginBottom: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {truck.currentStop}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {truck.accepts.map(a => <WasteChip key={a} type={a} dark={dark}/>)}
                </div>
              </div>
              {(() => {
                const f = formatEta(truck.eta, { atStop: truck.atStop });
                return (
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    <div style={{
                      fontSize: f.mode === 'clock' ? 16 : 22, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1,
                      fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                    }}>{f.value}</div>
                    <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginTop: 2 }}>{f.unit}</div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '22px 20px 10px', fontSize: 12.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
        最近搜尋
      </div>
      <div style={{ padding: '0 16px' }}>
        {recents.map((r, i) => (
          <button key={i} onClick={() => setQuery(r)} style={{
            width: '100%', background: 'none', border: 'none',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 2px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            borderBottom: i < recents.length - 1 ? `0.5px solid ${t.divider}` : 'none',
          }}>
            {Icon.clock(t.textMuted)}
            <span style={{ flex: 1, fontSize: 14, color: t.text }}>{r}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FavoritesScreen({ dark, density, setTab }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const [modalOpen, setModalOpen] = useState(false);
  const compact = density === 'compact';
  const emojis = { '家': '🏠', '公司': '🏢', '阿嬤家': '🌿', '學校': '🏫' };

  const focusOnFavorite = (f) => {
    if (!f.latlng) return; // 沒座標就 no-op
    d.setFocusedLocation({ ...f.latlng, name: f.name });
    if (setTab) setTab('map');
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, overflow: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '62px 20px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6, lineHeight: 1.15 }}>
            收藏地點
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>常用地點的收集時刻</div>
        </div>
        <button onClick={() => setModalOpen(true)} style={{
          background: t.accent, color: '#fff', border: 'none',
          borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {Icon.plus('#fff')} 新增
        </button>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {favorites.map((f) => {
          const primary = (f.types && f.types[0]) || 'general';
          const primaryColor = {
            general: dark ? '#CBD5D0' : '#4B5563',
            recycle: '#0F7B5A',
            food: '#B85C2E',
          }[primary];
          const nearest = nearestTruckForLocation(f.latlng, d.trucks);
          const canFocus = Boolean(f.latlng);
          return (
            <div key={f.id}
              onClick={() => canFocus && focusOnFavorite(f)}
              role={canFocus ? 'button' : undefined}
              tabIndex={canFocus ? 0 : undefined}
              style={{
                background: t.surface, border: `0.5px solid ${t.border}`,
                borderRadius: 16, padding: compact ? '14px 16px' : '16px 18px',
                cursor: canFocus ? 'pointer' : 'default',
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
              }}
              onMouseEnter={(e) => canFocus && (e.currentTarget.style.boxShadow = `0 6px 18px ${dark ? 'rgba(0,0,0,0.25)' : 'rgba(17,24,22,0.08)'}`)}
              onMouseLeave={(e) => canFocus && (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: t.accentSoft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>{emojis[f.name] || '📍'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>
                    {f.name}
                  </div>
                  <div style={{
                    fontSize: 12, color: t.textMuted, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{f.address}</div>
                  {!f.latlng && (
                    <div style={{ fontSize: 11, color: '#B85C2E', marginTop: 2 }}>地址無法解析,無法計算距離</div>
                  )}
                </div>
                {(() => {
                  const ef = formatEta(nearest?.eta, { atStop: nearest?.atStop });
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: ef.mode === 'clock' ? 16 : 20, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1,
                        fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                      }}>{ef.value}</div>
                      <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginTop: 2 }}>{ef.unit}</div>
                    </div>
                  );
                })()}
              </div>
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${t.divider}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(f.types || []).map(a => <WasteChip key={a} type={a} dark={dark}/>)}
                  {nearest && (
                    <span style={{ fontSize: 11, color: t.textDim, fontWeight: 500, alignSelf: 'center' }}>
                      最近 {nearest.distance} km · {nearest.truck.route}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {canFocus && (
                    <span style={{ fontSize: 11, color: t.accentText, fontWeight: 700 }}>
                      看附近車輛 →
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`刪除「${f.name}」?`)) removeFavorite(f.id);
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: t.textMuted, fontFamily: 'inherit',
                    }}
                  >刪除</button>
                </div>
              </div>
            </div>
          );
        })}
        {favorites.length === 0 && (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            background: t.surface, border: `1.5px dashed ${t.border}`, borderRadius: 16,
            color: t.textMuted, fontSize: 13,
          }}>
            還沒有收藏地點。按右上角「新增」加入常去的地方。
          </div>
        )}
      </div>

      <div style={{ padding: '18px 16px 0' }}>
        <button onClick={() => setModalOpen(true)} style={{
          width: '100%', background: 'none',
          border: `1.5px dashed ${t.border}`, borderRadius: 16,
          padding: '18px', cursor: 'pointer', color: t.textMuted,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          fontFamily: 'inherit',
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text }}>新增常用地點</div>
          <div style={{ fontSize: 11.5 }}>住家、公司、學校… 隨時查看收集時刻</div>
        </button>
      </div>

      {modalOpen && (
        <AddFavoriteModal
          dark={dark}
          onAdd={addFavorite}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

export function GuideScreen({ dark }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const [active, setActive] = useState('general');
  const cur = d.guide.find(g => g.type === active);
  const colorMap = {
    general: dark ? '#CBD5D0' : '#4B5563',
    recycle: '#0F7B5A',
    food: '#B85C2E',
  };
  const bgMap = {
    general: dark ? 'rgba(156,163,175,0.18)' : '#ECEAE4',
    recycle: dark ? 'rgba(79,190,149,0.18)' : '#E8F3EE',
    food: dark ? 'rgba(184,92,46,0.22)' : '#FBEEE4',
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: t.bg, overflow: 'auto', paddingBottom: 100 }}>
      <div style={{ padding: '62px 20px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6, lineHeight: 1.15 }}>
          分類指南
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          什麼垃圾該上哪一台車
        </div>
      </div>

      <div style={{ padding: '18px 16px 0', display: 'flex', gap: 8 }}>
        {d.guide.map(g => {
          const isActive = active === g.type;
          return (
            <button key={g.type} onClick={() => setActive(g.type)} style={{
              flex: 1, padding: '10px 8px',
              background: isActive ? bgMap[g.type] : t.surface,
              border: `1px solid ${isActive ? colorMap[g.type] : t.border}`,
              color: isActive ? colorMap[g.type] : t.textMuted,
              borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700, letterSpacing: 0.2,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{d.wasteTypes[g.type].icon}</div>
              {d.wasteTypes[g.type].label}
            </button>
          );
        })}
      </div>

      <div style={{
        margin: '16px 16px 0',
        background: t.surface, border: `0.5px solid ${t.border}`,
        borderRadius: 18, overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          background: bgMap[active],
          borderBottom: `0.5px solid ${t.border}`,
        }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: colorMap[active], letterSpacing: -0.3 }}>
            {cur.title}
          </div>
          <div style={{ fontSize: 12, color: colorMap[active], opacity: 0.85, marginTop: 4, fontWeight: 500 }}>
            {cur.rule}
          </div>
        </div>
        <div style={{ padding: '4px 0' }}>
          {cur.items.map((item, i) => (
            <div key={i} style={{
              padding: '11px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < cur.items.length - 1 ? `0.5px solid ${t.divider}` : 'none',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999, background: colorMap[active],
              }}/>
              <span style={{ fontSize: 14, color: t.text, flex: 1 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '22px 20px 10px', fontSize: 12.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
        如何辨識垃圾車
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.6 }}>
            黃色車身為<span style={{ color: t.text, fontWeight: 600 }}>一般垃圾車</span>,後方通常跟隨<span style={{ color: t.accentText, fontWeight: 600 }}>資源回收車</span>。<span style={{ color: '#B85C2E', fontWeight: 600 }}>廚餘</span>由清潔隊員如行收取,分「養豬」、「菜」、「加熱」桶。
          </div>
        </div>
      </div>
    </div>
  );
}
