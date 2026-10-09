<template>
  <div class="res">
    <h2 class="res__sub">{{ $t('diag.resProfile') }}</h2>
    <div class="res__bars">
      <div v-for="letra in diagOrdem" :key="letra" class="res__bar">
        <span class="res__bar-lab">
          <b>{{ letra }}</b
          >{{ $t(diagPerfis[letra].nameKey) }}
        </span>
        <span class="res__bar-out">
          <span
            class="res__bar-in"
            :class="{ 'res__bar-in--lead': pontos(letra) === maior }"
            :style="{
              width: (pontos(letra) / diagQuestions.length) * 100 + '%'
            }"
          />
        </span>
        <span class="res__bar-val">{{ pontos(letra) }}</span>
      </div>
    </div>
    <p class="res__scale">{{ $t('diag.resScale') }}</p>

    <div class="res__profiles">
      <article
        v-for="letra in ordenados"
        :key="letra"
        class="res__prof"
        :class="{ 'res__prof--lead': pontos(letra) === maior }"
      >
        <h3>
          {{ $t(diagPerfis[letra].nameKey) }}
          <span class="res__prof-score"
            >({{ letra }} · {{ pontos(letra) }})</span
          >
          <span v-if="pontos(letra) === maior" class="res__tag">
            {{ $t('diag.resLeading') }}
          </span>
        </h3>
        <p>{{ $t(diagPerfis[letra].descKey) }}</p>
        <p v-if="reflexao" class="res__refl">{{
          $t(diagPerfis[letra].reflKey)
        }}</p>
      </article>
    </div>

    <h2 class="res__sub">{{ $t('diag.resListen') }}</h2>
    <div class="res__recap">
      <div v-for="(chave, i) in diagEscuta" :key="chave">
        <p class="res__recap-q">{{ $t(chave) }}</p>
        <p class="res__recap-a">{{
          escuta[i]?.trim() || $t('diag.resEmpty')
        }}</p>
      </div>
    </div>

    <h2 class="res__sub">{{ $t('diag.resStyle') }}</h2>
    <div v-if="estiloEscolhido" class="res__chosen">
      <img
        :src="estiloEscolhido.img"
        :alt="$t(estiloEscolhido.nameKey)"
        width="640"
        height="916"
        loading="lazy"
      />
      <span>
        <strong>{{ $t(estiloEscolhido.nameKey) }}</strong>
        <em>{{ $t(estiloEscolhido.descKey) }}</em>
      </span>
    </div>
    <p v-else class="res__recap-a">{{ $t('diag.resNoStyle') }}</p>

    <h2 class="res__sub">{{ $t('diag.resWhere') }}</h2>
    <p class="res__recap-a">
      {{
        atendimentoEscolhido
          ? $t(atendimentoEscolhido.nameKey)
          : $t('diag.resEmpty')
      }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  diagEscuta,
  diagQuestions,
  diagOrdem,
  diagPerfis,
  diagEstilos,
  diagAtendimento
} from '@/data/diagnostico.js'

/**
 * O resultado do diagnóstico: placar DISC, as descrições, a escuta ativa, o
 * estilo e o formato. O cliente vê ao fim do passo 1; o barbeiro vê o mesmo
 * no painel.
 */
const props = defineProps({
  placar: { type: Object, required: true },
  // Respostas da escuta na ordem de diagEscuta.
  escuta: { type: Array, required: true },
  estilo: { type: String, default: '' },
  atendimento: { type: String, default: '' },
  // As perguntas de reflexão são para o cliente; no painel ficam de fora.
  reflexao: { type: Boolean, default: true }
})

const pontos = letra => Number(props.placar?.[letra]) || 0
const maior = computed(() => Math.max(...diagOrdem.map(pontos)))
const ordenados = computed(() =>
  [...diagOrdem].sort((a, b) => pontos(b) - pontos(a))
)
const estiloEscolhido = computed(() =>
  diagEstilos.find(e => e.id === props.estilo)
)
const atendimentoEscolhido = computed(() =>
  diagAtendimento.find(a => a.id === props.atendimento)
)
</script>

<style scoped>
.res__sub {
  margin: 2.5rem 0 0.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mv-line);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: clamp(1.15rem, 2.6vw, 1.4rem);
  color: var(--mv-ink);
}
.res > .res__sub:first-child {
  margin-top: 1.5rem;
}

.res__bars {
  display: grid;
  gap: 1rem;
  margin-top: 0.5rem;
  padding: 1.35rem 1.25rem;
  border: 1px solid var(--mv-line);
  border-radius: 12px;
  background: var(--mv-surface);
}
.res__bar {
  display: grid;
  grid-template-columns: 120px 1fr 26px;
  align-items: center;
  gap: 0.75rem;
}
.res__bar-lab {
  font-size: 0.9rem;
  color: var(--mv-ink);
}
.res__bar-lab b {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--mv-hl);
  margin-right: 0.35rem;
}
.res__bar-out {
  height: 12px;
  border-radius: 8px;
  background: var(--mv-line);
  overflow: hidden;
}
.res__bar-in {
  display: block;
  height: 100%;
  border-radius: 8px;
  background: var(--mv-line-strong);
  transition: width 0.7s cubic-bezier(0.4, 0, 0.1, 1);
}
.res__bar-in--lead {
  background: var(--mv-hl);
}
.res__bar-val {
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.res__scale {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--mv-faint);
}

.res__profiles {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.25rem;
}
.res__prof {
  border: 1px solid var(--mv-line);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
}
.res__prof--lead {
  border-color: var(--mv-hl);
}
.res__prof h3 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 1.2rem;
  line-height: 1.3;
}
.res__prof-score {
  font-weight: 400;
  font-size: 0.95rem;
  color: var(--mv-muted);
}
.res__tag {
  padding: 0.25rem 0.6rem;
  line-height: 1;
  border-radius: 999px;
  background: var(--mv-hl);
  color: var(--mv-cta-ink);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.res__prof p {
  margin: 0.5rem 0 0;
  font-size: 0.94rem;
  line-height: 1.6;
  color: var(--mv-muted);
}
.res__refl {
  font-style: italic;
  color: var(--mv-ink) !important;
}

.res__recap {
  display: grid;
  gap: 0.75rem;
}
.res__recap > div {
  border: 1px solid var(--mv-line);
  border-radius: 10px;
  padding: 0.8rem 1rem;
}
.res__recap-q {
  margin: 0 0 0.2rem;
  font-size: 0.78rem;
  color: var(--mv-faint);
}
.res__recap-a {
  margin: 0;
  color: var(--mv-ink);
  white-space: pre-line;
}

.res__chosen {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1.5px solid var(--mv-hl);
  border-radius: 12px;
  padding: 0.9rem 1rem;
}
.res__chosen img {
  width: 58px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
}
.res__chosen strong {
  display: block;
  font-family: var(--font-heavy);
  font-weight: 700;
  color: var(--mv-ink);
}
.res__chosen em {
  display: block;
  font-style: normal;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--mv-muted);
  margin-top: 0.15rem;
}

@media (max-width: 480px) {
  .res__bar {
    grid-template-columns: 96px 1fr 24px;
  }
}
</style>
