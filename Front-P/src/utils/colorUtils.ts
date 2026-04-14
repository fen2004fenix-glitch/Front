export function normalizeHexColor(color?: string | null): string {
  if (!color) return '#FFFFFF';
  const s = String(color).trim();

  // #RGB
  const m3 = s.match(/^#([0-9a-fA-F]{3})$/);
  if (m3 && m3[1]) {
    const [r, g, b] = m3[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  // #RGBA -> drop alpha, expand RGB
  const m4 = s.match(/^#([0-9a-fA-F]{4})$/);
  if (m4 && m4[1]) {
    const colorStr = m4[1].slice(0, 3);
    const [r, g, b] = colorStr.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  // #RRGGBB
  const m6 = s.match(/^#([0-9a-fA-F]{6})$/);
  if (m6 && m6[1]) {
    return `#${m6[1].toUpperCase()}`;
  }

  // #RRGGBBAA -> drop alpha
  const m8 = s.match(/^#([0-9a-fA-F]{8})$/);
  if (m8 && m8[1]) {
    return `#${m8[1].slice(0, 6).toUpperCase()}`;
  }

  // Try to resolve named CSS colors or other CSS color formats in browser environments
  try {
    if (typeof document !== 'undefined') {
      const el = document.createElement('div');
      el.style.color = s;
      document.body.appendChild(el);
      const computed = getComputedStyle(el).color;
      document.body.removeChild(el);

      const rgba = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgba && rgba[1] && rgba[2] && rgba[3]) {
        const r = Number(rgba[1]).toString(16).padStart(2, '0');
        const g = Number(rgba[2]).toString(16).padStart(2, '0');
        const b = Number(rgba[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
      }
    }
  } catch {
    // ignore and fall through to default
  }

  return '#FFFFFF';
}