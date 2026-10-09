/**
 * Estado das fotos de um diagnóstico — os seis ângulos e as referências.
 * Serve o formulário do cliente (passos 2 e 3) e a ficha no painel, que
 * também deixa o barbeiro subir uma foto que chegou pelo WhatsApp.
 *
 * Diferença entre os dois lados: o cliente não lê o bucket, então ao voltar
 * pelo link ele vê "enviada" sem a miniatura; o painel assina as URLs e, ao
 * trocar uma foto, apaga a antiga.
 */
import { reactive, ref, computed, onBeforeUnmount } from 'vue'
import { diagAngulos, MAX_REFERENCIAS } from '@/data/diagnostico.js'
import { supabase } from '@/config/supabase.js'
import {
  enviarArquivo,
  registrarArquivo,
  desregistrarArquivo,
  apagarDoBucket,
  assinar,
  pastaDo,
  novaChaveDeReferencia
} from '@/composables/useArquivos.js'

function vazio() {
  return { caminho: '', url: '', estado: 'vazio' }
}

/**
 * @param {() => { id: string, token: string } | null} envio
 * @param {{ painel?: boolean }} opcoes  no painel o token vai nulo (o RLS do
 *   barbeiro autoriza) e as URLs são assinadas
 */
export function useFotos(envio, { painel = false } = {}) {
  // chave do ângulo -> { caminho, url, estado }
  const angulos = reactive(
    Object.fromEntries(diagAngulos.map(a => [a.id, vazio()]))
  )
  // [{ chave, caminho, url, estado }]
  const referencias = ref([])
  const carregando = ref(false)
  const previas = []

  const enviadas = computed(
    () => diagAngulos.filter(a => angulos[a.id].estado === 'ok').length
  )
  const completas = computed(() => enviadas.value === diagAngulos.length)
  const ocupado = computed(
    () =>
      diagAngulos.some(a => angulos[a.id].estado === 'enviando') ||
      referencias.value.some(r => r.estado === 'enviando')
  )
  const refsProntas = computed(() =>
    referencias.value.filter(r => r.estado === 'ok')
  )

  const id = () => envio()?.id
  const token = () => (painel ? null : envio()?.token)
  const pasta = () => pastaDo(envio().id, envio().token)

  /** Prévia local: aparece na hora, sem esperar o upload. */
  function previa(arquivo) {
    const url = URL.createObjectURL(arquivo)
    previas.push(url)
    return url
  }

  /**
   * Monta o estado a partir do mapa { chave: caminho }. No painel o mapa vem
   * do registro; no formulário, de `arquivos_do_envio` (com o token).
   */
  async function carregar(mapa) {
    if (!envio()) return
    carregando.value = true
    try {
      if (!mapa) {
        const { data, error } = await supabase.rpc('arquivos_do_envio', {
          p_id: id(),
          p_token: envio().token
        })
        if (error) throw error
        mapa = data || {}
      }
      const urls = painel ? await assinar(Object.values(mapa)) : {}
      const refs = []
      for (const [chave, caminho] of Object.entries(mapa)) {
        const item = { caminho, url: urls[caminho] || '', estado: 'ok' }
        if (chave.startsWith('referencia-')) refs.push({ chave, ...item })
        else if (angulos[chave]) Object.assign(angulos[chave], item)
      }
      referencias.value = refs
    } finally {
      carregando.value = false
    }
  }

  /** Sobe, registra e (no painel) apaga o arquivo que foi substituído. */
  async function subir(chave, arquivo) {
    const caminho = await enviarArquivo(pasta(), chave, arquivo)
    const anterior = await registrarArquivo(id(), token(), chave, caminho)
    if (painel && anterior && anterior !== caminho) {
      await apagarDoBucket([anterior]).catch(() => {})
    }
    return caminho
  }

  async function enviarAngulo(chave, arquivo) {
    const slot = angulos[chave]
    Object.assign(slot, { url: previa(arquivo), estado: 'enviando' })
    try {
      slot.caminho = await subir(chave, arquivo)
      slot.estado = 'ok'
    } catch {
      slot.estado = 'erro'
    }
  }

  async function tirar(chave) {
    const anterior = await desregistrarArquivo(id(), token(), chave)
    if (painel && anterior) await apagarDoBucket([anterior]).catch(() => {})
  }

  async function removerAngulo(chave) {
    if (angulos[chave].caminho) await tirar(chave)
    Object.assign(angulos[chave], vazio())
  }

  /** Devolve quantos arquivos ficaram de fora por passar do limite. */
  async function enviarReferencias(arquivos) {
    const livres = MAX_REFERENCIAS - referencias.value.length
    const lote = arquivos.slice(0, Math.max(0, livres))
    await Promise.all(
      lote.map(async arquivo => {
        const item = reactive({
          chave: novaChaveDeReferencia(),
          caminho: '',
          url: previa(arquivo),
          estado: 'enviando'
        })
        referencias.value.push(item)
        try {
          item.caminho = await subir(item.chave, arquivo)
          item.estado = 'ok'
        } catch {
          item.estado = 'erro'
        }
      })
    )
    return arquivos.length - lote.length
  }

  async function removerReferencia(item) {
    if (item.caminho) await tirar(item.chave)
    referencias.value = referencias.value.filter(r => r !== item)
  }

  onBeforeUnmount(() => previas.forEach(url => URL.revokeObjectURL(url)))

  return {
    angulos,
    referencias,
    carregando,
    enviadas,
    completas,
    ocupado,
    refsProntas,
    carregar,
    enviarAngulo,
    removerAngulo,
    enviarReferencias,
    removerReferencia
  }
}
