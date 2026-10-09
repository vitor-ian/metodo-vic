<template>
  <div class="lang" role="group" aria-label="Idioma">
    <button
      v-for="l in locales"
      :key="l.code"
      type="button"
      class="lang__btn"
      :class="{ 'lang__btn--active': locale === l.code }"
      :aria-pressed="locale === l.code"
      :title="l.name"
      @click="setLocale(l.code)"
    >
      <FlagIcon :code="l.code" />
      <span class="lang__label">{{ l.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { locales } from '@/data/diagnostico.js'
import FlagIcon from '@/components/ui/FlagIcon.vue'

const { locale } = useI18n()

function setLocale(code) {
  locale.value = code
  if (typeof document !== 'undefined') document.documentElement.lang = code
  if (typeof window !== 'undefined') {
    window.localStorage?.setItem('mv-locale', code)
  }
}
</script>

<style scoped>
.lang {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.lang__btn {
  appearance: none;
  border: 0;
  cursor: pointer;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-heavy);
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  /* 34px de altura: o seletor fica confortável no toque sem inchar a barra. */
  padding: 0.5rem 0.6rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}
.lang__btn:hover {
  color: #fff;
}
.lang__btn--active {
  background: var(--mv-green);
  color: #fff;
}
</style>
