/**
 * PDF do diagnóstico, montado no próprio navegador — o cliente baixa no fim
 * do formulário e o barbeiro baixa no painel, a partir do mesmo código.
 *
 * O documento é o diagnóstico completo, em A4, com quantas páginas precisar:
 *
 *   capa ........ cabeçalho com o cliente e o resumo (perfil, estilo, formato)
 *   01 .......... escuta ativa, pergunta por pergunta
 *   02 .......... perfil comportamental: placar e a leitura de cada tendência
 *   03 .......... estilo desejado (com a imagem) e onde a consultoria acontece
 *   04 .......... as seis fotos, na grade dos ângulos
 *   05 .......... referências e o comentário do cliente
 *
 * As seções 04 e 05 entram quando quem chama manda `fotos`/`referencias`: o
 * painel sempre manda (com URLs assinadas); o cliente manda as que subiu
 * nesta visita (ele não lê o bucket, então de visitas anteriores sobra só o
 * "enviada").
 *
 * O jsPDF entra por import dinâmico (~350 KB, só quando alguém pede o PDF).
 */
import { diagEscuta, diagOrdem, diagPerfis } from '@/data/diagnostico.js'
import { SITE_URL } from '@/config/site.js'

// ---------------------------------------------------------------- medidas
/** 1 pt em mm — transforma corpo de texto em altura de linha. */
const PT_MM = 0.3528
const A4 = { w: 210, h: 297 }
const M = 16
const LARG = A4.w - 2 * M
const CAPA = 42
const FAIXA = 15
const TOPO_CAPA = CAPA + 12
const TOPO = FAIXA + 12
const BASE = A4.h - 20

// ---------------------------------------------------------------- cores
const VINHO = [196, 60, 88]
const VINHO_CLARO = [250, 236, 239]
const PRETO = [10, 10, 10]
const TINTA = [18, 19, 21]
const MEDIO = [84, 90, 98]
const FRACO = [138, 143, 150]
const LINHA = [226, 228, 232]
const SUPERFICIE = [246, 247, 249]
const TRILHO = [232, 233, 236]

const LOGO = '/img/logo-curso-metodo-vic.png'

// ---------------------------------------------------------------- imagens
/** Decodifica num <img> (img-src aceita self, blob: e o Supabase). */
function abrirImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * As fotos do bucket chegam por URL assinada de outro domínio: baixar como
 * blob evita "sujar" o canvas (o toDataURL falharia). Imagens locais e
 * prévias (blob:) abrem direto.
 */
