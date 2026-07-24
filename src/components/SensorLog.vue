<template>
  <div class="log-wrap">
    <div class="log-header">
      <div class="status">
        <span class="status-dot" :class="statusClass"></span>
        <span class="status-text">{{ status }}</span>
        <span class="queue">QUEUE: {{ queueName }} (dest: /amq/queue/{{ queueName }})</span>
      </div>
      <div class="actions">
        <button @click="clear">CLEAR</button>
      </div>
    </div>
    <div v-if="debug && debug.length" class="debug-area">
      <div class="debug-title">DEBUG CONNECTION:</div>
      <div v-for="(d,i) in debug" :key="i" class="debug-line">{{ d }}</div>
    </div>
    <div class="log-list" ref="listRef">
      <div v-if="logs.length===0" class="empty">
        Menunggu data dari RabbitMQ...<br/>
        Format harus: 315,2917,3009,4820,548,1753,2895,1818<br/>
        <b>Pastikan:</b><br/>
        1. rabbitmq-plugins enable rabbitmq_web_stomp<br/>
        2. Queue 'sensor' sudah dibuat (durable)<br/>
        3. Konek ke ws://localhost:15674/ws bukan 5672
      </div>
      <div v-for="(log, i) in logs" :key="log.timestamp + '-' + i" class="log-item">
        <div class="log-time">[{{ log.time }}]</div>
        <div class="log-raw">{{ log.raw }}</div>
        <div class="log-parsed">
          <div v-for="(d, idx) in log.parsed" :key="idx" class="sensor-line" :style="{ color: getColor(d) }">
            Sensor {{ idx+1 }} ({{ labels[idx].label }} {{ labels[idx].angle }}°): {{ d }} mm
            <span class="bar"><span :style="{ width: Math.min(d/6000*100,100)+'%', background: getColor(d) }"></span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
const props = defineProps({
  logs: { type: Array, default: () => [] },
  status: { type: String, default: 'DISCONNECTED' },
  debug: { type: Array, default: () => [] }
})

const listRef = ref(null)
const queueName = import.meta.env.VITE_RABBITMQ_QUEUE_SENSOR || 'sensor'

const labels = [
  { label: 'Depan', angle: 0 },
  { label: 'Depan-Kanan', angle: 45 },
  { label: 'Kanan', angle: 90 },
  { label: 'Belakang-Kanan', angle: 135 },
  { label: 'Belakang', angle: 180 },
  { label: 'Belakang-Kiri', angle: 225 },
  { label: 'Kiri', angle: 270 },
  { label: 'Depan-Kiri', angle: 315 },
]

const statusClass = computed(() => {
  if (props.status.includes('CONNECTED')) return 'ok'
  if (props.status.includes('MOCK')) return 'mock'
  if (props.status.includes('CONNECTING')) return 'warn'
  return 'err'
})

function getColor(d){
  if(d<500) return '#ff4d4d'
  if(d<1500) return '#ff9f1a'
  if(d<3000) return '#ffe135'
  return '#00ff88'
}

watch(() => props.logs.length, () => {
  if(listRef.value) listRef.value.scrollTop = 0
})

function clear(){
  props.logs.splice(0)
}
</script>

<style scoped>
.log-wrap { height:100%; display:flex; flex-direction:column; background:#080d0a; }
.log-header { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#0e1a12; border-bottom:1px solid #1a3a26; font-size:11px; }
.status { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.status-dot { width:9px; height:9px; border-radius:50%; display:inline-block; }
.status-dot.ok { background:#00ff88; box-shadow:0 0 8px #00ff88; }
.status-dot.mock { background:#ffcc00; box-shadow:0 0 8px #ffcc00; }
.status-dot.warn { background:#ff9f1a; animation:pulse 1s infinite; }
.status-dot.err { background:#ff2a2a; }
@keyframes pulse { 0%{opacity:1} 50%{opacity:0.4} 100%{opacity:1} }
.status-text { color:#cde; font-weight:bold; }
.queue { color:#5a8a6a; margin-left:8px; font-size:10px; }
.actions button { background:#143a22; border:1px solid #1e5a32; color:#6fbf8a; padding:3px 10px; font-size:10px; cursor:pointer; }
.debug-area { background:#0a1a12; border-bottom:1px solid #1a3a26; padding:6px 10px; max-height:100px; overflow-y:auto; font-size:10px; }
.debug-title { color:#ffcc00; font-weight:bold; margin-bottom:4px; }
.debug-line { color:#8fbf9f; line-height:1.4; }
.log-list { flex:1; overflow-y:auto; padding:8px; font-size:11px; line-height:1.5; }
.empty { color:#4a6a5a; font-style:italic; padding:20px; text-align:center; line-height:1.8; }
.log-item { border-bottom:1px solid #112216; padding:8px 0; }
.log-time { color:#5a8a6a; font-size:10px; }
.log-raw { color:#8fbf9f; background:#0a1a12; padding:4px 6px; margin:4px 0; border-left:2px solid #1e5a32; word-break:break-all; }
.log-parsed { padding-left:8px; }
.sensor-line { display:flex; gap:8px; align-items:center; margin:2px 0; }
.bar { width:60px; height:4px; background:#112216; display:inline-block; border-radius:2px; overflow:hidden; }
.bar span { display:block; height:100%; }
</style>
