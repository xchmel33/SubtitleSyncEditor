<template>
  <div class="d-flex ga-4">
    <div
      style="width: 26vw; height: 60vh"
      v-for="(video, idx) in videos"
      :key="video.id"
      class="d-flex position-relative"
    >
      <div class="w-100 d-flex flex-column">
        <VideoPlayer
          class="mb-4"
          :file="video.file"
          @update:file="videos[idx].file = $event"
        />
        <SubtitleTable
          :rows="maxSubtitles"
          :subtitles="video.subtitles"
          :has-video="!!video.file"
          :file="video.subtitle_file"
          @update-file="videos[idx].subtitle_file = $event"
          @update-subtitle="handleSubtitleUpdate($event, idx)"
          @extract-subtitles="() => extractSubtitles(idx)"
          @hover-subtitle="handleHoverSubtitle($event, idx)"
        />
      </div>
      <div
        style="position: absolute; right: 0; top: 50%; transform: translateX(66%); z-index: 1"
        v-if="video.file && videos[idx + 1].id !== -1"
      >
        <v-btn
          icon
          small
          style="border: 1px solid white"
          :class="`icon_button_link${video.sync ? '_active' : ''}`"
          @click="matchSubtitles(idx)"
          ><v-icon color="white">mdi-link</v-icon></v-btn
        >
      </div>
    </div>
  </div>
  <div class="d-flex">
    <div
      style="overflow-x: auto"
      class="d-flex flex-column ga-4"
    >
      <div
        v-for="video in videos.filter(x => x.id !== -1)"
        :key="video.id"
      >
        <WaveForm
          :videoSubtitles="video.subtitles"
          :video-name="video.file"
          :zoom-level="zoomLevel"
          :ws-start-pos="wsStartPos"
        />
        <!--        @update-subtitle="handleSubtitleUpdate"-->
      </div>
    </div>
    <div class="h-100 d-flex justify-center align-center ga-5">
      <div class="d-flex align-center mb-5">
        <label
          for="time-zoom"
          class="rotated_input_label"
          >Time zoom</label
        >
        <input
          type="range"
          id="time-zoom"
          min="2"
          step="2"
          max="100"
          v-model="zoomLevel"
          class="rotated_input"
        />
      </div>
      <div class="d-flex align-center mb-5">
        <label
          for="wave-zoom"
          class="rotated_input_label"
          >Wave zoom</label
        >
        <input
          type="range"
          id="wave-zoom"
          min="50"
          max="100"
          step="2"
          v-model="wsStartPos"
          class="rotated_input"
        />
      </div>
    </div>
  </div>
  <transition name="slide-down">
    <v-alert
      type="error"
      v-if="error"
      class="position-fixed mt-4 alert"
      style="top: 0; left: 50%; transform: translateX(-50%); z-index: 99"
      @click="error = ''"
    >
      {{ error }}
    </v-alert>
  </transition>
</template>
<script>
import VideoPlayer from './components/VideoPlayer.vue'
import SubtitleTable from '@/components/SubtitleTable.vue'
import { defineAsyncComponent } from 'vue'
import { parseSubtitles, compareSubtitles } from '@/helpers'

export default {
  name: 'App',
  data() {
    return {
      videos: [
        {
          id: 0,
          file: 'videos/ai_story_long_effects.mp4',
          subtitles: [],
          subtitle_file: 'videos/ai_story.srt',
          sync: false,
        },
        {
          id: 1,
          file: 'videos/siete.mkv',
          subtitles: [],
          subtitle_file: 'videos/output.srt',
          sync: false,
        },
        {
          id: -1,
          file: '',
          filename: '',
          subtitles: [],
          sync: false,
        },
      ],
      activeSubtitles: [],
      zoomLevel: 70,
      wsStartPos: 64,
    }
  },
  components: {
    WaveForm: defineAsyncComponent(() => import('./components/WaveForm.vue')),
    VideoPlayer,
    SubtitleTable,
  },
  methods: {
    handleSubtitleUpdate(subtitles, idx) {
      this.videos[idx].subtitles = subtitles
      subtitles.forEach(subtitle => {
        if (subtitle.match) {
          const { subtitleId, videoId } = subtitle.match
          this.videos[videoId].subtitles[subtitleId].text = subtitle.text
          this.videos[videoId].subtitles[subtitleId].start = subtitle.start
          this.videos[videoId].subtitles[subtitleId].end = subtitle.end
        }
      })
    },
    handleHoverSubtitle(subtitle, videoIdx) {
      if (!this.videos[videoIdx].sync) return
      this.activeSubtitles.forEach(subtitle => (subtitle.active = false))
      if (this.videos[videoIdx].subtitles[subtitle].match) {
        const { subtitleId, videoId } = this.videos[videoIdx].subtitles[subtitle].match
        this.videos[videoId].subtitles[subtitleId].active = true
        this.activeSubtitles.push(this.videos[videoId].subtitles[subtitleId])
      }
    },
    matchSubtitles(index) {
      const match = compareSubtitles(
        this.videos[index].subtitles,
        this.videos[index + 1].subtitles,
        index,
      )
      if (match) this.videos[index].sync = !this.videos[index].sync
      console.log('Subtitles matched:', match)
    },
    async extractSubtitles(index) {
      try {
        const { data } = await this.$apiService.sendMessage('extract-subtitles', {
          file: this.videos[index].file,
        })
        if (data) {
          console.log('Subtitles:', data)
          this.videos[index].subtitles = parseSubtitles(data)
        }
      } catch (error) {
        console.error('Error extracting subtitles:', error)
        this.error = error?.response?.data?.error || ''
      }
    },
  },
  computed: {
    maxSubtitles() {
      return Math.max(...this.videos.map(video => video.subtitles?.length || 0))
    },
    error: {
      get() {
        return this.$error.message
      },
      set(value) {
        this.$error.message = value
      },
    },
  },
}
</script>
<style>
/* Transition enter and leave active */
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

/* Starting state for entering */
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px); /* Start slightly above */
}

/* Ending state for entering */
.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Starting state for leaving */
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Ending state for leaving */
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px); /* Move up slightly */
}
.rotated_input,
.rotated_input_label {
  writing-mode: vertical-lr; /* Rotate the text */
  transform: rotate(180deg); /* Flip the text so it reads from bottom to top */
  text-align: center;
}
.rotated_input {
  cursor: pointer;
  height: 300px;
  -webkit-appearance: slider-vertical; /* For WebKit browsers */
}
</style>
