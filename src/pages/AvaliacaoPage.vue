<template>
  <main class="av">
    <header class="av-hd">
      <div class="av-hd__bar">
        <img
          class="av-hd__logo"
          src="/img/logo-curso-metodo-vic.png"
          :alt="$t('logoAlt')"
          width="240"
          height="58"
        />
        <LanguageSwitcher class="av-hd__lang" />
      </div>
    </header>

    <div class="mv-container mv-container--narrow av__wrap">
      <!-- ================= CARREGANDO ================= -->
      <section v-if="tela === 'carregando'" class="av__screen av__center">
        <q-spinner size="34px" class="av__spin" />
      </section>

      <!-- ================= LINK INVÁLIDO / PAUSADO ================= -->
      <section v-else-if="tela === 'indisponivel'" class="av__screen">
        <p class="mv-kicker">Método VIC</p>
        <h1 class="mv-display mv-h2 av__title">{{ $t('aval.offTitle') }}</h1>
        <p class="mv-body av__lead">{{ $t('aval.offText') }}</p>
      </section>

      <!-- ================= JÁ AVALIADO ================= -->
      <section v-else-if="tela === 'ja'" class="av__screen">
        <span class="av__done-icon"><q-icon name="check" size="34px" /></span>
        <h1 class="mv-display mv-h2 av__title">{{ $t('aval.jaTitle') }}</h1>
        <p class="mv-body av__lead">
          {{ $t('aval.jaText', { nome: nomeBarbeiro }) }}
        </p>
        <button
          v-if="!diagnostico"
          type="button"
          class="av__link"
          @click="novaAvaliacao"
        >
          {{ $t('aval.outra') }}
        </button>
      </section>

      <!-- ================= FORMULÁRIO ================= -->
      <section v-else-if="tela === 'form'" class="av__screen">
        <p class="mv-kicker">
          {{ $t('aval.kicker', { nome: nomeBarbeiro }) }}
        </p>
        <h1 class="mv-display mv-h2 av__title">
          {{
            info.cliente
              ? $t('aval.tituloNome', { nome: info.cliente })
              : $t('aval.titulo')
          }}
        </h1>
        <p class="mv-body av__lead">{{ $t('aval.lead') }}</p>

        <!-- Nota geral: a única obrigatória. -->
        <div class="av__bloco av__bloco--nota">
          <h2 id="av-nota" class="av__q">
            {{ $t('aval.notaPergunta', { nome: nomeBarbeiro }) }}
          </h2>
          <EstrelasNota
            v-model="nota"
            tamanho="clamp(40px, 12vw, 52px)"
            :rotulo="$t('aval.notaPergunta', { nome: nomeBarbeiro })"
            :rotulos="rotulosNota.map(k => $t(k))"
          />
          <p class="av__nota-txt" :class="{ 'av__nota-txt--on': nota }">
            {{ nota ? $t(rotulosNota[nota - 1]) : $t('aval.toque') }}
          </p>
        </div>

        <!-- O resto aparece depois da nota: a pessoa vê uma pergunta só e
             começa; quem só quer dar a nota já pode enviar. -->
        <div v-if="nota" class="av__resto">
          <div class="av__bloco">
            <h2 class="av__q">
              {{ $t('aval.npsPergunta', { nome: nomeBarbeiro }) }}
            </h2>
            <div
              class="av-nps"
              role="radiogroup"
              :aria-label="$t('aval.npsPergunta', { nome: nomeBarbeiro })"
            >
              <button
                v-for="n in 11"
                :key="n"
                type="button"
                role="radio"
                class="av-nps__b"
                :class="{ 'av-nps__b--on': nps === n - 1 }"
                :aria-checked="nps === n - 1"
                @click="nps = nps === n - 1 ? null : n - 1"
              >
                {{ n - 1 }}
              </button>
            </div>
            <div class="av-nps__legenda">
              <span>{{ $t('aval.npsMin') }}</span>
              <span>{{ $t('aval.npsMax') }}</span>
            </div>
          </div>

          <div v-for="p in info.perguntas" :key="p.id" class="av__bloco">
            <h2 class="av__q">{{ p.texto }}</h2>
            <EstrelasNota
              v-if="p.tipo === 'nota'"
              v-model="respostas[p.id]"
              tamanho="34px"
              :rotulo="p.texto"
              :rotulos="rotulosNota.map(k => $t(k))"
            />
            <div
              v-else-if="p.tipo === 'sim_nao'"
              class="av-sn"
              role="radiogroup"
              :aria-label="p.texto"
            >
              <button
                v-for="op in [true, false]"
                :key="String(op)"
                type="button"
                role="radio"
                class="av-sn__b"
                :class="{ 'av-sn__b--on': respostas[p.id] === op }"
                :aria-checked="respostas[p.id] === op"
                @click="respostas[p.id] = respostas[p.id] === op ? null : op"
              >
                <q-icon :name="op ? 'thumb_up' : 'thumb_down'" size="18px" />
                {{ op ? $t('aval.sim') : $t('aval.nao') }}
              </button>
            </div>
            <q-input
              v-else
              v-model="respostas[p.id]"
              outlined
              type="textarea"
              autogrow
              maxlength="1000"
              :placeholder="$t('aval.respostaHint')"
              input-style="max-height: 140px"
            />
          </div>

          <div class="av__bloco">
            <h2 class="av__q">
              {{
                nota >= 4 ? $t('aval.comentarioBom') : $t('aval.comentarioRuim')
              }}
            </h2>
            <q-input
              v-model="comentario"
              outlined
              type="textarea"
              autogrow
              maxlength="2000"
              :placeholder="$t('aval.comentarioHint')"
              input-style="min-height: 72px; max-height: 180px"
            />
          </div>

          <div v-if="!info.cliente" class="av__bloco">
            <q-input
              v-model="nome"
              outlined
              autocomplete="name"
              maxlength="120"
              :label="$t('aval.nomeLabel')"
              :hint="$t('aval.nomeDica')"
            />
          </div>
        </div>

        <div class="av__enviar">
          <q-btn
            unelevated
            no-caps
            class="mv-cta"
            :loading="enviando"
            :disable="!nota"
            @click="enviar"
          >
            <span>{{ $t('aval.enviar') }}</span>
            <q-icon name="send" size="20px" />
          </q-btn>
        </div>
        <p v-if="erro" class="av__erro">
          <q-icon name="error_outline" size="18px" />
          {{ erro }}
        </p>
      </section>

      <!-- ================= OBRIGADO ================= -->
      <section v-else-if="tela === 'obrigado'" class="av__screen">
        <span class="av__done-icon"
          ><q-icon name="favorite" size="30px"
        /></span>
        <p class="mv-kicker">{{ $t('aval.obrigadoKicker') }}</p>
        <h1 class="mv-display mv-h2 av__title">
          {{ $t('aval.obrigadoTitle') }}
        </h1>
        <p class="mv-body av__lead">
          {{ $t('aval.obrigadoText', { nome: nomeBarbeiro }) }}
        </p>
        <!-- Cliente satisfeito: o melhor momento para um post marcando o
             barbeiro. -->
        <q-btn
          v-if="nota >= 4 && instagramUrl"
          unelevated
          no-caps
          class="mv-cta av__insta"
          :href="instagramUrl"
          target="_blank"
          rel="noopener"
        >
          <span>{{
            $t('aval.instagram', { insta: '@' + info.instagram })
          }}</span>
          <q-icon name="arrow_outward" size="20px" />
        </q-btn>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import EstrelasNota from '@/components/EstrelasNota.vue'
