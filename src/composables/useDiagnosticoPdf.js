/**
 * PDF do diagnóstico, montado no próprio navegador — o cliente baixa no fim
 * do formulário e o barbeiro baixa no painel, a partir do mesmo código.
 *
 * O jsPDF entra por import dinâmico (~350 KB, só quando alguém pede o PDF) e
 * o arquivo é gerado e baixado no aparelho de quem clicou.
 *
 * O documento cabe em uma página só. Para isso ele é montado duas vezes: a
 * primeira medindo a altura das duas colunas, a segunda desenhando de fato,
 * já com a escala de texto que coube. A foto do estilo entra por último e
 * ocupa o que sobrou da coluna, então nunca é ela que empurra para a página 2.
 */
import { diagEscuta, diagOrdem, diagPerfis } from '@/data/diagnostico.js'
import { SITE_URL } from '@/config/site.js'

/** 1 pt em mm — usado para transformar o corpo de texto em altura de linha. */
const PT_MM = 0.3528
const PAGINA = { largura: 210, altura: 297 }
const MARGEM = 15
const CABECALHO = 30
const RODAPE = 14
/** Duas colunas: a escuta ativa à esquerda, o resto à direita. */
const COL_ESQ = 100
const VAO = 8
const COL_DIR = PAGINA.largura - 2 * MARGEM - COL_ESQ - VAO

const VINHO = [196, 60, 88]
const LOGO = '/img/logo-curso-metodo-vic.png'

/**
 * As imagens do projeto são .webp e .png, que o jsPDF não lê direto. O canvas
 * converte na hora, sem precisar de uma segunda cópia de cada arquivo.
 * `formato` é PNG para o logotipo (que tem fundo transparente) e JPEG para as
 * fotos, bem mais leves assim.
 */
function carregarImagem(src, formato = 'JPEG') {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve({
          formato,
          dados:
            formato === 'PNG'
              ? canvas.toDataURL('image/png')
              : canvas.toDataURL('image/jpeg', 0.82),
          proporcao: img.naturalHeight / img.naturalWidth
        })
      } catch {
        resolve(null)
      }
    }
    // Sem a imagem o PDF sai igual, só sem a referência visual.
    img.onerror = () => resolve(null)
    img.src = src
  })
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

