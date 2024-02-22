<template>
  <div
    v-if="!file"
    class="container_button wrapper"
    @click="pickFile"
  >
    <div class="d-flex align-center flex-column ma-auto">
      <v-icon style="font-size: 78px">mdi-upload</v-icon>
      <span style="font-size: 24px">Upload Video</span>
      <input
        type="file"
        ref="fileInput"
        @change="$emit('update:file', $event)"
        accept="video/*"
        style="display: none"
      />
    </div>
  </div>
  <div
    v-else
    class="wrapper d-flex"
    @mouseover="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="mx-auto">
      <div
        v-if="hovered"
        class="d-flex align-center justify-space-between"
        style="
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          color: black;
          width: calc(100% - 3rem);
        "
      >
        <div>
          <span>{{ filename || file }}</span>
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
      <video
        style="height: 100%; border-radius: 20px"
        class="ma-auto"
        ref="video_player"
        :src="file"
        @timeupdate="handleTimeUpdate"
        controls
        muted
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'SolfigrGmfForm',
  emits: ['update:time', 'update:file'],
  props: {
    file: { String, default: '' },
    filename: { String, default: '' },
    audioContext: null,
    analyser: null,
    animationId: null,
  },
  data() {
    return {
      time: 0,
      actions: [
        { icon: 'mdi-content-save', method: this.saveVideo },
        { icon: 'mdi-pencil', method: this.changeVideo },
        { icon: 'mdi-close', method: this.clearVideo },
      ],
      hovered: false,
    }
  },
  mounted() {
    this.setVideoTime()
  },
  methods: {
    async pickFile() {
      const { data } = await this.$apiService.sendMessage('open-file-dialog', {}, {})
      this.$emit('update:file', data)
    },
    setVideoTime() {
      if (!this.$refs.video_player) return
      this.$refs.video_player.currentTime = this.time
    },
    handleTimeUpdate() {
      this.time = this.$refs.video_player.currentTime
      this.$emit('update:time', this.time)
    },
    saveVideo() {
      console.log('Save Video')
    },
    changeVideo() {
      this.$refs.fileInput.click()
    },
    clearVideo() {
      this.$emit('update:file', '')
    },
  },
  watch: {
    file() {
      this.$emit('update:file', this.file)
    },
  },
}
</script>

<style scoped>
.ss_icon {
  min-width: 20px;
  height: 20px;
  padding: 2px;
  border-radius: 4px;
}
.wrapper {
  height: 53%;
}
</style>
