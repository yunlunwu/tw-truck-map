import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaipeiData } from '../data/DataContext.jsx';
import { applyTruckFilter, nearestTruckForLocation, trucksNearCenter } from '../data/taipei.js';
import { useFavorites } from '../data/useFavorites.js';
import { theme, WasteChip, Icon, formatEta, FilterPopover, isTruckFilterActive, Tooltip } from './shared.jsx';
import { MapGL } from './map-gl.jsx';
import { AddFavoriteModal } from './AddFavoriteModal.jsx';

// 桌面版的地址搜尋:真 input + 下拉建議 (從 d.stops 取前 6 筆地名比對)
function DesktopAddressSearch({ dark }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const q = (d.searchQuery || '').trim();

  // 第一次 focus 時 lazy 抓 NTPC stops (3.4MB,只在這裡用)
  const onFocus = () => {
    setOpen(true);
    d.ensureStops?.();
  };

  // 點 wrapper 外面就關掉下拉
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const matches = useMemo(() => {
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

  const pick = (s) => {
    d.setFocusedLocation({ lat: s.latlng.lat, lng: s.latlng.lng, name: s.name });
    d.setSearchQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: t.surface2, border: `0.5px solid ${t.border}`,
        borderRadius: 12, padding: '11px 14px',
        cursor: 'text',
      }}>
        {Icon.search(t.textMuted)}
        <input
          value={d.searchQuery || ''}
          onChange={(e) => { d.setSearchQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={onFocus}
          placeholder={`輸入地址 / 路名 / 行政區 (目前位置:${d.userLocation.name || '—'})`}
          autoComplete="off"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: t.text, fontFamily: 'inherit', minWidth: 0,
          }}
        />
        {q && (
          <button onClick={() => d.setSearchQuery('')} style={{
            background: t.chip, border: 'none', width: 22, height: 22,
            borderRadius: 999, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
          }}>{Icon.x(t.textMuted)}</button>
        )}
        {d.focusedLocation && (
          <button onClick={() => d.setFocusedLocation(null)} style={{
            padding: '4px 9px', borderRadius: 7,
            background: t.accentSoft, color: t.accentText, border: 'none',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>回到目前位置</button>
        )}
      </label>

      {open && q && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1100,
          background: t.surface, border: `0.5px solid ${t.border}`,
          borderRadius: 12, padding: 6,
          boxShadow: dark ? '0 10px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(17,24,22,0.1)',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {!d.stopsFull && (
            <div style={{ padding: '8px 12px', fontSize: 11.5, color: t.textMuted }}>
              載入完整地址資料中…
            </div>
          )}
          {matches.length === 0 ? (
            <div style={{ padding: '12px', fontSize: 12.5, color: t.textMuted, textAlign: 'center' }}>
              {d.stopsFull ? `找不到符合「${q}」的地址` : '請稍等地址資料載入'}
            </div>
          ) : matches.map((s) => (
            <button key={s.id} onClick={() => pick(s)} style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = t.surface2}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                background: t.accentSoft, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>{Icon.pin(t.accentText)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: -0.1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>
                  {s.city}{s.village ? ' · ' + s.village : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DesktopMap({ dark }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const effectiveCenter = d.focusedLocation || d.userLocation;
  const visibleTrucks = useMemo(
    () => trucksNearCenter(applyTruckFilter(d.trucks, d.truckFilter), effectiveCenter, { limit: 20 }),
    [d.trucks, d.truckFilter, effectiveCenter]
  );
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4, flexShrink: 0,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 11px', borderRadius: 999,
          background: t.surface, border: `0.5px solid ${t.border}`,
          fontSize: 11.5, color: t.textMuted, fontWeight: 600,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: '#2BA66F',
            boxShadow: '0 0 0 3px rgba(43,166,111,0.2)',
            animation: 'pulse 2s infinite',
          }}/>
          即時 · {d.lastUpdated.split(' ')[1]} 更新
        </div>
      </div>
    <div style={{
      flex: 1, minHeight: 0, position: 'relative', borderRadius: 20,
      overflow: 'hidden', background: t.mapBg,
      border: `0.5px solid ${t.border}`,
      isolation: 'isolate', // 鎖住 leaflet 內部高 z-index,避免蓋掉外面的搜尋下拉
    }}>
      <MapGL
        dark={dark}
        center={effectiveCenter}
        trucks={visibleTrucks}
        radiusKm={3}
        zoom={effectiveCenter?.zoom}
      />
      {d.focusedLocation && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
          background: dark ? 'rgba(15,123,90,0.22)' : '#E8F3EE',
          color: dark ? '#4FBE95' : '#0F7B5A',
          border: `0.5px solid ${t.accent}`,
          borderRadius: 10, padding: '7px 11px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(15,123,90,0.2)',
          maxWidth: 'min(70%, calc(100% - 32px))',
        }}>
          {Icon.pin(dark ? '#4FBE95' : '#0F7B5A')}
          <Tooltip content={d.focusedLocation.name} dark={dark}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              顯示中:{d.focusedLocation.name}
            </span>
          </Tooltip>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => d.setFocusedLocation(null)}
              style={{
                padding: '4px 10px', borderRadius: 999,
                background: t.accent, color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3,
                fontFamily: 'inherit', lineHeight: 1,
                boxShadow: '0 1px 3px rgba(15,123,90,0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0C6449')}
              onMouseLeave={(e) => (e.currentTarget.style.background = t.accent)}
            >返回目前位置</button>
            <button
              onClick={() => d.setFocusedLocation(null)}
              aria-label="關閉"
              style={{
                width: 22, height: 22, borderRadius: 999,
                background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,123,90,0.12)',
                border: 'none', cursor: 'pointer', padding: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.18)' : 'rgba(15,123,90,0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,123,90,0.12)')}
            >{Icon.x(dark ? '#4FBE95' : '#0F7B5A')}</button>
          </div>
        </div>
      )}
      <button
        onClick={d.reloadData}
        disabled={d.isRefreshing}
        aria-label="刷新資料"
        title={d.isRefreshing ? '刷新中…' : '刷新資料'}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 500,
          width: 38, height: 38, borderRadius: 10,
          background: dark ? 'rgba(26,34,32,0.92)' : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: `0.5px solid ${t.border}`,
          boxShadow: dark ? '0 4px 14px rgba(0,0,0,0.3)' : '0 2px 10px rgba(17,24,22,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: d.isRefreshing ? 'wait' : 'pointer',
          opacity: d.isRefreshing ? 0.7 : 1,
          padding: 0,
        }}
      >
        <span style={{
          display: 'inline-flex', animation: d.isRefreshing ? 'spin 0.9s linear infinite' : 'none',
        }}>{Icon.refresh(t.accentText)}</span>
      </button>
    </div>
    </div>
  );
}

