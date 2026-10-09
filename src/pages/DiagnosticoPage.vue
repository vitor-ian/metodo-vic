<template>
  <main class="diag">
    <!-- Cabeçalho próprio: logotipo, os três passos e o idioma. Nenhuma porta
         de saída, para quem está respondendo não se perder no meio. -->
    <header class="dhd">
      <div class="dhd__bar">
        <img
          class="dhd__logo"
          src="/img/logo-curso-metodo-vic.png"
          :alt="$t('logoAlt')"
          width="240"
          height="58"
        />
        <ol v-if="barbeiro" class="dhd__steps">
          <li
            v-for="(chave, i) in [
              'envio.passo1',
              'envio.passo2',
              'envio.passo3'
            ]"
            :key="chave"
            :class="{
              'dhd__step--on': i + 1 === passo,
              'dhd__step--done': i + 1 < passo
            }"
          >
            <span class="dhd__step-n">
              <q-icon v-if="i + 1 < passo" name="check" size="12px" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="dhd__step-t">{{ $t(chave) }}</span>
          </li>
        </ol>
        <LanguageSwitcher class="dhd__lang" />
      </div>
    </header>

    <div class="mv-container mv-container--narrow diag__wrap">
      <!-- ================= CARREGANDO ================= -->
      <section v-if="tela === 'carregando'" class="diag__screen diag__center">
        <q-spinner size="34px" class="diag__spin" />
        <p class="diag__note diag__note--plain">{{ $t('envio.loading') }}</p>
      </section>

      <!-- ================= LINK INVÁLIDO / PAUSADO ================= -->
      <section v-else-if="tela === 'indisponivel'" class="diag__screen">
        <p class="mv-kicker">Método VIC</p>
        <h1 class="mv-display mv-h2 diag__title">{{ $t('envio.offTitle') }}</h1>
        <p class="mv-body diag__lead">{{ $t('envio.offText') }}</p>
      </section>

      <!-- ================= CAPA ================= -->
      <section v-else-if="tela === 'capa'" class="diag__screen">
        <p class="mv-kicker">
          {{
            barbeiro.nome
              ? $t('envio.withBarber', { nome: barbeiro.nome })
              : $t('diag.kicker')
          }}
        </p>
        <h1 class="mv-display mv-h2 diag__title" v-html="$t('diag.title')" />
        <p class="mv-body diag__lead">{{ $t('diag.lead') }}</p>

        <blockquote v-if="barbeiro.mensagem" class="diag__recado">
          <span class="diag__recado-de">
            {{ $t('envio.fromBarber', { nome: barbeiro.nome }) }}
          </span>
          {{ barbeiro.mensagem }}
        </blockquote>

        <ol class="diag__agenda">
          <li v-for="(item, i) in agenda" :key="i">
            <span class="diag__agenda-n">{{ i + 1 }}</span>
            <span>
              <strong>{{ $t(item.title) }}</strong>
              <em>{{ $t(item.text) }}</em>
            </span>
          </li>
        </ol>

        <q-form class="diag__form" greedy @submit="comecar">
          <q-input
            v-model="form.nome"
            :label="$t('form.nameLabel')"
            outlined
            no-error-icon
            autocomplete="name"
            :rules="[obrigatorio]"
            lazy-rules
          />
          <q-input
            v-model="form.whatsapp"
            :label="$t('form.whatsappLabel')"
            outlined
            inputmode="tel"
            autocomplete="tel"
            no-error-icon
            :rules="[obrigatorio, telefone]"
            lazy-rules
          />

          <p class="diag__note">{{ $t('diag.note') }}</p>

          <q-btn type="submit" unelevated no-caps class="mv-cta diag__submit">
            <span>{{ $t('diag.start') }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
          <p class="diag__minutes">
            <q-icon name="schedule" size="14px" />
            {{ $t('envio.minutes') }}
          </p>
        </q-form>
      </section>

      <!-- ================= 1 · ESCUTA ATIVA ================= -->
      <section v-else-if="tela === 'escuta'" class="diag__screen">
        <p class="mv-kicker">{{ $t('diag.s1Kicker') }}</p>
        <h2 class="mv-display mv-h3 diag__title">{{ $t('diag.s1Title') }}</h2>
        <p class="mv-body diag__lead">{{ $t('diag.s1Sub') }}</p>

        <!-- Todas as oito são obrigatórias: a escuta ativa é o que o barbeiro
             lê antes do atendimento, e meia escuta não serve de nada. -->
        <q-form greedy @submit="irParaTeste">
          <div class="diag__qa">
            <div
              v-for="(chave, i) in diagEscuta"
              :key="chave"
              class="diag__open"
            >
              <label :for="`esc-${i}`">
                <span class="diag__open-n">{{ i + 1 }}</span>
                {{ $t(chave) }}
              </label>
              <q-input
                :for="`esc-${i}`"
                v-model="escuta[i]"
                outlined
                type="textarea"
                autogrow
                no-error-icon
                :rules="[respondida]"
                lazy-rules
                :placeholder="$t('diag.answerHint')"
                input-style="max-height: 140px"
              />
            </div>
          </div>

          <div class="diag__nav">
            <q-btn flat no-caps class="diag__back" @click="irPara('capa')">
              <q-icon name="arrow_back" size="18px" />
              <span>{{ $t('diag.back') }}</span>
            </q-btn>
            <q-btn type="submit" unelevated no-caps class="mv-cta">
              <span>{{ $t('diag.toTest') }}</span>
              <q-icon name="arrow_forward" size="20px" />
            </q-btn>
          </div>
        </q-form>
      </section>

      <!-- ================= 2 · COMPORTAMENTO ================= -->
      <section v-else-if="tela === 'teste'" class="diag__screen">
        <p class="diag__count">
          {{
            $t('diag.counter', { n: atual + 1, total: diagQuestions.length })
          }}
        </p>
        <div class="diag__track" role="presentation">
          <span class="diag__fill" :style="{ width: progresso + '%' }" />
        </div>

        <h2 class="mv-display mv-h3 diag__q">{{
          $t(diagQuestions[atual].key)
        }}</h2>

        <div class="diag__opts">
          <button
            v-for="(letra, i) in diagAlternativas"
            :key="letra"
            type="button"
            class="diag__opt"
            :class="{ 'diag__opt--on': respostas[atual] === i }"
            @click="responder(i)"
          >
            <span class="diag__mark">{{ letra.toUpperCase() }}</span>
            <span>{{ $t(diagQuestions[atual].key + letra) }}</span>
          </button>
        </div>

        <div class="diag__nav">
          <q-btn flat no-caps class="diag__back" @click="voltarTeste">
            <q-icon name="arrow_back" size="18px" />
            <span>{{ $t('diag.back') }}</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :disable="respostas[atual] === null"
            @click="avancarTeste"
          >
            <span>{{ ultima ? $t('diag.chooseStyle') : $t('diag.next') }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
        </div>
      </section>

      <!-- ================= 3 · ESTILO ================= -->
      <section v-else-if="tela === 'estilo'" class="diag__screen">
        <p class="mv-kicker">{{ $t('diag.s3Kicker') }}</p>
        <h2 class="mv-display mv-h3 diag__title">{{ $t('diag.s3Title') }}</h2>
        <p class="mv-body diag__lead">{{ $t('diag.s3Sub') }}</p>
        <p class="diag__hint">{{ $t('diag.s3Hint') }}</p>

        <div class="diag__gallery">
          <button
            v-for="item in diagEstilos"
            :key="item.id"
            type="button"
            class="diag__tile"
            :class="{ 'diag__tile--on': estilo === item.id }"
            :aria-pressed="estilo === item.id"
            @click="escolherEstilo(item.id)"
          >
            <img
              :src="item.img"
              :alt="$t(item.nameKey)"
              width="640"
              height="916"
              loading="lazy"
            />
            <span class="diag__check"><q-icon name="check" size="16px" /></span>
            <span class="diag__tile-cap">
              <strong>{{ $t(item.nameKey) }}</strong>
              <em>{{ $t(item.descKey) }}</em>
            </span>
          </button>
        </div>

        <div class="diag__nav">
          <q-btn flat no-caps class="diag__back" @click="voltarAoTeste">
            <q-icon name="arrow_back" size="18px" />
            <span>{{ $t('diag.back') }}</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :loading="enviando"
            :disable="!estilo"
            @click="depoisDoEstilo"
          >
            <span>{{
              atendimentosDoBarbeiro.length
                ? $t('diag.next')
                : $t('diag.seeResult')
            }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
        </div>
      </section>

      <!-- ================= FECHAMENTO ================= -->
      <section v-else-if="tela === 'local'" class="diag__screen">
        <p class="mv-kicker">{{ $t('diag.s3Kicker') }}</p>
        <h2 class="mv-display mv-h3 diag__title">{{
          $t('diag.atendTitle')
        }}</h2>
        <p class="mv-body diag__lead">{{ $t('diag.atendPick') }}</p>

        <div class="diag__choices">
          <button
            v-for="op in atendimentosDoBarbeiro"
            :key="op.id"
            type="button"
            class="diag__choice"
            :class="{ 'diag__choice--on': atendimento === op.id }"
            :aria-pressed="atendimento === op.id"
            @click="atendimento = op.id"
          >
            <span class="diag__op-icon">
              <q-icon :name="op.icon" size="22px" />
            </span>
            <span>
              <strong>{{ $t(op.nameKey) }}</strong>
              <em>{{ $t(op.descKey) }}</em>
            </span>
          </button>
        </div>

        <div class="diag__nav">
          <q-btn flat no-caps class="diag__back" @click="irPara('estilo')">
            <q-icon name="arrow_back" size="18px" />
            <span>{{ $t('diag.back') }}</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :loading="enviando"
            :disable="!atendimento"
            @click="concluir"
          >
            <span>{{ $t('diag.seeResult') }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
        </div>
      </section>

      <!-- ================= RESULTADO ================= -->
      <section v-else-if="tela === 'resultado'" class="diag__screen">
        <p class="mv-kicker">{{ $t('diag.resKicker') }}</p>
        <h1 class="mv-display mv-h2 diag__title">{{ $t('diag.resTitle') }}</h1>
        <p class="diag__who">
          {{ [form.nome, dataFormatada].filter(Boolean).join(' · ') }}
        </p>

        <p v-if="envio.salvo" class="diag__flash diag__flash--ok">
          <q-icon name="check_circle" size="18px" />
          {{ $t('diag.resSaved', { nome: nomeBarbeiro }) }}
        </p>
        <p v-else-if="erroEnvio" class="diag__flash diag__flash--erro">
          <q-icon name="error_outline" size="18px" />
          <span>{{ $t('diag.resSaveError') }}</span>
          <q-btn flat dense no-caps :loading="enviando" @click="salvar">
            {{ $t('diag.resRetry') }}
          </q-btn>
        </p>

        <!-- O próximo passo vem antes do resultado longo: no celular, quem
             rola até o fim da leitura não pode achar que acabou ali. -->
        <div class="diag__next">
          <span class="diag__next-n">2</span>
          <div>
            <strong>{{ $t('envio.nextTitle') }}</strong>
            <p>{{ $t('envio.nextText') }}</p>
          </div>
          <q-btn
            unelevated
            no-caps
            class="mv-cta diag__next-btn"
            :loading="enviando"
            :disable="!envio.salvo"
            @click="irPara('fotos')"
          >
            <span>{{ $t('envio.nextBtn') }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
        </div>

        <DiagResumo
          :placar="placar"
          :escuta="escuta"
          :estilo="estilo"
          :atendimento="atendimento"
        />

        <div class="diag__actions">
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :loading="enviando"
            :disable="!envio.salvo"
            @click="irPara('fotos')"
          >
            <span>{{ $t('envio.nextBtn') }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta mv-cta--ghost"
            :loading="gerandoPdf"
            @click="baixarPdf"
          >
            <span>{{
              gerandoPdf ? $t('diag.pdfLoading') : $t('diag.pdf')
            }}</span>
            <q-icon name="download" size="20px" />
          </q-btn>
        </div>
        <p v-if="erroPdf" class="diag__flash diag__flash--erro">
          <q-icon name="error_outline" size="18px" />
          {{ $t('diag.pdfError') }}
        </p>
      </section>

      <!-- ================= PASSO 2 · FOTOS ================= -->
      <section v-else-if="tela === 'fotos'" class="diag__screen">
        <p class="mv-kicker">{{ $t('envio.p2Kicker') }}</p>
        <h1 class="mv-display mv-h2 diag__title">{{ $t('envio.p2Title') }}</h1>
        <p class="mv-body diag__lead">{{ $t('envio.p2Lead') }}</p>

        <ul class="diag__regras">
          <li v-for="regra in diagRegrasFoto" :key="regra.key">
            <q-icon :name="regra.icon" size="20px" />
            <span>{{ $t(regra.key) }}</span>
          </li>
        </ul>

        <p class="diag__hint">{{ $t('envio.p2Grid') }}</p>

        <div class="diag__fotos">
          <FotoSlot
            v-for="ang in diagAngulos"
            :key="ang.id"
            :label="$t(ang.nameKey)"
            :guia="ang.img"
            :url="fotos.angulos[ang.id].url"
            :estado="fotos.angulos[ang.id].estado"
            @arquivos="arq => fotos.enviarAngulo(ang.id, arq[0])"
          />
        </div>

        <p class="diag__count diag__count--fotos">
          {{
            $t('envio.fotosContador', {
              n: fotos.enviadas.value,
              total: diagAngulos.length
            })
          }}
        </p>
        <div class="diag__track" role="presentation">
          <span
            class="diag__fill"
            :style="{
              width: (fotos.enviadas.value / diagAngulos.length) * 100 + '%'
            }"
          />
        </div>
        <p class="diag__minutes diag__privacy">
          <q-icon name="lock" size="14px" />
          {{ $t('envio.privacy') }}
        </p>

        <div class="diag__nav">
          <q-btn flat no-caps class="diag__back" @click="irPara('resultado')">
            <q-icon name="arrow_back" size="18px" />
            <span>{{ $t('diag.back') }}</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :loading="finalizando"
            :disable="!fotos.completas.value || fotos.ocupado.value"
            @click="fecharFotos"
          >
            <span>{{ $t('envio.toRef') }}</span>
            <q-icon name="arrow_forward" size="20px" />
          </q-btn>
        </div>
        <p
          v-if="!fotos.completas.value || fotos.ocupado.value"
          class="diag__wait"
        >
          {{
            fotos.ocupado.value
              ? $t('envio.fotosAguarde')
              : $t('envio.fotosFaltam', { total: diagAngulos.length })
          }}
        </p>
        <p v-if="erroFinalizar" class="diag__flash diag__flash--erro">
          <q-icon name="error_outline" size="18px" />
          {{ $t('envio.finishError') }}
        </p>
      </section>

      <!-- ================= PASSO 3 · REFERÊNCIA ================= -->
      <section v-else-if="tela === 'referencia'" class="diag__screen">
        <p class="mv-kicker">{{ $t('envio.p3Kicker') }}</p>
        <h1 class="mv-display mv-h2 diag__title">{{ $t('envio.p3Title') }}</h1>
        <p class="mv-body diag__lead">{{ $t('envio.p3Lead') }}</p>
        <p class="diag__minutes">
          <q-icon name="info" size="14px" />
          {{ $t('envio.p3Optional', { n: MAX_REFERENCIAS }) }}
        </p>

        <div class="diag__fotos diag__fotos--refs">
          <FotoSlot
            v-for="(ref, i) in fotos.referencias.value"
            :key="ref.chave"
            :label="`${$t('envio.p3Title')} ${i + 1}`"
            :url="ref.url"
            :estado="ref.estado"
            removivel
            @arquivos="arq => trocarReferencia(ref, arq[0])"
            @remover="fotos.removerReferencia(ref)"
          />
          <FotoSlot
            v-if="fotos.referencias.value.length < MAX_REFERENCIAS"
            :label="$t('envio.refAdd')"
            adicionar
            multiplo
            @arquivos="fotos.enviarReferencias"
          />
        </div>

        <q-input
          v-model="envio.refObs"
          class="diag__obs"
          :label="$t('envio.refObsLabel')"
          :placeholder="$t('envio.refObsHint')"
          outlined
          type="textarea"
          autogrow
          maxlength="1000"
          input-style="max-height: 160px"
        />

        <div class="diag__nav">
          <q-btn flat no-caps class="diag__back" @click="irPara('fotos')">
            <q-icon name="arrow_back" size="18px" />
            <span>{{ $t('diag.back') }}</span>
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :loading="finalizando"
            :disable="fotos.ocupado.value"
            @click="fecharReferencias"
          >
            <span>{{
              fotos.refsProntas.value.length || envio.refObs.trim()
                ? $t('envio.finish')
                : $t('envio.finishNoRef')
            }}</span>
            <q-icon name="check" size="20px" />
          </q-btn>
        </div>
        <p v-if="erroFinalizar" class="diag__flash diag__flash--erro">
          <q-icon name="error_outline" size="18px" />
          {{ $t('envio.finishError') }}
        </p>
      </section>

      <!-- ================= FIM ================= -->
      <section v-else-if="tela === 'fim'" class="diag__screen">
        <span class="diag__done-icon"><q-icon name="check" size="34px" /></span>
        <p class="mv-kicker">{{ $t('envio.doneKicker') }}</p>
        <h1
          class="mv-display mv-h2 diag__title"
          v-html="$t('envio.doneTitle')"
        />
        <p class="mv-body diag__lead">
          {{ $t('envio.doneText', { nome: nomeBarbeiro }) }}
        </p>

        <div class="diag__actions">
          <q-btn
            v-if="linkWhats"
            unelevated
            no-caps
            class="mv-cta"
            :href="linkWhats"
            target="_blank"
            rel="noopener"
          >
            <span>{{ $t('envio.doneWhats') }}</span>
            <BrandIcon name="whatsapp" size="20px" />
          </q-btn>
          <q-btn
            unelevated
            no-caps
            class="mv-cta mv-cta--ghost"
            :loading="gerandoPdf"
            @click="baixarPdf"
          >
            <span>{{
              gerandoPdf ? $t('diag.pdfLoading') : $t('diag.pdf')
            }}</span>
            <q-icon name="download" size="20px" />
          </q-btn>
        </div>
        <p v-if="erroPdf" class="diag__flash diag__flash--erro">
          <q-icon name="error_outline" size="18px" />
          {{ $t('diag.pdfError') }}
        </p>
        <p class="diag__note">{{ $t('diag.actionsNote') }}</p>

        <div class="diag__links">
          <button
            type="button"
            class="diag__restart"
            @click="irPara('resultado')"
          >
            <q-icon name="visibility" size="16px" />
            {{ $t('envio.seeAgain') }}
          </button>
          <button type="button" class="diag__restart" @click="recomecar">
            <q-icon name="restart_alt" size="16px" />
            {{ $t('diag.restart') }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BrandIcon from '@/components/ui/BrandIcon.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import DiagResumo from '@/components/DiagResumo.vue'
import FotoSlot from '@/components/FotoSlot.vue'
import {
  diagEscuta,
  diagQuestions,
  diagAlternativas,
  diagPerfis,
  diagEstilos,
  diagAtendimento,
  diagAngulos,
  diagRegrasFoto,
  MAX_REFERENCIAS
} from '@/data/diagnostico.js'
import { supabase } from '@/config/supabase.js'
import { useDiagnostico } from '@/composables/useDiagnostico.js'
import { useDiagnosticoPdf } from '@/composables/useDiagnosticoPdf.js'
import { useFotos } from '@/composables/useFotos.js'
import { linkWhatsapp } from '@/utils/whatsapp.js'

const { t, locale } = useI18n()
const route = useRoute()
const slug = String(route.params.slug || '').toLowerCase()

const {
  form,
  escuta,
  respostas,
  estilo,
  atendimento,
  placar,
  maiorPlacar,
  predominantes,
  estiloEscolhido,
  atendimentoEscolhido,
  dataFormatada,
  envio,
  prepararEnvio,
  payload,
  resumo,
  carregarRascunho,
  limparRascunho
} = useDiagnostico(t, slug)

const { baixar } = useDiagnosticoPdf(t)
// As fotos só sobem depois que o diagnóstico foi gravado: o id e o token
// dele é que autorizam o envio.
const fotos = useFotos(() => (envio.salvo ? envio : null))

// 'carregando' | 'indisponivel' | 'capa' | 'escuta' | 'teste' | 'estilo' |
// 'local' | 'resultado' | 'fotos' | 'referencia' | 'fim'
const tela = ref('carregando')
const barbeiro = ref(null)
const atual = ref(0)
const enviando = ref(false)
const erroEnvio = ref(false)
const finalizando = ref(false)
const erroFinalizar = ref(false)
const gerandoPdf = ref(false)
const erroPdf = ref(false)
let fotosCarregadas = false

const agenda = [
  { title: 'diag.agenda1', text: 'diag.agenda1Text' },
  { title: 'diag.agenda2', text: 'diag.agenda2Text' },
  { title: 'diag.agenda3', text: 'diag.agenda3Text' },
  { title: 'envio.agenda4', text: 'envio.agenda4Text' },
  { title: 'envio.agenda5', text: 'envio.agenda5Text' }
]

const obrigatorio = v =>
  (!!v && String(v).trim().length > 1) || t('form.required')
const telefone = v =>
  (v && v.replace(/\D/g, '').length >= 10) || t('form.whatsappInvalid')
// A escuta ativa aceita resposta curta ("Advogado"), mas não aceita vazio.
const respondida = v =>
  (!!v && String(v).trim().length > 0) || t('form.required')

// Passos do cabeçalho: 1 diagnóstico, 2 fotos, 3 referência. No fim, os três
// aparecem concluídos.
const PASSOS = {
  escuta: 1,
  teste: 1,
  estilo: 1,
  local: 1,
  resultado: 1,
  fotos: 2,
  referencia: 3,
  fim: 4
}
const passo = computed(() => PASSOS[tela.value] || 0)

const ultima = computed(() => atual.value === diagQuestions.length - 1)
const progresso = computed(() => (atual.value / diagQuestions.length) * 100)

const nomeBarbeiro = computed(() => barbeiro.value?.nome || 'Método VIC')

/** Só os formatos que este barbeiro oferece (configurado no painel). */
const atendimentosDoBarbeiro = computed(() => {
  const oferece = barbeiro.value?.atendimentos || []
  return diagAtendimento.filter(a => oferece.includes(a.id))
})

const linkWhats = computed(() => {
  if (!barbeiro.value?.whatsapp) return ''
  const linhas = [
    t('envio.waIntro'),
    '',
    resumo({ negrito: true }),
    '',
    `${t('envio.waFotos')}: ${fotos.enviadas.value}/${diagAngulos.length}`,
    `${t('envio.waRefs')}: ${fotos.refsProntas.value.length}`
  ]
  return linkWhatsapp(barbeiro.value.whatsapp, linhas.join('\n'))
})

function subirTopo() {
  window.scrollTo({ top: 0 })
}

function irPara(destino) {
  tela.value = destino
  subirTopo()
}

function comecar() {
  irPara('escuta')
}

function irParaTeste() {
  // Volta para a primeira pergunta ainda em branco: quem já respondeu metade
  // e saiu não recomeça do zero.
  const pendente = respostas.value.findIndex(r => r === null)
  atual.value = pendente < 0 ? 0 : pendente
  irPara('teste')
}

function responder(i) {
  respostas.value[atual.value] = i
  // Pequena pausa para a alternativa marcada aparecer antes de virar a página.
  setTimeout(avancarTeste, 260)
}

function avancarTeste() {
  if (respostas.value[atual.value] === null) return
  if (ultima.value) {
    tela.value = 'estilo'
  } else {
    atual.value += 1
  }
  subirTopo()
}

function voltarTeste() {
  if (atual.value > 0) {
    atual.value -= 1
    subirTopo()
  } else {
    irPara('escuta')
  }
}

function escolherEstilo(id) {
  estilo.value = id
  // Mesma pausa das alternativas: dá para ver o card marcado antes de virar.
  setTimeout(depoisDoEstilo, 260)
}

/** Sem formato para escolher (o barbeiro não marcou nenhum), vai direto. */
function depoisDoEstilo() {
  if (!estilo.value || tela.value !== 'estilo') return
  if (atendimentosDoBarbeiro.value.length) {
    // Um formato só: já vem marcado, a pessoa só confirma.
    if (atendimentosDoBarbeiro.value.length === 1) {
      atendimento.value = atendimentosDoBarbeiro.value[0].id
    }
    irPara('local')
  } else {
    concluir()
  }
}

function voltarAoTeste() {
  atual.value = diagQuestions.length - 1
  irPara('teste')
}

/**
 * Grava o diagnóstico na lista do barbeiro. O id e o token nascem aqui e
 * ficam no rascunho: tentar de novo não duplica, e eles autorizam as fotos.
 */
async function salvar() {
  if (enviando.value || envio.salvo) return
  enviando.value = true
  erroEnvio.value = false
  prepararEnvio()
  try {
    const { error } = await supabase.rpc('enviar_diagnostico', {
      p_slug: slug,
      p_dados: payload(locale.value)
    })
    if (error) throw error
    envio.salvo = true
  } catch (e) {
    if (String(e?.message).includes('formulario_indisponivel')) {
      tela.value = 'indisponivel'
    }
    erroEnvio.value = true
  } finally {
    enviando.value = false
  }
}

async function concluir() {
  irPara('resultado')
  // O resultado aparece mesmo se o envio falhar: quem respondeu 20 perguntas
  // não pode ficar sem ver o diagnóstico por causa da rede.
  await salvar()
}

async function finalizar(etapa, obs) {
  finalizando.value = true
  erroFinalizar.value = false
  try {
    const { error } = await supabase.rpc('finalizar_envio', {
      p_id: envio.id,
      p_token: envio.token,
      p_etapa: etapa,
      p_obs: obs ?? null
    })
    if (error) throw error
    return true
  } catch {
    erroFinalizar.value = true
    return false
  } finally {
    finalizando.value = false
  }
}

async function fecharFotos() {
  if (await finalizar('fotos')) irPara('referencia')
}

async function fecharReferencias() {
  if (await finalizar('referencias', envio.refObs.trim())) irPara('fim')
}

/** Trocar uma referência = subir a nova e tirar a antiga. */
async function trocarReferencia(item, arquivo) {
  await fotos.removerReferencia(item).catch(() => {})
  await fotos.enviarReferencias([arquivo])
}

async function baixarPdf() {
  gerandoPdf.value = true
  erroPdf.value = false
  try {
    await baixar({
      nome: form.nome.trim(),
      data: dataFormatada.value,
      placar: placar.value,
      maior: maiorPlacar.value,
      total: diagQuestions.length,
      predominantes: predominantes.value
        .map(k => t(diagPerfis[k].nameKey))
        .join(', '),
      escuta,
      estilo: estiloEscolhido.value,
      atendimento: atendimentoEscolhido.value
        ? t(atendimentoEscolhido.value.nameKey)
        : ''
    })
  } catch {
    erroPdf.value = true
  } finally {
    gerandoPdf.value = false
  }
}

function recomecar() {
  limparRascunho()
  window.location.reload()
}

// Depois do envio, a tela em que a pessoa está vai para o rascunho: fechar a
// aba no meio das fotos e voltar pelo mesmo link cai no mesmo lugar.
const TELAS_POS_ENVIO = ['resultado', 'fotos', 'referencia', 'fim']
watch(tela, async nova => {
  if (envio.id && TELAS_POS_ENVIO.includes(nova)) envio.tela = nova
  if ((nova === 'fotos' || nova === 'referencia') && !fotosCarregadas) {
    fotosCarregadas = true
    await fotos.carregar().catch(() => (fotosCarregadas = false))
  }
})

watch(
  locale,
  () => {
    document.title = t('diag.metaTitle')
  },
  { immediate: true }
)

onMounted(async () => {
  carregarRascunho()
  // O rascunho pode ser de outro dia; a data do diagnóstico é a de hoje —
  // a não ser que ele já tenha sido enviado.
  if (!envio.salvo) form.data = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase.rpc('formulario_publico', {
    p_slug: slug
  })
  if (error || !data) {
    tela.value = 'indisponivel'
    return
  }
  barbeiro.value = data

  if (envio.id && TELAS_POS_ENVIO.includes(envio.tela)) {
    tela.value = envio.tela
    // Gravou o id mas a resposta do servidor se perdeu: confirma de novo.
    if (!envio.salvo) await salvar()
  } else {
    tela.value = 'capa'
  }
})
</script>

<style scoped>
.diag {
  display: block;
  min-height: 100vh;
  background: var(--mv-bg);
  padding-bottom: clamp(3rem, 8vh, 5rem);
}

/* ---- cabeçalho ---- */
.dhd {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
  background: #0a0a0a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: clamp(2rem, 6vh, 3.5rem);
}
.dhd__bar {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 4vw, 2.5rem);
  max-width: 1120px;
  margin-inline: auto;
  padding: 0.85rem clamp(1rem, 4vw, 2rem);
}
.dhd__logo {
  flex-shrink: 0;
  height: 34px;
  width: auto;
}
.dhd__steps {
  flex: 1;
  list-style: none;
  display: flex;
  justify-content: center;
  gap: clamp(0.75rem, 3vw, 2rem);
  margin: 0;
  padding: 0;
}
.dhd__steps li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-heavy);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}
.dhd__step-n {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.24);
  font-size: 0.68rem;
  font-weight: 700;
}
.dhd__steps .dhd__step--done {
  color: rgba(255, 255, 255, 0.78);
}
.dhd__steps .dhd__step--done .dhd__step-n {
  border-color: var(--mv-green-bright);
  color: var(--mv-green-bright);
}
.dhd__steps .dhd__step--on {
  color: #ffffff;
  font-weight: 700;
}
.dhd__steps .dhd__step--on .dhd__step-n {
  background: var(--mv-green);
  border-color: var(--mv-green);
  color: #ffffff;
}
.dhd__lang {
  flex-shrink: 0;
  margin-left: auto;
}

/* No celular a barra fica com logotipo e idioma; os passos descem para uma
   segunda linha, onde cabe o nome de cada um. */
@media (max-width: 720px) {
  .dhd__bar {
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .dhd__steps {
    order: 3;
    width: 100%;
    justify-content: space-between;
    gap: 0.4rem;
  }
  .dhd__logo {
    height: 28px;
  }
  .dhd__steps li {
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    gap: 0.35rem;
  }
  .dhd__step-n {
    width: 19px;
    height: 19px;
    font-size: 0.6rem;
  }
}

.diag__wrap {
  max-width: 720px;
}
.diag__screen {
  animation: diag-in 0.35s ease both;
}
@keyframes diag-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .diag__screen {
    animation: none;
  }
}
.diag__center {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding-top: 4rem;
}
.diag__spin {
  color: var(--mv-hl);
}

.diag__title {
  margin: 0.6rem 0 0;
}
.diag__title :deep(.hl) {
  color: var(--mv-hl);
}
.diag__lead {
  margin-top: 0.9rem;
}

/* ---- capa ---- */
.diag__recado {
  margin: 1.5rem 0 0;
  padding: 1rem 1.15rem;
  border-left: 3px solid var(--mv-hl);
  background: var(--mv-surface);
  border-radius: 0 12px 12px 0;
  color: var(--mv-ink);
  line-height: 1.6;
  white-space: pre-line;
}
.diag__recado-de {
  display: block;
  margin-bottom: 0.3rem;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mv-hl);
}
.diag__agenda {
  list-style: none;
  margin: 2rem 0 0;
  padding: 0;
  border-top: 1px solid var(--mv-line);
}
.diag__agenda li {
  display: flex;
  gap: 1rem;
  align-items: baseline;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--mv-line);
}
.diag__agenda-n {
  font-family: var(--font-display);
  font-size: 1.15rem;
  color: var(--mv-hl);
}
.diag__agenda strong,
.diag__tile-cap strong,
.diag__choice strong {
  display: block;
  font-family: var(--font-heavy);
  font-weight: 700;
  color: var(--mv-ink);
}
.diag__agenda em,
.diag__tile-cap em,
.diag__choice em {
  display: block;
  font-style: normal;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--mv-muted);
  margin-top: 0.15rem;
}

