/**
 * Diagnóstico da consultoria visagista (/diagnostico/:slug).
 *
 * Como no resto do site, aqui vive só a estrutura (ordem, pesos, imagens e as
 * chaves de i18n); o texto fica nos catálogos de src/i18n.
 *
 * O roteiro é o mesmo que o Max aplica no atendimento: escuta ativa, um
 * questionário de tendência comportamental e a escolha do estilo desejado.
 */

/** Etapa 1 — perguntas abertas da escuta ativa. */
export const diagEscuta = [
  'diag.e1',
  'diag.e2',
  'diag.e3',
  'diag.e4',
  'diag.e5',
  'diag.e6',
  'diag.e7',
  'diag.e8'
]

/**
 * Etapa 2 — 12 perguntas de tendência comportamental.
 *
 * `letras` é a tendência de cada alternativa, na ordem em que ela aparece na
 * tela (a, b, c, d). A ordem gira a cada pergunta de propósito: se a primeira
 * alternativa fosse sempre "D", quem responde pega o padrão e o resultado
 * vira a escolha da posição, não da frase.
 */
export const diagQuestions = [
  { key: 'diag.q1', letras: ['D', 'I', 'S', 'C'] },
  { key: 'diag.q2', letras: ['I', 'S', 'C', 'D'] },
  { key: 'diag.q3', letras: ['S', 'C', 'D', 'I'] },
  { key: 'diag.q4', letras: ['C', 'D', 'I', 'S'] },
  { key: 'diag.q5', letras: ['D', 'I', 'S', 'C'] },
  { key: 'diag.q6', letras: ['I', 'S', 'C', 'D'] },
  { key: 'diag.q7', letras: ['S', 'C', 'D', 'I'] },
  { key: 'diag.q8', letras: ['C', 'D', 'I', 'S'] },
  { key: 'diag.q9', letras: ['D', 'I', 'S', 'C'] },
  { key: 'diag.q10', letras: ['I', 'S', 'C', 'D'] },
  { key: 'diag.q11', letras: ['S', 'C', 'D', 'I'] },
  { key: 'diag.q12', letras: ['C', 'D', 'I', 'S'] }
]

/** Letras das alternativas, na tela. */
export const diagAlternativas = ['a', 'b', 'c', 'd']

/** Ordem fixa das tendências no resultado. */
export const diagOrdem = ['D', 'I', 'S', 'C']

export const diagPerfis = {
  D: {
    nameKey: 'diag.profD',
    descKey: 'diag.profDDesc',
    reflKey: 'diag.profDRefl'
  },
  I: {
    nameKey: 'diag.profI',
    descKey: 'diag.profIDesc',
    reflKey: 'diag.profIRefl'
  },
  S: {
    nameKey: 'diag.profS',
    descKey: 'diag.profSDesc',
    reflKey: 'diag.profSRefl'
  },
  C: {
    nameKey: 'diag.profC',
    descKey: 'diag.profCDesc',
    reflKey: 'diag.profCRefl'
  }
}

/** Etapa 3 — os 7 estilos universais do Método VIC. */
export const diagEstilos = [
  {
    id: 'natural',
    img: '/img/estilos/natural.webp',
    nameKey: 'diag.st1',
    descKey: 'diag.st1Desc'
  },
  {
    id: 'tradicional',
    img: '/img/estilos/tradicional.webp',
    nameKey: 'diag.st2',
    descKey: 'diag.st2Desc'
  },
  {
    id: 'elegante',
    img: '/img/estilos/elegante.webp',
    nameKey: 'diag.st3',
    descKey: 'diag.st3Desc'
  },
  {
    id: 'criativo',
    img: '/img/estilos/criativo.webp',
    nameKey: 'diag.st4',
    descKey: 'diag.st4Desc'
  },
  {
    id: 'romantico',
    img: '/img/estilos/romantico.webp',
    nameKey: 'diag.st5',
    descKey: 'diag.st5Desc'
  },
  {
    id: 'sexy',
    img: '/img/estilos/sexy.webp',
    nameKey: 'diag.st6',
    descKey: 'diag.st6Desc'
  },
  {
    id: 'dramatico',
    img: '/img/estilos/dramatico.webp',
    nameKey: 'diag.st7',
    descKey: 'diag.st7Desc'
  }
]

/**
 * Fechamento — onde a consultoria acontece. Cada barbeiro escolhe no painel
 * quais destes formatos oferece; o formulário mostra só os dele.
 */
export const diagAtendimento = [
  {
    id: 'pres-espaco',
    icon: 'storefront',
    nameKey: 'diag.at1',
    descKey: 'diag.at1Desc'
  },
  {
    id: 'pres-casa',
    icon: 'home',
    nameKey: 'diag.at2',
    descKey: 'diag.at2Desc'
  },
  {
    id: 'hibrida-casa',
    icon: 'home_work',
    nameKey: 'diag.at3',
    descKey: 'diag.at3Desc'
  },
  {
    id: 'hibrida-espaco',
    icon: 'devices',
    nameKey: 'diag.at4',
    descKey: 'diag.at4Desc'
  },
  {
    id: 'online',
    icon: 'videocam',
    nameKey: 'diag.at5',
    descKey: 'diag.at5Desc'
  }
]

/** Idiomas do formulário (o seletor do cabeçalho). */
export const locales = [
  { code: 'pt-BR', label: 'PT', name: 'Português' },
  { code: 'en-US', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' }
]

/**
 * Passo 2 — as seis fotos da consultoria. O `id` é o nome do arquivo no
 * bucket (<id>.jpg) e a imagem é o guia de enquadramento de cada ângulo.
 */
export const diagAngulos = [
  { id: 'frente', img: '/img/angulos/frente.webp', nameKey: 'envio.angFrente' },
  {
    id: 'perfil-direito',
    img: '/img/angulos/perfil-direito.webp',
    nameKey: 'envio.angPerfilDireito'
  },
  {
    id: 'perfil-esquerdo',
    img: '/img/angulos/perfil-esquerdo.webp',
    nameKey: 'envio.angPerfilEsquerdo'
  },
  {
    id: '45-esquerdo',
    img: '/img/angulos/45-esquerdo.webp',
    nameKey: 'envio.ang45Esquerdo'
  },
  {
    id: '45-direito',
    img: '/img/angulos/45-direito.webp',
    nameKey: 'envio.ang45Direito'
  },
  { id: 'costas', img: '/img/angulos/costas.webp', nameKey: 'envio.angCostas' }
]

/** Orientações do passo 2, na ordem em que aparecem. */
export const diagRegrasFoto = [
  { icon: 'crop_portrait', key: 'envio.regra1' },
  { icon: 'wb_sunny', key: 'envio.regra2' },
  { icon: 'checkroom', key: 'envio.regra3' },
  { icon: 'contrast', key: 'envio.regra4' },
  { icon: 'wallpaper', key: 'envio.regra5' }
]

/** Passo 3 — até quantas referências o cliente pode mandar. */
export const MAX_REFERENCIAS = 6
