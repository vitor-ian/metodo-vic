import { defineRouter } from '#q-app'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from '@/stores/auth.js'

export default defineRouter(({ store }) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
  })

  /**
   * Guardas do painel. O RLS é quem protege os dados de verdade; aqui é só
   * para ninguém cair numa tela que não vai carregar nada.
   */
  Router.beforeEach(async to => {
    const precisaLogin = to.matched.some(r => r.meta.login)
    const soDeslogado = to.matched.some(r => r.meta.soDeslogado)
    if (!precisaLogin && !soDeslogado) return true

    const auth = useAuthStore(store)
    await auth.pronto()

    if (precisaLogin && !auth.logado) {
      return { path: '/entrar', query: { para: to.fullPath } }
    }
    if (soDeslogado && auth.logado) return { path: '/painel' }
    if (to.matched.some(r => r.meta.admin) && !auth.ehAdmin) {
      return { path: '/painel' }
    }
    return true
  })

  return Router
})
