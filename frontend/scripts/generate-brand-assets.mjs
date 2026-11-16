// Xuất logo VietBank ra icon app, icon Android, splash, favicon và layer icon iOS
// từ cùng hình học với logo trong app (src/helpers/logo.ts), để hai nơi luôn khớp nhau.
//
// Chạy: node --experimental-strip-types scripts/generate-brand-assets.mjs
// Bước vẽ PNG dùng GDI+ (scripts/brand-renderer.cs, nạp qua Add-Type của PowerShell) nên cần Windows;
// layer SVG của icon iOS thì ghi được trên mọi hệ điều hành.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { LogoPalettes, logoParts, logoSvg } from '../src/helpers/logo.ts';

const root = resolve(import.meta.dirname, '..');
const images = join(root, 'assets', 'images');

// Nền xanh rêu chuyển màu của icon app và nền icon Android.
const BG_FROM = '#137258';
const BG_TO = '#0B3A2E';

// Android chỉ lấy kênh alpha của icon đơn sắc rồi tự tô màu theo theme máy: đồng tiền trắng, lỗ trong suốt.
const MONOCHROME = { coin: '#FFFFFF' };

const jobs = [
  // Đồng tiền rộng khoảng 55% icon.
  { file: 'icon.png', canvas: 1024, bg: true, level: 'full', mark: 600, palette: LogoPalettes.onPrimary },
  // Android adaptive icon: nền và logo tách lớp. Launcher chỉ hiện phần giữa 72/108 của lớp (khoảng 341 px trên khung 512)
  // rồi cắt theo hình của máy; logo 200 px cho đồng tiền rộng khoảng 55% phần hiện ra, cùng tỉ lệ với icon.png
  // và nằm gọn trong vùng an toàn.
  { file: 'android-icon-background.png', canvas: 512, bg: true, level: 'full', mark: 0, palette: LogoPalettes.onPrimary },
  { file: 'android-icon-foreground.png', canvas: 512, bg: false, level: 'full', mark: 200, palette: LogoPalettes.onPrimary },
  { file: 'android-icon-monochrome.png', canvas: 512, bg: false, level: 'compact', mark: 200, palette: MONOCHROME },
  // Splash: logo kín khung, app.json hiển thị với imageWidth 120 trên nền xanh.
  { file: 'splash-icon.png', canvas: 512, bg: false, level: 'full', mark: 512, palette: LogoPalettes.onPrimary },
  { file: 'favicon.png', canvas: 48, bg: false, level: 'compact', mark: 48, palette: LogoPalettes.brand },
];

// Layer của icon iOS (Icon Composer, nền xanh đặt trong icon.json): đồng tiền vàng phẳng, iOS tự thêm hiệu ứng kính.
// Tên file phải khớp "image-name" trong assets/expo.icon/icon.json.
const IOS_LAYER = 'vietbank-logo.svg';
writeFileSync(join(root, 'assets', 'expo.icon', 'Assets', IOS_LAYER), logoSvg('full', LogoPalettes.onPrimary, 1024, 620));
console.log(`Đã ghi assets/expo.icon/Assets/${IOS_LAYER}`);

const lines = [];
for (const level of ['full', 'compact']) {
  for (const p of logoParts(level)) {
    lines.push(['PART', level, p.paint, p.evenOdd ? 'evenodd' : 'nonzero', p.d].join('|'));
  }
}
for (const j of jobs) {
  lines.push(
    ['JOB', join(images, j.file), j.canvas, j.bg ? BG_FROM : '-', j.bg ? BG_TO : '-', j.level, j.mark, j.palette.coin].join('|'),
  );
}
const spec = join(mkdtempSync(join(tmpdir(), 'vietbank-brand-')), 'spec.txt');
writeFileSync(spec, lines.join('\n'));

if (process.platform !== 'win32') {
  console.log(`Bước vẽ PNG cần Windows (GDI+). Spec đã ghi tại: ${spec}`);
  process.exit(0);
}

const renderer = join(root, 'scripts', 'brand-renderer.cs');
const command = `Add-Type -Path '${renderer}' -ReferencedAssemblies System.Drawing; [BrandRenderer]::Run('${spec}')`;
console.log('Đang vẽ PNG vào assets/images:');
const result = spawnSync('powershell', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
process.exit(result.status ?? 1);
