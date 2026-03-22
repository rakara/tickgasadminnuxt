/**
 * Normalise a Kenyan phone number to the 254XXXXXXXXX format
 * expected by Safaricom Daraja and stored in the DB.
 */
export function normalisePhone(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0'))    cleaned = '254' + cleaned.slice(1);
  else if (cleaned.startsWith('7') || cleaned.startsWith('1')) cleaned = '254' + cleaned;
  else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
  return cleaned;
}
