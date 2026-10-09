<template>
  <div class="pn-page">
    <q-btn
      flat
      no-caps
      dense
      icon="arrow_back"
      :label="$t('painel.menu.diagnosticos')"
      class="dd-voltar"
      @click="voltar"
    />

    <div v-if="carregando" class="row justify-center q-py-xl">
      <q-spinner size="34px" color="primary" />
    </div>

    <div v-else-if="!diag" class="pn-card q-mt-md">
      <strong>{{ $t('painel.ficha.naoEncontrado') }}</strong>
      <p class="pn-sub">{{ $t('painel.ficha.naoEncontradoTexto') }}</p>
    </div>

    <template v-else>
      <header class="pn-head dd-head">
        <div>
          <p class="mv-kicker">
            {{
              $t('painel.ficha.recebidoEm', { data: dataHora(diag.criado_em) })
            }}
            <template v-if="auth.ehAdmin && diag.barbeiro">
              · {{ diag.barbeiro.nome }}
            </template>
          </p>
          <h1 class="pn-title">{{ diag.nome }}</h1>
          <p class="pn-sub dd-perfil">
            <span v-if="diag.predominantes?.length" class="dd-perfil__disc">
              {{
                diag.predominantes
                  .map(k => $t(diagPerfis[k].nameKey))
                  .join(' · ')
              }}
            </span>
            <span v-if="estiloNome">{{ estiloNome }}</span>
          </p>
        </div>
        <div class="dd-acoes">
          <q-btn
            v-if="linkCliente"
            unelevated
            no-caps
            class="pn-btn dd-whats"
            :href="linkCliente"
            target="_blank"
            rel="noopener"
          >
            <BrandIcon name="whatsapp" size="18px" />
            <span class="q-ml-sm">{{ $t('painel.ficha.whatsCliente') }}</span>
          </q-btn>
          <q-btn
            outline
            no-caps
            color="primary"
            class="pn-btn"
            icon="picture_as_pdf"
            :label="$t('painel.ficha.pdf')"
            :loading="gerandoPdf"
            @click="baixarPdf"
          />
        </div>
      </header>

      <div class="dd-grid">
        <!-- ============ Coluna principal ============ -->
        <div class="dd-main">
          <section class="pn-card">
            <div class="dd-sec-head">
              <h2 class="pn-card__title">{{
                $t('painel.ficha.fotosTitulo')
              }}</h2>
              <span
                class="dd-cont"
                :class="{ 'dd-cont--ok': fotos.completas.value }"
              >
                {{ fotos.enviadas.value }}/{{ diagAngulos.length }}
              </span>
            </div>
            <p v-if="!diag.fotos_enviadas_em" class="dd-dica">
              <q-icon name="info" size="16px" />
              {{ $t('painel.ficha.fotosPendentes') }}
            </p>
            <div class="dd-fotos">
              <FotoSlot
                v-for="ang in diagAngulos"
                :key="ang.id"
                :label="$t(ang.nameKey)"
                :guia="ang.img"
                :url="fotos.angulos[ang.id].url"
                :estado="fotos.angulos[ang.id].estado"
                visualizar
                @ver="verFoto(ang.id)"
                @arquivos="arq => subirAngulo(ang.id, arq[0])"
              />
            </div>
          </section>

          <section class="pn-card">
            <div class="dd-sec-head">
              <h2 class="pn-card__title">{{
                $t('painel.ficha.refsTitulo')
              }}</h2>
              <span class="dd-cont">{{ fotos.refsProntas.value.length }}</span>
            </div>
            <blockquote v-if="diag.referencia_obs" class="dd-obs">
              {{ diag.referencia_obs }}
            </blockquote>
            <div v-if="fotos.referencias.value.length" class="dd-fotos">
              <FotoSlot
                v-for="(ref, i) in fotos.referencias.value"
                :key="ref.chave"
                :label="$t('painel.ficha.referenciaN', { n: i + 1 })"
                :url="ref.url"
                :estado="ref.estado"
                visualizar
                removivel
                @ver="verReferencia(ref)"
                @arquivos="arq => trocarReferencia(ref, arq[0])"
                @remover="removerReferencia(ref)"
              />
            </div>
            <p v-else class="pn-sub q-mt-none">
              {{
                diag.envio_concluido_em
                  ? $t('painel.ficha.semRefConcluido')
                  : $t('painel.ficha.semRef')
              }}
            </p>
          </section>

          <section class="pn-card">
            <h2 class="pn-card__title">{{ $t('painel.ficha.diagnostico') }}</h2>
            <DiagResumo
              :placar="diag.placar || {}"
              :escuta="escutaAlinhada"
              :estilo="diag.estilo || ''"
              :atendimento="diag.atendimento || ''"
              :reflexao="false"
            />
          </section>
        </div>

        <!-- ============ Lateral ============ -->
        <aside class="dd-side">
          <section class="pn-card">
            <h2 class="pn-card__title">{{ $t('painel.ficha.atendimento') }}</h2>
            <div class="dd-status">
              <button
                v-for="s in statusList"
                :key="s.id"
                type="button"
                class="dd-status__op"
                :class="{ 'dd-status__op--on': diag.status === s.id }"
                @click="mudarStatus(s.id)"
              >
                <q-icon :name="s.icon" size="18px" />
                {{ $t(s.key) }}
              </button>
            </div>

            <q-input
              v-model="notas"
              class="q-mt-md"
              outlined
              type="textarea"
              autogrow
              :label="$t('painel.ficha.notas')"
              :hint="$t('painel.ficha.notasDica')"
              input-style="min-height: 90px; max-height: 280px"
            />
            <q-btn
              unelevated
              no-caps
              color="primary"
              class="pn-btn q-mt-sm"
              :label="$t('painel.ficha.salvarNotas')"
              :disable="notas === (diag.notas || '')"
              :loading="salvandoNotas"
              @click="salvarNotas"
            />
          </section>

          <section class="pn-card">
            <h2 class="pn-card__title">{{ $t('painel.ficha.dadosEnvio') }}</h2>
            <dl class="dd-dados">
              <dt>{{ $t('painel.ficha.whatsapp') }}</dt>
              <dd>{{ diag.whatsapp }}</dd>
              <dt>{{ $t('painel.ficha.formato') }}</dt>
              <dd>{{ atendimentoNome || '—' }}</dd>
              <dt>{{ $t('painel.ficha.idioma') }}</dt>
              <dd>{{ idiomaNome }}</dd>
              <template v-if="origemTexto">
                <dt>{{ $t('painel.ficha.origem') }}</dt>
                <dd>{{ origemTexto }}</dd>
              </template>
            </dl>
            <ol class="dd-linha">
              <li class="dd-linha--ok">
                <strong>{{ $t('painel.ficha.linhaRespondido') }}</strong>
                <span>{{ dataHora(diag.criado_em) }}</span>
              </li>
              <li :class="{ 'dd-linha--ok': diag.fotos_enviadas_em }">
                <strong>{{ $t('painel.ficha.linhaFotos') }}</strong>
                <span>{{
                  diag.fotos_enviadas_em
                    ? dataHora(diag.fotos_enviadas_em)
                    : $t('painel.ficha.pendente')
                }}</span>
              </li>
              <li :class="{ 'dd-linha--ok': diag.envio_concluido_em }">
                <strong>{{ $t('painel.ficha.linhaConcluido') }}</strong>
                <span>{{
                  diag.envio_concluido_em
                    ? dataHora(diag.envio_concluido_em)
                    : $t('painel.ficha.pendente')
                }}</span>
              </li>
            </ol>
          </section>

          <section v-if="auth.ehAdmin" class="pn-card">
            <h2 class="pn-card__title">{{ $t('painel.ficha.responsavel') }}</h2>
            <q-select
              v-model="responsavel"
              outlined
              dense
              emit-value
              map-options
              :options="opcoesBarbeiro"
            />
            <q-btn
              flat
              no-caps
              color="primary"
              class="pn-btn q-mt-sm"
              :label="$t('painel.ficha.transferir')"
              :disable="responsavel === diag.barbeiro_id"
              @click="transferir"
            />
          </section>

          <q-btn
            flat
            no-caps
            color="negative"
            icon="delete_outline"
            :label="$t('painel.ficha.apagar')"
            class="pn-btn dd-apagar"
            @click="apagar"
          />
        </aside>
      </div>
    </template>

    <!-- Visualizador de fotos -->
    <q-dialog
      v-model="visor.aberto"
      maximized
      transition-show="fade"
      transition-hide="fade"
    >
      <div class="dd-visor" @click.self="visor.aberto = false">
        <div class="dd-visor__bar">
          <strong>{{ visor.atual?.label }}</strong>
          <span class="dd-visor__acoes">
            <q-btn
              flat
              round
              icon="download"
              color="white"
              :aria-label="$t('painel.ficha.baixarFoto')"
              @click="baixarFoto(visor.atual)"
            />
            <q-btn
              flat
              round
              icon="close"
              color="white"
              :aria-label="$t('painel.comum.fechar')"
              @click="visor.aberto = false"
            />
          </span>
        </div>
        <q-btn
          v-if="visor.lista.length > 1"
          class="dd-visor__nav dd-visor__nav--prev"
          flat
          round
          icon="chevron_left"
          color="white"
          size="lg"
          :aria-label="$t('painel.ficha.anterior')"
          @click="passarFoto(-1)"
        />
        <img
          v-if="visor.atual"
          class="dd-visor__img"
          :src="visor.atual.url"
          :alt="visor.atual.label"
        />
        <q-btn
          v-if="visor.lista.length > 1"
          class="dd-visor__nav dd-visor__nav--next"
          flat
          round
          icon="chevron_right"
          color="white"
          size="lg"
          :aria-label="$t('painel.ficha.proxima')"
          @click="passarFoto(1)"
        />
      </div>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import BrandIcon from '@/components/ui/BrandIcon.vue'
