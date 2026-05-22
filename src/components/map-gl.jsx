import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { isTruckStale } from '../data/taipei.js';
import { formatEta } from './shared.jsx';

const TYPE_LABEL = { general: '一般', recycle: '回收', food: '廚餘' };

function TruckPopupContent({ truck, dark }) {
  const { value, unit } = formatEta(truck.eta, {
    atStop: truck.atStop,
    reportedAt: truck.realtime ? truck.time : null,
  });
  const primary = truck.accepts[0];
  const accentColor = {
    general: '#4B5563',
    recycle: '#0F7B5A',
    food: '#B85C2E',
  }[primary];
  return (
    <div style={{
      fontFamily: "'Noto Sans TC', system-ui",
      minWidth: 200, maxWidth: 260, padding: '2px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: '#111816' }}>{truck.route}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1.5px 6px', borderRadius: 4,
          background: truck.realtime ? '#E8F3EE' : '#F3F4F6',
          color: truck.realtime ? '#0F7B5A' : '#6B7280',
        }}>{truck.realtime ? '即時' : '排程'}</span>
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 1.4 }}>
        {truck.atStop ? '目前位置' : '下一站'} · {truck.currentStop}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 22, fontWeight: 800, color: accentColor, lineHeight: 1,
          fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>{unit}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>{truck.distance} km</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {truck.accepts.map(a => (
          <span key={a} style={{
            fontSize: 10.5, padding: '2px 7px', borderRadius: 999,
            background: a === 'recycle' ? '#E8F3EE' : a === 'food' ? '#FBEEE4' : '#ECEAE4',
            color: a === 'recycle' ? '#0F7B5A' : a === 'food' ? '#B85C2E' : '#4B5563',
            fontWeight: 600,
          }}>{TYPE_LABEL[a] || a}</span>
        ))}
      </div>
    </div>
  );
}

// CartoDB 底圖 — 深淺兩套,街道清晰、標籤中文(OSM 資料),免 key
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const TRUCK_COLORS = {
  general: (dark) => (dark ? '#CBD5D0' : '#4B5563'),
  recycle: () => '#0F7B5A',
  food:    () => '#B85C2E',
};

function truckDivIcon({ truck, dark, selected }) {
  const primary = truck.accepts[0];
  const color = TRUCK_COLORS[primary](dark);
  const stale = isTruckStale(truck);
  const { value, unit } = formatEta(truck.eta, {
    reportedAt: truck.realtime ? truck.time : null,
  });
  const label = unit === '分鐘' ? `${value}分` : value;
  const ring = selected ? dark ? '#0E1412' : '#fff' : dark ? '#0E1412' : '#fff';
  const outerRing = selected ? `, 0 0 0 5px ${color}` : '';
  return L.divIcon({
    className: '',
    iconSize: [58, 34],
    iconAnchor: [29, 34],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;opacity:${stale ? 0.45 : 1};">
        <div style="
          background:${color};color:#fff;border-radius:999px;padding:4px 10px;
          font-weight:700;font-size:12px;letter-spacing:0.3px;white-space:nowrap;
          font-family:'Noto Sans TC',system-ui;
          box-shadow:0 0 0 2.5px ${ring}${outerRing}, 0 3px 8px rgba(0,0,0,0.25);
          transform:${selected ? 'scale(1.08)' : 'scale(1)'};
          transition:transform 0.15s ease;
          pointer-events:auto;cursor:pointer;
          filter:${stale ? 'grayscale(0.6)' : 'none'};
        ">${label}</div>
        <div style="
          width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
          border-top:6px solid ${color};margin-top:-1px;
          filter:drop-shadow(0 1px 1px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
  });
}

function userDivIcon(dark) {
  const accent = '#0F7B5A';
  const bg = dark ? '#0E1412' : '#fff';
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `
      <div style="
        width:20px;height:20px;border-radius:999px;
        background:${accent};border:3px solid ${bg};
        box-shadow:0 0 0 4px ${accent}40;
      "></div>
    `,
  });
}

// 當中心或 trucks 改變,重新 fit bounds,讓使用者 + 最近 N 台車都可見
// 例外:呼叫端傳了 zoom (例如點某台車要近看) 就 setView 不 fitBounds
function FitBoundsOnChange({ center, trucks, radiusKm, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    if (zoom) {
      map.setView([center.lat, center.lng], zoom, { animate: true });
      return;
    }
    const points = [[center.lat, center.lng]];
    for (const tr of trucks) {
      points.push([tr.latlng.lat, tr.latlng.lng]);
    }
    // 至少讓 radius 圈可見 —— 退一個 bounding box 給 circle
    const degPad = (radiusKm || 3) / 111;
    points.push([center.lat + degPad, center.lng + degPad]);
    points.push([center.lat - degPad, center.lng - degPad]);
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
  }, [map, center.lat, center.lng, trucks, radiusKm, zoom]);
  return null;
}

export function MapGL({
  dark = false,
  center,
  trucks = [],
  selectedId,
  onSelect,
  radiusKm = 3,
  showRadius = true,
  zoom,
  style,
}) {
  if (!center) return null;
  const tileUrl = dark ? DARK_TILE : LIGHT_TILE;
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: dark ? '#111917' : '#E8E3D7', ...style }}
    >
      <TileLayer url={tileUrl} attribution={ATTRIBUTION} />
      {showRadius && (
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#0F7B5A', weight: 1, dashArray: '4 5',
            fillColor: '#0F7B5A', fillOpacity: dark ? 0.08 : 0.06,
          }}
        />
      )}
      <Marker
        position={[center.lat, center.lng]}
        icon={userDivIcon(dark)}
        interactive={false}
      />
      {trucks.map((tr) => (
        <Marker
          key={tr.id}
          position={[tr.latlng.lat, tr.latlng.lng]}
          icon={truckDivIcon({ truck: tr, dark, selected: selectedId === tr.id })}
          eventHandlers={onSelect ? { click: () => onSelect(tr) } : undefined}
        >
          <Popup>
            <TruckPopupContent truck={tr} dark={dark} />
          </Popup>
        </Marker>
      ))}
      <FitBoundsOnChange center={center} trucks={trucks} radiusKm={radiusKm} zoom={zoom} />
    </MapContainer>
  );
}
