/**
 * Estado e regras do diagnóstico (/diagnostico/:slug).
 *
 * Fica fora do componente por dois motivos: a pontuação e o resumo são a
 * parte que precisa estar certa (e dá para ler sem atravessar template), e o
 * rascunho no localStorage deixa a pessoa fechar a aba no meio das 12
 * perguntas — ou no meio das fotos — sem perder o que já fez.
 *
 * O rascunho é por link: o mesmo aparelho pode responder para dois
 * barbeiros sem um sobrescrever o outro.
 */
import { reactive, ref, computed, watch } from 'vue'
import {
  diagEscuta,
  diagQuestions,
  diagOrdem,
  diagEstilos,
  diagAtendimento
} from '@/data/diagnostico.js'

const PREFIXO = 'mv-diag-'

/** uuid v4 também nos navegadores sem crypto.randomUUID (http, iOS antigo). */
function novoUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Parâmetros de campanha da URL: o barbeiro vê de onde o cliente veio. */
function origemDaUrl() {
  if (typeof window === 'undefined') return {}
  const q = new URLSearchParams(window.location.search)
  const origem = {
    utm_source: q.get('utm_source'),
    utm_medium: q.get('utm_medium'),
    utm_campaign: q.get('utm_campaign')
  }
  return Object.fromEntries(Object.entries(origem).filter(([, v]) => v))
}

export function useDiagnostico(t, slug) {
  const RASCUNHO = PREFIXO + slug
  const form = reactive({
    nome: '',
    whatsapp: '',
    data: new Date().toISOString().slice(0, 10)
  })
  // Uma entrada por pergunta aberta, na ordem de diagEscuta.
  const escuta = reactive(diagEscuta.map(() => ''))
  // Índice da alternativa escolhida (0..3) ou null enquanto não respondida.
  const respostas = ref(diagQuestions.map(() => null))
  const estilo = ref('')
  const atendimento = ref('')
  // Depois de enviado: o id e o token que autorizam as fotos, e a tela em que
  // a pessoa parou (resultado, fotos, referencia ou fim).
  const envio = reactive({
    id: '',
    token: '',
    salvo: false,
    tela: '',
    refObs: ''
  })

  function carregarRascunho() {
    if (typeof window === 'undefined') return
    try {
      const salvo = JSON.parse(window.localStorage.getItem(RASCUNHO) || '{}')
      if (salvo.form) Object.assign(form, salvo.form)
      if (
        Array.isArray(salvo.escuta) &&
        salvo.escuta.length === escuta.length
      ) {
        salvo.escuta.forEach((v, i) => (escuta[i] = v))
      }
      if (
        Array.isArray(salvo.respostas) &&
        salvo.respostas.length === diagQuestions.length
      ) {
        respostas.value = salvo.respostas
      }
      if (salvo.estilo) estilo.value = salvo.estilo
      if (salvo.atendimento) atendimento.value = salvo.atendimento
      if (salvo.envio) Object.assign(envio, salvo.envio)
    } catch {
      // Rascunho corrompido ou storage bloqueado: começa do zero, sem alarde.
    }
  }

  function salvarRascunho() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        RASCUNHO,
        JSON.stringify({
          form,
          escuta,
          respostas: respostas.value,
          estilo: estilo.value,
          atendimento: atendimento.value,
          envio
        })
      )
    } catch {
      // Navegação privada: seguir sem rascunho é melhor que quebrar o fluxo.
    }
  }

  function limparRascunho() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(RASCUNHO)
    } catch {
      // idem
    }
  }

  watch([form, escuta, respostas, estilo, atendimento, envio], salvarRascunho, {
    deep: true
  })

  /** Pontuação: uma resposta vale um ponto para a tendência da alternativa. */
  const placar = computed(() => {
    const total = { D: 0, I: 0, S: 0, C: 0 }
    respostas.value.forEach((escolha, i) => {
      if (escolha === null) return
      total[diagQuestions[i].letras[escolha]] += 1
    })
    return total
  })

  const maiorPlacar = computed(() =>
    Math.max(...diagOrdem.map(k => placar.value[k]))
  )

  /** Pode haver empate: todas as tendências no topo entram como predominante. */
  const predominantes = computed(() =>
    diagOrdem.filter(k => placar.value[k] === maiorPlacar.value)
  )

  const estiloEscolhido = computed(() =>
    diagEstilos.find(e => e.id === estilo.value)
  )
  const atendimentoEscolhido = computed(() =>
    diagAtendimento.find(a => a.id === atendimento.value)
  )

  const dataFormatada = computed(() => {
    if (!form.data) return ''
    // 'T00:00' evita o pulo de um dia que o parse em UTC causa no Brasil.
    return new Date(`${form.data}T00:00`).toLocaleDateString('pt-BR')
  })

  /** Gera o id e o token do envio uma vez só: o reenvio reaproveita. */
  function prepararEnvio() {
    if (!envio.id) envio.id = novoUuid()
    if (!envio.token) envio.token = novoUuid()
  }

  /** O que vai para a função enviar_diagnostico (ver a migration). */
  function payload(idioma) {
    return {
      id: envio.id,
      token: envio.token,
      nome: form.nome.trim(),
      whatsapp: form.whatsapp.trim(),
      data: form.data,
      idioma,
      escuta: diagEscuta.map((chave, i) => ({
        chave,
        resposta: escuta[i].trim()
      })),
      respostas: respostas.value,
      placar: placar.value,
      predominantes: predominantes.value,
      estilo: estilo.value || null,
      atendimento: atendimento.value || null,
      origem: origemDaUrl()
    }
  }

  /**
   * Resumo em texto: é o que vai para o WhatsApp do barbeiro. O `negrito`
   * marca o título de cada bloco — no WhatsApp o asterisco vira negrito.
   */
  function resumo({ negrito = false } = {}) {
    const b = negrito ? '*' : ''
    const linhas = [
      `${b}${t('diag.waTitle')}${b}`,
      `${t('diag.waName')}: ${form.nome.trim() || t('diag.resEmpty')}`,
      `${t('diag.waDate')}: ${dataFormatada.value || t('diag.resEmpty')}`,
      '',
      `${b}1. ${t('diag.resListen')}${b}`
    ]

    diagEscuta.forEach((chave, i) => {
      const resposta = escuta[i].trim()
      if (resposta) linhas.push(`• ${t(chave)}`, `  ${resposta}`)
    })

    const p = placar.value
    linhas.push(
      '',
      `${b}2. ${t('diag.resProfile')}${b}`,
      `D: ${p.D}  I: ${p.I}  S: ${p.S}  C: ${p.C}`,
      `${t('diag.waLead')}: ${predominantes.value
        .map(k => `${t(`diag.prof${k}`)} (${k})`)
        .join(', ')}`,
      '',
      `${b}3. ${t('diag.resStyle')}${b}`,
      estiloEscolhido.value
        ? `${t(estiloEscolhido.value.nameKey)} — ${t(estiloEscolhido.value.descKey)}`
        : t('diag.resEmpty')
    )

    if (atendimentoEscolhido.value) {
      linhas.push(
        '',
        `${b}${t('diag.resWhere')}${b}`,
        t(atendimentoEscolhido.value.nameKey)
      )
    }

    return linhas.join('\n')
  }

  return {
    form,
    escuta,
    respostas,
    estilo,
    atendimento,
    placar,
    maiorPlacar,
    predominantes,
    estiloEscolhido,
    atendimentoEscolhido,
    dataFormatada,
    envio,
    prepararEnvio,
    payload,
    resumo,
    carregarRascunho,
    limparRascunho
  }
}