import { supabase } from '@/config/supabase.js'
import { rotulosNota } from '@/data/avaliacao.js'

const { t, locale } = useI18n()
const route = useRoute()
const slug = String(route.params.slug || '').toLowerCase()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const diagnostico = UUID.test(String(route.query.d || ''))
  ? String(route.query.d).toLowerCase()
  : ''
// Marca no aparelho de que esta avaliação já foi feita.
const FEITA = `mv-aval-${slug}${diagnostico ? '-' + diagnostico : ''}`

// 'carregando' | 'indisponivel' | 'ja' | 'form' | 'obrigado'
const tela = ref('carregando')
const info = ref({ nome: '', instagram: '', perguntas: [], cliente: '' })
const nota = ref(0)
const nps = ref(null)
const comentario = ref('')
const nome = ref('')
const respostas = reactive({})
const enviando = ref(false)
const erro = ref('')
// Gerado uma vez por avaliação: tentar de novo não duplica.
let idEnvio = novoId()

const nomeBarbeiro = computed(() => info.value.nome || 'Método VIC')
const instagramUrl = computed(() =>
  info.value.instagram
    ? `https://instagram.com/${encodeURIComponent(info.value.instagram)}`
    : ''
)

function novoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function lerMarca() {
  try {
    return !!window.localStorage.getItem(FEITA)
  } catch {
    return false
  }
}
function gravarMarca() {
  try {
    window.localStorage.setItem(FEITA, new Date().toISOString())
  } catch {
    // Navegação privada: sem marca, sem problema.
  }
}

function novaAvaliacao() {
  try {
    window.localStorage.removeItem(FEITA)
  } catch {
    // idem
  }
  idEnvio = novoId()
  nota.value = 0
  nps.value = null
  comentario.value = ''
  nome.value = ''
  Object.keys(respostas).forEach(k => delete respostas[k])
  tela.value = 'form'
}

async function enviar() {
  if (!nota.value || enviando.value) return
  enviando.value = true
  erro.value = ''
  const resp = {}
  for (const p of info.value.perguntas) {
    const v = respostas[p.id]
    if (v === undefined || v === null || v === '') continue
    resp[p.id] = typeof v === 'string' ? v.trim() : v
  }
  try {
    const { error } = await supabase.rpc('enviar_avaliacao', {
      p_slug: slug,
      p_dados: {
        id: idEnvio,
        diagnostico: diagnostico || null,
        nota: nota.value,
        nps: nps.value,
        comentario: comentario.value.trim(),
        nome: nome.value.trim(),
        respostas: resp,
        idioma: locale.value
      }
    })
    if (error) throw error
    gravarMarca()
    tela.value = 'obrigado'
    window.scrollTo({ top: 0 })
  } catch (e) {
    const msg = String(e?.message || '')
    if (msg.includes('ja_avaliado')) {
      gravarMarca()
      tela.value = 'ja'
    } else if (msg.includes('avaliacao_indisponivel')) {
      tela.value = 'indisponivel'
    } else if (msg.includes('muitos_envios')) {
      erro.value = t('aval.erroMuitos')
    } else {
      erro.value = t('aval.erroEnviar')
    }
  } finally {
    enviando.value = false
  }
}