.diag__form {
  display: grid;
  gap: 1rem;
  margin-top: 2rem;
}
.diag__submit {
  justify-self: start;
}
.diag__note {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  font-style: italic;
  color: var(--mv-faint);
  border-left: 2px solid var(--mv-line-strong);
  padding-left: 0.85rem;
}
.diag__note--plain {
  border: 0;
  padding: 0;
  font-style: normal;
}
.diag__minutes {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.82rem;
  color: var(--mv-faint);
}

/* ---- escuta ---- */
.diag__qa {
  display: grid;
  gap: 1.5rem;
  margin-top: 2rem;
}
.diag__open label {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
  font-family: var(--font-heavy);
  font-weight: 600;
  color: var(--mv-ink);
}
.diag__open-n {
  font-family: var(--font-display);
  color: var(--mv-hl);
}

/* ---- questionário ---- */
.diag__count {
  margin: 0 0 0.6rem;
  font-family: var(--font-heavy);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  color: var(--mv-muted);
  font-variant-numeric: tabular-nums;
}
.diag__track {
  height: 3px;
  border-radius: 2px;
  background: var(--mv-line);
  overflow: hidden;
}
.diag__fill {
  display: block;
  height: 100%;
  background: var(--mv-hl);
  transition: width 0.35s ease;
}
.diag__q {
  margin: 1.75rem 0 1.5rem;
}
.diag__opts {
  display: grid;
  gap: 0.75rem;
}
.diag__opt {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  width: 100%;
  text-align: left;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.45;
  color: var(--mv-ink);
  background: var(--mv-bg);
  border: 1.5px solid var(--mv-line);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  cursor: pointer;
  transition:
    border-color 0.18s,
    background 0.18s;
}
.diag__opt:hover {
  border-color: var(--mv-line-strong);
  background: var(--mv-surface);
}
.diag__opt--on {
  border-color: var(--mv-hl);
  background: var(--mv-accent-tint);
}
.diag__mark {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--mv-line-strong);
  font-family: var(--font-heavy);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--mv-muted);
}
.diag__opt--on .diag__mark {
  background: var(--mv-hl);
  border-color: var(--mv-hl);
  color: var(--mv-cta-ink);
}

