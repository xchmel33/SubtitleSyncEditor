<template>
  <div
    v-if="!file"
    class="wrapper"
    :class="{ container_button: !hasVideo, 'd-flex': hasVideo, 'pa-0': hasVideo }"
  >
    <div
      class="d-flex align-center flex-column ma-auto w-100 h-100 justify-center"
      :style="`${hasVideo ? 'border-radius: 20px 0 0 20px' : ''}`"
      :class="{ container_button: hasVideo }"
      @click="$refs.fileInput.click()"
    >
      <v-icon style="font-size: 78px">mdi-upload</v-icon>
      <span style="font-size: 24px">Upload Subtitles</span>
      <input
        type="file"
        ref="fileInput"
        @change="handleSubtitleUpload"
        accept=".srt, .vtt, text/vtt, application/x-subrip"
        style="display: none"
      />
    </div>
    <div
      class="d-flex align-center flex-column ma-auto container_button w-100 h-100 justify-center"
      style="border-radius: 0 20px 20px 0"
      v-if="hasVideo"
      @click="extractSubtitles"
    >
      <v-icon style="font-size: 78px">mdi-file-export</v-icon>
      <span style="font-size: 24px">Extract Subtitles</span>
    </div>
  </div>
  <div
    v-else
    class="sub-table_wrapper position-relative"
    @mouseover="hovered = true"
    @mouseleave="hovered = false"
  >
    <div
      v-if="hovered"
      class="d-flex align-center justify-space-between"
      style="position: absolute; top: 0; right: 0.5rem; color: black; width: calc(100% - 1rem)"
    >
      <div>
        <span>{{ file }}</span>
      </div>
      <div class="ml-auto">
        <v-btn
          v-for="action in actions"
          :key="action.icon"
          class="icon_button"
          @click="action.method"
        >
          <v-icon>{{ action.icon }}</v-icon>
        </v-btn>
      </div>
    </div>
    <div class="sub-table d-flex flex-column ga-1 pt-6">
      <div
        class="sub-table_row d-flex w-100"
        :class="{ 'sub-table_row_active': item.active && item.id !== undefined }"
        v-for="item in subtitleRows"
        :key="item.id"
        @mouseover="
          () => {
            $emit('hover-subtitle', item.id)
            item.active = true
          }
        "
        @mouseleave="() => (item.active = false)"
      >
        <input
          class="sub-table_cell"
          v-for="header in headers"
          :key="header.value"
          :style="{
            flexGrow: header.title === 'Subtitle text' ? 1 : 0,
            maxWidth: header.title === 'Subtitle text' ? '20rem' : '6rem',
          }"
          :disabled="item.id === undefined"
          v-model="item[header.value]"
          @input="updateSubtitle(subtitles)"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SubtitleTable',
  emits: ['update-subtitle', 'update-file', 'extract-subtitles', 'hover-subtitle'],
  props: {
    subtitles: {
      type: Array,
      default: () => [],
    },
    hasVideo: {
      type: Boolean,
      default: false,
    },
    file: { String, default: '' },
    rows: { Number, default: 0 },
  },
  data() {
    return {
      headers: [
        { title: 'Start', value: 'start', align: 'center' },
        { title: 'End', value: 'end', align: 'center' },
        { title: 'Subtitle text', value: 'text', align: 'center' },
      ],
      actions: [
        { icon: 'mdi-content-save', method: this.saveSubtitles },
        { icon: 'mdi-pencil', method: this.changeSubtitles },
        { icon: 'mdi-close', method: this.clearSubtitles },
      ],
      hovered: false,
      extracting: false,
    }
  },
  methods: {
    extractSubtitles() {
      this.extracting = true
      this.$emit('extract-subtitles')
    },
    updateSubtitle(subtitle) {
      this.$emit('update-subtitle', subtitle)
    },
    changeSubtitles() {
      this.$refs.fileInput.click()
    },
    saveSubtitles() {
      // TODO
    },
    clearSubtitles() {
      this.$emit('update-subtitle', [])
      this.$emit('update-file', '')
    },
    async loadSubtitles(file) {
      try {
        const { data } = await this.$apiService.sendMessage('load-subtitles', {
          file,
          isPath: true,
        })
        this.$emit('update-subtitle', this.$helpers.parseSubtitles(data))
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    },
    async handleSubtitleUpload(event) {
      const file = event.target.files[0]
      if (!file) {
        // TODO Handle case where no file is selected
        return
      }

      const reader = new FileReader()

      reader.onload = async e => {
        const fileContents = e.target.result

        try {
          const { data } = await this.$apiService.sendMessage('load-subtitles', {
            file: fileContents,
          })

          if (!data) {
            // TODO Handle error: data not received
            return
          }

          this.$emit('update-file', file.name)
          this.$emit('update-subtitle', this.$helpers.parseSubtitles(data))
        } catch (error) {
          // TODO Handle any errors, such as network issues or server errors
          console.error('Error uploading file:', error)
        }
      }

      reader.onerror = error => {
        // TODO Handle errors that occur during the read operation
        console.error('Error reading file:', error)
      }

      reader.readAsText(file) // Read the file as a text string
    },
  },
  watch: {
    subtitles: {
      deep: true,
      handler(newSubtitles) {
        if (this.extracting && newSubtitles.length > 0) {
          this.$emit('update-file', 'Extracted subtitles')
          this.extracting = false
        }
      },
    },
    file: {
      immediate: true,
      handler(newFile) {
        if (newFile && !this.subtitles.length) {
          this.loadSubtitles(newFile)
        }
      },
    },
  },
  computed: {
    filename() {
      return this.file?.split('/').pop() || ''
    },
    subtitleRows() {
      if (this.subtitles.length < this.rows) {
        return [
          ...this.subtitles,
          ...Array(this.rows - this.subtitles.length).fill({
            start: '',
            end: '',
            text: '',
          }),
        ]
      }
      return this.subtitles
    },
  },
}
</script>

<style scoped lang="scss">
.subtitle-table {
  max-width: 600px;
  margin: 0 auto;
}
input:focus {
  outline: none;
  border: none;
}
.sub-table {
  background-color: white;
  border: 2px var(--clr-white) solid;
  border-radius: 20px;
  padding: 0.5rem;
  --clr-cell: var(--clr-gray);
  &_wrapper {
    margin-top: 2rem;
  }
  &_cell {
    color: var(--clr-cell);
    text-align: center;
    display: inline-block;
    flex-shrink: 0;
    flex-basis: 0;
  }
  &_row_active {
    background-color: var(--clr-primary);
    --clr-cell: var(--clr-white) !important;
  }
}
</style>
