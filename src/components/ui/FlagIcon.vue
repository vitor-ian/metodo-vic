<template>
  <span class="flag" :aria-hidden="true">
    <!-- Brazil -->
    <svg
      v-if="code === 'pt-BR'"
      viewBox="0 0 28 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="28" height="20" fill="#009c3b" />
      <path d="M14 2.5 26 10 14 17.5 2 10Z" fill="#ffdf00" />
      <circle cx="14" cy="10" r="4.3" fill="#002776" />
    </svg>

    <!-- United States -->
    <svg
      v-else-if="code === 'en-US'"
      viewBox="0 0 28 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="28" height="20" fill="#fff" />
      <g fill="#b22234">
        <rect y="0" width="28" height="1.54" />
        <rect y="3.08" width="28" height="1.54" />
        <rect y="6.15" width="28" height="1.54" />
        <rect y="9.23" width="28" height="1.54" />
        <rect y="12.31" width="28" height="1.54" />
        <rect y="15.38" width="28" height="1.54" />
        <rect y="18.46" width="28" height="1.54" />
      </g>
      <rect width="12" height="10.77" fill="#3c3b6e" />
      <g fill="#fff">
        <circle cx="2.4" cy="2" r="0.7" />
        <circle cx="6" cy="2" r="0.7" />
        <circle cx="9.6" cy="2" r="0.7" />
        <circle cx="4.2" cy="4.3" r="0.7" />
        <circle cx="7.8" cy="4.3" r="0.7" />
        <circle cx="2.4" cy="6.6" r="0.7" />
        <circle cx="6" cy="6.6" r="0.7" />
        <circle cx="9.6" cy="6.6" r="0.7" />
        <circle cx="4.2" cy="8.9" r="0.7" />
        <circle cx="7.8" cy="8.9" r="0.7" />
      </g>
    </svg>

    <!-- Spain -->
    <svg v-else viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="20" fill="#aa151b" />
      <rect y="5" width="28" height="10" fill="#f1bf00" />
    </svg>
  </span>
</template>

<script setup>
defineProps({
  code: { type: String, required: true }
})
</script>

<style scoped>
.flag {
  display: inline-block;
  width: 20px;
  height: 14px;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  line-height: 0;
  flex-shrink: 0;
}
.flag svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
