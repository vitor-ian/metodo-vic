<template>
  <div>
    <h1 class="auth-title">{{ $t('painel.auth.novaTitulo') }}</h1>

    <div v-if="verificando" class="row justify-center q-py-lg">
      <q-spinner size="28px" color="primary" />
    </div>

    <template v-else-if="!sessao">
      <p class="auth-sub">{{ $t('painel.auth.linkExpirado') }}</p>
      <q-btn unelevated no-caps class="mv-cta auth-btn" to="/recuperar-senha">
        <span>{{ $t('painel.auth.pedirLink') }}</span>
      </q-btn>
    </template>

    <template v-else>
      <p class="auth-sub">{{ $t('painel.auth.novaSub') }}</p>
      <p v-if="erro" class="auth-alert" role="alert">
        <q-icon name="error_outline" size="18px" />
        <span>{{ erro }}</span>
      </p>
      <q-form class="auth-form" @submit="salvar">
        <q-input
          v-model="senha"
          :label="$t('painel.auth.novaSenha')"
          type="password"
          outlined
          autocomplete="new-password"
          no-error-icon
          :rules="[v => (v && v.length >= 8) || $t('painel.auth.senhaMin')]"
          lazy-rules
        />
        <q-input
          v-model="senha2"
          :label="$t('painel.auth.confirmeSenha')"
          type="password"
          outlined
          autocomplete="new-password"
          no-error-icon
          :rules="[v => v === senha || $t('painel.auth.senhasDiferentes')]"
          lazy-rules
        />
        <q-btn
          type="submit"
          unelevated
          no-caps
          class="mv-cta auth-btn"
          :loading="carregando"
        >
          <span>{{ $t('painel.auth.salvarEntrar') }}</span>
          <q-icon name="arrow_forward" size="20px" />
        </q-btn>
      </q-form>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/config/supabase.js'
import { mensagemDeErro } from '@/utils/erros.js'

const $q = useQuasar()
const { t } = useI18n()
const router = useRouter()

const verificando = ref(true)
const sessao = ref(null)
const senha = ref('')
const senha2 = ref('')
const carregando = ref(false)
const erro = ref('')

onMounted(async () => {
  // O supabase-js lê o token de recuperação da URL ao iniciar; aqui só
  // conferimos se ele virou sessão.
  const { data } = await supabase.auth.getSession()
  sessao.value = data.session
  verificando.value = false
})

async function salvar() {
  carregando.value = true
  erro.value = ''
  try {
    const { error } = await supabase.auth.updateUser({ password: senha.value })
    if (error) throw error
    $q.notify({ type: 'positive', message: t('painel.auth.senhaAtualizada') })
    router.replace('/painel')
  } catch (e) {
    erro.value = mensagemDeErro(t, e)
  } finally {
    carregando.value = false
  }
}
</script>
