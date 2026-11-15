<template>
  <div class="pn-page av-pn">
    <header class="pn-head">
      <div>
        <p class="mv-kicker">{{ $t('painel.aval.kicker') }}</p>
        <h1 class="pn-title">{{ $t('painel.aval.titulo') }}</h1>
        <p class="pn-sub">{{ $t('painel.aval.sub') }}</p>
      </div>
    </header>

    <!-- ============ Link ============ -->
    <section class="pn-card">
      <h2 class="pn-card__title">{{ $t('painel.aval.seuLink') }}</h2>
      <template v-if="auth.perfil.slug">
        <div class="av-link">
          <span class="av-link__url">{{ link }}</span>
          <div class="av-link__acoes">
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
              class="pn-btn av-link__out"
              icon="open_in_new"
              :label="$t('painel.comum.abrir')"
              :href="link"
              target="_blank"
              rel="noopener"
            />
            <q-btn
              outline
              no-caps
              class="pn-btn av-link__out"
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
          :model-value="auth.perfil.avaliacao_ativa !== false"
          class="q-mt-sm"
          color="primary"
          :disable="salvandoAtiva"
          :label="
            auth.perfil.avaliacao_ativa !== false
              ? $t('painel.aval.recebendo')
              : $t('painel.aval.pausado')
          "
          @update:model-value="mudarAtiva"
        />
        <p class="av-dica">
          <q-icon name="tips_and_updates" size="16px" />
          {{ $t('painel.aval.dicaFicha') }}
        </p>
      </template>
      <div v-else class="av-sem-link">
        <p class="pn-sub q-mt-none">{{ $t('painel.aval.semLink') }}</p>
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="pn-btn"
          icon="link"
          :label="$t('painel.lista.criarLink')"
          to="/painel/formulario"
        />
      </div>
    </section>

    <q-tabs
      v-model="aba"
      align="left"
      no-caps
      inline-label
      active-color="primary"
      indicator-color="primary"
      class="av-tabs"
    >
      <q-tab
        name="resultados"
        icon="insights"
        :label="$t('painel.aval.abaResultados')"
      />
      <q-tab
        name="perguntas"
        icon="quiz"
        :label="$t('painel.aval.abaPerguntas')"
      />
    </q-tabs>

    <!-- ================= RESULTADOS ================= -->
    <template v-if="aba === 'resultados'">
      <div class="av-filtros">
        <q-btn-toggle
          v-model="periodo"
          no-caps
          unelevated
          toggle-color="primary"
          color="white"
          text-color="grey-9"
          class="av-periodo"
          :options="opcoesPeriodo"
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
          class="av-sel"
        />
      </div>

      <div v-if="carregando" class="row justify-center q-py-xl">
        <q-spinner size="34px" color="primary" />
      </div>

      <div v-else-if="!linhas.length" class="pn-card av-vazio">
        <q-icon name="reviews" size="40px" />
        <strong>{{ $t('painel.aval.vazioTitulo') }}</strong>
        <p class="pn-sub">{{ $t('painel.aval.vazioTexto') }}</p>
      </div>

      <template v-else>
        <!-- Números do topo -->
        <div class="av-stats">
          <div class="av-stat">
            <span class="av-stat__n">{{ linhas.length }}</span>
            <span class="av-stat__l">{{ $t('painel.aval.total') }}</span>
          </div>
          <div class="av-stat">
            <span class="av-stat__n">
              {{ fmt1(metricas.media) }}
              <q-icon name="star" class="av-stat__star" />
            </span>
            <span class="av-stat__l">{{ $t('painel.aval.media') }}</span>
          </div>
          <div class="av-stat">
            <span class="av-stat__n">
              {{
                metricas.nps === null
                  ? '–'
                  : (metricas.nps > 0 ? '+' : '') + metricas.nps
              }}
            </span>
            <span class="av-stat__l">
              {{ $t('painel.aval.nps') }}
              <q-icon name="help_outline" size="14px">
                <q-tooltip max-width="260px">{{
                  $t('painel.aval.npsAjuda')
                }}</q-tooltip>
              </q-icon>
            </span>
            <span
              v-if="metricas.nps !== null"
              class="av-stat__sel"
              :class="`av-stat__sel--${faixaNps.id}`"
            >
              {{ $t(faixaNps.key) }}
            </span>
          </div>
          <div class="av-stat">
            <span class="av-stat__n">{{ pct(metricas.cinco) }}</span>
            <span class="av-stat__l">{{
              $t('painel.aval.cincoEstrelas')
            }}</span>
          </div>
        </div>

        <div class="av-grid">
          <!-- Distribuição das notas: uma série só, uma cor. -->
          <section class="pn-card">
            <h2 class="pn-card__title">{{ $t('painel.aval.distribuicao') }}</h2>
            <ul class="av-dist">
              <li v-for="d in distribuicao" :key="d.nota">
                <span class="av-dist__rot">
                  {{ d.nota }} <q-icon name="star" size="14px" />
                </span>
                <span class="av-dist__trilho">
                  <span
                    class="av-dist__barra"
                    :style="{ width: d.pct + '%' }"
                  />
                </span>
                <span class="av-dist__val">
                  {{ d.n }} <em>· {{ pct(d.pct) }}</em>
                </span>
                <q-tooltip anchor="top middle" self="bottom middle">
                  {{
                    $t('painel.aval.tipDist', {
                      n: d.n,
                      nota: d.nota,
                      pct: pct(d.pct)
                    })
                  }}
                </q-tooltip>
              </li>
            </ul>
          </section>

          <!-- NPS: três grupos com nome e número, nunca só a cor. -->
          <section class="pn-card">
            <h2 class="pn-card__title">{{ $t('painel.aval.recomendacao') }}</h2>
            <template v-if="metricas.respNps">
              <div class="av-nps-barra" role="img" :aria-label="resumoNps">
                <span
                  v-for="g in gruposNps"
                  v-show="g.n"
                  :key="g.id"
                  class="av-nps-barra__seg"
                  :class="`av-nps-barra__seg--${g.id}`"
                  :style="{ flexGrow: g.n }"
                >
                  <q-tooltip>
                    {{ $t(g.key) }}: {{ g.n }} · {{ pct(g.pct) }}
                  </q-tooltip>
                </span>
              </div>
              <ul class="av-nps-leg">
                <li v-for="g in gruposNps" :key="g.id">
                  <span
                    class="av-nps-leg__cor"
                    :class="`av-nps-barra__seg--${g.id}`"
                  />
                  <span class="av-nps-leg__nome">
                    {{ $t(g.key) }} <em>{{ g.faixa }}</em>
                  </span>
                  <strong>{{ pct(g.pct) }}</strong>
                  <span class="av-nps-leg__n">({{ g.n }})</span>
                </li>
              </ul>
              <p class="av-nota-rodape">
                {{ $t('painel.aval.npsBase', { n: metricas.respNps }) }}
              </p>
            </template>
            <p v-else class="pn-sub q-mt-none">
              {{ $t('painel.aval.semNps') }}
            </p>
          </section>
        </div>

        <!-- Perguntas do barbeiro -->
        <section v-if="porPergunta.length" class="pn-card av-perg-res">
          <h2 class="pn-card__title">{{ $t('painel.aval.suasPerguntas') }}</h2>
          <div class="av-perg-lista">
            <article v-for="p in porPergunta" :key="p.id" class="av-perg-item">
              <header>
                <strong>{{ p.texto }}</strong>
                <span class="av-perg-item__n">
                  {{ $t('painel.aval.respostasN', { n: p.n }) }}
                  <template v-if="p.removida">
                    · {{ $t('painel.aval.removida') }}
                  </template>
                </span>
              </header>

              <div v-if="p.tipo === 'nota'" class="av-perg-item__nota">
                <span class="av-perg-item__big">{{ fmt1(p.media) }}</span>
                <EstrelasNota
                  :model-value="p.media"
                  somente-leitura
                  tamanho="18px"
                />
              </div>

              <div v-else-if="p.tipo === 'sim_nao'" class="av-sn-res">
                <div class="av-sn-res__trilho">
                  <span
                    class="av-sn-res__sim"
                    :style="{ width: p.pctSim + '%' }"
                  />
                </div>
                <div class="av-sn-res__leg">
                  <span>
                    <q-icon name="thumb_up" size="14px" />
                    {{ $t('aval.sim') }}
                    <strong>{{ pct(p.pctSim) }}</strong> ({{ p.sim }})
                  </span>
                  <span>
                    <q-icon name="thumb_down" size="14px" />
                    {{ $t('aval.nao') }}
                    <strong>{{ pct(100 - p.pctSim) }}</strong>
                    ({{ p.n - p.sim }})
                  </span>
                </div>
              </div>

              <ul v-else class="av-textos">
                <li v-for="(r, i) in p.textos.slice(0, 4)" :key="i">
                  “{{ r }}”
                </li>
                <li v-if="p.textos.length > 4" class="av-textos__mais">
                  {{
                    $t('painel.aval.maisNaLista', { n: p.textos.length - 4 })
                  }}
                </li>
              </ul>
            </article>
          </div>
        </section>

        <!-- Lista -->
        <section class="pn-card av-lista">
          <div class="av-lista__head">
            <h2 class="pn-card__title">{{ $t('painel.aval.todas') }}</h2>
            <q-btn-toggle
              v-model="filtroLista"
              no-caps
              dense
              unelevated
              toggle-color="primary"
              color="white"
              text-color="grey-9"
              class="av-periodo"
              :options="opcoesLista"
            />
          </div>

          <p v-if="!listaFiltrada.length" class="pn-sub">
            {{ $t('painel.lista.semResultado') }}
          </p>

          <article
            v-for="a in listaFiltrada.slice(0, mostrar)"
            :key="a.id"
            class="av-item"
          >
            <div class="av-item__top">
              <EstrelasNota
                :model-value="a.nota"
                somente-leitura
                tamanho="18px"
              />
              <span
                v-if="a.nps !== null"
                class="av-item__nps"
                :class="`av-item__nps--${grupoNps(a.nps)}`"
              >
                {{ $t('painel.aval.recomenda', { n: a.nps }) }}
              </span>
              <span class="av-item__data">{{ dataCurta(a.criado_em) }}</span>
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="delete_outline"
                class="av-item__x"
                :aria-label="$t('painel.aval.apagar')"
                @click="apagar(a)"
              />
            </div>
            <div class="av-item__quem">
              <router-link
                v-if="a.diagnostico_id && a.diagnostico"
                :to="{ name: 'diagnostico', params: { id: a.diagnostico_id } }"
              >
                {{ a.diagnostico.nome }}
              </router-link>
              <span v-else>{{ a.nome || $t('painel.aval.anonimo') }}</span>
              <template v-if="auth.ehAdmin && a.barbeiro">
                · {{ a.barbeiro.nome }}
              </template>
            </div>
            <p v-if="a.comentario" class="av-item__com">{{ a.comentario }}</p>
            <dl v-if="a.respostas?.length" class="av-item__resp">
              <template v-for="r in a.respostas" :key="r.id">
                <dt>{{ r.texto }}</dt>
                <dd>
                  <EstrelasNota
                    v-if="r.tipo === 'nota'"
                    :model-value="r.resposta"
                    somente-leitura
                    tamanho="15px"
                  />
                  <template v-else-if="r.tipo === 'sim_nao'">
                    {{ r.resposta ? $t('aval.sim') : $t('aval.nao') }}
                  </template>
                  <template v-else>{{ r.resposta }}</template>
                </dd>
              </template>
            </dl>
          </article>

          <q-btn
            v-if="listaFiltrada.length > mostrar"
            flat
            no-caps
            color="primary"
            class="pn-btn q-mt-sm"
            :label="$t('painel.aval.verMais')"
            @click="mostrar += 20"
          />
        </section>
      </template>
    </template>

    <!-- ================= PERGUNTAS ================= -->
    <template v-else>
      <section class="pn-card">
        <h2 class="pn-card__title">{{ $t('painel.aval.fixasTitulo') }}</h2>
        <p class="pn-sub av-sub">{{ $t('painel.aval.fixasSub') }}</p>
        <ul class="av-fixas">
          <li>
            <q-icon name="star" size="18px" />
            {{ $t('aval.notaPergunta', { nome: nomeExemplo }) }}
            <em>{{ $t('painel.aval.obrigatoria') }}</em>
          </li>
          <li>
            <q-icon name="speed" size="18px" />
            {{ $t('aval.npsPergunta', { nome: nomeExemplo }) }}
          </li>
          <li>
            <q-icon name="notes" size="18px" />
            {{ $t('aval.comentarioBom') }}
          </li>
        </ul>
      </section>

      <section class="pn-card">
        <h2 class="pn-card__title">
          {{ $t('painel.aval.suasPerguntas') }}
          <span class="av-cont"
            >{{ perguntas.length }}/{{ MAX_PERGUNTAS }}</span
          >
        </h2>
        <p class="pn-sub av-sub">{{ $t('painel.aval.suasSub') }}</p>

        <div v-if="perguntas.length" class="av-editor">
          <div v-for="(p, i) in perguntas" :key="p.id" class="av-ed">
            <span class="av-ed__n">{{ i + 1 }}</span>
            <q-input
              v-model="p.texto"
              class="av-ed__txt"
              outlined
              dense
              maxlength="200"
              :placeholder="$t('painel.aval.perguntaHint')"
              :rules="[
                v =>
                  (v || '').trim().length >= 3 ||
                  $t('painel.aval.perguntaCurta')
              ]"
              lazy-rules
            />
            <q-select
              v-model="p.tipo"
              class="av-ed__tipo"
              outlined
              dense
              emit-value
              map-options
              :options="opcoesTipo"
            >
              <template #selected-item="scope">
                <q-icon :name="tipoPorId[scope.opt.value]?.icon" size="16px" />
                <span class="q-ml-xs">{{ scope.opt.label }}</span>
              </template>
            </q-select>
            <span class="av-ed__acoes">
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="arrow_upward"
                :disable="i === 0"
                :aria-label="$t('painel.aval.subir')"
                @click="mover(i, -1)"
              />
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="arrow_downward"
                :disable="i === perguntas.length - 1"
                :aria-label="$t('painel.aval.descer')"
                @click="mover(i, 1)"
              />
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="close"
                :aria-label="$t('painel.comum.remover')"
                @click="perguntas.splice(i, 1)"
              />
            </span>
          </div>
        </div>
        <p v-else class="av-ed-vazio">{{
          $t('painel.aval.nenhumaPergunta')
        }}</p>

        <q-btn
          v-if="perguntas.length < MAX_PERGUNTAS"
          outline
          no-caps
          color="primary"
          class="pn-btn q-mt-md"
          icon="add"
          :label="$t('painel.aval.adicionar')"
          @click="adicionar('', 'nota')"
        />

        <div
          v-if="sugestoesLivres.length && perguntas.length < MAX_PERGUNTAS"
          class="av-sug"
        >
          <span class="av-sug__t">{{ $t('painel.aval.sugestoes') }}</span>
          <q-chip
            v-for="s in sugestoesLivres"
            :key="s.key"
            clickable
            outline
            color="primary"
            icon="add"
            @click="adicionar($t(s.key), s.tipo)"
          >
            {{ $t(s.key) }}
          </q-chip>
        </div>
      </section>

      <div class="av-salvar">
        <q-btn
          unelevated
          no-caps
          class="mv-cta"
          :loading="salvando"
          :disable="!mudou"
          @click="salvarPerguntas"
        >
          <span>{{ $t('painel.form.salvar') }}</span>
          <q-icon name="check" size="20px" />
        </q-btn>
        <span v-if="!mudou" class="av-salvo">{{
          $t('painel.form.tudoSalvo')
        }}</span>
        <q-btn
          v-if="auth.perfil.slug"
          flat
          no-caps
          color="primary"
          class="pn-btn"
          icon="visibility"
          :label="$t('painel.aval.verComoCliente')"
          :href="link"
          target="_blank"
          rel="noopener"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import BrandIcon from '@/components/ui/BrandIcon.vue'
