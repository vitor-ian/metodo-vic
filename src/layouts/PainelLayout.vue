<template>
  <q-layout view="lHh LpR lFf" class="pn">
    <!-- No celular a barra de cima abre o menu; no desktop o menu fica fixo. -->
    <q-header class="pn-top lt-md">
      <q-toolbar>
        <q-btn
          flat
          round
          dense
          icon="menu"
          :aria-label="$t('painel.menu.abrir')"
          @click="menu = !menu"
        />
        <img
          class="pn-top__logo"
          src="/img/logo-curso-metodo-vic.png"
          alt="Método VIC"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="menu"
      show-if-above
      :width="248"
      :breakpoint="1023"
      class="pn-side"
    >
      <div class="pn-side__in">
        <router-link
          to="/painel"
          class="pn-side__brand"
          :aria-label="$t('painel.menu.inicio')"
        >
          <img src="/img/logo-curso-metodo-vic.png" alt="Método VIC" />
        </router-link>

        <nav class="pn-side__nav" :aria-label="$t('painel.menu.nav')">
          <router-link
            v-for="item in itens"
            :key="item.to"
            :to="item.to"
            class="pn-side__link"
            :class="{ 'pn-side__link--on': ativoNoMenu(item) }"
          >
            <q-icon :name="item.icon" size="20px" />
            <span>{{ $t(item.label) }}</span>
            <span v-if="item.badge" class="pn-side__badge">{{
              item.badge
            }}</span>
          </router-link>
        </nav>

        <div class="pn-side__foot">
          <LanguageSwitcher class="pn-side__lang" />
          <div class="pn-side__user">
            <span class="pn-side__avatar">{{ iniciais }}</span>
            <span class="pn-side__who">
              <strong>{{ auth.perfil?.nome || auth.perfil?.email }}</strong>
              <em>{{
                auth.ehAdmin
                  ? $t('painel.menu.papelAdmin')
                  : $t('painel.menu.papelBarbeiro')
              }}</em>
            </span>
          </div>
          <q-btn
            flat
            no-caps
            dense
            class="pn-side__sair"
            icon="logout"
            :label="$t('painel.menu.sair')"
            @click="sair"
          />
        </div>
      </div>
    </q-drawer>

    <q-page-container class="pn-main">
      <div v-if="!auth.perfil" class="pn-page">
        <div class="pn-card pn-aviso">
          <q-icon name="cloud_off" size="28px" />
          <div>
            <strong>{{ $t('painel.menu.erroPerfilTitulo') }}</strong>
            <p>{{ $t('painel.menu.erroPerfilTexto') }}</p>
          </div>
        </div>
      </div>

      <template v-else>
        <div v-if="!auth.ativo" class="pn-pendente">
          <q-icon name="hourglass_top" size="20px" />
          <span>
            <strong>{{ $t('painel.menu.pendenteTitulo') }}</strong>
            {{ $t('painel.menu.pendenteTexto') }}
          </span>
        </div>
        <router-view />
      </template>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { supabase } from '@/config/supabase.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const menu = ref(false)
const pendentes = ref(0)

const itens = computed(() => [
  {
    to: '/painel',
    label: 'painel.menu.diagnosticos',
    icon: 'assignment_ind'
  },
  { to: '/painel/formulario', label: 'painel.menu.formulario', icon: 'link' },
  ...(auth.ehAdmin
    ? [
        {
          to: '/painel/barbeiros',
          label: 'painel.menu.barbeiros',
          icon: 'groups',
          badge: pendentes.value || ''
        }
      ]
    : [])
])

/** "Diagnósticos" também fica aceso dentro da ficha de um diagnóstico. */
function ativoNoMenu(item) {
  if (item.to === '/painel') {
    return (
      route.path === '/painel' || route.path.startsWith('/painel/diagnosticos')
    )
  }
  return route.path.startsWith(item.to)
}

const iniciais = computed(() => {
  const nome = (auth.perfil?.nome || auth.perfil?.email || '?').trim()
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
})

async function sair() {
  await auth.sair()
  router.replace('/entrar')
}

watch(locale, () => (document.title = t('painel.titulo')), { immediate: true })

onMounted(async () => {
  if (auth.ehAdmin) {
    const { count } = await supabase
      .from('perfis')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', false)
    pendentes.value = count || 0
  }
})
</script>

<style scoped>
.pn {
  background: var(--mv-bg-alt);
}
.pn-top {
  background: #0a0a0a;
  color: #fff;
}
.pn-top__logo {
  height: 26px;
  width: auto;
  margin-left: 0.5rem;
}
.pn-side__in {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #0a0a0a;
  padding: 1.5rem 1rem 1rem;
  color: #fff;
}
.pn-side__brand {
  display: block;
  padding: 0 0.6rem 1.75rem;
}
.pn-side__brand img {
  height: 44px;
  width: auto;
}
.pn-side__nav {
  display: grid;
  gap: 0.25rem;
}
.pn-side__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.66);
  font-family: var(--font-heavy);
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;
  transition:
    background 0.18s,
    color 0.18s;
}
.pn-side__link:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.pn-side__link--on {
  background: var(--mv-green);
  color: #fff;
}
.pn-side__link--on:hover {
  background: var(--mv-green-bright);
}
.pn-side__badge {
  margin-left: auto;
  min-width: 20px;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: #fff;
  color: var(--mv-green-deep);
  font-size: 0.7rem;
  font-weight: 800;
  text-align: center;
}
.pn-side__foot {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: grid;
  gap: 0.6rem;
}
.pn-side__lang {
  justify-self: start;
}
.pn-side__user {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}
.pn-side__avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  font-family: var(--font-heavy);
  font-weight: 800;
  font-size: 0.8rem;
}
.pn-side__who {
  min-width: 0;
  display: grid;
}
.pn-side__who strong {
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pn-side__who em {
  font-style: normal;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.5);
}
.pn-side__sair {
  justify-self: start;
  color: rgba(255, 255, 255, 0.66);
}
.pn-pendente {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  max-width: 1280px;
  margin: 1rem auto 0;
  padding: 0.85rem 1rem;
  margin-inline: clamp(1rem, 3vw, 2.5rem);
  border-radius: 12px;
  background: #fff4e0;
  color: #6b4100;
  font-size: 0.9rem;
  line-height: 1.45;
}
.pn-aviso {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.pn-aviso p {
  margin: 0.25rem 0 0;
  color: var(--mv-muted);
}
</style>
