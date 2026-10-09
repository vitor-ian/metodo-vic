<template>
  <main class="auth">
    <div class="auth__glow" aria-hidden="true" />
    <LanguageSwitcher class="auth__lang" />
    <div class="auth__box">
      <img
        class="auth__logo"
        src="/img/logo-curso-metodo-vic.png"
        alt="Método VIC"
        width="240"
        height="117"
      />
      <div class="auth__card">
        <router-view />
      </div>
      <p class="auth__foot">{{ $t('painel.auth.rodape') }}</p>
    </div>
  </main>
</template>

<script setup>
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t, locale } = useI18n()
watch(locale, () => (document.title = t('painel.titulo')), { immediate: true })
</script>

<style scoped>
.auth {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2.5rem 1rem;
  background: #0a0a0a;
  overflow: hidden;
}
.auth__glow {
  position: absolute;
  width: 640px;
  height: 640px;
  top: -260px;
  right: -200px;
  border-radius: 50%;
  background: var(--mv-green);
  opacity: 0.22;
  filter: blur(120px);
  pointer-events: none;
}
.auth__lang {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1;
}
.auth__box {
  position: relative;
  width: 100%;
  max-width: 420px;
  display: grid;
  justify-items: center;
  gap: 1.75rem;
}
.auth__logo {
  height: 64px;
  width: auto;
}
.auth__card {
  width: 100%;
  background: var(--mv-bg);
  border-radius: 18px;
  padding: clamp(1.5rem, 5vw, 2.25rem);
  box-shadow: 0 40px 90px -40px rgba(0, 0, 0, 0.9);
}
.auth__foot {
  margin: 0;
  font-family: var(--font-heavy);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

/* Peças comuns às páginas de acesso (slot do router-view). */
:deep(.auth-title) {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.9rem;
  line-height: 1;
  text-transform: uppercase;
  color: var(--mv-ink);
}
:deep(.auth-sub) {
  margin: 0.5rem 0 1.5rem;
  color: var(--mv-muted);
  font-size: 0.92rem;
  line-height: 1.5;
}
:deep(.auth-form) {
  display: grid;
  gap: 0.35rem;
}
:deep(.auth-btn) {
  width: 100%;
  margin-top: 0.5rem;
}
:deep(.auth-links) {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 1.25rem;
  font-size: 0.86rem;
}
:deep(.auth-links a) {
  color: var(--mv-hl);
  font-weight: 600;
  text-decoration: none;
}
:deep(.auth-links a:hover) {
  text-decoration: underline;
}
:deep(.auth-alert) {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  font-size: 0.88rem;
  line-height: 1.45;
  background: var(--mv-accent-tint);
  color: var(--mv-ink);
}
:deep(.auth-alert--ok) {
  background: #e6f6ec;
}
</style>