import EstrelasNota from '@/components/EstrelasNota.vue'
import { supabase } from '@/config/supabase.js'
import { useAuthStore } from '@/stores/auth.js'
import { linkDaAvaliacao } from '@/config/site.js'
import {
  MAX_PERGUNTAS,
  tiposPergunta,
  sugestoesPergunta,
  grupoNps,
  novoIdPergunta
} from '@/data/avaliacao.js'
import { mensagemDeErro } from '@/utils/erros.js'

const $q = useQuasar()
const { t, locale } = useI18n()
const auth = useAuthStore()

const aba = ref('resultados')
const periodo = ref('90')
const barbeiro = ref(null)
const barbeiros = ref([])
const linhas = ref([])
const carregando = ref(false)
const filtroLista = ref('todas')
const mostrar = ref(20)
const salvandoAtiva = ref(false)

const link = computed(() => linkDaAvaliacao(auth.perfil.slug))
const linkCompartilhar = computed(
  () =>
    `https://wa.me/?text=${encodeURIComponent(
      t('painel.aval.msgCompartilhar', { link: link.value })
    )}`
)
const nomeExemplo = computed(() => auth.perfil?.nome || 'Método VIC')

const opcoesPeriodo = computed(() => [
  { label: t('painel.aval.p30'), value: '30' },
  { label: t('painel.aval.p90'), value: '90' },
  { label: t('painel.aval.p365'), value: '365' },
  { label: t('painel.aval.pTudo'), value: 'tudo' }
])
const opcoesLista = computed(() => [
  { label: t('painel.aval.fTodas'), value: 'todas' },
  { label: t('painel.aval.fComentario'), value: 'comentario' },
  { label: t('painel.aval.fBaixas'), value: 'baixas' }
])
const opcoesBarbeiro = computed(() =>
  barbeiros.value.map(b => ({ label: b.nome || b.email, value: b.id }))
)
const opcoesTipo = computed(() =>
  tiposPergunta.map(tp => ({ label: t(tp.key), value: tp.id }))
)
const tipoPorId = Object.fromEntries(tiposPergunta.map(tp => [tp.id, tp]))

