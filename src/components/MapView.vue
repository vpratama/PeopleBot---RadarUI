<template>
  <div class="map-wrap">
    <div id="leaflet-map"></div>
    <div class="map-overlay">
      <div class="info-card">
        <div>📍 PeopleBot Position</div>
        <div class="coords">{{ lat.toFixed(6) }}, {{ lng.toFixed(6) }}</div>
        <div class="sensor-mini">
          <div v-for="(d,i) in sensors" :key="i" class="mini">
            <span class="mini-angle">{{ angles[i] }}°</span>
            <span :style="{color: getColor(d)}">{{ d }}mm</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref } from 'vue'
import L from 'leaflet'

const props = defineProps({
  sensors: { type: Array, default: () => [0,0,0,0,0,0,0,0] }
})

const lat = ref(-6.9175)
const lng = ref(107.6191)
const angles = [0,45,90,135,180,225,270,315]

let map = null
let robotMarker = null
let obstacleLayers = []

function getColor(d){
  if(d<500) return '#ff2a2a'
  if(d<1500) return '#ff8c1a'
  if(d<3000) return '#ffeb3b'
  return '#00ff88'
}

function updateObstacles() {
  obstacleLayers.forEach(l => map.removeLayer(l))
  obstacleLayers = []

  const robotLatLng = L.latLng(lat.value, lng.value)

  props.sensors.forEach((dist, idx) => {
    const angleDeg = angles[idx]
    // scale: 1mm ~ 0.0000009 deg lat (approx for visualization, 1m ~ 0.000009)
    // biar keliatan di map, kalikan 0.000002
    const scale = 0.000002
    const rad = angleDeg * Math.PI/180
    const dLat = -dist * scale * Math.cos(rad)
    const dLng = dist * scale * Math.sin(rad)
    const obsLat = lat.value + dLat
    const obsLng = lng.value + dLng

    // line
    const line = L.polyline([robotLatLng, [obsLat, obsLng]], {
      color: getColor(dist),
      weight: 2,
      opacity: 0.6,
      dashArray: '4,6'
    }).addTo(map)
    obstacleLayers.push(line)

    // circle obstacle
    const circle = L.circle([obsLat, obsLng], {
      radius: Math.max(2, dist/100),
      color: getColor(dist),
      fillColor: getColor(dist),
      fillOpacity: 0.6,
      weight: 1
    }).addTo(map).bindPopup(`Sensor ${idx+1} (${angleDeg}°) : ${dist}mm`)
    obstacleLayers.push(circle)
  })
}

onMounted(() => {
  map = L.map('leaflet-map', { zoomControl: false }).setView([lat.value, lng.value], 19)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map)

  const robotIcon = L.divIcon({
    html: '<div style="background:#00ff88;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #00ff88;display:flex;align-items:center;justify-content:center;font-size:12px">🤖</div>',
    className: '',
    iconSize: [22,22],
    iconAnchor: [11,11]
  })

  robotMarker = L.marker([lat.value, lng.value], { icon: robotIcon }).addTo(map).bindPopup('PeopleBot')
  updateObstacles()
})

watch(() => props.sensors, () => {
  if(map) updateObstacles()
}, { deep: true })
</script>

<style scoped>
.map-wrap { width:100%; height:100%; position:relative; }
#leaflet-map { width:100%; height:100%; background:#0a1210; }
.map-overlay { position:absolute; top:12px; left:12px; z-index:1000; pointer-events:none; }
.info-card { background:rgba(8,18,12,0.92); border:1px solid #1e4d2e; color:#cde; padding:12px; border-radius:8px; font-size:11px; min-width:210px; backdrop-filter: blur(6px); }
.coords { color:#6fbf8a; font-size:10px; margin:4px 0 8px 0; }
.sensor-mini { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
.mini { background:#0a1a12; padding:3px 6px; border-radius:4px; display:flex; justify-content:space-between; }
.mini-angle { color:#5a8a6a; }
</style>
