<template>
  <div class="pn-page">
    <header class="pn-head">
      <div>
        <p class="mv-kicker">
          {{
            auth.ehAdmin
              ? $t('painel.lista.kickerAdmin')
              : $t('painel.lista.kickerBarbeiro')
          }}
        </p>
        <h1 class="pn-title">{{ $t('painel.lista.titulo') }}</h1>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          v-if="auth.perfil?.slug"
          outline
          no-caps
          class="pn-btn"
          color="primary"
          icon="content_copy"
          :label="$t('painel.lista.copiarLink')"
          @click="copiarLink"
        />
        <q-btn
          v-else
          unelevated
          no-caps
          class="pn-btn"
          color="primary"
          icon="link"
          :label="$t('painel.lista.criarLink')"
          to="/painel/formulario"
        />
      </div>
    </header>

    <!-- Números do topo: clicar filtra a lista. -->
    <div class="dl-stats">
      <button
        v-for="s in cartoes"
        :key="s.id"
        type="button"
        class="dl-stat"
        :class="{ 'dl-stat--on': filtroAtivo(s) }"
        @click="aplicarAtalho(s)"
      >
        <span class="dl-stat__n">{{ resumo?.[s.id] ?? '–' }}</span>
        <span class="dl-stat__l">{{ $t(s.label) }}</span>
      </button>
    </div>

    <div class="pn-card dl-filtros">
      <q-input
        v-model="busca"
        dense
        outlined
        clearable
        debounce="350"
        :placeholder="$t('painel.lista.busca')"
        class="dl-busca"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-select
        v-model="status"
        dense
        outlined
        emit-value
        map-options
        :options="opcoesStatus"
        :label="$t('painel.lista.status')"
        class="dl-sel"
      />
      <q-select
        v-model="fotos"
        dense
        outlined
        emit-value
        map-options
        :options="opcoesFotos"
        :label="$t('painel.lista.fotos')"
        class="dl-sel"
      />
      <q-select
        v-if="auth.ehAdmin"
        v-model="barbeiro"
        dense
        outlined
        emit-value
        map-options
        clearable
        :options="opcoesBarbeiro"
        :label="$t('painel.lista.visagista')"
        class="dl-sel dl-sel--wide"
      />
    </div>

    <q-table
      v-model:pagination="paginacao"
      class="dl-tabela"
      flat
      :rows="linhas"
      :columns="colunas"
      row-key="id"
      :loading="carregando"
      :grid="$q.screen.lt.md"
      :rows-per-page-options="[20, 50, 100]"
      :rows-per-page-label="$t('painel.lista.porPagina')"
      :pagination-label="
        (a, b, total) => $t('painel.lista.paginacao', { a, b, total })
      "
      :no-data-label="$t('painel.lista.vazio')"
      :no-results-label="$t('painel.lista.semResultado')"
      binary-state-sort
      @request="carregar"
      @row-click="(_, linha) => abrir(linha)"
    >
      <template #body-cell-cliente="props">
        <q-td :props="props">
          <div class="dl-cliente">
            <strong>{{ props.row.nome }}</strong>
            <span>{{ props.row.whatsapp }}</span>
          </div>
        </q-td>
      </template>
      <template #body-cell-perfil="props">
        <q-td :props="props">
          <span class="dl-perfil">{{ perfilTexto(props.row) }}</span>
        </q-td>
      </template>
      <template #body-cell-fotos="props">
        <q-td :props="props">
          <span
            class="dl-fotos"
            :class="{ 'dl-fotos--ok': fotosOk(props.row) }"
          >
            <q-icon
              :name="fotosOk(props.row) ? 'photo_library' : 'hide_image'"
              size="16px"
            />
            {{ props.row.qtd_fotos }}/{{ totalAngulos }}
            <template v-if="props.row.qtd_referencias">
              · {{ $t('painel.lista.ref', { n: props.row.qtd_referencias }) }}
            </template>
          </span>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td :props="props">
          <span class="pn-status" :class="`pn-status--${props.row.status}`">
            {{ $t(statusPorId[props.row.status].key) }}
          </span>
        </q-td>
      </template>

      <!-- Celular: um cartão por cliente. -->
      <template #item="props">
        <div class="dl-item" @click="abrir(props.row)">
          <div class="dl-item__top">
            <strong>{{ props.row.nome }}</strong>
            <span class="pn-status" :class="`pn-status--${props.row.status}`">
              {{ $t(statusPorId[props.row.status].key) }}
            </span>
          </div>
          <div class="dl-item__meta">
            <span>{{ dataCurta(props.row.criado_em) }}</span>
            <span>{{ perfilTexto(props.row) }}</span>
            <span
              class="dl-fotos"
              :class="{ 'dl-fotos--ok': fotosOk(props.row) }"
            >
              <q-icon name="photo_library" size="14px" />
              {{ props.row.qtd_fotos }}/{{ totalAngulos }}
            </span>
          </div>
          <div v-if="auth.ehAdmin" class="dl-item__barb">
            {{ props.row.barbeiro?.nome || '—' }}
          </div>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { supabase } from '@/config/supabase.js'