// ---------------------------------------------------------------- métricas
const metricas = computed(() => {
  const rows = linhas.value
  const total = rows.length || 1
  const comNps = rows.filter(r => r.nps !== null && r.nps !== undefined)
  const prom = comNps.filter(r => r.nps >= 9).length
  const detr = comNps.filter(r => r.nps <= 6).length
  return {
    media: rows.reduce((s, r) => s + r.nota, 0) / total,
    cinco: (rows.filter(r => r.nota === 5).length / total) * 100,
    respNps: comNps.length,
    prom,
    detr,
    neutro: comNps.length - prom - detr,
    nps: comNps.length
      ? Math.round(((prom - detr) / comNps.length) * 100)
      : null
  }
})

const distribuicao = computed(() => {
  const total = linhas.value.length || 1
  return [5, 4, 3, 2, 1].map(nota => {
    const n = linhas.value.filter(r => r.nota === nota).length
    return { nota, n, pct: (n / total) * 100 }
  })
})

const gruposNps = computed(() => {
  const m = metricas.value
  const base = m.respNps || 1
  return [
    { id: 'detrator', key: 'painel.aval.detratores', faixa: '0–6', n: m.detr },
    { id: 'neutro', key: 'painel.aval.neutros', faixa: '7–8', n: m.neutro },
    { id: 'promotor', key: 'painel.aval.promotores', faixa: '9–10', n: m.prom }
  ].map(g => ({ ...g, pct: (g.n / base) * 100 }))
})

