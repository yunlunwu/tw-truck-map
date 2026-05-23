import { useEffect, useState, useCallback } from 'react';
import { forwardGeocode } from './taipei.js';

const STORAGE_KEY = 'tw-truck-map:favorites:v1';

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

export function useFavorites() {
  // 從 localStorage 載入既有收藏;預設空陣列,使用者自行新增
  const [favorites, setFavorites] = useState(readStorage);

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
