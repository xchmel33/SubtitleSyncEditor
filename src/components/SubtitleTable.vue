<script setup>
import ActionBtn from '@/components/lib/ActionBtn.vue'
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { numFixed, smartSplit, uniqueId } from '@/utilities/helpers'
import { handleKeyCombination } from '@/utilities/listeners'

const props = defineProps({
  subtitles: {
    type: Array,
    default: () => [],
  },
  activeSubtitleProp: { Object, default: () => null },
  testPrefix: String,
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
const mergingSubtitles = ref(false)
const headers = reactive([
  { title: 'Align', value: 'aligned', align: 'center', width: '6%' },
  { title: 'Len', value: 'duration', align: 'center', width: '7%' },
  { title: 'CPS', value: 'cps', align: 'center', width: '7%' },
  { title: 'Subtitle text', value: 'text', align: 'left', width: '63%' },
  { title: 'Actions', value: 'actions', align: 'right', width: '15%' },
])
const activeSubtitle = ref(props.activeSubtitleProp)
const splitSubtitles = idx => {
  const subtitle = props.subtitles[idx]
  const split = smartSplit(subtitle.text)
  const duration = subtitle.end - subtitle.start
  const end = subtitle.end
  subtitle.text = split[0]
  subtitle.end = subtitle.start + duration / 2
  emit('update-subtitle', { item: subtitle, index: idx })
  emit('add-subtitle', {
    newSubtitle: {
      start: subtitle.start + duration / 2,
      end,
      text: split[1],
      id: uniqueId(),
    },
    after: subtitle,
    afterIndex: idx,
  })
}

const startMerging = () => {
  mergingSubtitles.value = true
  activeSubtitle.value.merge = true
  window.addEventListener('mouseup', mergeSubtitles)
}
const mergeSubtitles = () => {
  if (!mergingSubtitles.value) return
  mergingSubtitles.value = false
  const toMerge = props.subtitles.filter(subtitle => subtitle.merge)
  const finalText = toMerge.reduce((acc, subtitle) => acc + ' ' + subtitle.text, '')
  const finalEnd = toMerge[toMerge.length - 1].end
  const last = toMerge.pop()
  last.text = finalText
  last.end = finalEnd
  last.start = toMerge[0].start
  last.merge = false
  emit('update-subtitle', { item: last, index: props.subtitles.indexOf(last) })
  toMerge.forEach(subtitle => {
    emit('delete-subtitle', subtitle)
  })
  activeSubtitle.value.merge = false
  window.removeEventListener('mouseup', mergeSubtitles)
}

const calculateCPS = item => {
  const duration = (item.end - item.start) / 1000
  const chars = item.text?.length || 0
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
const activateSubtitle = (index, scroll = false) => {
  if (!props.subtitles[index]) {
    console.log('No subtitle at index', index)
    return
  }
  activeSubtitle.value = props.subtitles[index]
  if (scroll)
    document.getElementById(`subtitle_${activeSubtitle.value.id}`).scrollIntoView({
      block: 'center',
    })
  emit('activate-subtitle', activeSubtitle.value)
}
const activateSubtitleSibling = (e, sibling = 1) => {
  e.stopPropagation()
  // if (document.activeElement?.tagName === 'INPUT' && !e.ctrlKey) e.stopPropagation()
  if (!activeSubtitle.value) return activateSubtitle(0)
  if (document.activeElement) {
    document.activeElement.blur()
    subtitleTable.value.focus()
  }
  let nextIndex = props.subtitles.indexOf(activeSubtitle.value) + sibling
  if (nextIndex < 0) nextIndex = props.subtitles.length - 1
  if (nextIndex >= props.subtitles.length) nextIndex = 0
  activateSubtitle(nextIndex, true)
}
const playFromActiveSubtitle = () => {
  if (!activeSubtitle.value) return
  emit('play-subtitle', (activeSubtitle.value.start || 0) / 1000)
}
const selectActiveSubtitle = () => {
  if (!activeSubtitle.value) return
  const activeSubtitleInput = document.getElementById(`text_${activeSubtitle.value.id}`)
  if (document.activeElement === activeSubtitleInput) {
    activeSubtitleInput.blur()
    subtitleTable.value.focus()
  } else {
    activeSubtitleInput.focus()
  }
}
const duplicateActiveSubtitle = () => {
  if (!activeSubtitle.value) return
  const idx = props.subtitles.indexOf(activeSubtitle.value)
  const newSubtitle = {
    text: activeSubtitle.value.text,
    id: uniqueId(),
    start: activeSubtitle.value.end + 10,
    end: activeSubtitle.value.end + 10 + (activeSubtitle.value.end - activeSubtitle.value.start),
  }
  emit('add-subtitle', { after: activeSubtitle.value, afterIndex: idx, newSubtitle })
}
const splitActiveSubtitle = () => {
  if (!activeSubtitle.value) return
  splitSubtitles(props.subtitles.indexOf(activeSubtitle.value))
}
const addSubtitleAfterActive = () => {
  if (!activeSubtitle.value) return
  emit('add-subtitle', {
    after: activeSubtitle.value,
    afterIndex: props.subtitles.indexOf(activeSubtitle.value),
  })
}
const addItalic = () => {
  if (!activeSubtitle.value) return
  if (activeSubtitle.value?.text.startsWith('<i>')) {
    activeSubtitle.value.text = activeSubtitle.value?.text.replace('<i>', '').replace('</i>', '')
    return
  }
  activeSubtitle.value.text = `<i>${activeSubtitle.value.text}</i>`
}
const createConversation = () => {
  if (!activeSubtitle.value) return
  const split = smartSplit(activeSubtitle.value?.text || '')
  activeSubtitle.value.text = `- ${split[0]}\n- ${split[1]}`
}
const handleMultipleKeyCombinations = e => {
  console.log('handleMultipleKeyCombinations', e)
  if (document.activeElement.tagName === 'INPUT' && e.key.length === 1) return
  if (!subtitleTable.value.contains(e.target)) return
  const keyConfigurations = [
    { targetKey: 'ArrowDown', callback: () => activateSubtitleSibling(e, 1) },
    { targetKey: 'ArrowUp', callback: () => activateSubtitleSibling(e, -1) },
    {
      targetKey: 'ArrowDown',
      ctrl: true, //
      callback: () => activateSubtitle(0, true),
    },
    {
      targetKey: 'ArrowUp',
      ctrl: true,
      callback: () => activateSubtitle(props.subtitles.length - 1, true),
    },
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
      ctrl: config.ctrl || false,
      callback: config.callback,
    })
  })
}
const deactivateAllSubtitles = () => {
  activeSubtitle.value = null
  document.activeElement?.blur()
  emit('activate-subtitle', null)
}
const scrollToActive = () => {
  if (!activeSubtitle.value || !subtitleTable.value?.querySelector) return
  subtitleTable.value.querySelector('#subtitle_' + activeSubtitle.value.id).scrollIntoView({
    block: 'center',
  })
}

