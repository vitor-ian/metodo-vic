import { defineBoot } from '#q-app'
import { watch } from 'vue'
import { Lang } from 'quasar'
import { createI18n } from 'vue-i18n'
import messages from '@/i18n'

const SUPPORTED = ['pt-BR', 'en-US', 'es']

/**
 * Formulário e painel falam o idioma escolhido no seletor (guardado no
 * aparelho) ou, na primeira visita, o do navegador.
 */
function detectLocale() {
  if (typeof window === 'undefined') return 'pt-BR'
  const saved = window.localStorage?.getItem('mv-locale')
  if (saved && SUPPORTED.includes(saved)) return saved
  const nav = (window.navigator?.language || '').toLowerCase()
  if (nav.startsWith('en')) return 'en-US'
  if (nav.startsWith('es')) return 'es'
  return 'pt-BR'
}

/** Textos internos do Quasar (tabela, diálogos, seletores) no mesmo idioma. */
const PACOTES_QUASAR = {
  'pt-BR': () => import('quasar/lang/pt-BR.js'),
  'en-US': () => import('quasar/lang/en-US.js'),
  es: () => import('quasar/lang/es.js')
}

export default defineBoot(({ app }) => {
  const i18n = createI18n({
    legacy: false,
    locale: detectLocale(),
    fallbackLocale: 'pt-BR',
    globalInjection: true,
    warnHtmlMessage: false,
    messages
  })

  app.use(i18n)

  watch(
    i18n.global.locale,
    async codigo => {
      if (typeof document !== 'undefined')
        document.documentElement.lang = codigo
      const pacote = await PACOTES_QUASAR[codigo]?.()
      if (pacote) Lang.set(pacote.default)
    },
    { immediate: true }
  )
})
