import { useState } from 'react';
import { theme, Icon } from './shared.jsx';
import { useLang } from '../i18n.jsx';

export function AddFavoriteModal({ dark, onClose, onAdd }) {
  const { t: tr } = useLang();
  const t = theme(dark);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = name.trim() && address.trim() && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const entry = await onAdd({ name, address });
      if (!entry.latlng) {
        // 仍新增成功,但 geocode 失敗 — 提示但不擋流程
        setError(tr('地址無法解析座標,仍已新增;請確認地址或稍後編輯。'));
        setSubmitting(false);
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || tr('新增失敗'));
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: 420,
          background: t.surface, borderRadius: 18,
          border: `0.5px solid ${t.border}`,
          padding: 22,
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: t.text, letterSpacing: -0.3 }}>{tr('新增收藏地點')}</div>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: t.textMuted, fontSize: 22, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
          {tr('名稱(例如:家、公司)')}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder={tr('家')}
          maxLength={12}
          style={{
            width: '100%', padding: '10px 12px',
            fontSize: 14, fontFamily: 'inherit',
            background: t.surface2, color: t.text,
            border: `1px solid ${t.border}`, borderRadius: 10,
            outline: 'none', marginBottom: 12,
          }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
          {tr('地址')}
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="臺北市大安區永康街47巷8號"
          style={{
            width: '100%', padding: '10px 12px',
            fontSize: 14, fontFamily: 'inherit',
            background: t.surface2, color: t.text,
            border: `1px solid ${t.border}`, borderRadius: 10,
            outline: 'none', marginBottom: 10,
          }}
        />
        <div style={{ fontSize: 11, color: t.textDim, marginBottom: 16, lineHeight: 1.5 }}>
          {tr('會自動用 OpenStreetMap 反查座標來計算距離。地址越完整越準。')}
        </div>

        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, marginBottom: 12,
            background: dark ? 'rgba(184,92,46,0.18)' : '#FBEEE4',
            color: dark ? '#E39265' : '#B85C2E',
            fontSize: 12.5, lineHeight: 1.5,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', color: t.text, border: `1px solid ${t.border}`,
            fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
          }}>{tr('取消')}</button>
          <button type="submit" disabled={!canSubmit} style={{
            flex: 1, padding: '10px', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit ? t.accent : t.chip,
            color: canSubmit ? '#fff' : t.textMuted,
            border: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {submitting && <span style={{ fontSize: 11 }}>⟳</span>}
            {submitting ? tr('查詢地址中…') : tr('新增')}
          </button>
        </div>
      </form>
    </div>
  );
}