export function DesktopDashboard({ dark, density }) {
  const t = theme(dark);
  const d = useTaipeiData();
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const [favModalOpen, setFavModalOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterActive = isTruckFilterActive(d.truckFilter);
  const filteredTrucks = useMemo(
    () => applyTruckFilter(d.trucks, d.truckFilter),
    [d.trucks, d.truckFilter]
  );
  const next = d.scheduleToday[0];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0,
      color: t.text,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
        <div style={{
          background: t.surface, border: `0.5px solid ${t.border}`,
          borderRadius: 18, padding: 18,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
            地址搜尋
          </div>
          <DesktopAddressSearch dark={dark}/>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', fontSize: 11.5, color: t.textMuted }}>
            <span style={{ letterSpacing: 1, fontWeight: 700 }}>資料來源</span>
            <span style={{ padding: '3px 8px', borderRadius: 999, background: t.chip }}>台北市・data.taipei</span>
            <span style={{ padding: '3px 8px', borderRadius: 999, background: t.chip }}>新北市・data.ntpc</span>
          </div>
        </div>

        <div style={{
          borderRadius: 18, padding: '18px 20px',
          background: dark ? 'linear-gradient(135deg, #0F7B5A 0%, #0C6449 100%)' : 'linear-gradient(135deg, #0F7B5A 0%, #14997A 100%)',
          color: '#fff',
          boxShadow: dark ? 'none' : '0 10px 28px rgba(15,123,90,0.22)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85 }}>
            下一班 · 即將抵達您的位置
          </div>
          {(() => {
            const f = formatEta(next.eta, { atStop: next.atStop });
            return (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span style={{
                  fontSize: f.mode === 'clock' ? 38 : 48, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1,
                  fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                }}>{f.value}</span>
                <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.9 }}>{f.unit}</span>
                <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{next.time}</span>
              </div>
            );
          })()}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.2)' }}>{next.route}</span>
            {next.types.map(ty => {
              const T = d.wasteTypes[ty];
              return (
                <span key={ty} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontWeight: 600 }}>
                  {T.icon} {T.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gridTemplateRows: '560px', gap: 16 }}>
        <DesktopMap dark={dark}/>

        <div style={{
          background: t.surface, border: `0.5px solid ${t.border}`,
          borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column',
          minHeight: 0, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                附近垃圾車
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: -0.3, marginTop: 2 }}>
                {filteredTrucks.length}{filterActive ? ` / ${d.trucks.length}` : ''} 班 · 依距離排序
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                style={{
                  background: filterActive ? t.accentSoft : 'none',
                  border: `0.5px solid ${filterActive ? t.accent : t.border}`,
                  padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
                  color: filterActive ? t.accentText : t.textMuted,
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {Icon.filter(filterActive ? t.accentText : t.textMuted)} 篩選{filterActive ? ' ·' : ''}
              </button>
              <FilterPopover dark={dark} open={filterOpen} onClose={() => setFilterOpen(false)} anchor="right" placement="below"/>
            </div>
          </div>
          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            gap: density === 'compact' ? 6 : 8, marginRight: -8, paddingRight: 8,
          }}>
            {filteredTrucks.length === 0 && (
              <div style={{
                padding: '24px 12px', textAlign: 'center',
                color: t.textMuted, fontSize: 12.5,
                border: `1.5px dashed ${t.border}`, borderRadius: 12,
              }}>
                沒有符合篩選條件的車輛。<button onClick={() => d.setTruckFilter({ source: 'all', types: ['general', 'recycle', 'food'] })} style={{
                  background: 'none', border: 'none', color: t.accentText,
                  cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 12.5,
                }}>重設篩選</button>
              </div>
            )}
            {filteredTrucks.map(truck => {
              const primary = truck.accepts[0];
              const primaryColor = {
                general: dark ? '#CBD5D0' : '#4B5563',
                recycle: '#0F7B5A',
                food: '#B85C2E',
              }[primary];
              const focused = d.focusedLocation
                && Math.abs(d.focusedLocation.lat - truck.latlng.lat) < 1e-6
                && Math.abs(d.focusedLocation.lng - truck.latlng.lng) < 1e-6;
              return (
                <div
                  key={truck.id}
                  onClick={() => d.setFocusedLocation({
                    lat: truck.latlng.lat, lng: truck.latlng.lng,
                    name: `${truck.route} · ${truck.currentStop}`,
                    zoom: 17,
                  })}
                  role="button"
                  title="點擊將地圖聚焦到此車輛位置"
                  style={{
                    background: focused ? (dark ? 'rgba(15,123,90,0.15)' : '#F3FAF6') : t.surface2,
                    border: `1px solid ${focused ? t.accent : t.border}`,
                    borderRadius: 12, padding: density === 'compact' ? '10px 12px' : '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', transition: 'border-color 0.12s ease, background 0.12s ease',
                  }}
                  onMouseEnter={(e) => { if (!focused) e.currentTarget.style.borderColor = t.accent; }}
                  onMouseLeave={(e) => { if (!focused) e.currentTarget.style.borderColor = t.border; }}
                >
                  {(() => {
                    const f = formatEta(truck.eta, { atStop: truck.atStop });
                    return (
                      <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
                        <div style={{
                          fontSize: f.mode === 'clock' ? 15 : 19, fontWeight: 800, color: primaryColor, letterSpacing: -0.5, lineHeight: 1,
                          fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                        }}>{f.value}</div>
                        <div style={{ fontSize: 9.5, color: t.textMuted, fontWeight: 600, marginTop: 2 }}>{f.unit}</div>
                      </div>
                    );
                  })()}
                  <div style={{ width: 1, alignSelf: 'stretch', background: t.divider }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text, letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{truck.route}</span>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: '1.5px 6px', borderRadius: 4,
                        background: truck.realtime ? '#E8F3EE' : t.chip,
                        color: truck.realtime ? '#0F7B5A' : t.textMuted, flexShrink: 0,
                      }}>{truck.realtime ? '即時' : '排程'}</span>
                    </div>
                    <div style={{
                      fontSize: 11.5, color: t.textMuted, marginTop: 2, marginBottom: 5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      目前位置 · {truck.currentStop}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {truck.accepts.map(a => <WasteChip key={a} type={a} dark={dark}/>)}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textDim, fontWeight: 500 }}>{truck.distance} km</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 16 }}>
        <div style={{
          background: t.surface, border: `0.5px solid ${t.border}`,
          borderRadius: 18, padding: 18,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
            本週收集日 · 我的位置
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
          }}>
            {d.weekly.map((w, i) => {
              const today = i === d.todayIdx;
              const hasAny = w.types.length > 0;
              return (
                <div key={i} style={{
                  padding: '10px 4px', textAlign: 'center', borderRadius: 10,
                  background: today ? t.accentSoft : 'transparent',
                  border: `1px solid ${today ? t.accent : 'transparent'}`,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: today ? t.accentText : t.textMuted, letterSpacing: 0.5,
                  }}>{w.day}</div>
                  <div style={{
                    marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center',
                    minHeight: 44,
                  }}>
                    {hasAny ? w.types.map(ty => {
                      const color = { general: dark ? '#9CA3AF' : '#6B7280', recycle: '#0F7B5A', food: '#B85C2E' }[ty];
                      return <span key={ty} style={{ width: 8, height: 8, borderRadius: 999, background: color }}/>;
                    }) : <span style={{ fontSize: 10, color: t.textDim, marginTop: 6 }}>停收</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 12, padding: '8px 12px', background: t.surface2,
            borderRadius: 10, fontSize: 11.5, color: t.textMuted, lineHeight: 1.5,
            border: `0.5px dashed ${t.border}`,
          }}>
            資料來源:{d.dataSource} · 最後更新 {d.lastUpdated}
          </div>
        </div>

        <div style={{
          background: t.surface, border: `0.5px solid ${t.border}`,
          borderRadius: 18, padding: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              收藏地點
            </div>
            <button onClick={() => setFavModalOpen(true)} style={{
              background: t.accent, color: '#fff', border: 'none',
              borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>{Icon.plus('#fff')} 新增</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {favorites.length === 0 && (
              <div style={{
                padding: '18px 12px', textAlign: 'center',
                border: `1.5px dashed ${t.border}`, borderRadius: 12,
                color: t.textMuted, fontSize: 12,
              }}>還沒收藏 · 點右上角新增</div>
            )}
            {favorites.map((f) => {
              const emojis = { '家': '🏠', '公司': '🏢', '阿嬤家': '🌿', '學校': '🏫' };
              const primary = (f.types && f.types[0]) || 'general';
              const primaryColor = { general: dark ? '#CBD5D0' : '#4B5563', recycle: '#0F7B5A', food: '#B85C2E' }[primary];
              const nearest = nearestTruckForLocation(f.latlng, d.trucks);
              const canFocus = Boolean(f.latlng);
              return (
                <div key={f.id}
                  onClick={() => canFocus && d.setFocusedLocation({ ...f.latlng, name: f.name })}
                  role={canFocus ? 'button' : undefined}
                  title={canFocus ? '點擊將地圖聚焦到此地點' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 12,
                    cursor: canFocus ? 'pointer' : 'default',
                    transition: 'border-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => canFocus && (e.currentTarget.style.borderColor = t.accent)}
                  onMouseLeave={(e) => canFocus && (e.currentTarget.style.borderColor = t.border)}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: t.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}>{emojis[f.name] || '📍'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{f.name}</div>
                    <div style={{
                      fontSize: 11, color: t.textMuted, marginTop: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{f.address}</div>
                  </div>
                  {(() => {
                    const ef = formatEta(nearest?.eta, { atStop: nearest?.atStop });
                    return (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: ef.mode === 'clock' ? 13 : 16, fontWeight: 800, color: primaryColor, letterSpacing: -0.4, lineHeight: 1,
                          fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                        }}>{ef.value}</div>
                        <div style={{ fontSize: 9.5, color: t.textMuted, fontWeight: 600, marginTop: 1 }}>{ef.unit}</div>
                      </div>
                    );
                  })()}
                  <button onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`刪除「${f.name}」?`)) removeFavorite(f.id);
                  }} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: t.textDim, fontSize: 16, padding: 2, lineHeight: 1,
                  }} title="刪除">×</button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          background: t.surface, border: `0.5px solid ${t.border}`,
          borderRadius: 18, padding: 18,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
            分類指南
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.guide.map(g => {
              const colorMap = { general: dark ? '#CBD5D0' : '#4B5563', recycle: '#0F7B5A', food: '#B85C2E' };
              const bgMap = {
                general: dark ? 'rgba(156,163,175,0.18)' : '#ECEAE4',
                recycle: dark ? 'rgba(79,190,149,0.18)' : '#E8F3EE',
                food: dark ? 'rgba(184,92,46,0.22)' : '#FBEEE4',
              };
              const T = d.wasteTypes[g.type];
              return (
                <div key={g.type} style={{
                  padding: '10px 12px', borderRadius: 12,
                  background: bgMap[g.type], border: `0.5px solid ${colorMap[g.type]}25`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 15 }}>{T.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: colorMap[g.type] }}>{T.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: colorMap[g.type], opacity: 0.85, lineHeight: 1.5 }}>
                    {g.items.slice(0, 3).join(' · ')}…
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {favModalOpen && (
        <AddFavoriteModal
          dark={dark}
          onAdd={addFavorite}
          onClose={() => setFavModalOpen(false)}
        />
      )}
    </div>
  );
}
