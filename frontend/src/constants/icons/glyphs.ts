import type { IconName } from './types';

// Hình icon dùng ở nhiều nhóm: khai báo một lần ở đây, các nhóm (FeatureIcons, TransferIcons...) trỏ tới.
// Thêm icon mới: nếu hình đã có ở đây thì dùng lại, đừng khai báo lại object { ios, android, web }.
export const Glyphs = {
  account: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  faceId: { ios: 'faceid', android: 'face', web: 'face' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  key: { ios: 'key', android: 'key', web: 'key' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  more: { ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' },
  person: { ios: 'person', android: 'person', web: 'person' },
  phone: { ios: 'iphone', android: 'smartphone', web: 'smartphone' },
  qrCode: { ios: 'qrcode', android: 'qr_code', web: 'qr_code' },
  qrScan: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
  receipt: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' },
  school: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  securityShield: { ios: 'lock.shield', android: 'security', web: 'security' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  shoppingBag: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  statement: { ios: 'doc.text.magnifyingglass', android: 'description', web: 'description' },
  success: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  verified: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
} satisfies Record<string, IconName>;
