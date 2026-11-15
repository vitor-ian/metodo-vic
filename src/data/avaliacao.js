/**
 * Avaliação pós-atendimento (/avaliacao/:slug).
 *
 * Três perguntas fixas (nota geral em estrelas, recomendação 0–10 e
 * comentário) e até MAX_PERGUNTAS que o barbeiro cria no painel. O texto das
 * perguntas dele é livre; o resto vem do i18n (aval.* e painel.aval.*).
 */

export const MAX_PERGUNTAS = 10

/** Tipos de pergunta que o barbeiro pode criar (o banco confere os mesmos). */
export const tiposPergunta = [
  { id: 'nota', icon: 'star', key: 'painel.aval.tipoNota' },
  { id: 'sim_nao', icon: 'thumbs_up_down', key: 'painel.aval.tipoSimNao' },
  { id: 'texto', icon: 'notes', key: 'painel.aval.tipoTexto' }
]

/**
 * Sugestões de um toque no painel: o texto sai do i18n no idioma do painel e
 * vira pergunta própria do barbeiro (dá para editar depois).
 */
export const sugestoesPergunta = [
  { key: 'painel.aval.sug1', tipo: 'sim_nao' },
  { key: 'painel.aval.sug2', tipo: 'nota' },
  { key: 'painel.aval.sug3', tipo: 'nota' },
  { key: 'painel.aval.sug4', tipo: 'nota' },
  { key: 'painel.aval.sug5', tipo: 'sim_nao' },
  { key: 'painel.aval.sug6', tipo: 'texto' }
]

/** Rótulo de cada estrela (1..5). */
export const rotulosNota = [
  'aval.nota1',
  'aval.nota2',
  'aval.nota3',
  'aval.nota4',
  'aval.nota5'
]

/** NPS: 9–10 promove, 7–8 é neutro, 0–6 é detrator. */
export function grupoNps(n) {
  if (n === null || n === undefined) return null
  if (n >= 9) return 'promotor'
  if (n >= 7) return 'neutro'
  return 'detrator'
}

/** Id curto para pergunta nova (o banco aceita [a-z0-9]{1,24}). */
export function novoIdPergunta() {
  return (
    Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6)
  )
}
