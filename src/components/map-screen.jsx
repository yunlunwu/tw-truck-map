import { useEffect, useMemo, useRef, useState } from 'react';
import { useTaipeiData } from '../data/DataContext.jsx';
import { applyTruckFilter, isTruckStale, trucksNearCenter } from '../data/taipei.js';
import { theme, WasteChip, Icon, formatEta, FilterPopover, isTruckFilterActive, Tooltip, TruckListSkeleton } from './shared.jsx';
import { MapGL } from './map-gl.jsx';
import { useLang } from '../i18n.jsx';

function SearchBar({ dark }) {
  const { t: tr } = useLang();
  const t = theme(dark);
  const d = useTaipeiData();
  return (
    <div style={{
      position: 'absolute', top: 54, left: 16, right: 16, zIndex: 20,
    }}>
      <label style={{
        width: '100%', background: dark ? 'rgba(26,34,32,0.92)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: `0.5px solid ${t.border}`,
        borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: dark
          ? '0 6px 20px rgba(0,0,0,0.35)'
          : '0 2px 8px rgba(17,24,22,0.06), 0 6px 20px rgba(17,24,22,0.06)',
        cursor: 'text',
      }}>
        {Icon.search(t.textMuted)}
        <input
          value={d.searchQuery}
          onChange={(e) => d.setSearchQuery(e.target.value)}
          placeholder={tr('搜尋地址或地標…')}
          autoComplete="off"
          inputMode="search"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 16, color: t.text, fontFamily: 'inherit',
            minWidth: 0,
          }}
        />
        {d.searchQuery && (
          <button onClick={() => d.setTab('search')} style={{
            background: t.accent, color: '#fff', border: 'none',
            padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>{tr('查看')}</button>
        )}
      </label>
    </div>
  );
}

function StatusStrip({ dark }) {
  const { t: tr } = useLang();
  const t = theme(dark);
  const d = useTaipeiData();
  return (
    <div style={{
      position: 'absolute', top: 116, left: 16, right: 16, zIndex: 15,
      display: 'flex', gap: 8,
    }}>
      <div style={{
        background: dark ? 'rgba(26,34,32,0.92)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: `0.5px solid ${t.border}`,
        borderRadius: 10, padding: '7px 11px',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11.5, color: t.textMuted, fontWeight: 500,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 999, background: '#2BA66F',
          boxShadow: '0 0 0 3px rgba(43,166,111,0.2)',
          animation: 'pulse 2s infinite',
        }}/>
        {tr('即時 · {n} 輛運行中', { n: d.trucks.length })}
      </div>
    </div>
  );
}

