/**
 * Status do diagnóstico no painel — o funil do barbeiro depois que o cliente
 * respondeu. A ordem é a do atendimento; `arquivado` sai das contagens.
 * O nome de cada um vem do i18n (painel.status.<id>).
 */
export const statusList = [
  { id: 'novo', icon: 'fiber_new' },
  { id: 'em_contato', icon: 'chat' },
  { id: 'agendado', icon: 'event' },
  { id: 'concluido', icon: 'task_alt' },
  { id: 'arquivado', icon: 'inventory_2' }
].map(s => ({ ...s, key: `painel.status.${s.id}` }))

export const statusPorId = Object.fromEntries(statusList.map(s => [s.id, s]))
