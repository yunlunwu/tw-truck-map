import { useEffect, useState, useCallback } from 'react';
import { FAVORITES } from './staticData.js';
import { forwardGeocode } from './taipei.js';

const STORAGE_KEY = 'tw-truck-map:favorites:v1';
const SEED_FLAG_KEY = 'tw-truck-map:favorites-seeded:v1';

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('persist favorites failed:', err);
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// 初始化:若 localStorage 是空的且還沒 seed 過,用 staticData 的 FAVORITES 當起始。
// 之後使用者自行增刪都以 localStorage 為準。
function initialFavorites() {
  const existing = readStorage();
  if (existing.length > 0) return existing;
  if (localStorage.getItem(SEED_FLAG_KEY)) return []; // seed 過了就別再種
  const seeded = FAVORITES.map((f) => ({
    id: makeId(),
    name: f.name,
    address: f.address,
    types: f.types || [],
    latlng: null, // 會在 hook 裡 lazy geocode 補上
  }));
  writeStorage(seeded);
  localStorage.setItem(SEED_FLAG_KEY, '1');
  return seeded;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(initialFavorites);

  // 任何欠缺 latlng 的條目,非同步補 geocode;拿到後寫回 state + localStorage
  useEffect(() => {
    let cancelled = false;
    const missing = favorites.filter((f) => !f.latlng && f.address);
    if (missing.length === 0) return;
    (async () => {
      for (const f of missing) {
        const coord = await forwardGeocode(f.address);
        if (cancelled) return;
        if (!coord) continue;
        setFavorites((prev) => {
          const next = prev.map((x) => (x.id === f.id ? { ...x, latlng: coord } : x));
          writeStorage(next);
          return next;
        });
      }
    })();
    return () => { cancelled = true; };
  }, [favorites]);

  const addFavorite = useCallback(async ({ name, address, types = [] }) => {
    const coord = await forwardGeocode(address);
    const entry = {
      id: makeId(),
      name: name.trim(),
      address: address.trim(),
      types,
      latlng: coord, // 可能為 null,之後查不到時提示使用者檢查地址
    };
    setFavorites((prev) => {
      const next = [...prev, entry];
      writeStorage(next);
      return next;
    });
    return entry;
  }, []);

  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  return { favorites, addFavorite, removeFavorite };
}
