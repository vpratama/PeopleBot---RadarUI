<template>
  <div class="app">
    <div class="topbar">
      <div class="brand">🤖 PEOPLEBOT DASHBOARD</div>
      <div class="env-info">HOST:{{ host }} | PORT_WS:{{ wsPort }} | Q:{{ queue }} | USER:{{ user }}</div>
    </div>
    <div class="main">
      <div class="left">
        <div class="radar-panel">
          <Radar360 :sensors="sensorData" />
        </div>
        <div class="log-panel">
          <SensorLog :logs="logs" :status="status" :debug="debug" />
        </div>
      </div>
      <div class="right">
        <MapView :sensors="sensorData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Radar360 from './components/Radar360.vue'
import SensorLog from './components/SensorLog.vue'
import MapView from './components/MapView.vue'
import { useRabbitMQ } from './composables/useRabbitMQ.js'

const sensorData = ref([315,2917,3009,4820,548,1753,2895,1818])

const host = import.meta.env.VITE_RABBITMQ_HOST || 'localhost'
const wsPort = import.meta.env.VITE_RABBITMQ_WS_PORT || '15674'
const queue = import.meta.env.VITE_RABBITMQ_QUEUE_SENSOR || 'sensor'
const user = import.meta.env.VITE_RABBITMQ_USER || 'luluka'

const onSensorData = (parsed) => {
  sensorData.value = parsed
}

const { status, logs, debug } = useRabbitMQ(onSensorData)
</script>

<style>
.app { display:flex; flex-direction:column; height:100vh; background:#050805; }
.topbar { height:36px; background:#0a1a12; border-bottom:1px solid #1a3a26; display:flex; align-items:center; justify-content:space-between; padding:0 14px; }
.brand { color:#00ff88; font-weight:800; font-size:13px; letter-spacing:1.5px; }
.env-info { color:#4a7a5a; font-size:10px; }
.main { flex:1; display:flex; overflow:hidden; }
.left { width:38%; display:flex; flex-direction:column; border-right:1px solid #1a3a26; }
.radar-panel { height:50%; border-bottom:1px solid #1a3a26; }
.log-panel { height:50%; }
.right { width:62%; }
@media (max-width: 900px){
  .main { flex-direction:column; }
  .left { width:100%; height:60%; }
  .right { width:100%; height:40%; }
}
</style>
