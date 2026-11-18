import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { formatDateTime, formatFullDate, formatNumberVND, MINUS_SIGN } from '@/helpers';
import type { Translate } from '@/i18n';
import type { AccountStatement } from '@/models';

// Khổ A4 theo điểm in (72 điểm/inch).
const A4 = { width: 595, height: 842 };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const money = formatNumberVND;

/** Bản sao kê dạng HTML (một trang A4 hoặc nhiều hơn) để in ra PDF. */
export function buildStatementHtml(statement: AccountStatement, t: Translate): string {
  const period = `${formatFullDate(statement.from)} – ${formatFullDate(statement.to)}`;
  const rows = statement.items
    .map(
      (tx) => `<tr>
        <td class="nowrap">${escapeHtml(formatDateTime(tx.createdAt))}</td>
        <td class="mono">${escapeHtml(tx.reference)}</td>
        <td><strong>${escapeHtml(tx.counterpartyName)}</strong><br><span class="muted">${escapeHtml(tx.description)}</span></td>
        <td class="num">${tx.type === 'out' ? money(tx.amount) : ''}</td>
        <td class="num in">${tx.type === 'in' ? money(tx.amount) : ''}</td>
        <td class="num">${money(tx.balanceAfter)}</td>
      </tr>`,
    )
    .join('');
  const empty = `<tr><td colspan="6" class="muted center">${escapeHtml(t('statement.empty'))}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${escapeHtml(`${t('statement.title')} ${statement.accountNumber} ${period}`)}</title>
<style>
  @page { size: A4; margin: 16mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #14211C; font-size: 10px; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0F6B4F; padding-bottom: 8px; }
  .brand { font-size: 18px; font-weight: 800; color: #0F6B4F; }
  h1 { font-size: 15px; margin: 0; letter-spacing: 0.5px; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0; }
  .label { color: #69766F; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #E1E6E1; border-radius: 8px; margin-bottom: 12px; }
  .summary div { padding: 8px 10px; border-left: 1px solid #E1E6E1; }
  .summary div:first-child { border-left: none; }
  .summary strong { display: block; font-size: 12px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #E2F0E8; color: #0B5540; text-align: left; font-weight: 700; }
  th, td { padding: 6px 5px; border-bottom: 1px solid #E1E6E1; vertical-align: top; }
  tr { page-break-inside: avoid; }
  tfoot td { font-weight: 700; background: #F6F7F4; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .in { color: #15803D; }
  .mono { font-family: Menlo, Consolas, monospace; font-size: 9px; }
  .muted { color: #69766F; }
  .nowrap { white-space: nowrap; }
  .center { text-align: center; padding: 16px; }
  .footer { margin-top: 14px; color: #69766F; font-size: 9px; }
</style>
</head>
<body>
  <div class="top">
    <div class="brand">VietBank</div>
    <h1>${escapeHtml(t('statement.pdf.heading'))}</h1>
  </div>
  <div class="info">
    <div><span class="label">${escapeHtml(t('statement.pdf.holder'))}:</span> <strong>${escapeHtml(statement.holderName)}</strong></div>
    <div><span class="label">${escapeHtml(t('statement.period'))}:</span> <strong>${escapeHtml(period)}</strong></div>
    <div><span class="label">${escapeHtml(t('statement.pdf.account'))}:</span> <strong>${escapeHtml(statement.accountNumber)}</strong></div>
    <div><span class="label">${escapeHtml(t('statement.pdf.generatedAt'))}:</span> ${escapeHtml(formatDateTime(statement.generatedAt))}</div>
    <div><span class="label">${escapeHtml(t('statement.pdf.accountType'))}:</span> ${escapeHtml(statement.accountLabel)}</div>
  </div>
  <div class="summary">
    <div><span class="label">${escapeHtml(t('statement.opening'))}</span><strong>${money(statement.openingBalance)}</strong></div>
    <div><span class="label">${escapeHtml(t('statement.totalIn'))}</span><strong class="in">+${money(statement.totalIn)}</strong></div>
    <div><span class="label">${escapeHtml(t('statement.totalOut'))}</span><strong>${MINUS_SIGN}${money(statement.totalOut)}</strong></div>
    <div><span class="label">${escapeHtml(t('statement.closing'))}</span><strong>${money(statement.closingBalance)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t('statement.pdf.date'))}</th>
        <th>${escapeHtml(t('statement.pdf.reference'))}</th>
        <th>${escapeHtml(t('statement.pdf.description'))}</th>
        <th class="num">${escapeHtml(t('statement.pdf.debit'))}</th>
        <th class="num">${escapeHtml(t('statement.pdf.credit'))}</th>
        <th class="num">${escapeHtml(t('statement.pdf.balance'))}</th>
      </tr>
    </thead>
    <tbody>${rows || empty}</tbody>
    <tfoot>
      <tr>
        <td colspan="3">${escapeHtml(t('statement.pdf.total'))}</td>
        <td class="num">${money(statement.totalOut)}</td>
        <td class="num in">${money(statement.totalIn)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  <p class="footer">${escapeHtml(t('statement.pdf.footer'))}</p>
</body>
</html>`;
}

export type ExportResult = 'done' | 'blocked' | 'failed';

/**
 * Điện thoại: in HTML ra file PDF rồi mở bảng chia sẻ (lưu vào Tệp, gửi Zalo, email...).
 * Web: expo-print chỉ in được chính trang đang mở, nên mở bản sao kê trong cửa sổ mới rồi gọi hộp thoại in,
 * người dùng chọn "Lưu dưới dạng PDF". Hàm phải được gọi ngay trong lúc bấm nút để trình duyệt không chặn cửa sổ.
 */
export async function exportStatementPdf(html: string, title: string): Promise<ExportResult> {
  if (Platform.OS === 'web') return printOnWeb(html);
  try {
    const { uri } = await Print.printToFileAsync({ html, ...A4 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
    } else {
      await Print.printAsync({ uri });
    }
    return 'done';
  } catch {
    return 'failed';
  }
}

function printOnWeb(html: string): ExportResult {
  const win = window.open('', '_blank');
  if (!win) return 'blocked';
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Chờ cửa sổ mới vẽ xong bảng rồi mới mở hộp thoại in.
  setTimeout(() => win.print(), 300);
  return 'done';
}
