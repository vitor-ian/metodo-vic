<template>
  <div>
    <h1 class="auth-title">{{ $t('painel.auth.recTitulo') }}</h1>
    <p class="auth-sub">{{ $t('painel.auth.recSub') }}</p>

    <p v-if="enviado" class="auth-alert auth-alert--ok" role="status">
      <q-icon name="mark_email_read" size="18px" />
      <i18n-t scope="global" keypath="painel.auth.recEnviado" tag="span">
        <template #email>
          <strong>{{ email }}</strong>
        </template>
      </i18n-t>
    </p>
    <p v-if="erro" class="auth-alert" role="alert">
      <q-icon name="error_outline" size="18px" />
      <span>{{ erro }}</span>
    </p>

    <q-form v-if="!enviado" class="auth-form" @submit="enviar">
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
      <q-btn
        type="submit"
        unelevated
        no-caps
        class="mv-cta auth-btn"
        :loading="carregando"
      >
        <span>{{ $t('painel.auth.enviarLink') }}</span>
        <q-icon name="arrow_forward" size="20px" />
      </q-btn>
    </q-form>

    <div class="auth-links">
      <router-link to="/entrar">{{
        $t('painel.auth.voltarLogin')
      }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/config/supabase.js'
import { mensagemDeErro } from '@/utils/erros.js'

const { t } = useI18n()
const email = ref('')
const carregando = ref(false)
const enviado = ref(false)
const erro = ref('')

async function enviar() {
  carregando.value = true
  erro.value = ''
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.value.trim(),
      { redirectTo: `${window.location.origin}/redefinir-senha` }
    )
    if (error) throw error
    enviado.value = true
  } catch (e) {
    erro.value = mensagemDeErro(t, e)
  } finally {
    carregando.value = false
  }
}
</script>