import DiagResumo from '@/components/DiagResumo.vue'
import FotoSlot from '@/components/FotoSlot.vue'
import { supabase } from '@/config/supabase.js'
import { useAuthStore } from '@/stores/auth.js'
import { useFotos } from '@/composables/useFotos.js'
import { useDiagnosticoPdf } from '@/composables/useDiagnosticoPdf.js'
import {
  pastaDo,
  listarPasta,
  apagarDoBucket,
  linkDeDownload
} from '@/composables/useArquivos.js'
import { statusList, statusPorId } from '@/data/status.js'
import {
  diagAngulos,
  diagEscuta,
  diagEstilos,
  diagAtendimento,
  diagPerfis,
  diagQuestions,
  locales
} from '@/data/diagnostico.js'
import { linkWhatsapp } from '@/utils/whatsapp.js'

const $q = useQuasar()
const { t, locale } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { baixar } = useDiagnosticoPdf(t)

const diag = ref(null)
const carregando = ref(true)
const notas = ref('')
const salvandoNotas = ref(false)
const gerandoPdf = ref(false)
const responsavel = ref(null)
const barbeiros = ref([])

const fotos = useFotos(() => diag.value, { painel: true })

const visor = reactive({ aberto: false, lista: [], indice: 0, atual: null })

