/**
 * RFC4122 v4 UUID generator
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a random 4-digit quiz code
 */
export function generateQuizCode(): string {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
}