const resumoNps = computed(() =>
  gruposNps.value.map(g => `${t(g.key)} ${pct(g.pct)}`).join(', ')
)

/** Faixas usuais de leitura do NPS. */
const faixaNps = computed(() => {
  const n = metricas.value.nps
  if (n >= 75) return { id: 'otimo', key: 'painel.aval.faixaExcelencia' }
  if (n >= 50) return { id: 'bom', key: 'painel.aval.faixaQualidade' }
  if (n >= 0) return { id: 'medio', key: 'painel.aval.faixaAperfeicoar' }
  return { id: 'ruim', key: 'painel.aval.faixaCritica' }
})

/**
 * Respostas agrupadas por pergunta. As perguntas atuais vêm primeiro, na
 * ordem do barbeiro; as que ele já apagou aparecem depois, marcadas.
 */
const porPergunta = computed(() => {
  const mapa = new Map()
  for (const r of linhas.value) {
    for (const resp of r.respostas || []) {
      if (!mapa.has(resp.id)) {
        mapa.set(resp.id, {
          id: resp.id,
          texto: resp.texto,
          tipo: resp.tipo,
          valores: []
        })
      }
      mapa.get(resp.id).valores.push(resp.resposta)
    }
  }
  const atuais = (auth.perfil?.avaliacao_perguntas || []).map(p => p.id)
  const ordem = id => {
    const i = atuais.indexOf(id)
    return i < 0 ? 1000 : i
  }
  return [...mapa.values()]
    .sort((a, b) => ordem(a.id) - ordem(b.id))
    .map(p => {
      const n = p.valores.length
      const atual = (auth.perfil?.avaliacao_perguntas || []).find(
        q => q.id === p.id
      )
      const base = {
        id: p.id,
        texto: atual?.texto || p.texto,
        tipo: p.tipo,
        n,
        removida: !auth.ehAdmin && !atual
      }
      if (p.tipo === 'nota') {
        return { ...base, media: p.valores.reduce((s, v) => s + v, 0) / n }
      }
      if (p.tipo === 'sim_nao') {
        const sim = p.valores.filter(Boolean).length
        return { ...base, sim, pctSim: (sim / n) * 100 }
      }
      return { ...base, textos: p.valores }
    })
})