/* ---- estilo ---- */
.diag__hint {
  margin: 1.25rem 0 0;
  font-size: 0.85rem;
  color: var(--mv-muted);
  background: var(--mv-surface);
  border: 1px solid var(--mv-line);
  border-radius: 10px;
  padding: 0.75rem 1rem;
}
.diag__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
.diag__tile {
  position: relative;
  padding: 0;
  overflow: hidden;
  text-align: left;
  background: var(--mv-bg);
  border: 1.5px solid var(--mv-line);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.18s;
}
.diag__tile:hover {
  border-color: var(--mv-line-strong);
}
.diag__tile img {
  display: block;
  width: 100%;
  height: auto;
}
.diag__tile-cap {
  display: block;
  padding: 0.75rem 0.9rem;
  border-top: 1px solid var(--mv-line);
}
.diag__check {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--mv-bg);
  border: 1.5px solid var(--mv-line-strong);
  color: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.diag__tile--on {
  border-color: var(--mv-hl);
  box-shadow: inset 0 0 0 2px var(--mv-hl);
}
.diag__tile--on .diag__check {
  background: var(--mv-hl);
  border-color: var(--mv-hl);
  color: var(--mv-cta-ink);
}

.diag__choices {
  display: grid;
  gap: 0.6rem;
  margin-top: 0.9rem;
}
.diag__choice {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  width: 100%;
  text-align: left;
  font-family: inherit;
  background: var(--mv-bg);
  border: 1.5px solid var(--mv-line);
  border-radius: 12px;
  padding: 0.9rem 1rem;
  cursor: pointer;
  transition:
    border-color 0.18s,
    background 0.18s;
}
.diag__choice:hover {
  border-color: var(--mv-line-strong);
  background: var(--mv-surface);
}
.diag__choice--on {
  border-color: var(--mv-hl);
  background: var(--mv-accent-tint);
}
.diag__op-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--mv-surface);
  border: 1px solid var(--mv-line);
  color: var(--mv-hl);
  transition:
    background 0.18s,
    color 0.18s;
}
.diag__choice--on .diag__op-icon {
  background: var(--mv-hl);
  border-color: var(--mv-hl);
  color: var(--mv-cta-ink);
}

