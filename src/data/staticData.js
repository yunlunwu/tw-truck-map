// 以下欄位官方 open API 沒提供,保留為本機靜態設定。
// wasteTypes 是顯示用的色票 / icon;weekly / guide 屬於教學內容,與即時車輛位置無關。
// 收藏地點 (favorites) 純由使用者自行新增,localStorage 為唯一來源。

export const WASTE_TYPES = {
  general: { label: '一般垃圾', color: '#6B7280', bg: '#F3F4F6', icon: '🗑' },
  recycle: { label: '資源回收', color: '#0F7B5A', bg: '#E8F3EE', icon: '♻' },
  food:    { label: '廚餘',    color: '#B85C2E', bg: '#FBEEE4', icon: '🍂' },
};

export const WEEKLY = [
  { day: '一', types: ['general', 'food'] },
  { day: '二', types: ['general', 'food', 'recycle'] },
  { day: '三', types: [] },
  { day: '四', types: ['general', 'food'] },
  { day: '五', types: ['general', 'food', 'recycle'] },
  { day: '六', types: ['general', 'food'] },
  { day: '日', types: [] },
];
export const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export const GUIDE = [
  { type: 'general', title: '一般垃圾(專用垃圾袋)', rule: '必須使用專用垃圾袋',               items: ['廢紙、衛生紙', '保鮮膜', '口罩', '吸管', '菸蒂', '嬰兒尿布'] },
  { type: 'recycle', title: '資源回收',              rule: '洗淨、瀝乾、壓扁後分類投入',         items: ['紙類', '塑膠瓶', '鐵鋁罐', '玻璃瓶', '乾淨紙容器', '小家電'] },
  { type: 'food',    title: '廚餘',                  rule: '瀝乾水分,分「養豬、菜、加熱」二類',  items: ['生、熟食', '果皮', '菜葉', '茶葉渣', '咖啡渣', '剩飯剩菜'] },
];

export const DATA_SOURCE = '新北市政府環保局 · data.ntpc.gov.tw';

// 當 geolocation 被拒絕或不可用時的預設位置(新北市永和區)
export const DEFAULT_LOCATION = { lat: 25.009805, lng: 121.526576, name: '新北市永和區' };
