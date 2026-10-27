export type CardBrand = 'visa' | 'mastercard' | 'napas';

export interface AccountCard {
  holderName: string;
  brand: CardBrand;
  expiry: string;
  cardNumber: string;
}

export interface Account {
  id: string;
  label: string;
  number: string;
  balance: number;
  monthChange?: number;
  interestRate?: number;
  maturityDate?: string;
  card?: AccountCard;
}
