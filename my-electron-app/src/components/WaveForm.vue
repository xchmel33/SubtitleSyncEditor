<template>
  <div style="width: 60vw">
    <div class="my-2">{{ videoName }}</div>
    <div
      ref="waveform"
      id="waveform"
      style="width: 100%"
    ></div>
    <br />
  </div>
</template>

<script>
import WaveSurfer from 'wavesurfer.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'

export default {
  name: 'WaveForm',
  emits: ['load', 'update:subtitles'],
  props: {
    subtitles: {
      type: Array,
      default: () => [],
    },
    videoName: {
      type: String,
      default: '',
    },
    zoomLevel: {
      type: Number,
      default: 85,
    },
    wsStartPos: {
      type: Number,
      default: 100,
    },
  },
  data() {
    return {
      ws: null,
      wsRegions: null,
      wsRegionList: [],
      decoded: false,
    }
  },
  methods: {
    updateRegionsFromSubtitles(subtitles) {
      this.wsRegions.regions.forEach(region => {
        if (region && !region.wasRemoved) {
          region.remove()
          region.wasRemoved = true
          const i = this.wsRegions.regions.indexOf(region)
          delete this.wsRegions.regions[i]
        }
      })
      subtitles.forEach(subtitle => {
        const region = this.wsRegions.addRegion({
          start: subtitle.start / 1000,
          end: subtitle.end / 1000,
          loop: false,
          color: 'hsla(400, 100%, 30%, 0.5)',
          drag: true,
          resize: false,
          content: subtitle.text || ' ',
          contentEditable: true,
        })
        region.subId = subtitle.id
      })
    },
    updateSubtitleFromRegion(region) {
      const subtitleIndex = this.subtitles.findIndex(sub => sub.id === region.subId)
      console.log('updateSubtitleFromRegion', subtitleIndex)
      if (subtitleIndex !== -1) {
        this.subtitles[subtitleIndex].start = region.start * 1000
        this.subtitles[subtitleIndex].end = region.end * 1000
        this.subtitles[subtitleIndex].text = region.content.textContent
        this.$emit('update:subtitles', this.subtitles, subtitleIndex)
      }
    },
    initWaveSurfer() {
      if (this.ws) {
        this.ws.destroy()
      }
      this.ws = WaveSurfer.create({
        container: this.$refs.waveform,
        waveColor: 'violet',
        progressColor: 'purple',
        scrollParent: true,
        fillParent: true,
        media: document.querySelector('video'),
        plugins: [
          Hover.create({
            lineColor: '#ff0000',
            lineWidth: 2,
            labelBackground: '#555',
            labelColor: '#fff',
            labelSize: '11px',
          }),
        ],
      })
      this.wsRegions = this.ws.registerPlugin(RegionsPlugin.create())
      this.wsRegions.on('region-created', region => {
        region.content.style.margin = 'auto'
      })
      this.wsRegions.on('region-updated', region => {
        region.content.style.margin = 'auto'
        this.updateSubtitleFromRegion(region)
      })
      this.ws.on('decode', () => {
        if (this.decoded) return
        this.updateRegionsFromSubtitles(this.subtitles)
        this.decoded = true
      })
      this.ws.on('ready', () => {
        this.$emit('load')
        this.ws.zoom(this.zoomLevel)
      })
    },
  },
  watch: {
    zoomLevel(newVal) {
      this.ws.zoom(newVal)
    },
    wsStartPos(newVal) {
      this.ws.setOptions({ height: newVal })
    },
    subtitles: {
      deep: true,
      handler(newSubtitles) {
        this.updateRegionsFromSubtitles(newSubtitles)
      },
    },
    videoName(newSource, oldSource) {
      if (newSource !== oldSource) {
        this.initWaveSurfer()
      }
    },
  },
  mounted() {
    this.initWaveSurfer()
  },
}
</script>

<style></style>
