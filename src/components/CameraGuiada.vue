<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="v => $emit('update:modelValue', v)"
    @show="aoAbrir"
    @hide="aoFechar"
  >
    <div class="cam">
      <!-- ============ topo ============ -->
      <div class="cam__top">
        <q-btn
          flat
          round
          dense
          icon="close"
          color="white"
          :aria-label="$t('painel.comum.fechar')"
          @click="fechar"
        />
        <div class="cam__titulo">
          <span class="cam__passo">
            {{ $t('envio.camPasso', { n: indice + 1, total: angulos.length }) }}
          </span>
          <strong>{{ atual?.label }}</strong>
        </div>
        <ol class="cam__dots" aria-hidden="true">
          <li
            v-for="(a, i) in angulos"
            :key="a.id"
            :class="{
              'cam__dot--on': i === indice,
              'cam__dot--ok': feitosAgora.has(a.id)
            }"
          />
        </ol>
      </div>

      <!-- ============ visor ============ -->
      <div class="cam__visor">
        <!-- Vídeo e moldura espelham juntos na câmera frontal: o que a pessoa
             alinha na tela é o que sai na foto (sem espelho). -->
        <div class="cam__palco" :class="{ 'cam__palco--espelho': espelhar }">
          <video ref="video" class="cam__video" autoplay playsinline muted />
          <svg
            v-if="fase !== 'erro'"
            class="cam__moldura"
            viewBox="0 0 300 400"
            aria-hidden="true"
          >
            <ellipse cx="150" cy="150" rx="68" ry="88" />
            <path d="M122 232 L118 276 M178 232 L182 276" />
            <path
              d="M14 400 C24 316 74 290 118 278 M286 400 C276 316 226 290 182 278"
            />
          </svg>
        </div>

        <figure v-if="atual?.img && fase !== 'erro'" class="cam__exemplo">
          <img :src="atual.img" alt="" />
          <figcaption>{{ $t('envio.fotoExemplo') }}</figcaption>
        </figure>

        <div v-if="fase === 'iniciando'" class="cam__estado">
          <q-spinner size="34px" color="white" />
          <span>{{ $t('envio.camLigando') }}</span>
        </div>

        <span v-if="contagem" :key="contagem" class="cam__contagem">{{
          contagem
        }}</span>
        <span v-if="flash" class="cam__flash" />

        <img
          v-if="fase === 'revisao' && previa"
          class="cam__previa"
          :src="previa"
          :alt="atual?.label"
        />

        <!-- Sem câmera (permissão negada, navegador antigo, app do
             Instagram...): cai na câmera do próprio celular ou na galeria. -->
        <div v-if="fase === 'erro'" class="cam__erro">
          <q-icon name="no_photography" size="40px" />
          <strong>{{
            erroTipo === 'negado'
              ? $t('envio.camNegadaTitulo')
              : $t('envio.camIndisponivelTitulo')
          }}</strong>
          <p>
            {{
              erroTipo === 'negado'
                ? $t('envio.camNegadaTexto')
                : $t('envio.camIndisponivelTexto')
            }}
          </p>
          <div class="cam__erro-acoes">
            <q-btn
              unelevated
              no-caps
              class="mv-cta"
              @click="entradaCamera?.click()"
            >
              <span>{{ $t('envio.camNativa') }}</span>
              <q-icon name="photo_camera" size="20px" />
            </q-btn>
            <q-btn
              flat
              no-caps
              color="white"
              icon="photo_library"
              :label="$t('envio.camGaleria')"
              @click="entradaGaleria?.click()"
            />
            <q-btn
              v-if="erroTipo === 'negado'"
              flat
              no-caps
              color="white"
              icon="refresh"
              :label="$t('envio.camTentar')"
              @click="ligar"
            />
          </div>
        </div>
      </div>

      <!-- ============ instrução + controles ============ -->
      <div class="cam__base">
        <p v-if="atual?.instrucao" class="cam__instrucao">
          {{ atual.instrucao }}
        </p>
        <p v-if="fase === 'ao_vivo' || fase === 'contando'" class="cam__dica">
          {{
            facing === 'user'
              ? $t('envio.camDicaSozinho')
              : $t('envio.camDicaAjuda')
          }}
        </p>

        <div v-if="fase === 'revisao'" class="cam__revisao">
          <q-btn
            flat
            no-caps
            color="white"
            icon="replay"
            :label="$t('envio.camRefazer')"
            @click="refazer"
          />
          <q-btn unelevated no-caps class="mv-cta" @click="usar">
            <span>{{
              restantes > 1 ? $t('envio.camUsarProxima') : $t('envio.camUsar')
            }}</span>
            <q-icon name="check" size="20px" />
          </q-btn>
        </div>

        <div v-else-if="fase !== 'erro'" class="cam__controles">
          <button
            type="button"
            class="cam__lateral"
            :aria-label="$t('envio.camTimer')"
            @click="trocarTimer"
          >
            <q-icon :name="timer ? 'timer' : 'timer_off'" size="24px" />
            <span>{{ timer ? `${timer}s` : $t('envio.camSemTimer') }}</span>
          </button>
          <button
            type="button"
            class="cam__disparo"
            :class="{ 'cam__disparo--contando': fase === 'contando' }"
            :disabled="fase === 'iniciando'"
            :aria-label="
              fase === 'contando'
                ? $t('envio.camCancelar')
                : $t('envio.camTirar')
            "
            @click="disparar"
          >
            <span />
          </button>
          <button
            type="button"
            class="cam__lateral"
            :disabled="!variasCameras || fase === 'contando'"
            :aria-label="$t('envio.camVirar')"
            @click="virar"
          >
            <q-icon name="flip_camera_android" size="24px" />
            <span>{{ $t('envio.camVirarCurto') }}</span>
          </button>
        </div>
      </div>

      <input
        ref="entradaCamera"
        class="cam__input"
        type="file"
        accept="image/*"
        :capture="facing === 'user' ? 'user' : 'environment'"
        tabindex="-1"
        aria-hidden="true"
        @change="escolheuArquivo"
      />
      <input
        ref="entradaGaleria"
        class="cam__input"
        type="file"
        accept="image/*"
        tabindex="-1"
        aria-hidden="true"
        @change="escolheuArquivo"
      />
      <canvas ref="tela" class="cam__input" aria-hidden="true" />
    </div>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

