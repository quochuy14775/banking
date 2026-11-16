export interface Bank {
  code: string;
  /** Mã BIN NAPAS (6 số), dùng trong mã VietQR. */
  bin: string;
  shortName: string;
  name: string;
  logo?: string;
}

export interface GetBanksResponse {
  success: boolean;
  items: Bank[];
  message?: string;
}