// A escuta é gravada com a chave de cada pergunta; aqui volta para a ordem
// de diagEscuta, que é o que o resumo e o PDF esperam.
const escutaAlinhada = computed(() => {
  const salvas = diag.value?.escuta || []
  return diagEscuta.map(
    chave => salvas.find(e => e.chave === chave)?.resposta || ''
  )
})

const estiloObj = computed(() =>
  diagEstilos.find(e => e.id === diag.value?.estilo)
)
const estiloNome = computed(() =>
  estiloObj.value ? t(estiloObj.value.nameKey) : ''
)
const atendimentoNome = computed(() => {
  const a = diagAtendimento.find(x => x.id === diag.value?.atendimento)
  return a ? t(a.nameKey) : ''
})
const idiomaNome = computed(
  () =>
    locales.find(l => l.code === diag.value?.idioma)?.name || diag.value?.idioma
)
const origemTexto = computed(() => {
  const o = diag.value?.origem || {}
  return [o.utm_source, o.utm_medium, o.utm_campaign]
    .filter(Boolean)
    .join(' / ')
})

/**
 * Mensagem para o cliente no idioma em que ele respondeu o formulário — não
 * no idioma em que o painel está aberto.
 */
const linkCliente = computed(() => {
  if (!diag.value) return ''
  const params = {
    nome: diag.value.nome.split(' ')[0],
    barbeiro: auth.perfil?.nome || ''
  }
  const chave = params.barbeiro
    ? 'painel.ficha.waClienteDe'
    : 'painel.ficha.waCliente'
  return linkWhatsapp(
    diag.value.whatsapp,
    t(chave, params, { locale: diag.value.idioma || 'pt-BR' })
  )
})

