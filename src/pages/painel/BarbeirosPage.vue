<template>
  <div class="pn-page">
    <header class="pn-head">
      <div>
        <p class="mv-kicker">{{ $t('painel.barb.kicker') }}</p>
        <h1 class="pn-title">{{ $t('painel.barb.titulo') }}</h1>
        <p class="pn-sub">{{ $t('painel.barb.sub') }}</p>
      </div>
      <q-btn
        unelevated
        no-caps
        color="primary"
        class="pn-btn"
        icon="person_add"
        :label="$t('painel.barb.convidar')"
        @click="convite = true"
      />
    </header>

    <q-tabs
      v-model="aba"
      dense
      no-caps
      align="left"
      active-color="primary"
      indicator-color="primary"
      class="bb-abas"
    >
      <q-tab name="pendentes">
        <span class="bb-aba">
          {{ $t('painel.barb.abaPendentes') }}
          <q-badge
            v-if="contagem.pendentes"
            color="primary"
            :label="contagem.pendentes"
          />
        </span>
      </q-tab>
      <q-tab
        name="ativos"
        :label="$t('painel.barb.abaAtivos', { n: contagem.ativos })"
      />
      <q-tab
        name="todos"
        :label="$t('painel.barb.abaTodos', { n: lista.length })"
      />
    </q-tabs>

    <q-input
      v-model="busca"
      dense
      outlined
      clearable
      :placeholder="$t('painel.barb.busca')"
      class="bb-busca"
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <div v-if="carregando" class="row justify-center q-py-xl">
      <q-spinner size="30px" color="primary" />
    </div>

    <div v-else-if="!filtrados.length" class="pn-card bb-vazio">
      {{
        aba === 'pendentes'
          ? $t('painel.barb.vazioPendentes')
          : $t('painel.barb.vazio')
      }}
    </div>

    <div v-else class="bb-lista">
      <article v-for="b in filtrados" :key="b.id" class="pn-card bb-item">
        <span class="bb-avatar">{{ iniciais(b) }}</span>

        <div class="bb-info">
          <div class="bb-nome">
            <strong>{{ b.nome || $t('painel.barb.semNome') }}</strong>
            <span v-if="b.papel === 'admin'" class="bb-tag bb-tag--admin">
              {{ $t('painel.barb.tagAdmin') }}
            </span>
            <span v-if="!b.ativo" class="bb-tag bb-tag--pend">
              {{
                b.aprovado_em
                  ? $t('painel.barb.tagDesativado')
                  : $t('painel.barb.tagAguardando')
              }}
            </span>
            <span v-if="b.id === auth.perfil.id" class="bb-tag">
              {{ $t('painel.barb.tagVoce') }}
            </span>
          </div>
          <div class="bb-meta">
            <span><q-icon name="mail" size="14px" /> {{ b.email }}</span>
            <span v-if="b.whatsapp">
              <q-icon name="phone" size="14px" /> {{ b.whatsapp }}
            </span>
            <span v-if="b.cidade">
              <q-icon name="place" size="14px" /> {{ b.cidade }}
            </span>
          </div>
          <div class="bb-meta">
            <span v-if="b.slug" :class="{ 'bb-off': !b.form_ativo }">
              <q-icon name="link" size="14px" />
              /diagnostico/{{ b.slug }}
              <template v-if="!b.form_ativo">
                {{ $t('painel.barb.pausado') }}
              </template>
            </span>
            <span v-else class="bb-off">
              <q-icon name="link_off" size="14px" />
              {{ $t('painel.barb.semLink') }}
            </span>
            <span>{{
              $t('painel.barb.cadastroEm', { data: data(b.criado_em) })
            }}</span>
          </div>
        </div>

        <router-link
          class="bb-num"
          :to="{ path: '/painel', query: { barbeiro: b.id, status: 'todos' } }"
          :title="$t('painel.barb.verDiagnosticos')"
        >
          <strong>{{ b.diagnosticos?.[0]?.count ?? 0 }}</strong>
          <span>{{ $t('painel.barb.diagnosticos') }}</span>
        </router-link>

        <div class="bb-acoes">
          <q-btn
            v-if="!b.ativo"
            unelevated
            no-caps
            color="primary"
            class="pn-btn"
            :label="$t('painel.barb.aprovar')"
            :loading="salvando === b.id"
            @click="
              alterar(
                b,
                { ativo: true },
                $t('painel.barb.aprovado', { nome: b.nome || b.email })
              )
            "
          />
          <q-btn
            flat
            round
            dense
            icon="more_vert"
            :aria-label="$t('painel.barb.maisAcoes')"
          >
            <q-menu auto-close>
              <q-list style="min-width: 220px">
                <q-item clickable @click="editar(b)">
                  <q-item-section avatar><q-icon name="edit" /></q-item-section>
                  <q-item-section>{{
                    $t('painel.barb.editar')
                  }}</q-item-section>
                </q-item>
                <q-item
                  clickable
                  :to="{
                    path: '/painel',
                    query: { barbeiro: b.id, status: 'todos' }
                  }"
                >
                  <q-item-section avatar>
                    <q-icon name="assignment_ind" />
                  </q-item-section>
                  <q-item-section>{{
                    $t('painel.barb.verDiagnosticos')
                  }}</q-item-section>
                </q-item>
                <q-item
                  v-if="b.slug && b.ativo"
                  clickable
                  :href="linkDoFormulario(b.slug)"
                  target="_blank"
                  rel="noopener"
                >
                  <q-item-section avatar>
                    <q-icon name="open_in_new" />
                  </q-item-section>
                  <q-item-section>{{
                    $t('painel.barb.abrirForm')
                  }}</q-item-section>
                </q-item>
                <template v-if="b.id !== auth.perfil.id">
                  <q-separator />
                  <q-item
                    v-if="b.papel === 'barbeiro'"
                    clickable
                    @click="confirmarAdmin(b)"
                  >
                    <q-item-section avatar
                      ><q-icon name="shield"
                    /></q-item-section>
                    <q-item-section>{{
                      $t('painel.barb.tornarAdmin')
                    }}</q-item-section>
                  </q-item>
                  <q-item
                    v-else
                    clickable
                    @click="
                      alterar(
                        b,
                        { papel: 'barbeiro' },
                        $t('painel.barb.agoraBarbeiro')
                      )
                    "
                  >
                    <q-item-section avatar>
                      <q-icon name="remove_moderator" />
                    </q-item-section>
                    <q-item-section>{{
                      $t('painel.barb.removerAdmin')
                    }}</q-item-section>
                  </q-item>
                  <q-item
                    v-if="b.ativo"
                    clickable
                    class="text-negative"
                    @click="confirmarDesativar(b)"
                  >
                    <q-item-section avatar>
                      <q-icon name="block" color="negative" />
                    </q-item-section>
                    <q-item-section>{{
                      $t('painel.barb.desativar')
                    }}</q-item-section>
                  </q-item>
                </template>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </article>
    </div>

    <!-- Editar -->
    <q-dialog v-model="edicao.aberta">
      <q-card class="bb-dialog">
        <q-card-section>
          <h2 class="pn-card__title q-mb-none">
            {{ $t('painel.barb.editarTitulo') }}
          </h2>
          <p class="pn-sub">{{ edicao.email }}</p>
        </q-card-section>
        <q-card-section class="q-pt-none bb-form">
          <q-input
            v-model="edicao.nome"
            outlined
            dense
            :label="$t('painel.barb.nome')"
          />
          <q-input
            v-model="edicao.whatsapp"
            outlined
            dense
            :label="$t('painel.barb.whatsapp')"
          />
          <q-input
            v-model="edicao.cidade"
            outlined
            dense
            :label="$t('painel.barb.cidade')"
          />
          <q-input
            v-model="edicao.slug"
            outlined
            dense
            :label="$t('painel.barb.link')"
            prefix="/diagnostico/"
            :rules="[
              v =>
                !v ||
                /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(v) ||
                $t('painel.barb.linkRegra')
            ]"
          />
          <q-toggle
            v-model="edicao.form_ativo"
            :label="$t('painel.form.recebendo')"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            no-caps
            :label="$t('painel.comum.cancelar')"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            :label="$t('painel.comum.salvar')"
            :loading="salvando === edicao.id"
            @click="salvarEdicao"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Convite -->
    <q-dialog v-model="convite">
      <q-card class="bb-dialog">
        <q-card-section>
          <h2 class="pn-card__title">{{ $t('painel.barb.conviteTitulo') }}</h2>
          <p class="pn-sub q-mt-none">{{ $t('painel.barb.conviteTexto') }}</p>
          <div class="bb-convite">
            <span>{{ linkCadastro }}</span>
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="content_copy"
              :label="$t('painel.comum.copiar')"
              @click="copiarConvite"
            />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            no-caps
            :label="$t('painel.comum.fechar')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/config/supabase.js'
