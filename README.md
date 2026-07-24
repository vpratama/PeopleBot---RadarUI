# PeopleBot Dashboard - Vue + RabbitMQ

Aplikasi Vue 3 yang konek LANGSUNG ke RabbitMQ via WebSocket (STOMP).

## Kenapa tidak bisa pakai port 5672 langsung?
Browser tidak bisa konek ke AMQP binary TCP. Harus aktifkan plugin WebSocket:

```bash
rabbitmq-plugins enable rabbitmq_web_stomp
# restart rabbitmq
```

Vue akan konek ke ws://localhost:15674/ws

## Install
```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Format data RabbitMQ
Queue: `sensor`
Isi: `Sensor1,Sensor2,Sensor3,Sensor4,Sensor5,Sensor6,Sensor7,Sensor8`
Contoh: `315,2917,3009,4820,548,1753,2895,1818`

Mapping:
1: Depan 0°, 2: Depan-Kanan 45°, 3: Kanan 90°, 4: Belakang-Kanan 135°, 5: Belakang 180°, 6: Belakang-Kiri 225°, 7: Kiri 270°, 8: Depan-Kiri 315°

## Mode Mock
Jika RabbitMQ belum aktif, set di .env:
VITE_USE_MOCK=true


## FIX FINAL: JANGAN AUTODELETE

Error `NOT_FOUND - no queue 'sensor' in vhost '/'` = queue belum ada atau ke-delete otomatis.

### Penyebab auto-delete:
1. Python lama pakai `auto_delete=True` atau tidak set `durable=True`
2. Vue subscribe pakai header `auto-delete:true`

### Fix sudah diterapkan:
**Python (producer):**
```python
channel.queue_declare(queue='sensor', durable=True, auto_delete=False)
```

**Vue (useRabbitMQ.js):**
```js
client.subscribe(`/queue/sensor`, handler, {
  durable: true,
  'auto-delete': false,  // <--- kunci
  exclusive: false,
  persistent: true
})
```

### Cara manual buat queue yang benar:
1. Buka http://localhost:15672 -> Queues -> Add queue
   - Name: sensor
   - Durability: Durable
   - Auto delete: No
   - Arguments: (kosongkan)
   - Add queue

2. Atau pakai script `create_queue.py`:
   ```
   pip install requests
   python create_queue.py
   ```

3. Atau pakai rabbitmqadmin:
   ```
   rabbitmqadmin declare queue name=sensor durable=true auto_delete=false
   ```

Setelah itu Vue konek pakai `/queue/sensor` dan queue TIDAK akan hilang walau browser ditutup.
