import { ref } from 'vue'
import { Client } from '@stomp/stompjs'

export function useRabbitMQ(onData) {
  const status = ref('DISCONNECTED')
  const logs = ref([])
  const debug = ref([])

  const host = import.meta.env.VITE_RABBITMQ_HOST || 'localhost'
  const wsPort = import.meta.env.VITE_RABBITMQ_WS_PORT || '15674'
  const queue = import.meta.env.VITE_RABBITMQ_QUEUE_SENSOR || 'sensor'
  const user = import.meta.env.VITE_RABBITMQ_USER || 'luluka'
  const pass = import.meta.env.VITE_RABBITMQ_PASSWORD || 'arcanashadow'
  const vhost = import.meta.env.VITE_RABBITMQ_VHOST || '/'
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'

  let client = null
  let mockInterval = null

  const addDebug = (msg) => {
    console.log(msg)
    debug.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
    if(debug.value.length>30) debug.value.pop()
  }

  const pushLog = (raw, parsed) => {
    logs.value.unshift({
      time: new Date().toLocaleTimeString('id-ID'),
      timestamp: Date.now(),
      raw,
      parsed: [...parsed]
    })
    if (logs.value.length > 100) logs.value.pop()
  }

  const startMock = () => {
    status.value = 'MOCK - RabbitMQ tidak terkoneksi, pakai data dummy'
    addDebug('MOCK mode aktif')
    mockInterval = setInterval(() => {
      const mock = Array.from({length: 8}, () => Math.floor(100 + Math.random()*5400))
      const raw = mock.join(',')
      onData(mock, raw)
      pushLog(raw, mock)
    }, 700)
  }

  const connect = () => {
    if (useMock) {
      startMock()
      return
    }

    status.value = 'CONNECTING'
    const brokerURL = `ws://${host}:${wsPort}/ws`
    addDebug(`Mencoba konek ke ${brokerURL} user=${user} vhost=${vhost} queue=${queue}`)

    client = new Client({
      brokerURL,
      connectHeaders: {
        login: user,
        passcode: pass,
        host: vhost
      },
      // debug: (str) => console.log('[STOMP DEBUG]', str),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      
      onConnect: () => {
        status.value = 'CONNECTED'
        addDebug(`✅ CONNECTED ke ${brokerURL}`)

        // FIX UTAMA: Untuk queue yang sudah dibuat via AMQP (pika, dll)
        // HARUS pakai /amq/queue/nama_queue, bukan /queue/nama_queue
        // Kita coba 2 destination biar kompatibel
        
        const destinations = [
          `/amq/queue/${queue}`,  // <-- FIX untuk queue AMQP existing
          `/queue/${queue}`       // <-- fallback jika queue dibuat via STOMP
        ]

        destinations.forEach(dest => {
          try {
            addDebug(`Subscribe ke ${dest} ...`)
            client.subscribe(dest, (message) => {
              try {
                const raw = message.body.trim()
                addDebug(`📩 Diterima dari ${dest}: ${raw}`)
                const parts = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
                if (parts.length === 8) {
                  onData(parts, raw)
                  pushLog(raw, parts)
                } else {
                  addDebug(`⚠️ Format salah, harus 8 angka: ${raw}`)
                }
              } catch (e) {
                addDebug(`❌ Parse error: ${e.message}`)
              }
            }, {
              // headers penting untuk RabbitMQ
              durable: true,
              'auto-delete': false
            })
            addDebug(`✅ Subscribed ke ${dest}`)
          } catch(e) {
            addDebug(`❌ Gagal subscribe ${dest}: ${e.message}`)
          }
        })
      },
      
      onStompError: (frame) => {
        const msg = frame.headers['message'] || 'Unknown STOMP error'
        const body = frame.body || ''
        status.value = `STOMP ERROR: ${msg}`
        addDebug(`❌ STOMP ERROR: ${msg} - ${body}`)
        console.error('STOMP error', frame)
      },
      
      onWebSocketError: (evt) => {
        status.value = 'WS ERROR - Cek apakah rabbitmq_web_stomp aktif di port 15674'
        addDebug(`❌ WebSocket Error: Tidak bisa konek ke ws://${host}:${wsPort}/ws - Pastikan: 1) rabbitmq-plugins enable rabbitmq_web_stomp 2) Port 15674 terbuka 3) Tidak pakai https untuk ws`)
        console.error('WebSocket error', evt)
      },
      
      onWebSocketClose: (evt) => {
        if (status.value !== 'MOCK' && !status.value.includes('CONNECTED')) {
          addDebug(`🔌 WebSocket closed code=${evt.code} - akan reconnect...`)
        }
      },
      
      onDisconnect: () => {
        status.value = 'DISCONNECTED'
        addDebug('🔌 Disconnected')
      }
    })

    client.activate()
  }

  const disconnect = () => {
    if (mockInterval) clearInterval(mockInterval)
    if (client) client.deactivate()
  }

  connect()

  return { status, logs, debug, disconnect }
}
