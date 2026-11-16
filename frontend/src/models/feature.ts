export type AppFeatureId =
  | 'transfer'
  | 'qrScan'
  | 'qrReceive'
  | 'topup'
  | 'bills'
  | 'history'
  | 'statement'
  | 'exchange'
  | 'budget'
  | 'goals'
  | 'cards'
  | 'cardLock'
  | 'changePin'
  | 'profile'
  | 'ekyc';

export type AppFeatureGroup = 'payments' | 'accounts' | 'cards' | 'personal';

/** Một chức năng tìm được trong ô tìm kiếm ở trang chủ. Chưa có `route` = chưa làm ("Sắp ra mắt"). */
export interface AppFeature {
  id: AppFeatureId;
  group: AppFeatureGroup;
  route?: '/transfer' | '/qr' | '/bills' | '/profile' | '/kyc' | '/history' | '/statement';
  /** Từ khoá phụ không dấu (cả tiếng Việt và Anh) để gõ tắt vẫn tìm ra. */
  keywords: string[];
  popular?: boolean;
}

export interface GetAppFeaturesResponse {
  success: boolean;
  items: AppFeature[];
  message?: string;
}
