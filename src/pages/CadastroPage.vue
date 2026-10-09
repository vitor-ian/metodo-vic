<template>
  <div>
    <template v-if="confirmar">
      <h1 class="auth-title">{{ $t('painel.auth.confirmeTitulo') }}</h1>
      <!-- i18n-t e não v-html: o e-mail é texto digitado. -->
      <i18n-t
        scope="global"
        keypath="painel.auth.confirmeTexto"
        tag="p"
        class="auth-sub"
      >
        <template #email>
          <strong>{{ email }}</strong>
        </template>
      </i18n-t>
      <q-btn unelevated no-caps class="mv-cta auth-btn" to="/entrar">
        <span>{{ $t('painel.auth.irLogin') }}</span>
        <q-icon name="arrow_forward" size="20px" />
      </q-btn>
    </template>

    <template v-else>
      <h1 class="auth-title">{{ $t('painel.auth.cadastroTitulo') }}</h1>
      <p class="auth-sub">{{ $t('painel.auth.cadastroSub') }}</p>

      <p v-if="erro" class="auth-alert" role="alert">
        <q-icon name="error_outline" size="18px" />
        <span>{{ erro }}</span>
      </p>

      <q-form class="auth-form" @submit="cadastrar">
        <q-input
          v-model="nome"
          :label="$t('painel.auth.nomeCompleto')"
          outlined
          autocomplete="name"
          no-error-icon
          :rules="[
            v => (v && v.trim().length > 2) || $t('painel.auth.nomeObrigatorio')
          ]"
          lazy-rules
        />
        <q-input
          v-model="whatsapp"
          :label="$t('painel.auth.whatsapp')"
          outlined
          inputmode="tel"
          autocomplete="tel"
          no-error-icon
          :rules="[
            v =>
              (v && v.replace(/\D/g, '').length >= 10) ||
              $t('painel.auth.whatsappInvalido')
          ]"
          lazy-rules
        />
        <q-input
          v-model="email"
          :label="$t('painel.auth.email')"
          type="email"
          outlined
          autocomplete="email"
          no-error-icon
          :rules="[v => /.+@.+\..+/.test(v) || $t('painel.auth.emailInvalido')]"
          lazy-rules
        />
        <q-input
          v-model="senha"
          :label="$t('painel.auth.senha')"
          type="password"
          outlined
          autocomplete="new-password"
          :hint="$t('painel.auth.senhaDica')"
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
          <span>{{ $t('painel.auth.criarContaBtn') }}</span>
          <q-icon name="arrow_forward" size="20px" />
        </q-btn>
      </q-form>

      <div class="auth-links">
        <router-link to="/entrar">{{ $t('painel.auth.jaTenho') }}</router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.js'
import { mensagemDeErro } from '@/utils/erros.js'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const nome = ref('')
const whatsapp = ref('')
const email = ref('')
const senha = ref('')
const senha2 = ref('')
const carregando = ref(false)
const erro = ref('')
const confirmar = ref(false)

async function cadastrar() {
  carregando.value = true
  erro.value = ''
  try {
    const { precisaConfirmar } = await auth.cadastrar({
      nome: nome.value.trim(),
      whatsapp: whatsapp.value.trim(),
      email: email.value.trim(),
      senha: senha.value
    })
    if (precisaConfirmar) confirmar.value = true
    else router.replace('/painel')
  } catch (e) {
    erro.value = mensagemDeErro(t, e)
  } finally {
    carregando.value = false
  }
}
</script>