import { useAuthStore } from '@/stores/auth.js'
import { SITE_URL, linkDoFormulario } from '@/config/site.js'
import { mensagemDeErro } from '@/utils/erros.js'

const $q = useQuasar()
const { t, locale } = useI18n()
const auth = useAuthStore()

const lista = ref([])
const carregando = ref(true)
const salvando = ref(null)
const busca = ref('')
const convite = ref(false)
const edicao = reactive({ aberta: false })
const linkCadastro = `${SITE_URL}/cadastro`

const contagem = computed(() => ({
  pendentes: lista.value.filter(b => !b.ativo).length,
  ativos: lista.value.filter(b => b.ativo).length
}))

// Abre direto nos pendentes quando há alguém esperando.
const aba = ref('ativos')

const filtrados = computed(() => {
  const termo = (busca.value || '').trim().toLowerCase()
  return lista.value
    .filter(b =>
      aba.value === 'pendentes'
        ? !b.ativo
        : aba.value === 'ativos'
          ? b.ativo
          : true
    )
    .filter(
      b =>
        !termo ||
        [b.nome, b.email, b.slug, b.cidade]
          .filter(Boolean)
          .some(v => v.toLowerCase().includes(termo))
    )
})

function iniciais(b) {
  return (b.nome || b.email || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

function data(iso) {
  return new Date(iso).toLocaleDateString(locale.value)
}

async function carregar() {
  carregando.value = true
  const { data: dados, error } = await supabase
    .from('perfis')
    .select('*, diagnosticos(count)')
    .order('criado_em', { ascending: false })
  carregando.value = false
  if (error) {
    $q.notify({ type: 'negative', message: t('painel.barb.erroCarregar') })
    return
  }
  lista.value = dados
}

async function alterar(b, campos, mensagem) {
  salvando.value = b.id
  try {
    const { data: novo, error } = await supabase
      .from('perfis')
      .update(campos)
      .eq('id', b.id)
      .select('*, diagnosticos(count)')
      .single()
    if (error) throw error
    Object.assign(b, novo)
    if (mensagem) $q.notify({ type: 'positive', message: mensagem })
    return true
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: mensagemDeErro(t, e, 'painel.comum.erroSalvar')
    })
    return false
  } finally {
    salvando.value = null
  }
}

