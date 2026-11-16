// Logo VietBank: đồng tiền xưa, ngoài tròn, giữa là lỗ vuông xoay 45° ("trời tròn, đất vuông").
// Nửa dưới của lỗ vuông là một chữ V ẩn.
// File này không import gì để script xuất icon/splash (scripts/generate-brand-assets.mjs) chạy được bằng Node,
// nhờ vậy logo trong app và ảnh icon luôn khớp nhau. Toạ độ trên khung 100×100.

export type LogoLevel = 'full' | 'compact';

export type LogoPaint = 'coin';

export interface LogoPart {
  paint: LogoPaint;
  /** Path SVG tuyệt đối, chỉ dùng M/L/Z và A cho nửa đường tròn (script vẽ PNG chỉ hiểu cung nửa vòng). */
  d: string;
  evenOdd?: boolean;
}

export interface LogoPalette {
  coin: string;
}

const CENTER = 50;
const RADIUS = 47;
// Nửa đường chéo của lỗ vuông. Bản gọn mở lỗ rộng hơn một chút để ở cỡ nhỏ lỗ không bị nhoè lấp mất.
const HOLE: Record<LogoLevel, number> = { full: 21, compact: 23 };

// Đường tròn ghép từ hai nửa vòng: trái → trên → phải, rồi phải → dưới → trái.
const COIN =
  `M${CENTER - RADIUS} ${CENTER} A${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER} ` +
  `A${RADIUS} ${RADIUS} 0 0 1 ${CENTER - RADIUS} ${CENTER} Z`;

function f(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function hole(h: number): string {
  return `M${CENTER} ${CENTER - h} L${CENTER + h} ${CENTER} L${CENTER} ${CENTER + h} L${CENTER - h} ${CENTER} Z`;
}

/**
 * Cùng một hình ở mọi cỡ. `compact` (≤ 40px, favicon, icon đơn sắc) chỉ mở lỗ rộng hơn để còn rõ ở cỡ nhỏ.
 * Lỗ được đục bằng evenodd nên luôn trong suốt, nhìn xuyên thấy nền phía sau.
 */
export function logoParts(level: LogoLevel): LogoPart[] {
  return [{ paint: 'coin', d: `${COIN} ${hole(HOLE[level])}`, evenOdd: true }];
}

export function logoLevelForSize(size: number): LogoLevel {
  return size <= 40 ? 'compact' : 'full';
}

export const LogoPalettes = {
  // Trên nền sáng: xanh của app (vàng đồng trên nền trắng không đủ tương phản).
  brand: { coin: '#0F6B4F' },
  // Trên nền tối: vàng đồng.
  dark: { coin: '#E3B566' },
  // Trên nền xanh đậm (icon app, splash): vàng đồng.
  onPrimary: { coin: '#E3B566' },
} satisfies Record<string, LogoPalette>;

/** Chuỗi SVG hoàn chỉnh, dùng cho layer icon iOS. `markSize` là cỡ logo bên trong khung `canvas`. */
export function logoSvg(level: LogoLevel, palette: LogoPalette, canvas = 100, markSize = canvas): string {
  const offset = (canvas - markSize) / 2;
  const scale = markSize / 100;
  const body = logoParts(level)
    .map((p) => `<path d="${p.d}" fill="${palette[p.paint]}"${p.evenOdd ? ' fill-rule="evenodd"' : ''}/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">` +
    `<g transform="translate(${f(offset)} ${f(offset)}) scale(${f(scale)})">${body}</g></svg>`
  );
}
