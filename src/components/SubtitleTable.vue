<script setup>
import ActionBtn from '@/components/lib/ActionBtn.vue'
import { reactive, ref, watch } from 'vue'
import { numFixed, smartSplit, uniqueId } from '@/utilities/helpers'
import { handleKeyCombination } from '@/utilities/listeners'

const props = defineProps({
  subtitles: {
    type: Array,
    default: () => [],
  },
})
const emit = defineEmits([
  'add-subtitle',
  'delete-subtitle',
  'update-subtitle',
  'activate-subtitle',
  'hover-subtitle',
  'play-subtitle',
])
const subtitleTable = ref(null)
const subtitleRows = ref(props.subtitles)
const mergingSubtitles = ref(false)
const headers = reactive([
  { title: 'Duration', value: 'duration', align: 'center', width: '4rem' },
  { title: 'CPS', value: 'cps', align: 'center', width: '4rem' },
  { title: 'Subtitle text', value: 'text', align: 'center', width: '16rem' },
  { title: 'Actions', value: 'actions', align: 'right', width: '4rem' },
])
const splitSubtitles = idx => {
  const subtitle = subtitleRows.value[idx]
  const split = smartSplit(subtitle.text)
  const duration = subtitle.end - subtitle.start
  const end = subtitle.end
  subtitleRows.value[idx].text = split[0]
  subtitleRows.value[idx].end = subtitle.start + duration / 2
  subtitleRows.value.splice(idx + 1, 0, {
    start: subtitle.start + duration / 2,
    end,
    text: split[1],
    id: uniqueId(),
  })
}

const startMerging = () => {
  mergingSubtitles.value = true
  window.addEventListener('mouseup', mergeSubtitles)
}
const mergeSubtitles = () => {
  if (!mergingSubtitles.value) return
  mergingSubtitles.value = false
  const toMerge = subtitleRows.value.filter(subtitle => subtitle.merge)
  const finalText = toMerge.reduce((acc, subtitle) => acc + ' ' + subtitle.text, '')
  const finalEnd = toMerge[toMerge.length - 1].end
  const last = toMerge.pop()
  last.text = finalText
  last.end = finalEnd
  last.start = toMerge[0].start
  toMerge.forEach(subtitle => {
    const idx = subtitleRows.value.findIndex(x => x.id === subtitle.id)
    subtitleRows.value.splice(idx, 1)
  })
  window.removeEventListener('mouseup', mergeSubtitles)
}

const calculateCPS = item => {
  const duration = (item.end - item.start) / 1000
  const chars = item.text.length
  return numFixed(chars / duration, 2)
}
const colorizeCPS = item => {
  const cps = calculateCPS(item)
  if (cps < 14) return 'orange'
  if (cps < 21) return ''
  return 'red'
}
const calculateDuration = item => {
  item.duration = numFixed((item.end - item.start) / 1000, 2)
  return item.duration
}
const activateSubtitleSibling = (e, sibling = 1) => {
  // if (document.activeElement?.tagName === 'INPUT' && !e.ctrlKey) e.stopPropagation()
  if (document.activeElement) {
    document.activeElement.blur()
    subtitleTable.value.focus()
  }
  let nextIndex = subtitleRows.value.findIndex(x => x.active) + sibling
  if (nextIndex < 0) nextIndex = subtitleRows.value.length - 1
  if (nextIndex >= subtitleRows.value.length) nextIndex = 0
  const subtitleToActivate = subtitleRows.value[nextIndex]
  if (!subtitleToActivate) return
  emit('activate-subtitle', subtitleToActivate)
}
const playFromActiveSubtitle = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  emit('play-subtitle', (activeSubtitle?.start || 0) / 1000)
}
const selectActiveSubtitle = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  const activeSubtitleInput = document.getElementById(`text_${activeSubtitle.id}`)
  if (document.activeElement === activeSubtitleInput) {
    activeSubtitleInput.blur()
    subtitleTable.value.focus()
  } else {
    activeSubtitleInput.focus()
  }
}
const duplicateActiveSubtitle = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  const idx = subtitleRows.value.findIndex(x => x.id === activeSubtitle.id)
  const newSubtitle = { ...activeSubtitle, id: uniqueId(), active: false }
  subtitleRows.value.splice(idx + 1, 0, newSubtitle)
  emit('update-subtitles', subtitleRows.value)
}
const splitActiveSubtitle = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  const idx = subtitleRows.value.findIndex(x => x.id === activeSubtitle.id)
  splitSubtitles(idx)
}
const addSubtitleAfterActive = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  emit('add-subtitle', activeSubtitle)
}
const addItalic = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  const idx = subtitleRows.value.findIndex(x => x.id === activeSubtitle.id)
  if (activeSubtitle.text.startsWith('<i>')) {
    subtitleRows.value[idx].text = activeSubtitle.text.replace('<i>', '').replace('</i>', '')
    return
  }
  subtitleRows.value[idx].text = `<i>${subtitleRows.value[idx].text}</i>`
}
const createConversation = () => {
  const activeSubtitle = subtitleRows.value.find(x => x.active)
  if (!activeSubtitle) return
  const split = smartSplit(activeSubtitle.text)
  const newText = `- ${split[0]}\n- ${split[1]}`
  const idx = subtitleRows.value.findIndex(x => x.id === activeSubtitle.id)
  subtitleRows.value[idx].text = newText
}
const handleMultipleKeyCombinations = e => {
  if (document.activeElement.tagName === 'INPUT' && e.key.length === 1) return
  const keyConfigurations = [
    { targetKey: 'ArrowDown', callback: () => activateSubtitleSibling(e, 1) },
    { targetKey: 'ArrowUp', callback: () => activateSubtitleSibling(e, -1) },
    { targetKey: 'q', callback: playFromActiveSubtitle },
    { targetKey: 'Enter', callback: selectActiveSubtitle },
    { targetKey: 'D', shift: true, callback: duplicateActiveSubtitle },
    { targetKey: 'S', shift: true, callback: splitActiveSubtitle },
    { targetKey: 'Insert', callback: addSubtitleAfterActive },
    { targetKey: 'i', callback: addItalic },
    { targetKey: 'o', callback: createConversation },
    { targetKey: 'Escape', callback: deactivateAllSubtitles },
  ]
  keyConfigurations.forEach(config => {
    handleKeyCombination({
      e,
      targetKey: config.targetKey,
      shift: config.shift || false,
      callback: config.callback,
    })
  })
}
const isHover = item => {
  const isActive = subtitleRows.value.some(x => x.active)
  return item.id !== undefined && item.hover && !isActive
}
const deactivateAllSubtitles = () => {
  subtitleRows.value.forEach(subtitle => (subtitle.active = false))
  document.activeElement?.blur()
}
watch(
  () => props.subtitles,
  () => {
    subtitleRows.value = props.subtitles
  },
  { deep: true },
)
</script>