async function abrir(src) {
  const remoto =
    /^https?:/i.test(src) && !src.startsWith(window.location.origin)
  if (!remoto) return abrirImg(src)
  const resp = await fetch(src)
  if (!resp.ok) throw new Error(String(resp.status))
  const url = URL.createObjectURL(await resp.blob())
  try {
    return await abrirImg(url)
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/**
 * Prepara a imagem para o jsPDF (que não lê webp e pesa com foto grande):
 *   - `quadro: 'cobrir'` recorta em 4:5 (as fotos dos ângulos), puxando o
 *     recorte para cima, onde fica o rosto;
 *   - `quadro: 'conter'` encaixa inteira em 4:5 sobre fundo claro (as
 *     referências, que vêm em qualquer formato);
 *   - sem quadro, só reduz.
 * Devolve null se não der para carregar: o PDF sai com o espaço marcado.
 */
async function prepararImagem(
  src,
  { formato = 'JPEG', lado = 1200, quadro = null } = {}
) {
  if (!src) return null
  try {
    const img = await abrir(src)
    const sw = img.naturalWidth
    const sh = img.naturalHeight
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const alvo = 4 / 5

    if (quadro === 'cobrir') {
      let w = sw
      let h = sh
      let sx = 0
      let sy = 0
      if (sw / sh > alvo) {
        w = sh * alvo
        sx = (sw - w) / 2
      } else {
        h = sw / alvo
        sy = (sh - h) * 0.3
      }
      const k = Math.min(1, lado / Math.max(w, h))
      canvas.width = Math.round(w * k)
      canvas.height = Math.round(h * k)
      ctx.drawImage(img, sx, sy, w, h, 0, 0, canvas.width, canvas.height)
    } else if (quadro === 'conter') {
      canvas.height = Math.min(lado, 1000)
      canvas.width = Math.round(canvas.height * alvo)
      ctx.fillStyle = `rgb(${SUPERFICIE.join(',')})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const k = Math.min(canvas.width / sw, canvas.height / sh)
      const w = sw * k
      const h = sh * k
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    } else {
      const k = Math.min(1, lado / Math.max(sw, sh))
      canvas.width = Math.round(sw * k)
      canvas.height = Math.round(sh * k)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }

    return {
      formato,
      dados:
        formato === 'PNG'
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.84),
      proporcao: canvas.height / canvas.width
    }
  } catch {
    return null
  }
}

function nomeArquivo(nome) {
  const slug = (nome || 'cliente')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `diagnostico-metodo-vic-${slug || 'cliente'}.pdf`
}

// ---------------------------------------------------------------- documento
export function useDiagnosticoPdf(t) {
  /**
   * @param {object} dados
   * @param {string} dados.nome
   * @param {string} dados.data            já formatada
   * @param {string} [dados.barbeiro]
   * @param {string} [dados.whatsapp]
   * @param {object} dados.placar          { D, I, S, C }
   * @param {number} dados.total           perguntas do questionário
   * @param {string[]} dados.predominantes letras
   * @param {string[]} dados.escuta        na ordem de diagEscuta
   * @param {object} [dados.estilo]        item de diagEstilos
   * @param {string} [dados.atendimento]   nome já traduzido
   * @param {boolean} [dados.reflexao]     perguntas de reflexão (cliente)
   * @param {{label, url, estado}[]} [dados.fotos]
   * @param {{url, estado}[]} [dados.referencias]
   * @param {string} [dados.refObs]
   */
  async function gerar(dados) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

    const fotos = dados.fotos || null
    const refs = dados.referencias || null
    const [logo, imgEstilo, imgFotos, imgRefs] = await Promise.all([
      prepararImagem(LOGO, { formato: 'PNG', lado: 600 }),
      dados.estilo
        ? prepararImagem(dados.estilo.img, { lado: 700 })
        : Promise.resolve(null),
      fotos
        ? Promise.all(
            fotos.map(f => prepararImagem(f.url, { quadro: 'cobrir' }))
          )
        : Promise.resolve([]),
      refs
        ? Promise.all(
            refs.map(r => prepararImagem(r.url, { quadro: 'conter' }))
          )
        : Promise.resolve([])
    ])

    const placar = { D: 0, I: 0, S: 0, C: 0, ...dados.placar }
    const pontos = k => Number(placar[k]) || 0
    const maior = Math.max(...diagOrdem.map(pontos))
    const predominantes = dados.predominantes?.length
      ? dados.predominantes
      : diagOrdem.filter(k => pontos(k) === maior)
    const nomePerfis = predominantes
      .map(k => t(diagPerfis[k].nameKey))
      .join(' · ')

    // ------------------------------------------------------------ primitivas
    let y = TOPO_CAPA
    // Onde o conteúdo começa na página atual: seção no topo não ganha o
    // respiro de cima.
    let inicioPagina = TOPO_CAPA
    let secaoAtual = 0

    const lh = (tam, fator = 1.38) => tam * PT_MM * fator

    function fonte(tam, estilo = 'normal', cor = TINTA) {
      doc.setFont('helvetica', estilo)
      doc.setFontSize(tam)
      doc.setTextColor(...cor)
    }

    function quebrar(texto, tam, largura, estilo = 'normal') {
      doc.setFont('helvetica', estilo)
      doc.setFontSize(tam)
      return doc.splitTextToSize(String(texto ?? ''), largura)
    }

    function novaPagina() {
      doc.addPage()
      faixa()
      y = TOPO
      inicioPagina = TOPO
    }

    function garantir(altura) {
      if (y + altura > BASE) novaPagina()
    }

    /** Texto corrido que pode quebrar de página linha a linha. */
    function paragrafo(texto, opcoes = {}) {
      const {
        tam = 9.5,
        estilo = 'normal',
        cor = TINTA,
        x = M,
        largura = LARG,
        fator = 1.42
      } = opcoes
      const linhas = quebrar(texto, tam, largura, estilo)
      const alt = lh(tam, fator)
      for (const linha of linhas) {
        garantir(alt)
        y += alt
        fonte(tam, estilo, cor)
        doc.text(linha, x, y - alt * 0.28)
      }
    }

    /** Título numerado de seção: "01  Escuta ativa" com fio embaixo. */
    function secao(titulo, { minimo = 30, nova = false } = {}) {
      secaoAtual += 1
      if (nova && y > inicioPagina + 1) novaPagina()
      else garantir(22 + minimo)
      if (y > inicioPagina + 1) y += 7
      const n = String(secaoAtual).padStart(2, '0')
      fonte(9, 'bold', VINHO)
      doc.text(n, M, y + 5)
      fonte(13, 'bold', TINTA)
      doc.text(String(titulo), M + 9, y + 5)
      doc.setDrawColor(...LINHA)
      doc.setLineWidth(0.3)
      doc.line(M, y + 9, M + LARG, y + 9)
      doc.setDrawColor(...VINHO)
      doc.setLineWidth(0.8)
      doc.line(M, y + 9, M + 14, y + 9)
      y += 15
    }

    function rotulo(texto, x, yy, cor = VINHO) {
      fonte(6.6, 'bold', cor)
      doc.setCharSpace(0.35)
      doc.text(String(texto).toUpperCase(), x, yy)
      doc.setCharSpace(0)
    }

    /** Rótulo alinhado à direita (o espaçamento entre letras desalinharia). */
    function rotuloDireita(texto, x, yy, cor = VINHO) {
      fonte(6.8, 'bold', cor)
      doc.text(String(texto).toUpperCase(), x, yy, { align: 'right' })
    }

    function selo(texto, x, yy) {
      fonte(6, 'bold', [255, 255, 255])
      doc.setCharSpace(0.3)
      // getTextWidth não conta o espaçamento entre letras: soma à mão.
      const w = doc.getTextWidth(texto.toUpperCase()) + 0.3 * texto.length + 4
      doc.setFillColor(...VINHO)
      doc.roundedRect(x, yy - 3.4, w, 4.6, 2.3, 2.3, 'F')
      doc.text(texto.toUpperCase(), x + 2, yy)
      doc.setCharSpace(0)
      return w
    }

    // ------------------------------------------------------------ cabeçalhos
    function logoEm(x, yy, altura) {
      if (!logo) return
      doc.addImage(logo.dados, 'PNG', x, yy, altura / logo.proporcao, altura)
    }

    function capa() {
      doc.setFillColor(...PRETO)
      doc.rect(0, 0, A4.w, CAPA, 'F')
      doc.setFillColor(...VINHO)
      doc.rect(0, CAPA, A4.w, 1.2, 'F')
      logoEm(M, 13, 15)

      const direita = A4.w - M
      rotuloDireita(t('pdf.titulo'), direita, 14)

      const nome = quebrar(dados.nome || t('diag.resEmpty'), 17, 110, 'bold')
      fonte(17, 'bold', [255, 255, 255])
      doc.text(nome[0], direita, 23, { align: 'right' })

      const sub = [
        dados.data,
        dados.barbeiro ? t('pdf.consultoria', { nome: dados.barbeiro }) : ''
      ]
        .filter(Boolean)
        .join('   ·   ')
      fonte(8.5, 'normal', [180, 184, 190])
      doc.text(sub, direita, 30, { align: 'right' })
      if (dados.whatsapp) {
        doc.text(`${t('pdf.whatsapp')}: ${dados.whatsapp}`, direita, 35, {
          align: 'right'
        })
      }
    }

    function faixa() {
      doc.setFillColor(...PRETO)
      doc.rect(0, 0, A4.w, FAIXA, 'F')
      doc.setFillColor(...VINHO)
      doc.rect(0, FAIXA, A4.w, 0.8, 'F')
      logoEm(M, 4.2, 6.6)
      fonte(8, 'bold', [255, 255, 255])
      doc.text(dados.nome || '', A4.w - M, 9.3, { align: 'right' })
      const largNome = doc.getTextWidth(dados.nome || '')
      fonte(8, 'normal', [150, 154, 160])
      doc.text(`${t('pdf.titulo')}   ·   `, A4.w - M - largNome, 9.3, {
        align: 'right'
      })
    }

    function rodapes() {
      const total = doc.getNumberOfPages()
      for (let p = 1; p <= total; p++) {
        doc.setPage(p)
        doc.setDrawColor(...LINHA)
        doc.setLineWidth(0.3)
        doc.line(M, A4.h - 12, A4.w - M, A4.h - 12)
        fonte(7.2, 'normal', FRACO)
        doc.text(t('diag.waTitle'), M, A4.h - 7.5)
        doc.text(
          `${SITE_URL.replace(/^https?:\/\//, '')}   ·   ${t('pdf.pagina', {
            n: p,
            total
          })}`,
          A4.w - M,
          A4.h - 7.5,
          { align: 'right' }
        )
      }
    }

    // ------------------------------------------------------------ resumo
    function resumo() {
      const vao = 5
      const w = (LARG - 2 * vao) / 3
      const cartoes = [
        {
          rot: t('pdf.resumoPerfil'),
          valor: nomePerfis || t('diag.resEmpty'),
          sub: diagOrdem.map(k => `${k} ${pontos(k)}`).join('   ')
        },
        {
          rot: t('pdf.resumoEstilo'),
          valor: dados.estilo ? t(dados.estilo.nameKey) : t('diag.resEmpty'),
          sub: dados.estilo ? t(dados.estilo.descKey) : ''
        },
        {
          rot: t('pdf.resumoAtend'),
          valor: dados.atendimento || t('diag.resEmpty'),
          sub: ''
        }
      ].map(c => ({
        ...c,
        linhasValor: quebrar(c.valor, 10.5, w - 10, 'bold'),
        linhasSub: c.sub ? quebrar(c.sub, 7.8, w - 10) : []
      }))

      const altura =
        Math.max(
          ...cartoes.map(
            c =>
              c.linhasValor.length * lh(10.5, 1.3) +
              c.linhasSub.length * lh(7.8, 1.35)
          )
        ) + 16

      cartoes.forEach((c, i) => {
        const x = M + i * (w + vao)
        doc.setFillColor(...SUPERFICIE)
        doc.roundedRect(x, y, w, altura, 2.5, 2.5, 'F')
        doc.setFillColor(...VINHO)
        doc.rect(x, y + 4, 0.9, 6, 'F')
        rotulo(c.rot, x + 5, y + 8)
        let yy = y + 11.5
        fonte(10.5, 'bold', TINTA)
        c.linhasValor.forEach(l => {
          yy += lh(10.5, 1.3)
          doc.text(l, x + 5, yy - 1)
        })
        fonte(7.8, 'normal', MEDIO)
        c.linhasSub.forEach(l => {
          yy += lh(7.8, 1.35)
          doc.text(l, x + 5, yy - 0.6)
        })
      })
      y += altura
    }

    // ------------------------------------------------------------ 01 escuta
    function escuta() {
      secao(t('diag.resListen'), { minimo: 24 })
      const recuo = 9
      diagEscuta.forEach((chave, i) => {
        const pergunta = quebrar(t(chave), 9.5, LARG - recuo, 'bold')
        const resposta = String(dados.escuta?.[i] || '').trim()
        const respLinhas = quebrar(
          resposta || t('diag.resEmpty'),
          9.5,
          LARG - recuo
        )
        // Pergunta não fica sozinha no pé da página.
        garantir(
          pergunta.length * lh(9.5) + Math.min(2, respLinhas.length) * lh(9.5)
        )
        fonte(9.5, 'bold', VINHO)
        doc.text(String(i + 1), M + 1, y + lh(9.5) * 0.72)
        paragrafo(t(chave), {
          tam: 9.5,
          estilo: 'bold',
          x: M + recuo,
          largura: LARG - recuo
        })
        y += 0.6
        paragrafo(resposta || t('diag.resEmpty'), {
          tam: 9.5,
          cor: resposta ? MEDIO : FRACO,
          x: M + recuo,
          largura: LARG - recuo
        })
        y += 3
        if (i < diagEscuta.length - 1) {
          doc.setDrawColor(...LINHA)
          doc.setLineWidth(0.2)
          doc.line(M + recuo, y, M + LARG, y)
          y += 3.5
        }
      })
    }

    // ------------------------------------------------------------ 02 perfil
    function perfil() {
      secao(t('diag.resProfile'), { minimo: 50 })

      // Placar
      const xTrilho = M + 52
      const wTrilho = LARG - 52 - 12
      diagOrdem.forEach(k => {
        const destaque = predominantes.includes(k)
        garantir(8)
        fonte(9.5, destaque ? 'bold' : 'normal', destaque ? TINTA : MEDIO)
        doc.text(`${k}  ·  ${t(diagPerfis[k].nameKey)}`, M, y + 4.5)
        doc.setFillColor(...TRILHO)
        doc.roundedRect(xTrilho, y + 1.9, wTrilho, 3.2, 1.2, 1.2, 'F')
        const v = pontos(k)
        if (v) {
          doc.setFillColor(...(destaque ? VINHO : [168, 172, 178]))
          doc.roundedRect(
            xTrilho,
            y + 1.9,
            Math.max(3, wTrilho * (v / (dados.total || 12))),
            3.2,
            1.2,
            1.2,
            'F'
          )
        }
        fonte(9.5, 'bold', TINTA)
        doc.text(String(v), M + LARG, y + 4.5, { align: 'right' })
        y += 8
      })
      y += 1
      paragrafo(t('diag.resScale'), { tam: 7.8, cor: FRACO })
      y += 4

      // Leitura de cada tendência, da maior para a menor.
      const ordem = [...diagOrdem].sort((a, b) => pontos(b) - pontos(a))
      ordem.forEach(k => {
        const destaque = predominantes.includes(k)
        const p = diagPerfis[k]
        const desc = quebrar(t(p.descKey), 9, LARG - 12)
        const refl =
          destaque && dados.reflexao
            ? quebrar(
                `${t('pdf.reflexao')}: ${t(p.reflKey)}`,
                8.6,
                LARG - 12,
                'italic'
              )
            : []
        const altura =
          10 +
          desc.length * lh(9, 1.4) +
          refl.length * lh(8.6, 1.4) +
          (refl.length ? 2 : 0) +
          4
        garantir(altura + 3)

        if (destaque) {
          doc.setFillColor(...VINHO_CLARO)
          doc.roundedRect(M, y, LARG, altura, 2.5, 2.5, 'F')
          doc.setFillColor(...VINHO)
          doc.rect(M, y, 1.1, altura, 'F')
        } else {
          doc.setDrawColor(...LINHA)
          doc.setLineWidth(0.3)
          doc.roundedRect(M, y, LARG, altura, 2.5, 2.5, 'S')
        }

        let yy = y + 7
        fonte(10.5, 'bold', TINTA)
        const titulo = t(p.nameKey)
        doc.text(titulo, M + 6, yy)
        let xx = M + 6 + doc.getTextWidth(titulo) + 2.5
        fonte(8.5, 'normal', FRACO)
        const placarTxt = `(${k} · ${pontos(k)})`
        doc.text(placarTxt, xx, yy)
        xx += doc.getTextWidth(placarTxt) + 3
        if (destaque) selo(t('diag.resLeading'), xx, yy - 0.2)

        yy += 2.2
        fonte(9, 'normal', MEDIO)
        desc.forEach(l => {
          yy += lh(9, 1.4)
          doc.text(l, M + 6, yy - 1)
        })
        if (refl.length) {
          yy += 2
          fonte(8.6, 'italic', VINHO)
          refl.forEach(l => {
            yy += lh(8.6, 1.4)
            doc.text(l, M + 6, yy - 1)
          })
        }
        y += altura + 3
      })
    }

    // ------------------------------------------------------------ 03 estilo
    function estilo() {
      secao(t('diag.resStyle'), { minimo: 60 })
      const wImg = 40
      const hImg = imgEstilo ? wImg * imgEstilo.proporcao : 0
      const xTxt = M + (imgEstilo ? wImg + 8 : 0)
      const wTxt = LARG - (imgEstilo ? wImg + 8 : 0)

      if (!dados.estilo) {
        paragrafo(t('diag.resNoStyle'), { cor: FRACO })
      } else {
        const nome = quebrar(t(dados.estilo.nameKey), 15, wTxt, 'bold')
        const desc = quebrar(t(dados.estilo.descKey), 10, wTxt)
        const altTxt =
          nome.length * lh(15, 1.2) + desc.length * lh(10, 1.45) + 8
        garantir(Math.max(hImg, altTxt))
        const y0 = y
        if (imgEstilo) {
          doc.addImage(imgEstilo.dados, 'JPEG', M, y0, wImg, hImg)
          doc.setDrawColor(...LINHA)
          doc.setLineWidth(0.3)
          doc.rect(M, y0, wImg, hImg, 'S')
        }
        let yy = y0 + 2
        rotulo(t('pdf.resumoEstilo'), xTxt, yy + 2)
        yy += 4
        fonte(15, 'bold', TINTA)
        nome.forEach(l => {
          yy += lh(15, 1.2)
          doc.text(l, xTxt, yy - 1)
        })
        yy += 1.5
        fonte(10, 'normal', MEDIO)
        desc.forEach(l => {
          yy += lh(10, 1.45)
          doc.text(l, xTxt, yy - 1)
        })

        // Onde a consultoria acontece, na mesma seção.
        yy += 8
        rotulo(t('diag.resWhere'), xTxt, yy)
        yy += 2
        fonte(10.5, 'bold', TINTA)
        quebrar(
          dados.atendimento || t('diag.resEmpty'),
          10.5,
          wTxt,
          'bold'
        ).forEach(l => {
          yy += lh(10.5, 1.35)
          doc.text(l, xTxt, yy - 1)
        })
        y = Math.max(y0 + hImg, yy) + 2
      }
    }

    // ------------------------------------------------------------ grade
    /**
     * Grade de imagens em 4:5, três por linha, com legenda embaixo. Espaço
     * sem imagem fica tracejado com o estado ("Pendente", "Enviada").
     */
    function grade(itens) {
      const cols = 3
      const vao = 6
      const w = (LARG - (cols - 1) * vao) / cols
      const h = w * 1.25
      const legenda = 7
      for (let i = 0; i < itens.length; i += cols) {
        garantir(h + legenda)
        itens.slice(i, i + cols).forEach((item, j) => {
          const x = M + j * (w + vao)
          if (item.img) {
            doc.addImage(item.img.dados, 'JPEG', x, y, w, h)
            doc.setDrawColor(...LINHA)
            doc.setLineWidth(0.3)
            doc.rect(x, y, w, h, 'S')
          } else {
            doc.setFillColor(...SUPERFICIE)
            doc.rect(x, y, w, h, 'F')
            doc.setDrawColor(200, 203, 208)
            doc.setLineWidth(0.3)
            doc.setLineDashPattern([1.5, 1.2], 0)
            doc.rect(x, y, w, h, 'S')
            doc.setLineDashPattern([], 0)
            fonte(8, 'bold', FRACO)
            doc.text(item.vazio, x + w / 2, y + h / 2, { align: 'center' })
          }
          if (item.label) {
            fonte(8.5, 'bold', TINTA)
            doc.text(item.label, x, y + h + 4.6)
          }
        })
        y += h + legenda + 3
      }
    }

    // ------------------------------------------------------------ 04 fotos
    function secaoFotos() {
      secao(t('pdf.fotos'), { nova: true })
      const enviadas = fotos.filter(f => f.estado === 'ok').length
      fonte(8.5, 'normal', MEDIO)
      doc.text(
        t('pdf.fotosSub', { n: enviadas, total: fotos.length }),
        M,
        y - 1
      )
      y += 3
      grade(
        fotos.map((f, i) => ({
          img: imgFotos[i],
          label: f.label,
          vazio: f.estado === 'ok' ? t('pdf.enviada') : t('pdf.pendente')
        }))
      )
    }

    // ------------------------------------------------------------ 05 refs
    function secaoReferencias() {
      secao(t('pdf.referencias'), { minimo: refs.length ? 70 : 12 })
      const obs = String(dados.refObs || '').trim()
      if (!refs.length && !obs) {
        paragrafo(t('pdf.semRefs'), { cor: FRACO })
        return
      }
      if (refs.length) {
        grade(
          refs.map((r, i) => ({
            img: imgRefs[i],
            label: t('painel.ficha.referenciaN', { n: i + 1 }),
            vazio: t('pdf.enviada')
          }))
        )
      }
      if (obs) {
        const linhas = quebrar(`“${obs}”`, 9.5, LARG - 12, 'italic')
        const altura = linhas.length * lh(9.5, 1.45) + 13
        garantir(altura)
        doc.setFillColor(...SUPERFICIE)
        doc.roundedRect(M, y, LARG, altura, 2.5, 2.5, 'F')
        doc.setFillColor(...VINHO)
        doc.rect(M, y, 1.1, altura, 'F')
        rotulo(t('pdf.obsRef'), M + 6, y + 6.5)
        let yy = y + 8.5
        fonte(9.5, 'italic', TINTA)
        linhas.forEach(l => {
          yy += lh(9.5, 1.45)
          doc.text(l, M + 6, yy - 1)
        })
        y += altura
      }
    }

    // ------------------------------------------------------------ montagem
    capa()
    resumo()
    escuta()
    perfil()
    estilo()
    if (fotos) secaoFotos()
    if (refs) secaoReferencias()
    rodapes()

    return { blob: doc.output('blob'), arquivo: nomeArquivo(dados.nome) }
  }

  /**
   * Baixar: o clique já veio da pessoa, então o link sintético não cai no
   * bloqueio de pop-up. No iOS o arquivo abre numa aba, de onde dá para
   * compartilhar ou salvar em Arquivos.
   */
  async function baixar(dados) {
    const { blob, arquivo } = await gerar(dados)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = arquivo
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  return { baixar, gerar }
}
