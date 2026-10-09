<template>
  <div>
    <h1 class="auth-title">{{ $t('painel.auth.entrarTitulo') }}</h1>
    <p class="auth-sub">{{ $t('painel.auth.entrarSub') }}</p>

    <p v-if="erro" class="auth-alert" role="alert">
      <q-icon name="error_outline" size="18px" />
      <span>{{ erro }}</span>
    </p>

    <q-form class="auth-form" @submit="entrar">
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
        :type="verSenha ? 'text' : 'password'"
        outlined
        autocomplete="current-password"
        no-error-icon
        :rules="[v => !!v || $t('painel.auth.senhaObrigatoria')]"
        lazy-rules
      >
        <template #append>
          <q-icon
            :name="verSenha ? 'visibility_off' : 'visibility'"
            class="cursor-pointer"
            :aria-label="
              verSenha
                ? $t('painel.auth.esconderSenha')
                : $t('painel.auth.mostrarSenha')
            "
            @click="verSenha = !verSenha"
          />
        </template>
      </q-input>

      <q-btn
        type="submit"
        unelevated
        no-caps
        class="mv-cta auth-btn"
        :loading="carregando"
      >
        <span>{{ $t('painel.auth.entrar') }}</span>
        <q-icon name="arrow_forward" size="20px" />
      </q-btn>
    </q-form>

    <div class="auth-links">
      <router-link to="/recuperar-senha">{{
        $t('painel.auth.esqueci')
      }}</router-link>
      <router-link to="/cadastro">{{
        $t('painel.auth.criarConta')
      }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.js'
import { mensagemDeErro } from '@/utils/erros.js'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const senha = ref('')
const verSenha = ref(false)
const carregando = ref(false)
const erro = ref('')

async function entrar() {
  carregando.value = true
  erro.value = ''
  try {
    await auth.entrar(email.value.trim(), senha.value)
    // Só caminhos internos: um ?para= montado por fora não leva para outro site.
    const para = String(route.query.para || '')
    router.replace(para.startsWith('/painel') ? para : '/painel')
  } catch (e) {
    erro.value = mensagemDeErro(t, e)
  } finally {
    carregando.value = false
  }
}
</script>