watch(
  locale,
  () => {
    document.title = t('aval.metaTitle')
  },
  { immediate: true }
)

onMounted(async () => {
  const { data, error } = await supabase.rpc('avaliacao_publica', {
    p_slug: slug,
    p_diagnostico: diagnostico || null
  })
  if (error || !data) {
    tela.value = 'indisponivel'
    return
  }
  info.value = {
    ...data,
    perguntas: Array.isArray(data.perguntas) ? data.perguntas : []
  }
  tela.value = data.avaliado || lerMarca() ? 'ja' : 'form'
})
</script>

<style scoped>
.av {
  display: block;
  min-height: 100vh;
  background: var(--mv-bg);
  padding-bottom: clamp(3rem, 8vh, 5rem);
}
.av-hd {
  background: #0a0a0a;
  margin-bottom: clamp(2rem, 6vh, 3.5rem);
}
.av-hd__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 1120px;
  margin-inline: auto;
  padding: 0.85rem clamp(1rem, 4vw, 2rem);
}
.av-hd__logo {
  height: 30px;
  width: auto;
}
.av__wrap {
  max-width: 640px;
}
.av__screen {
  animation: av-in 0.35s ease both;
}
@keyframes av-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .av__screen,
  .av__resto {
    animation: none;
  }
}
.av__center {
  display: grid;
  justify-items: center;
  padding-top: 4rem;
}
.av__spin {
  color: var(--mv-hl);
}
.av__title {
  margin: 0.6rem 0 0;
}
.av__lead {
  margin-top: 0.9rem;
}
.av__bloco {
  margin-top: 2rem;
  padding-top: 1.75rem;
  border-top: 1px solid var(--mv-line);
}
.av__bloco--nota {
  display: grid;
  justify-items: center;
  text-align: center;
  padding: 1.75rem 1rem 1.25rem;
  border: 1px solid var(--mv-line);
  border-radius: 16px;
  background: var(--mv-surface);
}
.av__q {
  margin: 0 0 0.9rem;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.4;
  color: var(--mv-ink);
}
.av__nota-txt {
  margin: 0.6rem 0 0;
  min-height: 1.4em;
  font-size: 0.9rem;
  color: var(--mv-faint);
}
.av__nota-txt--on {
  font-family: var(--font-heavy);
  font-weight: 700;
  color: var(--mv-ink);
}
.av__resto {
  animation: av-in 0.35s ease both;
}

/* ---- NPS 0..10 ---- */
.av-nps {
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 0.35rem;
}
.av-nps__b {
  aspect-ratio: 1;
  min-height: 40px;
  padding: 0;
  border: 1.5px solid var(--mv-line-strong);
  border-radius: 10px;
  background: var(--mv-bg);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--mv-ink);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.av-nps__b:hover {
  border-color: var(--mv-hl);
}
.av-nps__b--on {
  background: var(--mv-hl);
  border-color: var(--mv-hl);
  color: #fff;
}
.av-nps__legenda {
  display: flex;
  justify-content: space-between;
  margin-top: 0.45rem;
  font-size: 0.78rem;
  color: var(--mv-faint);
}
/* No celular, 11 botões numa linha ficam pequenos demais para o dedo:
   0–5 em cima, 6–10 embaixo. */
@media (max-width: 520px) {
  .av-nps {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .av-nps__b {
    aspect-ratio: auto;
    height: 46px;
  }
}

/* ---- sim / não ---- */
.av-sn {
  display: flex;
  gap: 0.6rem;
}
.av-sn__b {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  border: 1.5px solid var(--mv-line-strong);
  border-radius: 12px;
  background: var(--mv-bg);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--mv-ink);
  cursor: pointer;
}
.av-sn__b--on {
  border-color: var(--mv-hl);
  background: var(--mv-accent-tint);
  color: var(--mv-green-deep);
}

.av__enviar {
  margin-top: 2.25rem;
}
.av__enviar .mv-cta {
  width: 100%;
}
@media (min-width: 560px) {
  .av__enviar .mv-cta {
    width: auto;
  }
}
.av__erro {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--mv-accent-tint);
  border: 1px solid var(--mv-hl);
  font-size: 0.9rem;
}
.av__done-icon {
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
.av__insta {
  margin-top: 1.75rem;
}
.av__link {
  margin-top: 1.5rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--mv-muted);
  font-family: inherit;
  font-size: 0.88rem;
  text-decoration: underline;
  cursor: pointer;
}
</style>