import { useAuthStore } from '@/stores/auth.js'
import { statusList, statusPorId } from '@/data/status.js'
import { diagAngulos, diagEstilos } from '@/data/diagnostico.js'
import { linkDoFormulario } from '@/config/site.js'

const $q = useQuasar()
const { t, locale } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const totalAngulos = diagAngulos.length

// Os filtros vivem na URL: voltar da ficha do cliente devolve a mesma lista.
const busca = ref(String(route.query.busca || ''))
const status = ref(String(route.query.status || 'ativos'))
const fotos = ref(String(route.query.fotos || 'todas'))
const barbeiro = ref(route.query.barbeiro ? String(route.query.barbeiro) : null)

const linhas = ref([])
const carregando = ref(false)
const resumo = ref(null)
const barbeiros = ref([])
const paginacao = ref({
  page: Number(route.query.pagina) || 1,
  rowsPerPage: 20,
  rowsNumber: 0,
  sortBy: 'criado_em',
  descending: true
})

const opcoesStatus = computed(() => [
  { label: t('painel.lista.ativos'), value: 'ativos' },
  { label: t('painel.lista.todos'), value: 'todos' },
  ...statusList.map(s => ({ label: t(s.key), value: s.id }))
])
const opcoesFotos = computed(() => [
  { label: t('painel.lista.todas'), value: 'todas' },
  { label: t('painel.lista.fotosPendentes'), value: 'pendentes' },
  { label: t('painel.lista.fotosEnviadas'), value: 'enviadas' }
])
const opcoesBarbeiro = computed(() =>
  barbeiros.value.map(b => ({ label: b.nome || b.email, value: b.id }))
)

const cartoes = [
  {
    id: 'total',
    label: 'painel.lista.emAberto',
    status: 'ativos',
    fotos: 'todas'
  },
  { id: 'novos', label: 'painel.lista.novos', status: 'novo', fotos: 'todas' },
  {
    id: 'sem_fotos',
    label: 'painel.lista.semFotos',
    status: 'ativos',
    fotos: 'pendentes'
  },
  {
    id: 'agendados',
    label: 'painel.lista.agendados',
    status: 'agendado',
    fotos: 'todas'
  },
  {
    id: 'semana',
    label: 'painel.lista.semana',
    status: 'todos',
    fotos: 'todas'
  }
]

function filtroAtivo(c) {
  return (
    c.status === status.value && c.fotos === fotos.value && c.id !== 'semana'
  )
}
function aplicarAtalho(c) {
  status.value = c.status
  fotos.value = c.fotos
}

const colunas = computed(() => [
  {
    name: 'cliente',
    label: t('painel.lista.cliente'),
    field: 'nome',
    align: 'left'
  },
  {
    name: 'criado_em',
    label: t('painel.lista.recebido'),
    field: 'criado_em',
    align: 'left',
    sortable: true,
    format: dataCurta
  },
  {
    name: 'perfil',
    label: t('painel.lista.perfil'),
    field: 'predominantes',
    align: 'left'
  },
  {
    name: 'estilo',
    label: t('painel.lista.estilo'),
    field: 'estilo',
    align: 'left',
    format: v => nomeEstilo(v)
  },
  {
    name: 'fotos',
    label: t('painel.lista.fotos'),
    field: 'qtd_fotos',
    align: 'left'
  },
  {
    name: 'status',
    label: t('painel.lista.status'),
    field: 'status',
    align: 'left',
    sortable: true
  },
  ...(auth.ehAdmin
    ? [
        {
          name: 'barbeiro',
          label: t('painel.lista.visagista'),
          field: r => r.barbeiro?.nome || '—',
          align: 'left'
        }
      ]
    : [])
])

function dataCurta(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  })
}

function nomeEstilo(id) {
  const e = diagEstilos.find(x => x.id === id)
  return e ? t(e.nameKey) : '—'
}

function perfilTexto(linha) {
  return (linha.predominantes || []).join(' · ') || '—'
}

function fotosOk(linha) {
  return linha.qtd_fotos >= totalAngulos
}

/**
 * Só letras, números, espaço e o que aparece num telefone: vírgula, ponto,
 * parênteses, aspas e curingas mudariam o sentido do filtro `or` do
 * PostgREST. (O RLS segura de qualquer jeito; isto evita filtro quebrado.)
 */
