export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Получает UTM-параметры из URL
 */
export const getUTMParameters = (): AttributionData => {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_term: urlParams.get('utm_term') || undefined,
    utm_content: urlParams.get('utm_content') || undefined,
  };
};

/**
 * Сохраняет данные атрибуции в localStorage
 * Сохраняет только если есть хотя бы один UTM-параметр
 */
export const saveAttributionToStorage = (attribution: AttributionData): void => {
  const hasUTM = Object.values(attribution).some(value => value !== undefined);
  if (hasUTM) {
    localStorage.setItem('attribution_data', JSON.stringify(attribution));
    console.log('📊 UTM данные сохранены:', attribution);
  }
};

/**
 * Получает сохраненные данные атрибуции из localStorage
 */
export const getAttributionFromStorage = (): AttributionData => {
  try {
    const stored = localStorage.getItem('attribution_data');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('⚠️ Ошибка при чтении UTM данных из localStorage:', error);
    return {};
  }
};

/**
 * Проверяет, есть ли уже сохраненные UTM данные
 */
export const hasStoredAttribution = (): boolean => {
  return localStorage.getItem('attribution_data') !== null;
};

/**
 * Очищает сохраненные данные атрибуции
 */
export const clearAttributionData = (): void => {
  localStorage.removeItem('attribution_data');
  console.log('🗑️ UTM данные очищены');
};