/* ---- navegação ---- */
.diag__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 2.25rem;
}
.diag__back {
  color: var(--mv-muted);
  font-family: var(--font-heavy);
  font-weight: 600;
}
.diag__wait {
  margin: 0.75rem 0 0;
  text-align: right;
  font-size: 0.82rem;
  color: var(--mv-faint);
}

/* ---- resultado ---- */
.diag__who {
  margin: 0.5rem 0 0;
  color: var(--mv-muted);
}
.diag__flash {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.25rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  line-height: 1.45;
}
.diag__flash--ok {
  background: var(--mv-surface);
  border: 1px solid var(--mv-line);
  color: var(--mv-ink);
}
.diag__flash--ok .q-icon {
  color: var(--mv-hl);
}
.diag__flash--erro {
  background: var(--mv-accent-tint);
  border: 1px solid var(--mv-hl);
  color: var(--mv-ink);
}

.diag__next {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 1rem;
  align-items: start;
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: 14px;
  background: #0a0a0a;
  color: #fff;
}
.diag__next-n {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--mv-green);
  font-family: var(--font-display);
  font-size: 1.2rem;
}
.diag__next strong {
  font-family: var(--font-heavy);
  font-weight: 800;
  font-size: 1.05rem;
}
.diag__next p {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.72);
}
.diag__next-btn {
  grid-column: 1 / -1;
  justify-self: start;
  margin-top: 0.6rem;
}