/**
 * Câmera guiada do passo 2: abre no ângulo pedido e, a cada foto aceita,
 * segue para o próximo que ainda falta. Quem tira sozinho usa a câmera
 * frontal com timer (e ouve a contagem: de perfil e de costas não dá para
 * ver a tela); com ajuda, a traseira, que tem a melhor qualidade.
 *
 * O componente só captura: entrega cada foto em `foto(id, File)` e quem usa
 * sobe pelo mesmo caminho das fotos escolhidas na galeria.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // [{ id, label, img, instrucao }]
  angulos: { type: Array, required: true },
  inicio: { type: String, default: '' },
  // Ids que já têm foto (enviada ou subindo).
  feitos: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'foto', 'fim'])

const PREF = 'mv-cam'
const TIMERS = [0, 3, 5, 10]

const video = ref(null)
const tela = ref(null)
const entradaCamera = ref(null)
const entradaGaleria = ref(null)

const indice = ref(0)
// 'iniciando' | 'ao_vivo' | 'contando' | 'revisao' | 'erro'
const fase = ref('iniciando')
const erroTipo = ref('')
const facing = ref(lerPref('facing', 'user'))
const timer = ref(Number(lerPref('timer', facing.value === 'user' ? 5 : 0)))
const espelhar = ref(false)
const variasCameras = ref(true)
const contagem = ref(0)
const flash = ref(false)
const previa = ref('')
const capturados = ref(new Set())
let arquivo = null
let stream = null
let relogio = null
let audio = null

const atual = computed(() => props.angulos[indice.value])
const feitosAgora = computed(
  () => new Set([...props.feitos, ...capturados.value])
)
/** Quantas fotos faltam contando a da tela. */
const restantes = computed(
  () =>
    props.angulos.filter(
      a => a.id === atual.value?.id || !feitosAgora.value.has(a.id)
    ).length
)

function lerPref(chave, padrao) {
  try {
    return window.localStorage.getItem(`${PREF}-${chave}`) ?? padrao
  } catch {
    return padrao
  }
}
function gravarPref(chave, valor) {
  try {
    window.localStorage.setItem(`${PREF}-${chave}`, String(valor))
  } catch {
    // sem storage: a escolha vale só agora
  }
}

// ------------------------------------------------------------------ câmera
function desligar() {
  pararContagem()
  stream?.getTracks().forEach(tr => tr.stop())
  stream = null
  if (video.value) video.value.srcObject = null
}

