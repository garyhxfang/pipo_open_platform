<script setup lang="ts">
import { computed } from 'vue'
import { documentationUrl } from './documentationLinks'

const props = defineProps<{
  path: string
  label: string
}>()

const href = computed(() => documentationUrl(props.path))
</script>

<template>
  <a
    class="capability-doc-hint"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="`在文档中心查看${label}`"
    @click.stop
  >
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.5 3.5h7.2a2 2 0 0 1 2 2v10.8H6.5a2 2 0 0 1-2-2V3.5Z" />
      <path d="M13.7 6.2h1.8v10.3H8.2M7.2 7h3.7M7.2 10h3.7" />
    </svg>
    <span>查看文档</span>
    <strong>↗</strong>
  </a>
</template>

<style>
.capability-doc-hint {
  position: absolute;
  top: var(--doc-hint-y, 100%);
  left: var(--doc-hint-x, 50%);
  right: auto;
  bottom: auto;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 104px;
  min-height: 30px;
  padding: 0 9px;
  overflow: hidden;
  border: 1px solid #a9c7f7;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(25, 68, 132, 0.14);
  color: #1769e8;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition: opacity 140ms ease, transform 140ms ease;
}

.capability-doc-hint svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.capability-doc-hint strong {
  font-size: 12px;
}

.capability-doc-target.is-doc-hint-visible > .capability-doc-hint,
.capability-doc-target:focus-within > .capability-doc-hint,
.capability-doc-hint:focus-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.capability-doc-hint:hover {
  border-color: #8ab4f8;
  background: #f7faff;
}

.capability-doc-hint:focus-visible {
  outline: 2px solid #1769e8;
  outline-offset: 2px;
}

@media (max-width: 900px) {
  .capability-doc-hint {
    max-width: calc(100vw - 24px);
  }
}
</style>