function confirmarAdmin(b) {
  $q.dialog({
    title: t('painel.barb.adminTitulo'),
    message: t('painel.barb.adminTexto', { nome: b.nome || b.email }),
    cancel: { flat: true, noCaps: true, label: t('painel.comum.cancelar') },
    ok: {
      unelevated: true,
      noCaps: true,
      color: 'primary',
      label: t('painel.barb.tornarAdmin')
    }
  }).onOk(() =>
    alterar(b, { papel: 'admin', ativo: true }, t('painel.barb.agoraAdmin'))
  )
}

function confirmarDesativar(b) {
  $q.dialog({
    title: t('painel.barb.desativarTitulo'),
    message: t('painel.barb.desativarTexto', { nome: b.nome || b.email }),
    cancel: { flat: true, noCaps: true, label: t('painel.comum.cancelar') },
    ok: {
      unelevated: true,
      noCaps: true,
      color: 'negative',
      label: t('painel.barb.desativar')
    }
  }).onOk(() => alterar(b, { ativo: false }, t('painel.barb.desativado')))
}

function editar(b) {
  Object.assign(edicao, {
    aberta: true,
    id: b.id,
    email: b.email,
    nome: b.nome,
    whatsapp: b.whatsapp,
    cidade: b.cidade,
    slug: b.slug || '',
    form_ativo: b.form_ativo,
    alvo: b
  })
}

async function salvarEdicao() {
  const ok = await alterar(
    edicao.alvo,
    {
      nome: edicao.nome.trim(),
      whatsapp: edicao.whatsapp.trim(),
      cidade: edicao.cidade.trim(),
      slug: edicao.slug.trim().toLowerCase() || null,
      form_ativo: edicao.form_ativo
    },
    t('painel.barb.atualizados')
  )
  if (ok) edicao.aberta = false
}

async function copiarConvite() {
  await copyToClipboard(linkCadastro)
  $q.notify({ type: 'positive', message: t('painel.barb.conviteCopiado') })
}

onMounted(async () => {
  await carregar()
  if (contagem.value.pendentes) aba.value = 'pendentes'
})
</script>

<style scoped>
.bb-abas {
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--mv-line);
}
.bb-aba {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.bb-busca {
  max-width: 420px;
  margin-bottom: 1rem;
}
.bb-vazio {
  color: var(--mv-muted);
}
.bb-lista {
  display: grid;
  gap: 0.6rem;
}
.bb-lista .pn-card + .pn-card {
  margin-top: 0;
}
.bb-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.15rem;
}
.bb-avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--mv-accent-tint);
  color: var(--mv-green-deep);
  font-family: var(--font-heavy);
  font-weight: 800;
  font-size: 0.85rem;
}
.bb-nome {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.bb-nome strong {
  font-weight: 700;
  color: var(--mv-ink);
}
.bb-tag {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--mv-surface-2);
  color: var(--mv-muted);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.bb-tag--admin {
  background: #0a0a0a;
  color: #fff;
}
.bb-tag--pend {
  background: #fff4e0;
  color: #9a5b00;
}
.bb-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1rem;
  margin-top: 0.3rem;
  font-size: 0.82rem;
  color: var(--mv-muted);
}
.bb-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  word-break: break-all;
}
.bb-off {
  color: var(--mv-faint);
}
.bb-num {
  display: grid;
  justify-items: center;
  padding: 0.4rem 0.8rem;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.18s;
}
.bb-num:hover {
  background: var(--mv-surface);
}
.bb-num strong {
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1;
  color: var(--mv-ink);
}
.bb-num span {
  font-size: 0.7rem;
  color: var(--mv-faint);
}
.bb-acoes {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
@media (max-width: 720px) {
  .bb-item {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .bb-num {
    grid-column: 2;
    justify-items: start;
    padding: 0;
  }
  .bb-acoes {
    grid-column: 3;
    grid-row: 1;
  }
}
.bb-dialog {
  width: 100%;
  max-width: 480px;
  border-radius: 16px;
}
.bb-form {
  display: grid;
  gap: 0.6rem;
}
.bb-convite {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: var(--mv-surface);
  font-weight: 600;
  word-break: break-all;
}
</style>
