<template>
  <div class="pn-page fm">
    <header class="pn-head">
      <div>
        <p class="mv-kicker">{{ $t('painel.form.kicker') }}</p>
        <h1 class="pn-title">{{ $t('painel.form.titulo') }}</h1>
        <p class="pn-sub">{{ $t('painel.form.sub') }}</p>
      </div>
    </header>

    <!-- ============ Link ============ -->
    <section class="pn-card fm-link">
      <h2 class="pn-card__title">{{ $t('painel.form.seuLink') }}</h2>

      <div v-if="auth.perfil.slug" class="fm-link__atual">
        <span class="fm-link__url">{{ linkAtual }}</span>
        <div class="fm-link__acoes">
          <q-btn
            unelevated
            no-caps
            color="primary"
            class="pn-btn"
            icon="content_copy"
            :label="$t('painel.comum.copiar')"
            @click="copiar"
          />
          <q-btn
            outline
            no-caps
            color="primary"
            class="pn-btn"
            icon="open_in_new"
            :label="$t('painel.comum.abrir')"
            :href="linkAtual"
            target="_blank"
            rel="noopener"
          />
          <q-btn
            outline
            no-caps
            class="pn-btn fm-whats"
            :href="linkCompartilhar"
            target="_blank"
            rel="noopener"
          >
            <BrandIcon name="whatsapp" size="18px" />
            <span class="q-ml-sm">{{ $t('painel.form.mandar') }}</span>
          </q-btn>
        </div>
      </div>

      <q-toggle
        v-if="auth.perfil.slug"
        v-model="campos.form_ativo"
        class="fm-toggle"
        color="primary"
        :label="
          campos.form_ativo
            ? $t('painel.form.recebendo')
            : $t('painel.form.pausado')
        "
      />

      <q-input
        v-model="campos.slug"
        class="q-mt-md"
        outlined
        :label="$t('painel.form.endereco')"
        :prefix="prefixo"
        :hint="$t('painel.form.enderecoDica')"
        maxlength="40"
        :rules="[validarSlug]"
        @update:model-value="v => (campos.slug = normalizarSlug(v))"
      >
        <template v-if="!campos.slug && sugestao" #after>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            :label="$t('painel.form.usar', { sugestao })"
            @click="campos.slug = sugestao"
          />
        </template>
      </q-input>
      <p
        v-if="auth.perfil.slug && campos.slug !== auth.perfil.slug"
        class="fm-aviso"
      >
        <q-icon name="warning_amber" size="16px" />
        {{ $t('painel.form.avisoTroca') }}
      </p>
    </section>

    <!-- ============ Como o cliente te vê ============ -->
    <section class="pn-card">
      <h2 class="pn-card__title">{{ $t('painel.form.comoVe') }}</h2>
      <div class="fm-grid">
        <q-input
          v-model="campos.nome"
          outlined
          :label="$t('painel.form.seuNome')"
          :hint="$t('painel.form.seuNomeDica')"
          maxlength="120"
        />
        <q-input
          v-model="campos.whatsapp"
          outlined
          :label="$t('painel.form.whatsapp')"
          inputmode="tel"
          :hint="$t('painel.form.whatsappDica')"
          maxlength="40"
        />
        <q-input
          v-model="campos.cidade"
          outlined
          :label="$t('painel.form.cidade')"
          maxlength="80"
        />
        <q-input
          v-model="campos.instagram"
          outlined
          :label="$t('painel.form.instagram')"
          prefix="@"
          maxlength="60"
          @update:model-value="
            v => (campos.instagram = String(v || '').replace(/^@+/, ''))
          "
        />
      </div>
      <q-input
        v-model="campos.mensagem"
        class="q-mt-md"
        outlined
        type="textarea"
        autogrow
        :label="$t('painel.form.recado')"
        :hint="$t('painel.form.recadoDica')"
        maxlength="600"
        counter
        input-style="min-height: 80px"
      />
    </section>

    <!-- ============ Formatos ============ -->
    <section class="pn-card">
      <h2 class="pn-card__title">{{ $t('painel.form.formatos') }}</h2>
      <p class="pn-sub fm-sub">{{ $t('painel.form.formatosSub') }}</p>
      <div class="fm-formatos">
        <label
          v-for="op in diagAtendimento"
          :key="op.id"
          class="fm-formato"
          :class="{ 'fm-formato--on': campos.atendimentos.includes(op.id) }"
        >
          <q-checkbox
            v-model="campos.atendimentos"
            :val="op.id"
            color="primary"
            dense
          />
          <q-icon :name="op.icon" size="20px" class="fm-formato__ic" />
          <span>
            <strong>{{ $t(op.nameKey) }}</strong>
            <em>{{ $t(op.descKey) }}</em>
          </span>
        </label>
      </div>
    </section>

    <div class="fm-salvar">
      <q-btn
        unelevated
        no-caps
        class="mv-cta"
        :loading="salvando"
        :disable="!mudou"
        @click="salvar"
      >
        <span>{{ $t('painel.form.salvar') }}</span>
        <q-icon name="check" size="20px" />
      </q-btn>
      <span v-if="!mudou" class="fm-salvo">{{
        $t('painel.form.tudoSalvo')
      }}</span>
    </div>

    <!-- ============ Conta ============ -->
    <section class="pn-card fm-conta">
      <h2 class="pn-card__title">{{ $t('painel.form.conta') }}</h2>
      <i18n-t
        scope="global"
        keypath="painel.form.emailAcesso"
        tag="p"
        class="pn-sub fm-sub"
      >
        <template #email>
          <strong>{{ auth.perfil.email }}</strong>
        </template>
      </i18n-t>
      <q-form class="fm-grid" @submit="trocarSenha">
        <q-input
          v-model="senha"
          outlined
          type="password"
          :label="$t('painel.auth.novaSenha')"
          autocomplete="new-password"
          :rules="[v => !v || v.length >= 8 || $t('painel.auth.senhaMin')]"
          lazy-rules
        />
        <q-input
          v-model="senha2"
          outlined
          type="password"
          :label="$t('painel.form.confirmeNova')"
          autocomplete="new-password"
          :rules="[v => v === senha || $t('painel.auth.senhasDiferentes')]"
          lazy-rules
        />
        <div>
          <q-btn
            type="submit"
            outline
            no-caps
            color="primary"
            class="pn-btn"
            :label="$t('painel.form.trocarSenha')"
            :disable="!senha"
            :loading="trocandoSenha"
          />
        </div>
      </q-form>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import BrandIcon from '@/components/ui/BrandIcon.vue'
