import type { Page } from '@playwright/test';

// Mirrors DEFAULT_LOCATION in src/data/staticData.js. The mocked truck below
// sits on this exact point so "nearby" assertions always have a 0km match,
// and it matches the fixed geolocation set in playwright.config.ts.
export const DEFAULT_LOCATION = { lat: 25.009805, lng: 121.526576 };

// src/data/taipei.js parses NTPC's "time" field with a plain Date.parse of a
// naive (no timezone) datetime string, so both the browser and this mock need
// to agree on what "now" means — stamping it at request time keeps a mocked
// truck from ever being treated as GPS-stale (src: isTruckStale, 30min cutoff).
function ntpcNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const json = (body: unknown) => ({ contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Stubs every external API the app calls (New Taipei realtime trucks, Taipei
 * scheduled routes, OpenStreetMap/Nominatim geocoding — see src/data/taipei.js)
 * so tests are deterministic and don't depend on the live government open-data
 * endpoints being reachable or fast. Plants exactly one realtime truck at
 * DEFAULT_LOCATION so "nearby trucks" assertions have something real to check.
 *
 * Call this before the navigation that triggers the fetch (i.e. before
 * `page.goto`).
 */
export async function mockTaipeiApis(page: Page): Promise<void> {
  // New Taipei realtime trucks (App.jsx's main data fetch) — one truck, 0km
  // from DEFAULT_LOCATION.
  await page.route('**/api/ntpc/api/datasets/28ab4122-60e1-4065-98e5-abccb69aaca6/**', (route) =>
    route.fulfill(
      json([
        {
          longitude: String(DEFAULT_LOCATION.lng),
          latitude: String(DEFAULT_LOCATION.lat),
          lineid: 'M1',
          car: 'T001',
          cityname: '新北市',
          location: '測試路口',
          time: ntpcNow(),
        },
      ]),
    ),
  );

  // New Taipei stops/routes gazetteer — only lazy-fetched once the Search
  // screen mounts (ensureNtpcStops). Empty is a valid, cheap response.
  await page.route('**/api/ntpc/api/datasets/edc3ad26-8ae7-4916-a00b-bc6048d19bf8/**', (route) =>
    route.fulfill(json([])),
  );

  // Taipei's scheduled routes dataset — empty page (count: 0) so
  // fetchTaipeiCityRoutes never has to paginate.
  await page.route('**/api/taipei/api/v1/dataset/**', (route) =>
    route.fulfill(json({ result: { count: 0, results: [] } })),
  );

  // Reverse geocode (GPS → address) — fired once on load to label "current
  // location" in the header/status strip.
  await page.route('**/api/geocode/reverse**', (route) =>
    route.fulfill(
      json({
        address: { city: '新北市', suburb: '永和區', road: '測試路' },
        display_name: '新北市永和區測試路',
      }),
    ),
  );

  // Forward geocode (address → GPS) — used by "Add saved place".
  await page.route('**/api/geocode/search**', (route) =>
    route.fulfill(json([{ lat: '25.0478', lon: '121.5173' }])),
  );
}
