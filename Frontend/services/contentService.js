import api from './apiService';

export const getAboutScreenContent = async () => {
  const response = await api.get('/api/content/about-screen');
  return response.data;
};

const normalizeLocale = (locale) => {
  if (typeof locale !== 'string') return 'en';
  const value = locale.toLowerCase();
  if (value.startsWith('ar')) return 'ar';
  if (value.startsWith('ku') || value.startsWith('ckb')) return 'ku';
  return 'en';
};

export const getLocalizedValue = (
  item,
  baseField,
  locale,
  fallback = '',
  options = {}
) => {
  const { preferFallbackForNonEnglish = false } = options;

  if (!item) return fallback;

  const normalizedLocale = normalizeLocale(locale);
  const localizedValue = item[`${baseField}_${normalizedLocale}`];
  if (typeof localizedValue === 'string' && localizedValue.trim()) {
    return localizedValue.trim();
  }

  if (
    preferFallbackForNonEnglish &&
    normalizedLocale !== 'en' &&
    typeof fallback === 'string' &&
    fallback.trim()
  ) {
    return fallback.trim();
  }

  const englishValue = item[`${baseField}_en`];
  if (typeof englishValue === 'string' && englishValue.trim()) {
    return englishValue.trim();
  }

  const baseValue = item[baseField];
  if (typeof baseValue === 'string' && baseValue.trim()) {
    return baseValue.trim();
  }

  return fallback;
};

export default {
  getAboutScreenContent,
  getLocalizedValue,
};
