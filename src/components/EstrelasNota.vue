<template>
  <!-- Editável: um grupo de rádio (setas do teclado funcionam como num
       input de rádio). Só leitura: uma imagem com o valor no aria-label. -->
  <div
    v-if="!somenteLeitura"
    class="est"
    role="radiogroup"
    :aria-label="rotulo"
    :style="{ '--est-tam': tamanho }"
  >
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      class="est__b"
      :class="{ 'est__b--on': n <= (sobre || modelValue || 0) }"
      :aria-checked="modelValue === n"
      :aria-label="rotulos[n - 1] ? `${n} · ${rotulos[n - 1]}` : String(n)"
      :tabindex="(modelValue || 1) === n ? 0 : -1"
      @click="$emit('update:modelValue', n)"
      @mouseenter="sobre = n"
      @mouseleave="sobre = 0"
      @keydown.right.prevent="mover(1)"
      @keydown.up.prevent="mover(1)"
      @keydown.left.prevent="mover(-1)"
      @keydown.down.prevent="mover(-1)"
    >
      <q-icon name="star" />
    </button>
  </div>
  <span
    v-else
    class="est est--ro"
    role="img"
    :aria-label="`${modelValue} / 5`"
    :style="{ '--est-tam': tamanho }"
  >
    <q-icon
      v-for="n in 5"
      :key="n"
      name="star"
      :class="{ 'est__i--on': n <= Math.round(modelValue || 0) }"
    />
  </span>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  somenteLeitura: { type: Boolean, default: false },
  tamanho: { type: String, default: '40px' },
  rotulo: { type: String, default: '' },
  // Um texto por estrela (Péssimo..Excelente), lido pelo leitor de tela.
  rotulos: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])
const sobre = ref(0)

function mover(passo) {
  const atual = props.modelValue || 0
  emit('update:modelValue', Math.min(5, Math.max(1, atual + passo)))
}
</script>

<style scoped>
.est {
  display: inline-flex;
  gap: calc(var(--est-tam) * 0.12);
}
.est__b {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font-size: var(--est-tam);
  line-height: 1;
  color: var(--mv-line-strong);
  transition:
    color 0.15s,
    transform 0.15s;
}
.est__b:hover {
  transform: scale(1.08);
}
.est__b:focus-visible {
  outline: 2px solid var(--mv-hl);
  outline-offset: 2px;
  border-radius: 6px;
}
.est__b--on {
  color: #f2a900;
}
.est--ro {
  gap: 1px;
  font-size: var(--est-tam);
  color: var(--mv-line-strong);
  vertical-align: middle;
}
.est--ro .est__i--on {
  color: #f2a900;
}
@media (prefers-reduced-motion: reduce) {
  .est__b {
    transition: none;
  }
  .est__b:hover {
    transform: none;
  }
}
</style>