const listaFiltrada = computed(() => {
  if (filtroLista.value === 'comentario') {
    return linhas.value.filter(
      r => r.comentario || (r.respostas || []).some(x => x.tipo === 'texto')
    )
  }
  if (filtroLista.value === 'baixas') {
    return linhas.value.filter(r => r.nota <= 3)
  }
  return linhas.value
})

function fmt1(n) {
  return Number.isFinite(n)
    ? n.toLocaleString(locale.value, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })
    : '–'
}
function pct(n) {
  return `${Math.round(n || 0)}%`
}
function dataCurta(iso) {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  })
}

async function carregar() {
  carregando.value = true
  try {
    let q = supabase
      .from('avaliacoes')
      .select(
        'id, nome, nota, nps, comentario, respostas, criado_em, diagnostico_id, barbeiro_id, barbeiro:perfis(nome), diagnostico:diagnosticos(nome)'
      )
      .order('criado_em', { ascending: false })
      .limit(2000)
    if (periodo.value !== 'tudo') {
      const desde = new Date()
      desde.setDate(desde.getDate() - Number(periodo.value))
      q = q.gte('criado_em', desde.toISOString())
    }
    if (barbeiro.value) q = q.eq('barbeiro_id', barbeiro.value)
    const { data, error } = await q
    if (error) throw error
    linhas.value = data || []
    mostrar.value = 20
  } catch {
    $q.notify({ type: 'negative', message: t('painel.aval.erroCarregar') })
  } finally {
    carregando.value = false
  }
}

