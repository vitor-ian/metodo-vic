<template>
  <main class="nf">
    <img
      src="/img/logo-curso-metodo-vic.png"
      alt="Método VIC"
      class="nf__logo"
    />
    <p class="mv-kicker">{{ $t('painel.nf.kicker') }}</p>
    <h1 class="mv-display mv-h2 nf__title">{{ $t('painel.nf.titulo') }}</h1>
    <p class="nf__text">{{ $t('painel.nf.texto') }}</p>
  </main>
</template>

<style scoped>
.nf {
  min-height: 100vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  text-align: center;
  background: #0a0a0a;
}
.nf__logo {
  height: 56px;
  width: auto;
  margin-bottom: 1.5rem;
}
.nf__title {
  margin: 0;
  color: #fff;
}
.nf__text {
  max-width: 40ch;
  margin: 0.5rem 0 0;
  color: rgba(255, 255, 255, 0.6);
}
</style>