async function ligar() {
  desligar()
  fase.value = 'iniciando'
  if (!navigator.mediaDevices?.getUserMedia) {
    erroTipo.value = 'indisponivel'
    fase.value = 'erro'
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facing.value },
        width: { ideal: 1920 },
        height: { ideal: 1920 }
      }
    })
    // Fechou enquanto pedia permissão.
    if (!props.modelValue) return desligar()
    video.value.srcObject = stream
    await video.value.play().catch(() => {})
    const ajustes = stream.getVideoTracks()[0]?.getSettings?.() || {}
    espelhar.value = ajustes.facingMode
      ? ajustes.facingMode === 'user'
      : facing.value === 'user'
    fase.value = 'ao_vivo'
    contarCameras()
  } catch (e) {
    erroTipo.value = ['NotAllowedError', 'SecurityError'].includes(e?.name)
      ? 'negado'
      : 'indisponivel'
    fase.value = 'erro'
  }
}

async function contarCameras() {
  try {
    const lista = await navigator.mediaDevices.enumerateDevices()
    variasCameras.value = lista.filter(d => d.kind === 'videoinput').length > 1
  } catch {
    variasCameras.value = true
  }
}

function virar() {
  facing.value = facing.value === 'user' ? 'environment' : 'user'
  gravarPref('facing', facing.value)
  // Sozinho precisa de timer; com ajuda, a foto sai na hora.
  timer.value = facing.value === 'user' ? Math.max(timer.value, 5) : 0
  gravarPref('timer', timer.value)
  ligar()
}

function trocarTimer() {
  const i = TIMERS.indexOf(timer.value)
  timer.value = TIMERS[(i + 1) % TIMERS.length]
  gravarPref('timer', timer.value)
}

// --------------------------------------------------------------- contagem
function bipe(final = false) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    const osc = audio.createOscillator()
    const vol = audio.createGain()
    osc.frequency.value = final ? 1320 : 880
    vol.gain.setValueAtTime(0.18, audio.currentTime)
    vol.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15)
    osc.connect(vol).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + 0.16)
  } catch {
    // Sem áudio: a contagem segue na tela.
  }
  navigator.vibrate?.(final ? 120 : 40)
}

function pararContagem() {
  clearInterval(relogio)
  relogio = null
  contagem.value = 0
  if (fase.value === 'contando') fase.value = 'ao_vivo'
}

function disparar() {
  if (fase.value === 'contando') return pararContagem()
  if (fase.value !== 'ao_vivo') return
  // O AudioContext precisa nascer num toque (regra do iOS).
  if (timer.value) bipe()
  if (!timer.value) return capturar()
  fase.value = 'contando'
  contagem.value = timer.value
  relogio = setInterval(() => {
    contagem.value -= 1
    if (contagem.value <= 0) {
      clearInterval(relogio)
      relogio = null
      bipe(true)
      capturar()
    } else {
      bipe(contagem.value === 1)
    }
  }, 1000)
}

function capturar() {
  const v = video.value
  if (!v?.videoWidth) return
  const c = tela.value
  c.width = v.videoWidth
  c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
  flash.value = true
  setTimeout(() => (flash.value = false), 180)
  c.toBlob(
    blob => {
      if (!blob) return
      arquivo = new File([blob], `${atual.value.id}.jpg`, {
        type: 'image/jpeg'
      })
      if (previa.value) URL.revokeObjectURL(previa.value)
      previa.value = URL.createObjectURL(blob)
      contagem.value = 0
      fase.value = 'revisao'
    },
    'image/jpeg',
    0.92
  )
}

function refazer() {
  arquivo = null
  fase.value = 'ao_vivo'
}

/** Entrega a foto e segue para o próximo ângulo que falta. */
function entregar(file) {
  const id = atual.value.id
  emit('foto', id, file)
  capturados.value = new Set([...capturados.value, id])
  const n = props.angulos.length
  for (let passo = 1; passo < n; passo++) {
    const j = (indice.value + passo) % n
    if (!feitosAgora.value.has(props.angulos[j].id)) {
      indice.value = j
      return true
    }
  }
  return false
}

function usar() {
  if (!arquivo) return
  const segue = entregar(arquivo)
  arquivo = null
  if (segue) {
    fase.value = stream ? 'ao_vivo' : 'erro'
  } else {
    emit('fim')
    fechar()
  }
}

function escolheuArquivo(evento) {
  const file = evento.target.files?.[0]
  evento.target.value = ''
  if (!file) return
  if (!entregar(file)) {
    emit('fim')
    fechar()
  }
}

// ------------------------------------------------------------- abrir/fechar
function aoAbrir() {
  capturados.value = new Set()
  const i = props.angulos.findIndex(a => a.id === props.inicio)
  const pendente = props.angulos.findIndex(a => !props.feitos.includes(a.id))
  indice.value = i >= 0 ? i : Math.max(0, pendente)
  ligar()
}