import { supabase } from '@/config/supabase.js'
import { useAuthStore } from '@/stores/auth.js'
import { diagAtendimento } from '@/data/diagnostico.js'
import { SITE_URL, linkDoFormulario } from '@/config/site.js'
import { mensagemDeErro } from '@/utils/erros.js'

const $q = useQuasar()
const { t } = useI18n()
const auth = useAuthStore()

const EDITAVEIS = [
  'slug',
  'form_ativo',
  'nome',
  'whatsapp',
  'cidade',
  'instagram',
  'mensagem',
  'atendimentos'
]

function copiaDoPerfil() {
  const p = auth.perfil
  return {
    slug: p.slug || '',
    form_ativo: p.form_ativo,
    nome: p.nome || '',
    whatsapp: p.whatsapp || '',
    cidade: p.cidade || '',
    instagram: p.instagram || '',
    mensagem: p.mensagem || '',
    atendimentos: [...(p.atendimentos || [])]
  }
}

const campos = reactive(copiaDoPerfil())
const salvando = ref(false)
const senha = ref('')
const senha2 = ref('')
const trocandoSenha = ref(false)

const prefixo = `${SITE_URL.replace(/^https?:\/\//, '')}/diagnostico/`
const linkAtual = computed(() => linkDoFormulario(auth.perfil.slug))
// Sem número: o WhatsApp abre a lista de conversas para escolher o cliente.
const linkCompartilhar = computed(
  () =>
    `https://wa.me/?text=${encodeURIComponent(
      t('painel.form.msgCompartilhar', { link: linkAtual.value })
    )}`
)

const mudou = computed(() => {
  const original = copiaDoPerfil()
  return EDITAVEIS.some(
    k => JSON.stringify(campos[k]) !== JSON.stringify(original[k])
  )
})

function normalizarSlug(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 40)
}

const sugestao = computed(() =>
  normalizarSlug(campos.nome || auth.perfil.nome)
    .replace(/-$/, '')
    .slice(0, 40)
)

function validarSlug(v) {
  if (!v) return true
  return (
    /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(v) || t('painel.form.slugInvalido')
  )
}

async function copiar() {
  await copyToClipboard(linkAtual.value)
  $q.notify({ type: 'positive', message: t('painel.form.linkCopiado') })
}

async function salvar() {
  if (validarSlug(campos.slug) !== true) {
    $q.notify({ type: 'warning', message: t('painel.form.confiraLink') })
    return
  }
  salvando.value = true
  try {
    await auth.atualizarPerfil({
      ...campos,
      slug: campos.slug || null,
      nome: campos.nome.trim(),
      whatsapp: campos.whatsapp.trim(),
      cidade: campos.cidade.trim(),
      instagram: campos.instagram.trim(),
      mensagem: campos.mensagem.trim()
    })
    Object.assign(campos, copiaDoPerfil())
    $q.notify({ type: 'positive', message: t('painel.form.salvo') })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: mensagemDeErro(t, e, 'painel.comum.erroSalvar')
    })
  } finally {
    salvando.value = false
  }
}

async function trocarSenha() {
  trocandoSenha.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: senha.value })
    if (error) throw error
    senha.value = ''
    senha2.value = ''
    $q.notify({ type: 'positive', message: t('painel.auth.senhaAtualizada') })
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemDeErro(t, e) })
  } finally {
    trocandoSenha.value = false
  }
}
</script>

<style scoped>
.fm {
  max-width: 920px;
}
.fm-link__atual {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: #0a0a0a;
}
.fm-link__url {
  min-width: 0;
  color: #fff;
  font-family: var(--font-heavy);
  font-weight: 600;
  word-break: break-all;
}
.fm-link__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.fm-link__acoes .q-btn--outline {
  color: #fff !important;
}
.fm-whats {
  color: #fff;
}
.fm-toggle {
  margin-top: 0.75rem;
}
.fm-aviso {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
  margin: 0.25rem 0 0;
  font-size: 0.84rem;
  color: #9a5b00;
}
.fm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.5rem 1rem;
}
.fm-sub {
  margin: -0.5rem 0 1rem;
}
.fm-formatos {
  display: grid;
  gap: 0.5rem;
}
.fm-formato {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--mv-line);
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.18s,
    background 0.18s;
}
.fm-formato--on {
  border-color: var(--mv-hl);
  background: var(--mv-accent-tint);
}
.fm-formato__ic {
  margin-top: 0.1rem;
  color: var(--mv-hl);
}
.fm-formato strong {
  display: block;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--mv-ink);
}
.fm-formato em {
  display: block;
  font-style: normal;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--mv-muted);
}
.fm-salvar {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  padding: 0.85rem 0;
  background: linear-gradient(to top, var(--mv-bg-alt) 70%, transparent);
}
.fm-salvo {
  font-size: 0.86rem;
  color: var(--mv-faint);
}
.fm-conta {
  margin-top: 1.5rem;
}
</style>
