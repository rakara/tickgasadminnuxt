/** Normalise a Kenyan phone number to 254XXXXXXXXX format */
export function normalisePhone(phone: string): string {
  let c = phone.replace(/\D/g, '')
  if (c.startsWith('0'))                        c = '254' + c.slice(1)
  else if (c.startsWith('7') && c.length === 9) c = '254' + c
  else if (!c.startsWith('254'))                c = '254' + c
  return c
}
