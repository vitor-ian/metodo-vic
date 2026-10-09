/**
 * Três áreas:
 *  - /diagnostico/:slug — o formulário do cliente, pelo link do barbeiro.
 *    Público, sem cabeçalho do painel.
 *  - /entrar, /cadastro, /recuperar-senha, /redefinir-senha — acesso.
 *  - /painel — barbeiro vê os próprios diagnósticos; admin vê todos e
 *    gerencia os barbeiros (`meta.admin`).
 */
const routes = [
  { path: '/', redirect: '/painel' },

  {
    path: '/diagnostico/:slug',
    component: () => import('@/pages/DiagnosticoPage.vue')
  },

  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { publica: true },
    children: [
      {
        path: 'entrar',
        component: () => import('@/pages/LoginPage.vue'),
        meta: { soDeslogado: true }
      },
      {
        path: 'cadastro',
        component: () => import('@/pages/CadastroPage.vue'),
        meta: { soDeslogado: true }
      },
      {
        path: 'recuperar-senha',
        component: () => import('@/pages/RecuperarSenhaPage.vue')
      },
      {
        path: 'redefinir-senha',
        component: () => import('@/pages/RedefinirSenhaPage.vue')
      }
    ]
  },

  {
    path: '/painel',
    component: () => import('@/layouts/PainelLayout.vue'),
    meta: { login: true },
    children: [
      {
        path: '',
        name: 'diagnosticos',
        component: () => import('@/pages/painel/DiagnosticosPage.vue')
      },
      {
        path: 'diagnosticos/:id',
        name: 'diagnostico',
        component: () => import('@/pages/painel/DiagnosticoDetalhePage.vue')
      },
      {
        path: 'formulario',
        name: 'formulario',
        component: () => import('@/pages/painel/FormularioPage.vue')
      },
      {
        path: 'barbeiros',
        name: 'barbeiros',
        component: () => import('@/pages/painel/BarbeirosPage.vue'),
        meta: { admin: true }
      }
    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue')
  }
]

export default routes
