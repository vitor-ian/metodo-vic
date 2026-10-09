/**
 * Fotos e referências do diagnóstico no bucket do Supabase.
 *
 *   diagnosticos/<id>/<token>/frente.<marca>.jpg
 *   diagnosticos/<id>/<token>/referencia-<x>.<marca>.jpg
 *
 * O cliente só CRIA arquivos (o token no caminho prova que ele pode); qual
 * arquivo vale para cada ângulo fica no mapa `diagnosticos.arquivos`, que ele
 * atualiza por `registrar_arquivo`. Ler, assinar e apagar é do barbeiro dono e
 * do admin — ver o cabeçalho da migration.
 */
import { supabase } from '@/config/supabase.js'
import { BUCKET } from '@/config/site.js'

/** Lado maior da foto depois de reduzida: nítida para análise, leve no 4G. */
const LADO_MAX = 1800

/**
 * Reduz e converte para JPEG no aparelho. Foto de celular passa de 5 MB; a
 * reduzida fica em ~400 KB e sobe em segundos. Se o navegador não decodifica o
 * formato (HEIC no Chrome, por exemplo), segue o arquivo original.
 */
export async function comprimir(arquivo) {
  try {
    const bitmap = await createImageBitmap(arquivo, {
      imageOrientation: 'from-image'
    })
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86)
    )
    return blob ? { blob, ext: 'jpg', tipo: 'image/jpeg' } : original(arquivo)
  } catch {
    return original(arquivo)
  }
}

/** Extensões que o bucket aceita (a política do storage confere o nome). */
const EXTENSOES = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

function original(arquivo) {
  const ext = (arquivo.name.split('.').pop() || '').toLowerCase()
  return {
    blob: arquivo,
    ext: EXTENSOES.includes(ext) ? ext : 'jpg',
    tipo: arquivo.type || 'image/jpeg'
  }
}

export function pastaDo(id, token) {
  return `${id}/${token}`
}

/** Sufixo curto e único: cada envio é um arquivo novo, nunca sobrescreve. */
function marca() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Chave nova para uma referência (o banco aceita referencia-[a-z0-9]{1,24}). */
export function novaChaveDeReferencia() {
  return `referencia-${marca()}`
}

/** Sobe o arquivo e devolve o caminho no bucket. */
export async function enviarArquivo(pasta, chave, arquivo) {
  const { blob, ext, tipo } = await comprimir(arquivo)
  const caminho = `${pasta}/${chave}.${marca()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType: tipo })
  if (error) throw error
  return caminho
}

/** Aponta a chave para o arquivo. Devolve o caminho que estava antes. */
export async function registrarArquivo(id, token, chave, caminho) {
  const { data, error } = await supabase.rpc('registrar_arquivo', {
    p_id: id,
    p_token: token,
    p_chave: chave,
    p_caminho: caminho
  })
  if (error) throw error
  return data
}

export async function desregistrarArquivo(id, token, chave) {
  const { data, error } = await supabase.rpc('remover_arquivo', {
    p_id: id,
    p_token: token,
    p_chave: chave
  })
  if (error) throw error
  return data
}

/** Só o painel: apaga do bucket. */
export async function apagarDoBucket(caminhos) {
  const lista = caminhos.filter(Boolean)
  if (!lista.length) return
  const { error } = await supabase.storage.from(BUCKET).remove(lista)
  if (error) throw error
}

/** Só o painel: todos os caminhos da pasta (inclusive os trocados). */
export async function listarPasta(pasta) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(pasta, { limit: 1000 })
  if (error) throw error
  return data.filter(o => o.id).map(o => `${pasta}/${o.name}`)
}

/** Só o painel: { caminho: urlAssinada } (o bucket é privado). */
export async function assinar(caminhos, validade = 3600) {
  if (!caminhos.length) return {}
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(caminhos, validade)
  if (error) throw error
  return Object.fromEntries(
    data.filter(a => a.signedUrl).map(a => [a.path, a.signedUrl])
  )
}

/** Link assinado que força o download, com nome legível. */
export async function linkDeDownload(caminho, nome) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 600, { download: nome })
  if (error) throw error
  return data.signedUrl
}
