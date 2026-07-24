<template>
  <div class="radar-wrap">
    <div class="header">
      <span class="title">RADAR 360° - REALTIME</span>
      <span class="range">MAX 6000mm</span>
    </div>
    <div class="canvas-container">
      <canvas ref="canvasRef" width="460" height="460"></canvas>
      <div class="center-dot"></div>
    </div>
    <div class="legend">
      <span><i class="dot red"></i> &lt;500mm</span>
      <span><i class="dot orange"></i> &lt;1500mm</span>
      <span><i class="dot yellow"></i> &lt;3000mm</span>
      <span><i class="dot green"></i> &gt;3000mm</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  sensors: { type: Array, default: () => [0,0,0,0,0,0,0,0] }
})

const canvasRef = ref(null)
let animId = null
let sweepAngle = 0

const SENSOR_MAP = [
  { id: 1, label: 'Depan', angle: 0 },
  { id: 2, label: 'Depan-Kanan', angle: 45 },
  { id: 3, label: 'Kanan', angle: 90 },
  { id: 4, label: 'Belakang-Kanan', angle: 135 },
  { id: 5, label: 'Belakang', angle: 180 },
  { id: 6, label: 'Belakang-Kiri', angle: 225 },
  { id: 7, label: 'Kiri', angle: 270 },
  { id: 8, label: 'Depan-Kiri', angle: 315 },
]

function getColor(dist) {
  if (dist < 500) return '#ff2a2a'
  if (dist < 1500) return '#ff8c1a'
  if (dist < 3000) return '#ffeb3b'
  return '#00ff88'
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const cx = W/2
  const cy = H/2
  const maxRadius = 190

  ctx.clearRect(0,0,W,H)
  
  // background
  ctx.fillStyle = '#0a1210'
  ctx.fillRect(0,0,W,H)

  // grid circles
  for(let i=1;i<=4;i++){
    ctx.beginPath()
    ctx.arc(cx, cy, (maxRadius/4)*i, 0, Math.PI*2)
    ctx.strokeStyle = i===4 ? '#1e4d2e' : '#123122'
    ctx.lineWidth = i===4 ? 1.5 : 0.7
    ctx.stroke()
    // range label
    ctx.fillStyle = '#2a5a3a'
    ctx.font = '10px monospace'
    ctx.fillText(`${(6000/4)*i}mm`, cx+5, cy - (maxRadius/4)*i + 12)
  }

  // axis lines
  SENSOR_MAP.forEach(s => {
    const rad = s.angle * Math.PI/180
    const x = cx + maxRadius * Math.sin(rad)
    const y = cy - maxRadius * Math.cos(rad)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#162d1e'
    ctx.lineWidth = 0.8
    ctx.setLineDash([4,6])
    ctx.stroke()
    ctx.setLineDash([])

    // label
    const lx = cx + (maxRadius+28) * Math.sin(rad)
    const ly = cy - (maxRadius+28) * Math.cos(rad)
    ctx.fillStyle = '#6fbf8a'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${s.angle}°`, lx, ly)
    ctx.font = '9px monospace'
    ctx.fillStyle = '#4a7a5a'
    ctx.fillText(s.label, lx, ly+10)
  })

  // sweep
  sweepAngle = (sweepAngle + 1.2) % 360
  const sweepRad = sweepAngle * Math.PI/180
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + maxRadius * Math.sin(sweepRad), cy - maxRadius * Math.cos(sweepRad))
  ctx.strokeStyle = 'rgba(0,255,136,0.6)'
  ctx.lineWidth = 2
  ctx.stroke()
  // sweep trail
  const grad = ctx.createConicGradient(sweepRad - Math.PI/2, cx, cy)
  grad.addColorStop(0, 'rgba(0,255,136,0)')
  grad.addColorStop(0.9, 'rgba(0,255,136,0.05)')
  grad.addColorStop(1, 'rgba(0,255,136,0.2)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(cx,cy)
  ctx.arc(cx,cy,maxRadius, sweepRad - 0.5, sweepRad)
  ctx.closePath()
  ctx.fill()

  // sensors
  props.sensors.forEach((dist, idx) => {
    const map = SENSOR_MAP[idx]
    if (!map) return
    const angle = map.angle * Math.PI/180
    const r = Math.min(dist, 6000) / 6000 * maxRadius
    const x = cx + r * Math.sin(angle)
    const y = cy - r * Math.cos(angle)
    
    // line to point
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.strokeStyle = getColor(dist) + '60'
    ctx.lineWidth = 1
    ctx.stroke()

    // glow
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI*2)
    ctx.fillStyle = getColor(dist) + '30'
    ctx.fill()

    // point
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI*2)
    ctx.fillStyle = getColor(dist)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.stroke()

    // distance text
    ctx.fillStyle = '#fff'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    const tx = cx + (r+16) * Math.sin(angle)
    const ty = cy - (r+16) * Math.cos(angle)
    ctx.fillText(`${dist}`, tx, ty)
  })

  // center robot
  ctx.beginPath()
  ctx.arc(cx, cy, 14, 0, Math.PI*2)
  ctx.fillStyle = '#0f2a1a'
  ctx.fill()
  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#00ff88'
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('BOT', cx, cy+3)

  animId = requestAnimationFrame(draw)
}

onMounted(() => { draw() })
onBeforeUnmount(() => { if(animId) cancelAnimationFrame(animId) })
watch(() => props.sensors, () => {}, { deep: true })
</script>

<style scoped>
.radar-wrap { height: 100%; display: flex; flex-direction: column; background: #0a1210; padding: 10px; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-bottom: 1px solid #143a22; }
.title { color: #00ff88; font-weight: bold; font-size: 13px; letter-spacing: 1px; }
.range { color: #4a7a5a; font-size: 10px; }
.canvas-container { flex:1; display:flex; align-items:center; justify-content:center; position: relative; }
.legend { display:flex; gap:12px; justify-content:center; padding:6px; font-size:10px; color:#6a9a7a; border-top: 1px solid #143a22; }
.dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:4px; }
.dot.red { background:#ff2a2a } .dot.orange{background:#ff8c1a} .dot.yellow{background:#ffeb3b} .dot.green{background:#00ff88}
.center-dot { display:none }
</style>