async function copiar() {
  await copyToClipboard(link.value)
  $q.notify({ type: 'positive', message: t('painel.form.linkCopiado') })
}

async function mudarAtiva(v) {
  salvandoAtiva.value = true
  try {
    await auth.atualizarPerfil({ avaliacao_ativa: v })
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: mensagemDeErro(t, e, 'painel.comum.erroSalvar')
    })
  } finally {
    salvandoAtiva.value = false
  }
}

function apagar(a) {
  $q.dialog({
    title: t('painel.aval.apagarTitulo'),
    message: t('painel.aval.apagarTexto'),
    cancel: { flat: true, noCaps: true, label: t('painel.comum.cancelar') },
    ok: {
      color: 'negative',
      unelevated: true,
      noCaps: true,
      label: t('painel.comum.apagar')
    }
  }).onOk(async () => {
    const { error } = await supabase.from('avaliacoes').delete().eq('id', a.id)
    if (error) {
      $q.notify({ type: 'negative', message: t('painel.ficha.erroApagar') })
      return
    }
    linhas.value = linhas.value.filter(x => x.id !== a.id)
  })
}

// ---------------------------------------------------------------- perguntas
function copiaDasPerguntas() {
  return (auth.perfil?.avaliacao_perguntas || []).map(p => ({ ...p }))
}
const perguntas = ref(copiaDasPerguntas())
const salvando = ref(false)

const mudou = computed(
  () => JSON.stringify(perguntas.value) !== JSON.stringify(copiaDasPerguntas())
)

/** Sugestões que ainda não viraram pergunta. */
const sugestoesLivres = computed(() => {
  const textos = perguntas.value.map(p => p.texto.trim().toLowerCase())
  return sugestoesPergunta.filter(
    s => !textos.includes(t(s.key).trim().toLowerCase())
  )
})

function adicionar(texto, tipo) {
  if (perguntas.value.length >= MAX_PERGUNTAS) return
  perguntas.value.push({ id: novoIdPergunta(), texto, tipo })
}

function mover(i, passo) {
  const lista = perguntas.value
  const j = i + passo
  if (j < 0 || j >= lista.length) return
  ;[lista[i], lista[j]] = [lista[j], lista[i]]
}