export function useDiagnosticoPdf(t) {
  async function gerar(dados) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    const [logo, foto] = await Promise.all([
      carregarImagem(LOGO, 'PNG'),
      dados.estilo ? carregarImagem(dados.estilo.img) : Promise.resolve(null)
    ])

    const topo = CABECALHO + 12
    const disponivel = PAGINA.altura - RODAPE - topo

    /**
     * Cursor de uma coluna. Com `desenhar` falso ele só acumula altura — é
     * assim que a passada de medição descobre se o conteúdo cabe.
     */
    function coluna(x, largura, desenhar) {
      let y = topo
      return {
        get altura() {
          return y - topo
        },
        get y() {
          return y
        },
        espaco(mm) {
          y += mm
        },
        texto(conteudo, tamanho, estilo = 'normal', cinza = 30) {
          doc.setFont('helvetica', estilo)
          doc.setFontSize(tamanho)
          const alturaLinha = tamanho * PT_MM * 1.32
          doc.splitTextToSize(String(conteudo), largura).forEach(linha => {
            y += alturaLinha
            if (desenhar) {
              doc.setTextColor(cinza, cinza, cinza)
              doc.text(linha, x, y)
            }
          })
        },
        secao(titulo, tamanho) {
          y += 4
          if (desenhar) {
            doc.setDrawColor(...VINHO)
            doc.setLineWidth(0.5)
            doc.line(x, y, x + 16, y)
          }
          y += 4
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(tamanho)
          y += tamanho * PT_MM * 1.2
          if (desenhar) {
            doc.setTextColor(15, 15, 15)
            doc.text(String(titulo), x, y)
          }
          y += 2.5
        },
        /** Barra de tendência: rótulo, trilho proporcional e o total. */
        barra(letra, valor, total, destaque, escala) {
          const alturaLinha = 6 * escala
          y += alturaLinha
          if (desenhar) {
            doc.setFont('helvetica', destaque ? 'bold' : 'normal')
            doc.setFontSize(8.5 * escala)
            doc.setTextColor(30, 30, 30)
            doc.text(`${letra} · ${t(diagPerfis[letra].nameKey)}`, x, y)
            const inicioTrilho = x + largura * 0.52
            const larguraTrilho = largura * 0.38
            doc.setFillColor(234, 234, 236)
            doc.rect(inicioTrilho, y - 2.4, larguraTrilho, 2.6, 'F')
            if (valor) {
              if (destaque) doc.setFillColor(...VINHO)
              else doc.setFillColor(168, 172, 178)
              doc.rect(
                inicioTrilho,
                y - 2.4,
                larguraTrilho * (valor / total),
                2.6,
                'F'
              )
            }
            doc.setFont('helvetica', 'bold')
            doc.text(String(valor), x + largura, y, { align: 'right' })
          }
        }
      }
    }

    /**
     * Monta as duas colunas. Devolve a altura da mais alta — com `desenhar`
     * falso, é só a medição. `escala` encolhe o corpo de texto junto.
     */
    function montar(escala, desenhar) {
      const esquerda = coluna(MARGEM, COL_ESQ, desenhar)
      const direita = coluna(MARGEM + COL_ESQ + VAO, COL_DIR, desenhar)
      const corpo = 8.6 * escala
      const rotulo = 8.2 * escala
      const titulo = 10.5 * escala

      esquerda.secao(t('diag.resListen'), titulo)
      diagEscuta.forEach((chave, i) => {
        esquerda.texto(t(chave), rotulo, 'bold', 20)
        esquerda.texto(
          dados.escuta[i]?.trim() || t('diag.resEmpty'),
          corpo,
          'normal',
          105
        )
        esquerda.espaco(2 * escala)
      })

      direita.secao(t('diag.resProfile'), titulo)
      diagOrdem.forEach(letra => {
        direita.barra(
          letra,
          dados.placar[letra],
          dados.total,
          dados.placar[letra] === dados.maior,
          escala
        )
      })
      direita.espaco(1.5)
      direita.texto(
        `${t('diag.waLead')}: ${dados.predominantes}`,
        rotulo,
        'bold',
        20
      )

      direita.secao(t('diag.resWhere'), titulo)
      direita.texto(
        dados.atendimento || t('diag.resEmpty'),
        corpo,
        'normal',
        30
      )

      direita.secao(t('diag.resStyle'), titulo)
      if (dados.estilo) {
        direita.texto(t(dados.estilo.nameKey), corpo + 1.4, 'bold', 20)
        direita.texto(t(dados.estilo.descKey), corpo, 'normal', 105)
        if (foto) {
          // A foto fica com a sobra da coluna: ela se ajusta ao texto, e não
          // o contrário.
          const sobra = disponivel - direita.altura - 3
          const larguraFoto = Math.min(COL_DIR, sobra / foto.proporcao)
          if (larguraFoto >= 26) {
            const alturaFoto = larguraFoto * foto.proporcao
            direita.espaco(3)
            if (desenhar) {
              doc.addImage(
                foto.dados,
                foto.formato,
                MARGEM + COL_ESQ + VAO,
                direita.y,
                larguraFoto,
                alturaFoto
              )
            }
            direita.espaco(alturaFoto)
          }
        }
      } else {
        direita.texto(t('diag.resNoStyle'), corpo, 'normal', 105)
      }

      return Math.max(esquerda.altura, direita.altura)
    }

    // Escala: cai de degrau em degrau até a coluna mais alta caber.
    let escala = 0.76
    for (const tentativa of [1, 0.94, 0.88, 0.82, 0.76]) {
      if (montar(tentativa, false) <= disponivel) {
        escala = tentativa
        break
      }
    }

    // ---- cabeçalho ----
    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, PAGINA.largura, CABECALHO, 'F')
    if (logo) {
      const alturaLogo = 11
      doc.addImage(
        logo.dados,
        'PNG',
        MARGEM,
        (CABECALHO - alturaLogo) / 2,
        alturaLogo / logo.proporcao,
        alturaLogo
      )
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(196, 60, 88)
    doc.text(
      t('diag.kicker').toUpperCase(),
      PAGINA.largura - MARGEM,
      CABECALHO / 2 - 2.5,
      { align: 'right' }
    )
    doc.setFontSize(10.5)
    doc.setTextColor(255, 255, 255)
    doc.text(
      [dados.nome || t('diag.resEmpty'), dados.data]
        .filter(Boolean)
        .join('   ·   '),
      PAGINA.largura - MARGEM,
      CABECALHO / 2 + 4,
      { align: 'right' }
    )

    montar(escala, true)

    // ---- rodapé ----
    doc.setDrawColor(226, 226, 228)
    doc.setLineWidth(0.3)
    doc.line(
      MARGEM,
      PAGINA.altura - 10,
      PAGINA.largura - MARGEM,
      PAGINA.altura - 10
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(130, 130, 134)
    doc.text(t('diag.waTitle'), MARGEM, PAGINA.altura - 6)
    doc.text(
      SITE_URL.replace(/^https?:\/\//, ''),
      PAGINA.largura - MARGEM,
      PAGINA.altura - 6,
      {
        align: 'right'
      }
    )

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

  return { baixar }
}