const opcoesBarbeiro = computed(() =>
  barbeiros.value.map(b => ({ label: b.nome || b.email, value: b.id }))
)

function dataHora(iso) {
  return new Date(iso).toLocaleString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function voltar() {
  if (window.history.state?.back?.startsWith('/painel')) router.back()
  else router.push('/painel')
}

async function carregar() {
  carregando.value = true
  try {
    const { data, error } = await supabase
      .from('diagnosticos')
      .select('*, barbeiro:perfis(nome)')
      .eq('id', route.params.id)
      .maybeSingle()
    if (error) throw error
    diag.value = data
    if (data) {
      notas.value = data.notas || ''
      responsavel.value = data.barbeiro_id
      fotos.carregar(data.arquivos || {}).catch(() => {
        $q.notify({
          type: 'warning',
          message: t('painel.ficha.erroFotos')
        })
      })
    }
  } catch {
    diag.value = null
  } finally {
    carregando.value = false
  }
}

async function atualizar(campos, mensagem) {
  const { data, error } = await supabase
    .from('diagnosticos')
    .update(campos)
    .eq('id', diag.value.id)
    .select('*, barbeiro:perfis(nome)')
    .single()
  if (error) {
    $q.notify({ type: 'negative', message: t('painel.comum.erroSalvar') })
    return false
  }
  diag.value = data
  if (mensagem) $q.notify({ type: 'positive', message: mensagem })
  return true
}

function mudarStatus(id) {
  if (diag.value.status === id) return
  atualizar(
    { status: id },
    t('painel.ficha.statusMudou', { status: t(statusPorId[id].key) })
  )
}

async function salvarNotas() {
  salvandoNotas.value = true
  await atualizar({ notas: notas.value }, t('painel.ficha.notasSalvas'))
  salvandoNotas.value = false
}

async function transferir() {
  // A pasta das fotos é por id/token, então elas acompanham a transferência.
  const nome = opcoesBarbeiro.value.find(
    o => o.value === responsavel.value
  )?.label
  await atualizar(
    { barbeiro_id: responsavel.value },
    t('painel.ficha.transferido', { nome })
  )
}

async function subirAngulo(chave, arquivo) {
  await fotos.enviarAngulo(chave, arquivo)
  if (fotos.angulos[chave].estado === 'erro') {
    $q.notify({ type: 'negative', message: t('painel.ficha.erroEnviarFoto') })
  }
}

async function trocarReferencia(item, arquivo) {
  await fotos.removerReferencia(item).catch(() => {})
  await fotos.enviarReferencias([arquivo])
}

function removerReferencia(item) {
  $q.dialog({
    title: t('painel.ficha.removerRefTitulo'),
    message: t('painel.ficha.removerRefTexto'),
    cancel: { flat: true, noCaps: true, label: t('painel.comum.cancelar') },
    ok: {
      color: 'negative',
      unelevated: true,
      noCaps: true,
      label: t('painel.comum.remover')
    }
  }).onOk(async () => {
    await fotos.removerReferencia(item)
  })
}

function abrirVisor(lista, indice) {
  Object.assign(visor, { aberto: true, lista, indice, atual: lista[indice] })
}

/** O visor percorre as fotos que existem, na ordem dos ângulos. */
function verFoto(chave) {
  const lista = diagAngulos
    .filter(a => fotos.angulos[a.id].url && fotos.angulos[a.id].estado === 'ok')
    .map(a => ({
      label: t(a.nameKey),
      chave: a.id,
      url: fotos.angulos[a.id].url,
      caminho: fotos.angulos[a.id].caminho
    }))
  abrirVisor(
    lista,
    Math.max(
      0,
      lista.findIndex(f => f.chave === chave)
    )
  )
}

function verReferencia(item) {
  const lista = fotos.refsProntas.value.map((r, i) => ({
    label: t('painel.ficha.referenciaN', { n: i + 1 }),
    chave: r.chave,
    url: r.url,
    caminho: r.caminho
  }))
  abrirVisor(
    lista,
    Math.max(
      0,
      lista.findIndex(f => f.chave === item.chave)
    )
  )
}

function passarFoto(direcao) {
  const n = visor.lista.length
  visor.indice = (visor.indice + direcao + n) % n
  visor.atual = visor.lista[visor.indice]
}

function teclas(e) {
  if (!visor.aberto) return
  if (e.key === 'ArrowRight') passarFoto(1)
  if (e.key === 'ArrowLeft') passarFoto(-1)
}

function slug(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function baixarFoto(foto) {
  if (!foto?.caminho) return
  try {
    const ext = foto.caminho.split('.').pop()
    const url = await linkDeDownload(
      foto.caminho,
      `${slug(diag.value.nome)}-${slug(foto.label)}.${ext}`
    )
    window.location.assign(url)
  } catch {
    $q.notify({ type: 'negative', message: t('painel.ficha.erroBaixarFoto') })
  }
}

async function baixarPdf() {
  gerandoPdf.value = true
  try {
    const placar = diag.value.placar || {}
    const maior = Math.max(
      ...['D', 'I', 'S', 'C'].map(k => Number(placar[k]) || 0)
    )
    await baixar({
      nome: diag.value.nome,
      data: new Date(`${diag.value.data_diagnostico}T00:00`).toLocaleDateString(
        locale.value
      ),
      placar: { D: 0, I: 0, S: 0, C: 0, ...placar },
      maior,
      total: diagQuestions.length,
      predominantes: (diag.value.predominantes || [])
        .map(k => t(diagPerfis[k].nameKey))
        .join(', '),
      escuta: escutaAlinhada.value,
      estilo: estiloObj.value,
      atendimento: atendimentoNome.value
    })
  } catch {
    $q.notify({ type: 'negative', message: t('painel.ficha.erroPdf') })
  } finally {
    gerandoPdf.value = false
  }
}

function apagar() {
  $q.dialog({
    title: t('painel.ficha.apagarTitulo'),
    message: t('painel.ficha.apagarTexto', { nome: diag.value.nome }),
    cancel: { flat: true, noCaps: true, label: t('painel.comum.cancelar') },
    ok: {
      color: 'negative',
      unelevated: true,
      noCaps: true,
      label: t('painel.comum.apagar')
    }
  }).onOk(async () => {
    try {
      const pasta = pastaDo(diag.value.id, diag.value.token)
      // A pasta inteira: inclui as fotos que o cliente trocou no caminho.
      await apagarDoBucket(await listarPasta(pasta))
      const { error } = await supabase
        .from('diagnosticos')
        .delete()
        .eq('id', diag.value.id)
      if (error) throw error
      $q.notify({ type: 'positive', message: t('painel.ficha.apagado') })
      router.replace('/painel')
    } catch {
      $q.notify({ type: 'negative', message: t('painel.ficha.erroApagar') })
    }
  })
}

onMounted(async () => {
  window.addEventListener('keydown', teclas)
  await carregar()
  if (auth.ehAdmin) {
    const { data } = await supabase
      .from('perfis')
      .select('id, nome, email')
      .order('nome')
    barbeiros.value = data || []
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', teclas))
</script>

<style scoped>
.dd-voltar {
  color: var(--mv-muted);
  margin-bottom: 0.75rem;
}
.dd-head {
  align-items: flex-start;
}
.dd-perfil {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}
.dd-perfil__disc {
  font-family: var(--font-heavy);
  font-weight: 700;
  color: var(--mv-hl);
}
.dd-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.dd-whats {
  background: #1f9d55;
  color: #fff;
}
.dd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 1rem;
  align-items: start;
}
.dd-main {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
.dd-main .pn-card + .pn-card,
.dd-side .pn-card + .pn-card {
  margin-top: 0;
}
.dd-side {
  display: grid;
  gap: 1rem;
  position: sticky;
  top: 1rem;
}
@media (max-width: 1023px) {
  .dd-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .dd-side {
    position: static;
    order: -1;
  }
}
.dd-sec-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}
.dd-cont {
  font-family: var(--font-heavy);
  font-weight: 700;
  color: var(--mv-faint);
  font-variant-numeric: tabular-nums;
}
.dd-cont--ok {
  color: #17703b;
}
.dd-dica {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin: -0.25rem 0 1rem;
  padding: 0.65rem 0.8rem;
  border-radius: 10px;
  background: var(--mv-surface);
  font-size: 0.85rem;
  color: var(--mv-muted);
}
.dd-fotos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem 0.85rem;
}
.dd-obs {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--mv-hl);
  background: var(--mv-surface);
  border-radius: 0 10px 10px 0;
  white-space: pre-line;
}
.dd-status {
  display: grid;
  gap: 0.4rem;
}
.dd-status__op {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--mv-line);
  border-radius: 10px;
  background: var(--mv-bg);
  font-family: var(--font-heavy);
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--mv-muted);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s,
    background 0.18s;
}
.dd-status__op:hover {
  border-color: var(--mv-line-strong);
}
.dd-status__op--on {
  border-color: var(--mv-hl);
  background: var(--mv-accent-tint);
  color: var(--mv-ink);
}
.dd-status__op--on .q-icon {
  color: var(--mv-hl);
}
.dd-dados {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.45rem 1rem;
  margin: 0;
  font-size: 0.9rem;
}
.dd-dados dt {
  color: var(--mv-faint);
}
.dd-dados dd {
  margin: 0;
  color: var(--mv-ink);
  word-break: break-word;
}
.dd-linha {
  list-style: none;
  margin: 1.25rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}
.dd-linha li {
  position: relative;
  display: grid;
  padding-left: 1.4rem;
  font-size: 0.85rem;
  color: var(--mv-faint);
}
.dd-linha li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.3rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--mv-line-strong);
}
.dd-linha li strong {
  color: var(--mv-muted);
  font-weight: 600;
}
.dd-linha .dd-linha--ok::before {
  background: var(--mv-hl);
  border-color: var(--mv-hl);
}
.dd-linha .dd-linha--ok strong {
  color: var(--mv-ink);
}
.dd-apagar {
  justify-self: start;
}

.dd-visor {
  position: relative;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  background: rgba(5, 5, 6, 0.96);
}
.dd-visor__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem 0.5rem 1.25rem;
  color: #fff;
  font-family: var(--font-heavy);
  z-index: 1;
}
.dd-visor__img {
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 7rem);
  object-fit: contain;
  border-radius: 8px;
}
.dd-visor__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.08);
}
.dd-visor__nav--prev {
  left: 0.75rem;
}
.dd-visor__nav--next {
  right: 0.75rem;
}
</style>