async function salvarPerguntas() {
  const limpas = perguntas.value.map(p => ({
    id: p.id,
    texto: p.texto.trim().replace(/\s+/g, ' '),
    tipo: p.tipo
  }))
  if (limpas.some(p => p.texto.length < 3)) {
    $q.notify({ type: 'warning', message: t('painel.aval.perguntaCurta') })
    return
  }
  salvando.value = true
  try {
    await auth.atualizarPerfil({ avaliacao_perguntas: limpas })
    perguntas.value = copiaDasPerguntas()
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

watch([periodo, barbeiro], carregar)

onMounted(async () => {
  carregar()
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
.av-pn {
  max-width: 1080px;
}
.av-link {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: #0a0a0a;
}
.av-link__url {
  min-width: 0;
  color: #fff;
  font-family: var(--font-heavy);
  font-weight: 600;
  word-break: break-all;
}
.av-link__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.av-link__out {
  color: #fff !important;
}
.av-dica {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
  margin: 0.4rem 0 0;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--mv-muted);
}
.av-dica .q-icon {
  margin-top: 0.1rem;
  color: var(--mv-hl);
}
.av-sem-link {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.av-tabs {
  margin: 1.25rem 0 1rem;
  border-bottom: 1px solid var(--mv-line);
  font-family: var(--font-heavy);
  font-weight: 700;
}
.av-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
}
.av-periodo {
  border: 1px solid var(--mv-line-strong);
  border-radius: 10px;
  overflow: hidden;
}
.av-sel {
  min-width: 220px;
}
.av-vazio {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--mv-faint);
}
.av-vazio strong {
  color: var(--mv-ink);
  font-family: var(--font-heavy);
}

/* ---- números ---- */
.av-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.av-stat {
  display: grid;
  align-content: start;
  gap: 0.2rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--mv-line);
  border-radius: 14px;
  background: var(--mv-bg);
}
.av-stat__n {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 1;
  color: var(--mv-ink);
  font-variant-numeric: tabular-nums;
}
.av-stat__star {
  font-size: 1.4rem;
  color: #f2a900;
}
.av-stat__l {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-heavy);
  font-weight: 600;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mv-muted);
}
.av-stat__sel {
  justify-self: start;
  margin-top: 0.2rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}
.av-stat__sel--otimo,
.av-stat__sel--bom {
  background: #e6f6ec;
  color: #17703b;
}
.av-stat__sel--medio {
  background: #fff4e0;
  color: #9a5b00;
}
.av-stat__sel--ruim {
  background: #fde8e8;
  color: #b42318;
}

.av-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
.av-grid .pn-card + .pn-card {
  margin-top: 0;
}
.av-grid + .pn-card,
.av-perg-res + .pn-card {
  margin-top: 1rem;
}
.av-perg-res {
  margin-top: 1rem;
}

/* ---- distribuição ---- */
.av-dist {
  list-style: none;
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
}
.av-dist li {
  display: grid;
  grid-template-columns: 2.4rem 1fr 5.5rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0.15rem 0;
}
.av-dist__rot {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--mv-ink);
}
.av-dist__rot .q-icon {
  color: #f2a900;
}
.av-dist__trilho {
  height: 10px;
  border-radius: 4px;
  background: var(--mv-surface-2);
  overflow: hidden;
}
.av-dist__barra {
  display: block;
  height: 100%;
  min-width: 0;
  border-radius: 4px;
  background: var(--mv-hl);
  transition: width 0.4s ease;
}
.av-dist__val {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--mv-ink);
  white-space: nowrap;
}
.av-dist__val em {
  font-style: normal;
  font-weight: 400;
  color: var(--mv-faint);
}

/* ---- NPS ---- */
.av-nps-barra {
  display: flex;
  gap: 2px;
  height: 14px;
}
.av-nps-barra__seg {
  flex-basis: 0;
  border-radius: 4px;
}
.av-nps-barra__seg--detrator {
  background: #d14343;
}
.av-nps-barra__seg--neutro {
  background: #b9bec5;
}
.av-nps-barra__seg--promotor {
  background: #2f9e5b;
}
.av-nps-leg {
  list-style: none;
  display: grid;
  gap: 0.45rem;
  margin: 1rem 0 0;
  padding: 0;
}
.av-nps-leg li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  color: var(--mv-ink);
}
.av-nps-leg__cor {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.av-nps-leg__nome {
  flex: 1;
}
.av-nps-leg__nome em {
  font-style: normal;
  color: var(--mv-faint);
  font-size: 0.82rem;
}
.av-nps-leg strong {
  font-variant-numeric: tabular-nums;
}
.av-nps-leg__n {
  min-width: 2.5rem;
  color: var(--mv-faint);
  font-variant-numeric: tabular-nums;
}
.av-nota-rodape {
  margin: 0.8rem 0 0;
  font-size: 0.8rem;
  color: var(--mv-faint);
}

/* ---- perguntas do barbeiro (resultado) ---- */
.av-perg-lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}
.av-perg-item {
  display: grid;
  align-content: start;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--mv-line);
  border-radius: 12px;
}
.av-perg-item header {
  display: grid;
  gap: 0.15rem;
}
.av-perg-item header strong {
  font-weight: 600;
  line-height: 1.35;
  color: var(--mv-ink);
}
.av-perg-item__n {
  font-size: 0.78rem;
  color: var(--mv-faint);
}
.av-perg-item__nota {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.av-perg-item__big {
  font-family: var(--font-display);
  font-size: 1.6rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.av-sn-res__trilho {
  height: 10px;
  border-radius: 4px;
  background: var(--mv-surface-2);
  overflow: hidden;
}
.av-sn-res__sim {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--mv-hl);
}
.av-sn-res__leg {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.3rem 1rem;
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--mv-muted);
}
.av-sn-res__leg span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.av-sn-res__leg strong {
  color: var(--mv-ink);
}
.av-textos {
  list-style: none;
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--mv-muted);
}
.av-textos__mais {
  font-size: 0.8rem;
  color: var(--mv-faint);
}