function aoFechar() {
  desligar()
  if (previa.value) URL.revokeObjectURL(previa.value)
  previa.value = ''
  arquivo = null
  fase.value = 'iniciando'
}

function fechar() {
  emit('update:modelValue', false)
}

onBeforeUnmount(() => {
  desligar()
  audio?.close?.()
})
</script>

<style scoped>
.cam {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: #000;
  color: #fff;
  overflow: hidden;
}
.cam__top {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.25rem 0.75rem;
  padding: calc(0.5rem + env(safe-area-inset-top)) 0.75rem 0.6rem;
  background: #0a0a0a;
}
.cam__titulo {
  display: grid;
  line-height: 1.2;
}
.cam__passo {
  font-family: var(--font-heavy);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.cam__titulo strong {
  font-family: var(--font-heavy);
  font-weight: 800;
  font-size: 1.05rem;
}
.cam__dots {
  grid-column: 1 / -1;
  display: flex;
  gap: 4px;
  margin: 0.2rem 0 0;
  padding: 0;
  list-style: none;
}
.cam__dots li {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}
.cam__dots .cam__dot--ok {
  background: var(--mv-green-bright);
}
.cam__dots .cam__dot--on {
  background: #fff;
}

.cam__visor {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.cam__palco {
  position: absolute;
  inset: 0;
}
.cam__palco--espelho {
  transform: scaleX(-1);
}
.cam__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}
.cam__moldura {
  position: absolute;
  left: 50%;
  top: 50%;
  height: 84%;
  max-width: 92%;
  transform: translate(-50%, -48%);
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 2.5;
  stroke-dasharray: 9 7;
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.6));
  pointer-events: none;
}
.cam__exemplo {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  width: clamp(64px, 18vw, 96px);
  margin: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  background: #ddd;
}
.cam__exemplo img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  filter: grayscale(1);
}
.cam__exemplo figcaption {
  padding: 0.15rem 0;
  background: rgba(10, 10, 10, 0.8);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.55rem;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
}
.cam__estado {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}
.cam__contagem {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: clamp(6rem, 32vw, 11rem);
  line-height: 1;
  color: #fff;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
  animation: cam-pulso 1s ease-out both;
  pointer-events: none;
}
@keyframes cam-pulso {
  from {
    opacity: 0;
    transform: scale(1.35);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}
.cam__flash {
  position: absolute;
  inset: 0;
  background: #fff;
  animation: cam-flash 0.18s ease-out both;
  pointer-events: none;
}
@keyframes cam-flash {
  to {
    opacity: 0;
  }
}
.cam__previa {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.cam__erro {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.6rem;
  padding: 1.5rem;
  text-align: center;
}
.cam__erro strong {
  font-family: var(--font-heavy);
  font-size: 1.15rem;
}
.cam__erro p {
  max-width: 34ch;
  margin: 0;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.75);
}
.cam__erro-acoes {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.cam__base {
  padding: 0.85rem 1rem calc(1rem + env(safe-area-inset-bottom));
  background: #0a0a0a;
}
.cam__instrucao {
  margin: 0 auto;
  max-width: 46ch;
  text-align: center;
  font-weight: 600;
  font-size: 0.98rem;
  line-height: 1.4;
}
.cam__dica {
  margin: 0.3rem auto 0;
  max-width: 46ch;
  text-align: center;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.6);
}
.cam__controles {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  justify-items: center;
  margin-top: 0.9rem;
}
.cam__lateral {
  display: grid;
  justify-items: center;
  gap: 0.15rem;
  min-width: 64px;
  padding: 0.35rem;
  border: 0;
  border-radius: 12px;
  background: none;
  color: #fff;
  font-family: var(--font-heavy);
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}
.cam__lateral:disabled {
  opacity: 0.35;
  cursor: default;
}
.cam__disparo {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  padding: 0;
  border: 4px solid #fff;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}
.cam__disparo span {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #fff;
  transition:
    transform 0.15s,
    border-radius 0.15s,
    background 0.15s;
}
.cam__disparo:active span {
  transform: scale(0.9);
}
.cam__disparo--contando span {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: var(--mv-hl);
}
.cam__disparo:disabled {
  opacity: 0.4;
}
.cam__revisao {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.75rem 1.25rem;
  margin-top: 0.9rem;
}
.cam__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .cam__contagem,
  .cam__flash {
    animation: none;
  }
}
</style>
