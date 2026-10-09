<template>
  <div class="slot" :class="[`slot--${estado}`, { 'slot--add': adicionar }]">
    <button
      type="button"
      class="slot__area"
      :disabled="estado === 'enviando'"
      :aria-label="`${label} · ${url ? (visualizar ? label : $t('envio.fotoTrocar')) : $t('envio.fotoAdd')}`"
      @click="clicou"
    >
      <!-- Com foto: a foto. Sem foto: o guia de enquadramento, apagado. -->
      <img v-if="url" class="slot__img" :src="url" :alt="label" />
      <img
        v-else-if="guia"
        class="slot__img slot__img--guia"
        :src="guia"
        alt=""
        aria-hidden="true"
      />

      <span v-if="!url && guia" class="slot__exemplo">
        {{ $t('envio.fotoExemplo') }}
      </span>

      <span v-if="estado === 'enviando'" class="slot__veu">
        <q-spinner size="28px" />
        <span>{{ $t('envio.fotoEnviando') }}</span>
      </span>
      <span v-else-if="estado === 'erro'" class="slot__veu slot__veu--erro">
        <q-icon name="error_outline" size="26px" />
        <span>{{ $t('envio.fotoErro') }}</span>
      </span>
      <!-- Enviada numa visita anterior: o cliente não lê o bucket, então não
           há miniatura — só a confirmação. -->
      <span v-else-if="!url && estado === 'ok'" class="slot__pronta">
        <q-icon v-if="!guia" name="image" size="30px" />
        <span>{{ $t('envio.fotoPronta') }}</span>
      </span>
      <span v-else-if="!url" class="slot__add">
        <q-icon
          :name="adicionar ? 'add_photo_alternate' : 'add_a_photo'"
          size="22px"
        />
        <span>{{ adicionar ? label : $t('envio.fotoAdd') }}</span>
      </span>

      <span v-if="estado === 'ok'" class="slot__ok">
        <q-icon name="check" size="15px" />
      </span>
    </button>

    <div v-if="!adicionar" class="slot__rodape">
      <strong>{{ label }}</strong>
      <span
        v-if="(url || estado === 'ok') && estado !== 'enviando'"
        class="slot__acoes"
      >
        <button type="button" class="slot__link" @click="abrir">
          {{ $t('envio.fotoTrocar') }}
        </button>
        <button
          v-if="removivel"
          type="button"
          class="slot__link slot__link--x"
          :aria-label="$t('envio.fotoRemover')"
          @click="$emit('remover')"
        >
          <q-icon name="close" size="16px" />
        </button>
      </span>
    </div>

    <input
      ref="entrada"
      class="slot__input"
      type="file"
      accept="image/*"
      :multiple="multiplo"
      tabindex="-1"
      aria-hidden="true"
      @change="escolheu"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

/**
 * Um espaço de foto. Vazio, mostra o guia do ângulo; depois do envio, a foto.
 * Sem `capture` no input de propósito: a pessoa escolhe entre a câmera e a
 * galeria (muita gente já tirou as fotos com outra pessoa segurando).
 */
const props = defineProps({
  label: { type: String, required: true },
  guia: { type: String, default: '' },
  url: { type: String, default: '' },
  // 'vazio' | 'enviando' | 'ok' | 'erro'
  estado: { type: String, default: 'vazio' },
  removivel: { type: Boolean, default: false },
  // No painel: clicar na foto abre a visualização; "Trocar" abre o seletor.
  visualizar: { type: Boolean, default: false },
  // Variante "adicionar mais" das referências.
  adicionar: { type: Boolean, default: false },
  multiplo: { type: Boolean, default: false }
})

const emit = defineEmits(['arquivos', 'remover', 'ver'])
const entrada = ref(null)

function abrir() {
  entrada.value?.click()
}

function clicou() {
  if (props.visualizar && props.url && props.estado === 'ok') emit('ver')
  else abrir()
}

function escolheu(evento) {
  const arquivos = [...(evento.target.files || [])].filter(f =>
    f.type ? f.type.startsWith('image/') : true
  )
  // Limpa para escolher o mesmo arquivo de novo (tentar de novo após erro).
  evento.target.value = ''
  if (arquivos.length) emit('arquivos', arquivos)
}
</script>

<style scoped>
.slot {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.slot__area {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 5;
  padding: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1.5px dashed var(--mv-line-strong);
  background: var(--mv-surface);
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}
.slot__area:hover,
.slot__area:focus-visible {
  border-color: var(--mv-hl);
  outline: none;
}
.slot__area:focus-visible {
  box-shadow: 0 0 0 3px var(--mv-accent-tint);
}
.slot--ok .slot__area {
  border-style: solid;
  border-color: var(--mv-hl);
}
.slot--erro .slot__area {
  border-style: solid;
  border-color: #d33;
}
.slot__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slot__img--guia {
  opacity: 0.55;
  filter: grayscale(1);
}
.slot__exemplo {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.72);
  color: #fff;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.slot__add {
  position: absolute;
  left: 50%;
  bottom: 0.75rem;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: calc(100% - 1rem);
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  background: var(--mv-green);
  color: #fff;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.74rem;
  white-space: nowrap;
  box-shadow: 0 8px 20px -8px var(--mv-green-glow);
}
.slot__add span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.slot--add .slot__add {
  position: static;
  transform: none;
  flex-direction: column;
  background: none;
  color: var(--mv-hl);
  box-shadow: none;
  white-space: normal;
  text-align: center;
}
.slot--add .slot__area {
  display: grid;
  place-items: center;
}
.slot__pronta {
  position: absolute;
  inset: auto 0.5rem 0.6rem;
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  color: var(--mv-hl);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.slot__pronta > span {
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: var(--mv-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.slot__veu {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.82);
  color: var(--mv-ink);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}
.slot__veu--erro {
  color: #b42318;
}
.slot__ok {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--mv-hl);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.slot__rodape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 2rem;
  padding: 0.45rem 0.1rem 0;
}
.slot__rodape strong {
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--mv-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slot__acoes {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.slot__link {
  border: 0;
  background: none;
  padding: 0.2rem 0.3rem;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--mv-hl);
  cursor: pointer;
  text-decoration: underline;
}
.slot__link--x {
  display: grid;
  place-items: center;
  color: var(--mv-muted);
  text-decoration: none;
}
.slot__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