<template>
  <div
    ref="subtitleTable"
    class="table d-flex flex-column ga-1 no-focus-outline"
    style="padding: 2.5rem 0 1rem 0"
    tabindex="0"
    @keydown="handleMultipleKeyCombinations"
  >
    <perfect-scrollbar>
      <div class="table_row d-flex w-100 ga-1">
        <div
          v-for="header in headers"
          :key="header.value"
          class="table_cell"
          :style="{ width: header.width }"
        >
          <span v-if="header.value !== 'actions'">{{ header.title }}</span>
        </div>
      </div>
      <div
        class="table_row d-flex w-100 ga-1"
        :class="{
          table_row_hover: isHover(item),
          table_row_active: item.active && item.id !== undefined,
          table_row_merge: item.merge,
        }"
        v-for="(item, idx) in subtitleRows"
        :key="item.id"
        @mouseover="
          () => {
            $emit('hover-subtitle', item.id)
            item.hover = true
            if (mergingSubtitles) item.merge = true
          }
        "
        @mouseleave="() => (item.hover = false)"
        @click="$emit('activate-subtitle', item)"
      >
        <div
          v-for="header in headers"
          :key="header.value"
          class="table_cell"
          :style="{ width: header.width }"
        >
          <span
            v-if="header.value === 'cps'"
            :style="{ color: colorizeCPS(item) }"
          >
            {{ calculateCPS(item) }}
          </span>
          <span v-else-if="header.value === 'duration'"> {{ calculateDuration(item) }} s </span>
          <div
            v-else-if="header.value === 'actions' && item.active"
            class="d-flex ga-1 table_cell"
            style="width: 4rem"
          >
            <ActionBtn
              size="small"
              icon="mdi-arrow-split-horizontal"
              class="my-auto"
              tooltip="Split"
              @click="splitSubtitles(idx)"
            />
            <ActionBtn
              :rotate="90"
              size="small"
              class="my-auto"
              icon="mdi-table-merge-cells"
              tooltip="Merge (hold & move mouse)"
              @mousedown="startMerging"
            />
            <ActionBtn
              size="small"
              icon="mdi-plus"
              class="my-auto"
              tooltip="Add subtitle after"
              @click="$emit('add-subtitle', item)"
            />
            <ActionBtn
              size="small"
              icon="mdi-delete"
              class="my-auto"
              tooltip="Delete"
              @click="$emit('delete-subtitle', item)"
            />
          </div>
          <input
            v-else
            :id="`text_${item.id}`"
            :style="{
              flexGrow: header.title === 'Subtitle text' ? 1 : 0,
              width: header.width,
            }"
            spellcheck="true"
            :disabled="item.id === undefined"
            v-model="item[header.value]"
            @input="$emit('update-subtitle', { item, index: idx })"
          />
        </div>
      </div>
    </perfect-scrollbar>
  </div>
</template>

<style scoped lang="scss">
.table:focus,
input:focus {
  outline: none;
}
.table {
  background-color: var(--clr-background);
  border: 2px var(--clr-white) solid;
  border-radius: 20px;
  padding: 0.5rem;
  --clr-cell: var(--clr-white);
  &_row_hover {
    background-color: rgba(var(--clr-primary-rgb), 0.2);
    --clr-cell: var(--clr-white) !important;
  }
  &_row_active {
    background-color: rgba(var(--clr-primary-rgb), 0.4);
    --clr-cell: var(--clr-white) !important;
  }
  &_row_merge {
    background-color: aqua;
    font-weight: bold;
  }
}
.table_cell {
  height: 1.5rem;
  flex-grow: 1;
  text-align: left;
}
.table_row {
  align-items: center;
}
.ps {
  height: calc(70vh * 0.5);
  padding: 0.5rem;
}
</style>
