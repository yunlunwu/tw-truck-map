# 台北垃圾車地圖 (tw-truck-map)

整合 **新北市** (即時 GPS) 與 **台北市** (排程) 公開資料的雙城垃圾車地圖,使用者可即時看到附近運行中的垃圾車、預計抵達時間、收集類型,以及收藏地點周邊的下一班車。

桌面與行動裝置各自獨立的 layout (在 1200px 以上會自動切換到桌面儀表板)。

## 資料來源

| 城市 | API | 內容 | CORS |
|------|-----|------|------|
| 新北市 | `data.ntpc.gov.tw` | 垃圾車即時 GPS + 路線站點 | 不允許 |
| 台北市 | `data.taipei` | 路線排程 (各站抵達/離開時間),無即時 GPS | 不允許 |
| 反查地址 | `nominatim.openstreetmap.org` | 反向 + 正向 geocoding | 限制 User-Agent |

開發環境的 CORS 由 [vite.config.js](vite.config.js) 的 proxy 處理 (`/api/ntpc`, `/api/taipei`, `/api/geocode`)。**正式部署需要自行架設同樣 rewrite 規則的後端**,否則瀏覽器會被 CORS 擋下。

## 開發

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出至 dist/
npm run preview  # 預覽 production build
npm run lint
```

需要 Node 18+。第一次 dev 啟動會抓 `data.taipei` 4000+ 筆排程資料 (~6s),已用 localStorage 做 stale-while-revalidate 快取 (1 小時 hard TTL)。

## 主要功能

- **地圖** — Leaflet + CartoDB 底圖 (Voyager / Dark_All 雙主題),自動 fit bounds 把使用者位置與最近 20 台車一起框進視窗。
- **附近垃圾車列表** — 依距離排序;點任一台 → 地圖聚焦並放大到該車 (zoom 17)。
- **篩選 (FilterPopover)** — 「全部 / 即時新北 / 排程台北」+ 廢棄物類型 toggle;桌面與行動版共用。
- **地址搜尋** — 從 4000+ 站點名稱去重後 fuzzy match (含市/里),選取後地圖以該地址為中心重排車輛。
- **收藏地點** — localStorage 持久化,顯示距該地點最近的下一班車。
- **Tooltip** — Portal 到 `document.body` 的 hover tooltip,適合在 `overflow:hidden` 容器內顯示完整文字。
- **本週收集日 / 分類指南** — 靜態內容,定義在 [src/data/staticData.js](src/data/staticData.js)。
- **深色模式 + density 切換** — 透過設定面板。

## 架構

```
src/
├── App.jsx                     主入口,管理 data fetch / GPS / focusedLocation / truckFilter,
│                                依視窗寬度切桌面 (DesktopDashboard) 或行動 (TabBar + MapScreen ...)
├── components/
│   ├── desktop-dashboard.jsx   桌面儀表板 (地圖 + 附近列表 + 收藏 + 分類指南 + 週曆)
│   ├── map-screen.jsx          行動版地圖頁 (滿版地圖 + 底部 BottomSheet)
│   ├── map-gl.jsx              Leaflet 包裝,truckDivIcon / FitBoundsOnChange / zoom 控制
│   ├── ios-frame.jsx           行動 layout 的 iOS frame 外殼
│   ├── other-screens.jsx       行動頁籤 (時刻 / 搜尋 / 收藏 / 分類)
│   ├── shared.jsx              共用 UI (theme, Icon, WasteChip, FilterPopover, Tooltip, TabBar)
│   └── AddFavoriteModal.jsx    新增收藏對話框 (含正向 geocoding 確認)
└── data/
    ├── DataContext.jsx         React context wrapper
    ├── taipei.js               雙城資料 fetch / merge / 距離計算 / filter helper
    ├── staticData.js           廢棄物類型色票、預設位置、週曆、分類指南
    └── useFavorites.js         收藏 hook (localStorage)
```

### 資料流

1. `App.jsx` 取 GPS → `fetchTaipeiData(userLocation)` → 處理後存到 `data` state。
2. 平行抓 NTPC 即時車 + Taipei 排程,合併後依距離排序。
3. NTPC stops (3.4MB) 只在第一次打開搜尋時 lazy load,合併進現有 cache。
4. `focusedLocation` (點收藏 / 搜尋下拉 / 點車輛) 會讓地圖 re-fit bounds 或 `setView` 到指定 zoom。
5. `truckFilter` (`{ source, types }`) 透過 `applyTruckFilter()` 在 list 與 map 端套用。

### Tooltip 元件

[shared.jsx](src/components/shared.jsx) 的 `<Tooltip>`:

```jsx
<Tooltip content="完整文字" dark={dark} side="bottom" delay={150}>
  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    截斷的文字
  </span>
</Tooltip>
```

特性:
- 用 `createPortal` 飄到 `document.body`,跨越祖先的 `overflow: hidden`
- `Children.only` + `cloneElement` 把事件接到 trigger,不額外加 wrapper,不破壞 flex layout
- 內建 150ms hover delay (避免快速滑過時閃爍),滾動/resize 自動重算座標
- `role="tooltip"` + 動態 `aria-describedby`,screen reader 友善

## 已知限制

- `inferAccepts()` 目前對所有車回 `['general', 'food']` —— 「廢棄物類型」篩選的差異主要在勾選/取消的數量,要更細的差異需要從 API 額外推導 (例如車牌或路線名稱)。
- 正式部署沒有後端 proxy 會被 CORS 擋,目前僅在 dev 環境可用。
- Nominatim 有 [usage policy](https://operations.osmfoundation.org/policies/nominatim/) (每秒 1 req + 必要 User-Agent),搜尋頻繁時要自行 rate-limit。