watch(
  () => props.activeSubtitleProp,
  () => {
    activeSubtitle.value = props.activeSubtitleProp
    nextTick().then(() => {
      playFromActiveSubtitle()
      scrollToActive()
    })
  },
  { immediate: false },
)
</script>

<template>
  <div
    ref="subtitleTable"
    class="table d-flex flex-column no-focus-outline"
    style="padding: 2.5rem 0 1rem 0"
    tabindex="0"
    @keydown.stop="handleMultipleKeyCombinations"
  >
    <!--    <div class="table_row table_row_header d-flex w-100 ga-1 mt-2">-->
    <!--      <div-->
    <!--        v-for="header in headers"-->
    <!--        :key="header.value"-->
    <!--        class="table_cell_header mt-auto"-->
    <!--        :class="header.align === 'center' ? 'text-center' : 'text-left'"-->
    <!--        :style="{ width: header.width }"-->
    <!--      >-->
    <!--        <span v-if="header.value !== 'actions'">{{ header.title }}</span>-->
    <!--      </div>-->
    <!--    </div>-->
    <perfect-scrollbar>
      <div
        class="table_row d-flex w-100 ga-1"
        :id="`subtitle_${item.id}`"
        :class="{
          table_row_active: activeSubtitle?.id === item.id,
          table_row_merge: item.merge,
          table_row_hover: !activeSubtitle,
        }"
        v-for="(item, idx) in subtitles.sort((a, b) => a.start - b.start)"
        :key="item.id"
        :data-test="`${testPrefix}_subtitle_row_${idx}`"
        @click="activateSubtitle(idx)"
        @mouseover="
          () => {
            if (mergingSubtitles) item.merge = true
          }
        "
      >
        <div
          v-for="header in headers"
          :key="header.value"
          class="table_cell"
          :style="{ width: header.width }"
        >
          <v-icon
            v-if="header.value === 'aligned'"
            :color="item.aligned ? 'green' : 'red'"
            :icon="item.aligned ? 'mdi-check' : 'mdi-close'"
            :data-test="item.aligned ? `aligned_${idx}` : `not_aligned_${idx}`"
            class="my-auto"
          >
          </v-icon>
          <span
            v-else-if="header.value === 'cps'"
            :style="{ color: colorizeCPS(item) }"
          >
            {{ calculateCPS(item) }}
          </span>
          <span v-else-if="header.value === 'duration'"> {{ calculateDuration(item) }} s </span>
          <div
            v-else-if="header.value === 'actions' && activeSubtitle?.id === item.id"
            class="d-flex ga-1 table_cell"
          >
            <ActionBtn
              data-test="split_subtitle"
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
              @click="addSubtitleAfterActive"
            />
            <ActionBtn
              data-test="delete_subtitle"
              size="small"
              icon="mdi-delete"
              class="my-auto"
              tooltip="Delete"
              @click="$emit('delete-subtitle', item)"
            />
          </div>
          <input
            v-else
            :data-test="header.title === 'Subtitle text' ? `subtitle_input_${idx}` : ''"
            :id="`text_${item.id}`"
            style="width: 100%"
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
  max-height: 100%;
  background-color: var(--clr-background);
  border: 2px var(--clr-white) solid;
  border-radius: 20px;
  padding: 0.5rem;
  --clr-cell: var(--clr-white);
  &_row_active {
    background-color: rgba(var(--clr-primary-rgb), 0.4) !important;
    --clr-cell: var(--clr-white) !important;
  }
  &_row_merge {
    background-color: aqua !important;
  }
}
.table_cell {
  font-size: 0.85rem;
  height: 1.6rem;
}
.table_cell,
.table_cell_header {
  flex-grow: 1;
  margin: auto;
  text-align: left;
}
.table_row {
  margin: auto 0;
  align-items: center;
  height: 1.6rem;
  padding: 0 0.5rem;
}
.table_row_hover:hover {
  background-color: rgba(var(--clr-primary-rgb), 0.2);
  --clr-cell: var(--clr-white) !important;
}
.table_row_aligned {
  background-color: red !important;
}
.ps {
  height: calc(70vh * 0.5);
  padding: 0.5rem;
}
</style>
