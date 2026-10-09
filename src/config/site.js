/**
 * Configuração do ambiente. Os valores vêm do .env (prefixo QCLI_, ver
 * .env.example); nada de segredo aqui — a chave do Supabase é a publicável.
 */
export const SUPABASE_URL = import.meta.env.QCLI_SUPABASE_URL || ''
export const SUPABASE_KEY = import.meta.env.QCLI_SUPABASE_KEY || ''

/** Endereço público: base do link do formulário e rodapé do PDF. */
export const SITE_URL = (
  import.meta.env.QCLI_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '')

/** Bucket das fotos e referências (ver a migration). */
export const BUCKET = 'diagnosticos'

export function linkDoFormulario(slug) {
  return `${SITE_URL}/diagnostico/${slug}`
}