function limparBusca(texto) {
  return String(texto || '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} +-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

async function carregar(req) {
  const pag = req?.pagination || paginacao.value
  carregando.value = true
  try {
    const de = (pag.page - 1) * pag.rowsPerPage
    let q = supabase
      .from('diagnosticos')
      .select(
        'id, nome, whatsapp, criado_em, predominantes, estilo, qtd_fotos, qtd_referencias, fotos_enviadas_em, status, barbeiro_id, barbeiro:perfis(nome)',
        { count: 'exact' }
      )
      .order(pag.sortBy || 'criado_em', { ascending: !pag.descending })
      .range(de, de + pag.rowsPerPage - 1)

    if (status.value === 'ativos') q = q.neq('status', 'arquivado')
    else if (status.value !== 'todos') q = q.eq('status', status.value)
    if (fotos.value === 'pendentes') q = q.is('fotos_enviadas_em', null)
    if (fotos.value === 'enviadas') q = q.not('fotos_enviadas_em', 'is', null)
    if (barbeiro.value) q = q.eq('barbeiro_id', barbeiro.value)
    const termo = limparBusca(busca.value)
    if (termo) q = q.or(`nome.ilike.%${termo}%,whatsapp.ilike.%${termo}%`)

    const { data, error, count } = await q
    if (error) throw error
    linhas.value = data
    paginacao.value = { ...pag, rowsNumber: count || 0 }
  } catch {
    $q.notify({ type: 'negative', message: t('painel.lista.erroCarregar') })
  } finally {
    carregando.value = false
  }
}

async function carregarResumo() {
  const { data } = await supabase.rpc('painel_resumo', {
    p_barbeiro: barbeiro.value || null
  })
  resumo.value = data
}

function abrir(linha) {
  router.push({ name: 'diagnostico', params: { id: linha.id } })
}

async function copiarLink() {
  await copyToClipboard(linkDoFormulario(auth.perfil.slug))
  $q.notify({ type: 'positive', message: t('painel.lista.linkCopiado') })
}

watch([busca, status, fotos, barbeiro], () => {
  router.replace({
    query: {
      ...(busca.value ? { busca: busca.value } : {}),
      ...(status.value !== 'ativos' ? { status: status.value } : {}),
      ...(fotos.value !== 'todas' ? { fotos: fotos.value } : {}),
      ...(barbeiro.value ? { barbeiro: barbeiro.value } : {})
    }
  })
  carregar({ pagination: { ...paginacao.value, page: 1 } })
})
watch(barbeiro, carregarResumo)

onMounted(async () => {
  carregar()
  carregarResumo()
  if (auth.ehAdmin) {
    const { data } = await supabase
      .from('perfis')
      .select('id, nome, email')
      .order('nome')
    barbeiros.value = data || []
  }
})
</script>

<style scoped>
.dl-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.dl-stat {
  display: grid;
  gap: 0.15rem;
  text-align: left;
  padding: 0.9rem 1rem;
  border: 1px solid var(--mv-line);
  border-radius: 14px;
  background: var(--mv-bg);
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}
.dl-stat:hover {
  border-color: var(--mv-line-strong);
}
.dl-stat--on {
  border-color: var(--mv-hl);
  box-shadow: inset 0 0 0 1px var(--mv-hl);
}
.dl-stat__n {
  font-family: var(--font-display);
  font-size: 1.9rem;
  line-height: 1;
  color: var(--mv-ink);
  font-variant-numeric: tabular-nums;
}
.dl-stat__l {
  font-family: var(--font-heavy);
  font-weight: 600;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mv-muted);
}
.dl-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.85rem;
}
.dl-busca {
  flex: 2 1 260px;
}
.dl-sel {
  flex: 1 1 170px;
}
.dl-sel--wide {
  flex-basis: 220px;
}
.dl-tabela {
  border: 1px solid var(--mv-line);
  border-radius: 14px;
  background: var(--mv-bg);
}
.dl-tabela :deep(tbody tr) {
  cursor: pointer;
}
.dl-tabela :deep(th) {
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mv-muted);
}
.dl-cliente {
  display: grid;
}
.dl-cliente strong {
  font-weight: 600;
  color: var(--mv-ink);
}
.dl-cliente span {
  font-size: 0.8rem;
  color: var(--mv-faint);
}
.dl-perfil {
  font-family: var(--font-heavy);
  font-weight: 700;
  color: var(--mv-hl);
  letter-spacing: 0.04em;
}
.dl-fotos {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--mv-faint);
  font-variant-numeric: tabular-nums;
}
.dl-fotos--ok {
  color: #17703b;
  font-weight: 600;
}
.dl-tabela :deep(.q-table__grid-content) {
  gap: 0.6rem;
  padding: 0.6rem;
}
.dl-item {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--mv-line);
  border-radius: 12px;
  background: var(--mv-bg);
  cursor: pointer;
}
.dl-item__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.dl-item__top strong {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin-top: 0.4rem;
  font-size: 0.82rem;
  color: var(--mv-muted);
}
.dl-item__barb {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: var(--mv-faint);
}
</style>