function BottomSheet({ dark, trucks, selectedTruck, setSelectedTruck, density }) {
  const { t: tr } = useLang();
  const t = theme(dark);
  const d = useTaipeiData();
  const compact = density === 'compact';
  const [filterOpen, setFilterOpen] = useState(false);
  const filterActive = isTruckFilterActive(d.truckFilter);
  // 換篩選條件後,清單捲回最上面(避免停在舊位置看不到結果)
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [d.truckFilter]);
  return (
    <div style={{
      flexShrink: 0, zIndex: 20,
      background: dark ? 'rgba(26,34,32,0.97)' : 'rgba(255,255,255,0.98)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderTop: `0.5px solid ${t.border}`,
      boxShadow: dark ? '0 -10px 30px rgba(0,0,0,0.4)' : '0 -6px 24px rgba(17,24,22,0.08)',
      maxHeight: '52%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '8px 0 4px', display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          width: 36, height: 4.5, borderRadius: 99,
          background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(17,24,22,0.18)',
        }}/>
      </div>

      <div style={{
        padding: '6px 20px 10px',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>
            {tr('附近垃圾車')} {!d.loading && <span style={{ color: t.textMuted, fontWeight: 500 }}>· {trucks.length}</span>}
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            {d.loading ? tr('載入中…') : <>{(d.focusedLocation || d.userLocation).name} · {tr('依距離排序')}</>}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            style={{
              background: filterActive ? t.accentSoft : 'none',
              border: filterActive ? `0.5px solid ${t.accent}` : 'none',
              cursor: 'pointer',
              color: filterActive ? t.accentText : t.textMuted,
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12.5, fontWeight: 600, padding: filterActive ? '3px 9px' : 4,
              borderRadius: 999, fontFamily: 'inherit',
            }}>
            {Icon.filter(filterActive ? t.accentText : t.textMuted)} {tr('篩選')}{filterActive ? ' ·' : ''}
          </button>
          <FilterPopover dark={dark} open={filterOpen} onClose={() => setFilterOpen(false)} anchor="right" placement="below"/>
        </div>
      </div>

      <div ref={listRef} style={{
        flex: 1, overflowY: 'auto', padding: '0 16px 12px',
        display: 'flex', flexDirection: 'column',
        gap: compact ? 6 : 8,
      }}>
        {d.loading && trucks.length === 0 && (
          <TruckListSkeleton dark={dark} compact={compact} label={tr('載入中…')} />
        )}
        {!d.loading && trucks.length === 0 && (
          <div style={{
            padding: '28px 16px', textAlign: 'center',
            color: t.textMuted, fontSize: 13,
          }}>
            {tr('目前無運行中的垃圾車,可能為離峰時段。')}
          </div>
        )}
        {trucks.map(truck => {
          const selected = selectedTruck?.id === truck.id;
          const stale = isTruckStale(truck);
          const primary = truck.accepts[0];
          const primaryColor = {
            general: dark ? '#CBD5D0' : '#4B5563',
            recycle: '#0F7B5A',
            food: '#B85C2E',
          }[primary];
          return (
            <button key={truck.id} onClick={() => {
              setSelectedTruck(truck);
              d.setFocusedLocation({
                lat: truck.latlng.lat, lng: truck.latlng.lng,
                name: `${truck.route} · ${truck.currentStop}`,
                zoom: 17,
              });
            }} style={{
              background: selected ? (dark ? 'rgba(15,123,90,0.15)' : '#F3FAF6') : t.surface2,
              border: `1px solid ${selected ? t.accent : t.border}`,
              borderRadius: 14, padding: compact ? '10px 12px' : '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
              opacity: stale ? 0.5 : 1,
            }}>
              {(() => {
                const f = formatEta(truck.eta, {
                  atStop: truck.atStop,
                  reportedAt: truck.realtime ? truck.time : null,
                  t: tr,
                });
                return (
                  <div style={{
                    width: compact ? 52 : 58, flexShrink: 0, textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: f.mode === 'clock' ? (compact ? 14 : 16) : (compact ? 19 : 22), fontWeight: 700,
                      color: primaryColor, letterSpacing: -0.5,
                      fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
                    }}>{f.value}</div>
                    <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, marginTop: -2 }}>{f.unit}</div>
                  </div>
                );
              })()}
              <div style={{
                width: 1, alignSelf: 'stretch', background: t.divider,
              }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
                }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>
                    {truck.route}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1.5px 6px', borderRadius: 4,
                    background: truck.realtime ? '#E8F3EE' : t.chip,
                    color: truck.realtime ? '#0F7B5A' : t.textMuted,
                  }}>{truck.realtime ? tr('即時') : tr('排程')}</span>
                </div>
                <div style={{
                  fontSize: 12, color: t.textMuted, marginBottom: compact ? 4 : 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {truck.currentStop}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {truck.accepts.map(a => <WasteChip key={a} type={a} dark={dark}/>)}
                  <span style={{
                    fontSize: 11, color: t.textDim, fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    marginLeft: 'auto', whiteSpace: 'nowrap',
                  }}>
                    {truck.distance} km
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MapScreen({ dark, setTab, density }) {
  const { t: tr } = useLang();
  const t = theme(dark);
  const d = useTaipeiData();
  const effectiveCenter = d.focusedLocation || d.userLocation;
  const visibleTrucks = useMemo(
    () => trucksNearCenter(applyTruckFilter(d.trucks, d.truckFilter), effectiveCenter, { limit: 20 }),
    [d.trucks, d.truckFilter, effectiveCenter]
  );
  const [selectedTruck, setSelectedTruck] = useState(visibleTrucks[0]);

  const floatBtnStyle = {
    width: 44, height: 44, borderRadius: 14,
    background: dark ? 'rgba(26,34,32,0.95)' : 'rgba(255,255,255,0.98)',
    border: `0.5px solid ${t.border}`,
    boxShadow: dark ? '0 4px 14px rgba(0,0,0,0.3)' : '0 2px 10px rgba(17,24,22,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: t.mapBg, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <MapGL
          dark={dark}
          center={effectiveCenter}
          trucks={visibleTrucks}
          selectedId={selectedTruck?.id}
          onSelect={setSelectedTruck}
          radiusKm={3}
          zoom={effectiveCenter?.zoom}
        />
        <SearchBar dark={dark}/>
        <StatusStrip dark={dark}/>
        {d.focusedLocation && (
          <div style={{
            position: 'absolute', top: 160, left: 16, right: 16, zIndex: 16,
            background: dark ? 'rgba(15,123,90,0.22)' : '#E8F3EE',
            color: dark ? '#4FBE95' : '#0F7B5A',
            border: `0.5px solid ${t.accent}`,
            borderRadius: 10, padding: '7px 11px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, fontWeight: 700,
            boxShadow: '0 2px 10px rgba(15,123,90,0.15)',
          }}>
            {Icon.pin(dark ? '#4FBE95' : '#0F7B5A')}
            <Tooltip content={d.focusedLocation.name} dark={dark}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                {tr('顯示中:{name}', { name: d.focusedLocation.name })}
              </span>
            </Tooltip>
            <div>
               <button onClick={() => d.setFocusedLocation(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', fontSize: 14, lineHeight: 1, padding: 2,
                  }}>
                  {tr('返回目前位置')}
                </button>
                 <button onClick={() => d.setFocusedLocation(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', fontSize: 14, lineHeight: 1, padding: 2,
                  }}>
                    X
                </button>
            </div>
           
          </div>
        )}

        <div style={{
          position: 'absolute', right: 12, bottom: 12, zIndex: 15,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <button
            onClick={d.reloadData}
            disabled={d.isRefreshing}
            aria-label={tr('刷新資料')}
            title={tr('刷新資料')}
            style={{
              ...floatBtnStyle,
              cursor: d.isRefreshing ? 'wait' : 'pointer',
              opacity: d.isRefreshing ? 0.7 : 1,
            }}
          >
            <span style={{
              display: 'inline-flex', animation: d.isRefreshing ? 'spin 0.9s linear infinite' : 'none',
            }}>{Icon.refresh(t.accentText)}</span>
          </button>

          <button style={{ ...floatBtnStyle, cursor: 'pointer' }}>
            {Icon.navigate(t.accentText)}
          </button>
        </div>
      </div>

      <BottomSheet dark={dark} trucks={visibleTrucks} density={density}
        selectedTruck={selectedTruck} setSelectedTruck={setSelectedTruck}/>
    </div>
  );
}
