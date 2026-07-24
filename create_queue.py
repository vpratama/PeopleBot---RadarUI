# create_queue.py - Buat queue sensor manual biar tidak NOT_FOUND
# Baca config dari .env (VITE_RABBITMQ_*)
import os
import sys
from urllib.parse import quote

try:
    import requests
    from requests.auth import HTTPBasicAuth
except ImportError:
    print("❌ Module requests belum terinstall")
    print("Install dulu: pip install requests")
    sys.exit(1)

def load_env(env_path=".env"):
    """Load .env manual tanpa butuh python-dotenv"""
    env = {}
    if not os.path.exists(env_path):
        print(f"⚠️ File {env_path} tidak ditemukan, pakai default")
        return env
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            env[key] = value
            # Set ke os.environ biar bisa diakses juga
            os.environ[key] = value
    return env

# Load .env
env = load_env(".env")

# Baca dari .env dengan fallback
HOST = env.get("VITE_RABBITMQ_HOST") or env.get("RABBITMQ_HOST") or "localhost"
# Untuk API Management butuh port 15672, bukan WS port 15674
# Coba baca dari env khusus, kalau tidak ada default 15672
MGMT_PORT = env.get("VITE_RABBITMQ_MGMT_PORT") or env.get("RABBITMQ_MGMT_PORT") or "15672"
QUEUE = env.get("VITE_RABBITMQ_QUEUE_SENSOR") or env.get("RABBITMQ_QUEUE_SENSOR") or "sensor"
USER = env.get("VITE_RABBITMQ_USER") or env.get("RABBITMQ_USER") or "luluka"
PASS = env.get("VITE_RABBITMQ_PASSWORD") or env.get("RABBITMQ_PASSWORD") or "arcanashadow"
VHOST = env.get("VITE_RABBITMQ_VHOST") or env.get("RABBITMQ_VHOST") or "/"

# Encode vhost untuk URL: "/" -> "%2F"
vhost_encoded = quote(VHOST, safe='')

# Construct URL: http://host:15672/api/queues/{vhost}/{queue}
RABBITMQ_API_URL = f"http://{HOST}:{MGMT_PORT}/api/queues/{vhost_encoded}/{QUEUE}"

print(f"📖 Config dari .env:")
print(f"   HOST={HOST}")
print(f"   MGMT_PORT={MGMT_PORT}")
print(f"   QUEUE={QUEUE}")
print(f"   USER={USER}")
print(f"   VHOST={VHOST} (encoded: {vhost_encoded})")
print(f"   URL={RABBITMQ_API_URL}")
print()

# Payload: durable true, auto_delete false - biar TIDAK auto-delete
payload = {
    "durable": True,
    "auto_delete": False,
    "arguments": {
        "x-queue-type": "classic"
    }
}

try:
    resp = requests.put(
        RABBITMQ_API_URL, 
        json=payload, 
        auth=HTTPBasicAuth(USER, PASS),
        timeout=5
    )
    
    if resp.status_code in [200, 201, 204]:
        print(f"✅ Queue '{QUEUE}' berhasil dibuat!")
        print(f"   - durable=True")
        print(f"   - auto_delete=False")
        print(f"   - vhost={VHOST}")
        print(f"   - type=classic")
        print()
        print(f"Queue ini TIDAK akan hilang walau Vue disconnect")
    else:
        print(f"❌ Gagal: {resp.status_code} {resp.text}")
        print()
        print("Kemungkinan penyebab:")
        print(f"1. User '{USER}' tidak punya hak administrator")
        print(f"2. Management plugin belum aktif: rabbitmq-plugins enable rabbitmq_management")
        print(f"3. Port {MGMT_PORT} tidak terbuka / salah host")
        print(f"4. Buat manual via Management UI http://{HOST}:{MGMT_PORT} -> Queues -> Add queue")
        print(f"   Name: {QUEUE}, Durability: Durable, Auto delete: No")

except requests.exceptions.ConnectionError:
    print(f"❌ Tidak bisa konek ke {RABBITMQ_API_URL}")
    print(f"   Pastikan:")
    print(f"   1. RabbitMQ jalan di {HOST}")
    print(f"   2. Management plugin aktif: rabbitmq-plugins enable rabbitmq_management")
    print(f"   3. Port {MGMT_PORT} terbuka (cek firewall)")
    print(f"   4. Coba buka di browser: http://{HOST}:{MGMT_PORT}")

except Exception as e:
    print(f"❌ Error: {e}")