.diag__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 2rem;
}

/* ---- fotos ---- */
.diag__regras {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.6rem;
  margin: 1.25rem 0 0;
  padding: 0;
}
.diag__regras li {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--mv-line);
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--mv-ink);
}
.diag__regras .q-icon {
  flex-shrink: 0;
  color: var(--mv-hl);
}
.diag__fotos {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem 0.85rem;
  margin-top: 1.25rem;
}
.diag__fotos--refs {
  margin-top: 1.5rem;
}
@media (max-width: 560px) {
  .diag__fotos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.diag__count--fotos {
  margin-top: 1.5rem;
}
.diag__privacy {
  margin-top: 0.85rem;
}
.diag__obs {
  margin-top: 1.5rem;
}

/* ---- fim ---- */
.diag__done-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 1.25rem;
  border-radius: 50%;
  background: var(--mv-green);
  color: #fff;
  box-shadow: 0 16px 40px -12px var(--mv-green-glow);
}
.diag__links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 2rem;
}
.diag__restart {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--mv-muted);
  font-family: inherit;
  font-size: 0.86rem;
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .diag__actions .mv-cta,
  .diag__next-btn {
    width: 100%;
  }
  .diag__nav .mv-cta {
    padding-inline: 1.25rem;
  }
}
</style>
