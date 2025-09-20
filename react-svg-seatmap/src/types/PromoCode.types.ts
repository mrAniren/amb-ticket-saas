export type PromoCodeType = 'permanent' | 'temporary';
export type DiscountType = 'percentage' | 'fixed';
export type Currency = 'RUB' | 'USD' | 'EUR' | 'KZT';

export interface PromoCode {
  id: string;
  code: string;
  name: string;
  type: PromoCodeType;
  startDate: string | null;
  endDate: string | null;
  discountType: DiscountType;
  discountValue: number;
  currency: Currency | null;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeFormData {
  code: string;
  name: string;
  type: PromoCodeType;
  startDate: string;
  endDate: string;
  discountType: DiscountType;
  discountValue: string;
  currency: Currency;
  description: string;
}

export interface PromoCodeCreateRequest {
  code: string;
  name: string;
  type: PromoCodeType;
  startDate?: string;
  endDate?: string;
  discountType: DiscountType;
  discountValue: number;
  currency?: Currency;
  description?: string;
}

export interface PromoCodeUpdateRequest extends PromoCodeCreateRequest {}

export interface PromoCodeValidationResponse {
  success: boolean;
  promoCode?: PromoCode;
  valid?: boolean;
  message?: string;
}

export interface PromoCodesResponse {
  success: boolean;
  promoCodes: PromoCode[];
}

export interface PromoCodeResponse {
  success: boolean;
  promoCode: PromoCode;
}

export interface PromoCodeDeleteResponse {
  success: boolean;
  message: string;
}

// Утилитарные типы для фильтрации
export type PromoCodeFilter = 'all' | 'active' | 'inactive';

// Константы для валют
export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'RUB', label: 'Российский рубль', symbol: '₽' },
  { value: 'USD', label: 'Доллар США', symbol: '$' },
  { value: 'EUR', label: 'Евро', symbol: '€' },
  { value: 'KZT', label: 'Казахстанский тенге', symbol: '₸' }
];

// Утилитарные функции
export const formatDiscount = (promoCode: PromoCode): string => {
  if (promoCode.discountType === 'percentage') {
    return `${promoCode.discountValue}%`;
  } else {
    const currency = CURRENCIES.find(c => c.value === promoCode.currency);
    return `${promoCode.discountValue} ${currency?.symbol || promoCode.currency}`;
  }
};

export const getPromoCodeStatus = (promoCode: PromoCode): 'active' | 'inactive' => {
  return promoCode.isActive ? 'active' : 'inactive';
};

export const formatPromoCodeDates = (promoCode: PromoCode): string => {
  if (promoCode.type === 'permanent') {
    return 'Постоянный';
  }
  
  if (promoCode.startDate && promoCode.endDate) {
    const start = new Date(promoCode.startDate).toLocaleDateString('ru-RU');
    const end = new Date(promoCode.endDate).toLocaleDateString('ru-RU');
    return `${start} - ${end}`;
  }
  
  return 'Временный';
};