/* ---- lista ---- */
.av-lista__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.av-lista__head .pn-card__title {
  margin: 0;
}
.av-item {
  padding: 1rem 0;
  border-bottom: 1px solid var(--mv-line);
}
.av-item:last-of-type {
  border-bottom: 0;
}
.av-item__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.75rem;
}
.av-item__nps {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  background: var(--mv-surface-2);
  color: var(--mv-muted);
}
.av-item__nps--promotor {
  background: #e6f6ec;
  color: #17703b;
}
.av-item__nps--detrator {
  background: #fde8e8;
  color: #b42318;
}
.av-item__data {
  margin-left: auto;
  font-size: 0.82rem;
  color: var(--mv-faint);
}
.av-item__x {
  color: var(--mv-faint);
}
.av-item__quem {
  margin-top: 0.3rem;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--mv-ink);
}
.av-item__quem a {
  color: var(--mv-hl);
}
.av-item__com {
  margin: 0.45rem 0 0;
  line-height: 1.55;
  color: var(--mv-ink);
  white-space: pre-line;
}
.av-item__resp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.3rem 1rem;
  margin: 0.6rem 0 0;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  background: var(--mv-surface);
  font-size: 0.86rem;
}
.av-item__resp dt {
  color: var(--mv-muted);
}
.av-item__resp dd {
  margin: 0;
  font-weight: 600;
  color: var(--mv-ink);
  text-align: right;
}
@media (max-width: 560px) {
  .av-item__resp {
    grid-template-columns: 1fr;
  }
  .av-item__resp dd {
    text-align: left;
    margin-bottom: 0.35rem;
  }
}

/* ---- editor de perguntas ---- */
.av-sub {
  margin: -0.5rem 0 1rem;
}
.av-cont {
  margin-left: 0.4rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--mv-faint);
}
.av-fixas {
  list-style: none;
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}
.av-fixas li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  background: var(--mv-surface);
  font-size: 0.92rem;
  color: var(--mv-ink);
}
.av-fixas .q-icon {
  color: var(--mv-hl);
}
.av-fixas em {
  margin-left: auto;
  font-style: normal;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--mv-faint);
}
.av-editor {
  display: grid;
  gap: 0.25rem;
}
.av-ed {
  display: grid;
  grid-template-columns: 1.6rem minmax(0, 1fr) 190px auto;
  align-items: start;
  gap: 0.6rem;
}
.av-ed__n {
  padding-top: 0.55rem;
  font-family: var(--font-display);
  color: var(--mv-hl);
  text-align: center;
}
.av-ed__acoes {
  display: inline-flex;
  padding-top: 0.25rem;
  color: var(--mv-muted);
}
@media (max-width: 680px) {
  .av-ed {
    grid-template-columns: 1.4rem minmax(0, 1fr) auto;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--mv-line);
  }
  .av-ed__txt {
    grid-column: 2 / -1;
  }
  .av-ed__tipo {
    grid-column: 2;
  }
}
.av-ed-vazio {
  margin: 0;
  padding: 1rem;
  border: 1.5px dashed var(--mv-line-strong);
  border-radius: 12px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--mv-faint);
}
.av-sug {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin-top: 1.25rem;
}
.av-sug__t {
  width: 100%;
  margin-bottom: 0.2rem;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mv-muted);
}
.av-salvar {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  padding: 0.85rem 0;
  background: linear-gradient(to top, var(--mv-bg-alt) 70%, transparent);
}
.av-salvo {
  font-size: 0.86rem;
  color: var(--mv-faint);
}
</style>
