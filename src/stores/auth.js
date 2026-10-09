import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/config/supabase.js'

/**
 * Sessão do painel: o usuário do Supabase Auth e o perfil dele (papel,
 * aprovação, link do formulário). O roteador espera `pronto()` antes de
 * decidir para onde a pessoa vai.
 */
export const useAuthStore = defineStore('auth', () => {
  const sessao = ref(null)
  const perfil = ref(null)
  let inicio = null

  const logado = computed(() => !!sessao.value)
  const ehAdmin = computed(
    () => perfil.value?.papel === 'admin' && perfil.value?.ativo
  )
  const ativo = computed(() => !!perfil.value?.ativo)

  async function carregarPerfil() {
    if (!sessao.value) {
      perfil.value = null
      return
    }
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', sessao.value.user.id)
      .maybeSingle()
    if (error) throw error
    perfil.value = data
  }

  /** Resolve uma vez só, na primeira navegação. */
  function pronto() {
    if (!inicio) {
      inicio = (async () => {
        const { data } = await supabase.auth.getSession()
        sessao.value = data.session
        try {
          await carregarPerfil()
        } catch {
          perfil.value = null
        }
        supabase.auth.onAuthStateChange((evento, novaSessao) => {
          const trocouUsuario = novaSessao?.user?.id !== sessao.value?.user?.id
          sessao.value = novaSessao
          if (trocouUsuario || evento === 'USER_UPDATED') {
            // Fora do callback: o supabase-js trava se outra chamada de auth
            // roda dentro dele.
            setTimeout(() => carregarPerfil().catch(() => {}), 0)
          }
        })
      })()
    }
    return inicio
  }

  async function entrar(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })
    if (error) throw error
    sessao.value = data.session
    await carregarPerfil()
  }

  async function cadastrar({ nome, email, whatsapp, senha }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, whatsapp },
        emailRedirectTo: `${window.location.origin}/entrar`
      }
    })
    if (error) throw error
    // Com confirmação de e-mail ligada não vem sessão: a pessoa confirma antes.
    sessao.value = data.session
    if (data.session) await carregarPerfil()
    return { precisaConfirmar: !data.session }
  }

  async function sair() {
    await supabase.auth.signOut()
    sessao.value = null
    perfil.value = null
  }

  async function atualizarPerfil(campos) {
    const { data, error } = await supabase
      .from('perfis')
      .update(campos)
      .eq('id', perfil.value.id)
      .select()
      .single()
    if (error) throw error
    perfil.value = data
    return data
  }

  return {
    sessao,
    perfil,
    logado,
    ehAdmin,
    ativo,
    pronto,
    carregarPerfil,
    entrar,
    cadastrar,
    sair,
    atualizarPerfil
  }
})
