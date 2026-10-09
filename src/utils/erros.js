/**
 * Erros do Supabase (que vêm em inglês, em texto técnico) traduzidos para o
 * idioma do painel. O que não estiver mapeado cai na mensagem genérica.
 */
const MAPA = [
  ['Invalid login credentials', 'credenciais'],
  ['Email not confirmed', 'naoConfirmado'],
  ['User already registered', 'jaExiste'],
  ['Password should be at least', 'senhaCurta'],
  ['New password should be different', 'senhaIgual'],
  ['rate limit', 'limite'],
  ['For security purposes', 'aguarde'],
  ['perfis_slug_key', 'slugUsado'],
  ['perfis_slug_check', 'slugFormato'],
  ['Failed to fetch', 'semConexao']
]

/**
 * @param {Function} t        o `t` do vue-i18n
 * @param {unknown} erro
 * @param {string} [padrao]   chave i18n para o que não estiver no mapa
 */
export function mensagemDeErro(t, erro, padrao = 'painel.erros.generico') {
  const texto = String(erro?.message || erro || '')
  const achado = MAPA.find(([trecho]) => texto.includes(trecho))
  return t(achado ? `painel.erros.${achado[1]}` : padrao)
}
