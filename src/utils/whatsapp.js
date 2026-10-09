/**
 * Link do WhatsApp para um número digitado à mão ("(11) 98888-7777",
 * "+351 912 345 678"...). Sem DDI, assume Brasil: 10 ou 11 dígitos.
 */
export function numeroWhatsapp(numero) {
  const digitos = String(numero || '').replace(/\D/g, '')
  if (!digitos) return ''
  if (digitos.length <= 11 && !String(numero).trim().startsWith('+')) {
    return `55${digitos}`
  }
  return digitos
}

export function linkWhatsapp(numero, texto = '') {
  const n = numeroWhatsapp(numero)
  if (!n) return ''
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}
