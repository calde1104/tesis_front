
const DANGEROUS_CHARS_REGEX = /['"\\;<>{}`^~$]/g;

/**
 * Sanitiza texto de búsqueda en tablas, selectores y autocompletados.
 * Permite letras, números, espacios, acentos en español (áéíóúÁÉÍÓÚñÑ), guiones y puntos.
 * Remueve apóstrofes, comillas, punto y comas, comentarios SQL y tags.
 */
export const sanitizeSearch = (value, maxLength = 100) => {
  if (typeof value !== 'string') return '';
  
  let clean = value.slice(0, maxLength);
  
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  
  clean = clean.replace(DANGEROUS_CHARS_REGEX, '');
  
  clean = clean.replace(/--+/g, '-');
  
  return clean;
};

export const sanitizeText = (value, maxLength = 200) => {
  if (typeof value !== 'string') return '';
  
  let clean = value.slice(0, maxLength);
  
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  
  clean = clean.replace(/<[^>]*>?/gm, '');
  
  clean = clean.replace(/['";\\`]/g, '');
  
  return clean;
};

export const sanitizeEmail = (value, maxLength = 120) => {
  if (typeof value !== 'string') return '';
  
  let clean = value.trim().slice(0, maxLength);
  
  clean = clean.replace(/[\x00-\x1F\x7F\s'"\\;<>{}`]/g, '');
  
  return clean;
};

/**
 * Valida y sanitiza entradas numéricas asegurando tipo, rango y evitando NaN / Infinity.
 */
export const sanitizeNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER, defaultValue = 0) => {
  if (value === '' || value === null || value === undefined) return defaultValue;
  
  const parsed = Number(value);
  if (isNaN(parsed) || !isFinite(parsed)) return defaultValue;
  
  return Math.min(Math.max(parsed, min), max);
};

export const sanitizeIsoDate = (value) => {
  if (typeof value !== 'string') return '';
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) return '';
  
  const [year, month, day] = value.split('-').map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }
  return value;
};
