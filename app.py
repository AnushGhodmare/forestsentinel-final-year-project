import sqlite3
import os
import re
import shutil
import requests
import threading
import random
import time
import io
import json
import hashlib
import queue
from dotenv import load_dotenv
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from jose import JWTError, jwt
from ultralytics import YOLO
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageOps
import warnings
warnings.filterwarnings("ignore", message=".*SourceChangeWarning.*")

load_dotenv()  # reads variables from a .env file in the same folder

# ---------------- CONFIG ----------------
DB_FILE = "wildlife.db"
SECRET_KEY = "change-this-to-something-random-later"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

MODEL_PATH = "best.pt"
EVIDENCE_FOLDER = "evidence"
CONFIDENCE_THRESHOLD = 0.4

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_PROXY = os.getenv("TELEGRAM_PROXY")  # optional, e.g. http://127.0.0.1:7890

# --- Groq: built to survive free-tier limits ---
# Keys: put one or more in .env. Any of these work (all are combined):
#   GROQ_API_KEY=gsk_...            GROQ_API_KEY_2=gsk_...  (up to _6)
#   GROQ_API_KEYS=gsk_a,gsk_b,gsk_c
# Models are tried in order; when one is rate-limited, the next is used.
# Override with GROQ_MODELS=model1,model2,model3 in .env if you like.
def _load_groq_keys():
    keys = [k.strip() for k in os.getenv("GROQ_API_KEYS", "").split(",") if k.strip()]
    for name in ["GROQ_API_KEY"] + [f"GROQ_API_KEY_{i}" for i in range(2, 7)]:
        value = (os.getenv(name) or "").strip()
        if value and value not in keys:
            keys.append(value)
    return keys

GROQ_API_KEYS = _load_groq_keys()
GROQ_API_KEY = GROQ_API_KEYS[0] if GROQ_API_KEYS else None
GROQ_MODELS = [
    m.strip() for m in os.getenv(
        "GROQ_MODELS", "openai/gpt-oss-20b,llama-3.1-8b-instant,llama-3.3-70b-versatile"
    ).split(",") if m.strip()
]
GROQ_MODEL = GROQ_MODELS[0]

CAMERAS = [
    ("Camera_1", 20.2450, 79.3550, "deep_buffer"),
    ("Camera_2", 20.2510, 79.3480, "deep_buffer"),
    ("Camera_3", 20.2380, 79.3610, "near_farmland"),
    ("Camera_4", 20.2340, 79.3650, "near_farmland"),
    ("Camera_5", 20.2290, 79.3690, "near_farmland"),
    ("Camera_6", 20.2260, 79.3720, "village_edge"),
    ("Camera_7", 20.2230, 79.3760, "village_edge"),
    ("Camera_8", 20.2200, 79.3800, "village_edge"),
]
# -----------------------------------------

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI(title="Wildlife Monitoring API")

from fastapi.middleware.cors import CORSMiddleware

from fastapi.middleware.cors import CORSMiddleware

allow_origins=[
    "https://forestsentinel-final-year-project-o9omv3mh1-anush17.vercel.app",
    "https://forestsentinel-final-year-project.vercel.app",
],

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(EVIDENCE_FOLDER, exist_ok=True)
app.mount("/evidence", StaticFiles(directory=EVIDENCE_FOLDER), name="evidence")

print("Loading YOLO model...")
model = YOLO(MODEL_PATH)
print("Model loaded.")

if TELEGRAM_BOT_TOKEN:
    masked_token = TELEGRAM_BOT_TOKEN[:8] + "..." + TELEGRAM_BOT_TOKEN[-4:]
    group_note = f", plus configured group/chat_id: {TELEGRAM_CHAT_ID}" if TELEGRAM_CHAT_ID else " (no group chat_id set - relying on auto-subscribers only)"
    print(f"Telegram configured -> token: {masked_token}{group_note}")
else:
    print("Telegram NOT configured - set TELEGRAM_BOT_TOKEN in .env to enable alerts.")

if GROQ_API_KEYS:
    print(f"Groq AI assistant configured -> {len(GROQ_API_KEYS)} key(s), models (in fallback order): {', '.join(GROQ_MODELS)}")
else:
    print("Groq NOT configured - set GROQ_API_KEY in .env to enable the AI assistant.")


# ---------------- DATABASE SETUP ----------------
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            created_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS cameras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            zone TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            location_name TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # Migration: a database created before location_name existed won't have
    # the column yet - add it quietly if missing, so existing installs don't break.
    cur.execute("PRAGMA table_info(cameras)")
    existing_columns = {row["name"] for row in cur.fetchall()}
    if "location_name" not in existing_columns:
        cur.execute("ALTER TABLE cameras ADD COLUMN location_name TEXT")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            camera_id INTEGER NOT NULL,
            species TEXT NOT NULL,
            confidence REAL NOT NULL,
            bbox TEXT NOT NULL,
            image_path TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (camera_id) REFERENCES cameras (id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            detection_id INTEGER,
            camera_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'unresolved',
            created_at TEXT NOT NULL,
            FOREIGN KEY (camera_id) REFERENCES cameras (id)
        )
    """)

    # One decision per detection, made by the decision engine (see DECISION ENGINE section)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            detection_id INTEGER,
            camera_id INTEGER NOT NULL,
            species TEXT NOT NULL,
            decision_type TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            title TEXT NOT NULL,
            reasons TEXT NOT NULL,
            action TEXT NOT NULL,
            telegram TEXT NOT NULL DEFAULT 'none',
            created_at TEXT NOT NULL,
            FOREIGN KEY (camera_id) REFERENCES cameras (id)
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_decisions_detection ON decisions (detection_id)")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS telegram_subscribers (
            chat_id TEXT PRIMARY KEY,
            joined_at TEXT NOT NULL
        )
    """)

    # Simple key/value store for settings edited from the dashboard (e.g. the Telegram message)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    conn.commit()

    cur.execute("SELECT COUNT(*) as count FROM cameras")
    if cur.fetchone()["count"] == 0:
        now = datetime.now().isoformat()
        for name, lat, lng, zone in CAMERAS:
            cur.execute(
                "INSERT INTO cameras (name, latitude, longitude, zone, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
                (name, lat, lng, zone, now),
            )
        conn.commit()
        print(f"Seeded {len(CAMERAS)} cameras.")

    cur.execute("SELECT COUNT(*) as count FROM users")
    if cur.fetchone()["count"] == 0:
        password_hash = pwd_context.hash(ADMIN_PASSWORD)
        cur.execute(
            "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, 'admin', ?)",
            (ADMIN_USERNAME, password_hash, datetime.now().isoformat()),
        )
        conn.commit()
        print(f"Created admin user -> username: '{ADMIN_USERNAME}', password: '{ADMIN_PASSWORD}'")

    conn.close()


init_db()


# ---------------- AUTH HELPERS ----------------
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception


def get_camera_by_name(name: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cameras WHERE name = ?", (name,))
    camera = cur.fetchone()
    conn.close()
    return camera


def get_all_recipients():
    """Every chat_id that should receive alerts: anyone who has ever messaged
    the bot (auto-registered by the poller below), plus TELEGRAM_CHAT_ID from
    .env if set (useful for a dedicated Telegram GROUP - add the bot to a
    group and every group member gets alerts through that one chat_id)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT chat_id FROM telegram_subscribers")
    ids = {row["chat_id"] for row in cur.fetchall()}
    conn.close()
    if TELEGRAM_CHAT_ID:
        ids.add(str(TELEGRAM_CHAT_ID))
    return ids


def _tg_clean(err):
    """Error text with the bot token hidden, so logs never leak it."""
    text = str(err)
    return text.replace(TELEGRAM_BOT_TOKEN, "<token>") if TELEGRAM_BOT_TOKEN else text


# One shared session = one TLS connection reused for every request, instead of
# a fresh handshake each time (fewer SSL timeouts on weak connections).
_tg_session = requests.Session()
if TELEGRAM_PROXY:
    _tg_session.proxies = {"http": TELEGRAM_PROXY, "https": TELEGRAM_PROXY}


def _shrink_for_telegram(image_path, max_side=960, quality=70):
    """Small JPEG copy (~100 KB) for fast uploads on weak connections.
    The original evidence file is never touched."""
    try:
        small_path = image_path + ".tg.jpg"
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img.thumbnail((max_side, max_side))
            img.save(small_path, "JPEG", quality=quality)
        return small_path
    except Exception as e:
        print(f"Telegram: could not shrink image ({e}) - sending original")
        return image_path


def _telegram_post(method, data, photo_path=None, attempts=3):
    """POST to the Telegram Bot API with retries and backoff. Honours
    Telegram's own 'slow down' replies. Raises the last error if all fail."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    last_error = None
    for attempt in range(attempts):
        try:
            if photo_path:
                with open(photo_path, "rb") as photo:
                    response = _tg_session.post(url, data=data, files={"photo": photo}, timeout=(8, 60))
            else:
                response = _tg_session.post(url, data=data, timeout=(8, 20))
            if response.status_code == 429:
                try:
                    wait = int(response.json().get("parameters", {}).get("retry_after", 3))
                except Exception:
                    wait = 3
                time.sleep(min(wait, 10))
                continue
            return response
        except requests.exceptions.RequestException as e:
            last_error = e
            time.sleep(2 * (attempt + 1))  # 2s, 4s, 6s
    raise last_error or requests.exceptions.RequestException("Telegram rate limited")


def _log_if_rejected(response, chat_id):
    """Telegram can answer 200-class errors like 'chat not found' or 'bot was
    blocked by the user' - these were previously ignored silently."""
    if not response.ok:
        try:
            reason = response.json().get("description", response.text[:150])
        except Exception:
            reason = response.text[:150]
        print(f"Telegram rejected message to {chat_id}: {reason}")


def _send_telegram_alert_blocking(message, image_path=None):
    if not TELEGRAM_BOT_TOKEN:
        print("Telegram not configured - skipping alert (set TELEGRAM_BOT_TOKEN in .env)")
        return

    recipients = get_all_recipients()
    if not recipients:
        print("Telegram: no subscribers yet - message anyone at the bot to auto-register them, or set TELEGRAM_CHAT_ID for a group.")
        return

    photo_path = None
    if image_path and os.path.exists(image_path):
        photo_path = _shrink_for_telegram(image_path)

    file_id = None  # after the first successful upload, reuse Telegram's copy
    try:
        for chat_id in recipients:
            # 1) TEXT FIRST - tiny and reliable, so the alert always arrives
            try:
                _log_if_rejected(_telegram_post("sendMessage", {"chat_id": chat_id, "text": message}), chat_id)
            except requests.exceptions.RequestException as e:
                print(f"Telegram text alert failed to send to {chat_id}: {_tg_clean(e)}")
                continue  # network is down right now - skip the photo too

            # 2) PHOTO second - uploaded once, then re-sent by file_id (no re-upload)
            if not photo_path:
                continue
            try:
                if file_id:
                    response = _telegram_post("sendPhoto", {"chat_id": chat_id, "photo": file_id, "caption": "Evidence photo"})
                else:
                    response = _telegram_post("sendPhoto", {"chat_id": chat_id, "caption": "Evidence photo"}, photo_path=photo_path)
                    if response.ok:
                        try:
                            file_id = response.json()["result"]["photo"][-1]["file_id"]
                        except (KeyError, IndexError, ValueError):
                            pass
                _log_if_rejected(response, chat_id)
            except requests.exceptions.RequestException as e:
                print(f"Telegram photo failed for {chat_id} (text alert WAS delivered): {_tg_clean(e)}")
    finally:
        if photo_path and photo_path != image_path:
            try:
                os.remove(photo_path)
            except OSError:
                pass


# A single background worker sends alerts one at a time, so several detections
# in a row never compete for a weak upload connection (or block detection).
_telegram_queue = queue.Queue(maxsize=50)


def _telegram_worker():
    while True:
        message, image_path = _telegram_queue.get()
        try:
            _send_telegram_alert_blocking(message, image_path)
        except Exception as e:
            print(f"Telegram worker error: {_tg_clean(e)}")
        finally:
            _telegram_queue.task_done()


threading.Thread(target=_telegram_worker, daemon=True).start()


def send_telegram_alert(message, image_path=None):
    """Fire-and-forget: queues the alert; never blocks or breaks detection."""
    try:
        _telegram_queue.put_nowait((message, image_path))
    except queue.Full:
        print("Telegram queue is full (connection too slow) - dropping this alert")


# ---- Auto-subscribe poller ----
# Polls Telegram for new messages sent to the bot and automatically adds
# any new chat_id to telegram_subscribers - so anyone who finds the bot and
# says hello starts receiving alerts, with zero manual chat-ID collection.
telegram_update_offset = 0


def telegram_poll_loop():
    global telegram_update_offset
    if not TELEGRAM_BOT_TOKEN:
        return

    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
            params = {"offset": telegram_update_offset + 1, "timeout": 20}
            res = requests.get(url, params=params, timeout=25)
            data = res.json()

            for update in data.get("result", []):
                telegram_update_offset = max(telegram_update_offset, update["update_id"])
                message = update.get("message")
                if not message:
                    continue
                chat_id = str(message["chat"]["id"])

                conn = get_db()
                cur = conn.cursor()
                cur.execute("SELECT 1 FROM telegram_subscribers WHERE chat_id = ?", (chat_id,))
                already_subscribed = cur.fetchone() is not None
                if not already_subscribed:
                    cur.execute(
                        "INSERT INTO telegram_subscribers (chat_id, joined_at) VALUES (?, ?)",
                        (chat_id, datetime.now().isoformat()),
                    )
                    conn.commit()
                    print(f"Telegram: new subscriber registered ({chat_id})")
                    try:
                        requests.post(
                            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                            data={"chat_id": chat_id, "text": "You're subscribed to ForestSentinel wildlife alerts."},
                            timeout=10,
                        )
                    except requests.exceptions.RequestException:
                        pass
                conn.close()
        except requests.exceptions.RequestException as e:
            print(f"Telegram poller error: {e}")
        except Exception as e:
            print(f"Telegram poller unexpected error: {e}")


if TELEGRAM_BOT_TOKEN:
    telegram_thread = threading.Thread(target=telegram_poll_loop, daemon=True)
    telegram_thread.start()
    print("Telegram auto-subscribe poller started.")


# ---------------- ROUTES ----------------
@app.get("/telegram/subscribers")
def get_subscriber_count(current_user: str = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT chat_id, joined_at FROM telegram_subscribers ORDER BY joined_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"count": len(rows), "subscribers": rows}


@app.get("/")
def root():
    return {"status": "Wildlife Monitoring API is running"}


@app.get("/model/info")
def model_info(current_user: str = Depends(get_current_user)):
    """Reports the ACTUAL classes the currently loaded model knows about -
    so the frontend never needs a hardcoded class count that goes stale
    when you swap in a different best.pt."""
    class_names = list(model.names.values())
    return {"class_count": len(class_names), "classes": class_names}


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (form_data.username,))
    user = cur.fetchone()
    conn.close()

    if not user or not pwd_context.verify(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/cameras")
def get_cameras(current_user: str = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cameras")
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


VALID_ZONES = {"deep_buffer", "near_farmland", "village_edge"}


class CameraUpdate(BaseModel):
    latitude: float
    longitude: float
    zone: str
    location_name: str = ""


@app.put("/cameras/{camera_id}")
def update_camera(camera_id: int, update: CameraUpdate, current_user: str = Depends(get_current_user)):
    if update.zone not in VALID_ZONES:
        raise HTTPException(status_code=400, detail=f"zone must be one of {sorted(VALID_ZONES)}")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cameras WHERE id = ?", (camera_id,))
    if cur.fetchone() is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Camera not found")

    cur.execute(
        "UPDATE cameras SET latitude = ?, longitude = ?, zone = ?, location_name = ? WHERE id = ?",
        (update.latitude, update.longitude, update.zone, update.location_name.strip() or None, camera_id),
    )
    conn.commit()
    cur.execute("SELECT * FROM cameras WHERE id = ?", (camera_id,))
    updated = dict(cur.fetchone())
    conn.close()
    return updated


def sanitize_camera_name(name: str) -> str:
    """Keep folder names safe: letters, numbers, underscore, hyphen only."""
    return re.sub(r"[^A-Za-z0-9_-]", "_", name.strip())


@app.post("/cameras")
async def register_camera(
    name: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    zone: str = Form(...),
    location_name: str = Form(""),
    files: List[UploadFile] = File(default=[]),
    current_user: str = Depends(get_current_user),
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Camera name is required")
    if zone not in VALID_ZONES:
        raise HTTPException(status_code=400, detail=f"zone must be one of {sorted(VALID_ZONES)}")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM cameras WHERE name = ?", (name,))
    if cur.fetchone() is not None:
        conn.close()
        raise HTTPException(status_code=400, detail=f"A camera named '{name}' already exists")

    now = datetime.now().isoformat()
    cur.execute(
        "INSERT INTO cameras (name, latitude, longitude, zone, status, location_name, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
        (name, latitude, longitude, zone, location_name.strip() or None, now),
    )
    conn.commit()
    cur.execute("SELECT * FROM cameras WHERE name = ?", (name,))
    new_camera = dict(cur.fetchone())
    conn.close()

    # Create this camera's image folder so simulate.py / the auto-simulator
    # can pick it up immediately, matching every other camera's structure.
    safe_folder_name = sanitize_camera_name(name)
    camera_folder = os.path.join("images", safe_folder_name)
    os.makedirs(camera_folder, exist_ok=True)

    saved_count = 0
    for f in files:
        if f.filename:
            dest_path = os.path.join(camera_folder, f.filename)
            with open(dest_path, "wb") as out:
                shutil.copyfileobj(f.file, out)
            saved_count += 1

    new_camera["images_uploaded"] = saved_count
    new_camera["image_folder"] = camera_folder
    return new_camera


class CameraStatusUpdate(BaseModel):
    status: str


@app.patch("/cameras/{camera_id}/status")
def update_camera_status(camera_id: int, update: CameraStatusUpdate, current_user: str = Depends(get_current_user)):
    if update.status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="status must be 'active' or 'inactive'")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cameras WHERE id = ?", (camera_id,))
    if cur.fetchone() is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Camera not found")

    cur.execute("UPDATE cameras SET status = ? WHERE id = ?", (update.status, camera_id))
    conn.commit()
    cur.execute("SELECT * FROM cameras WHERE id = ?", (camera_id,))
    updated = dict(cur.fetchone())
    conn.close()
    return updated


@app.delete("/cameras/{camera_id}")
def delete_camera(camera_id: int, current_user: str = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM cameras WHERE id = ?", (camera_id,))
    camera = cur.fetchone()
    if camera is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Camera not found")

    # Clean up dependent rows first (SQLite doesn't enforce foreign keys by
    # default here, but leaving orphaned detections/alerts pointing at a
    # deleted camera would just be confusing data - remove them too).
    cur.execute("DELETE FROM decisions WHERE camera_id = ?", (camera_id,))
    cur.execute("DELETE FROM alerts WHERE camera_id = ?", (camera_id,))
    cur.execute("DELETE FROM detections WHERE camera_id = ?", (camera_id,))
    cur.execute("DELETE FROM cameras WHERE id = ?", (camera_id,))
    conn.commit()
    conn.close()

    # Evidence images and the images/<camera> folder are left on disk
    # deliberately - deleting a camera shouldn't silently destroy photo
    # evidence that may still be needed for reports.
    return {"status": "deleted", "camera_id": camera_id, "name": camera["name"]}


@app.get("/detections")
def get_detections(current_user: str = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM detections ORDER BY timestamp DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/alerts")
def get_alerts(current_user: str = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM alerts ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/decisions")
def get_decisions(limit: int = 1000, current_user: str = Depends(get_current_user)):
    """Newest decisions first. Each links to its detection through detection_id."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM decisions ORDER BY created_at DESC LIMIT ?", (max(1, min(limit, 5000)),))
    rows = cur.fetchall()
    conn.close()
    out = []
    for row in rows:
        item = dict(row)
        try:
            item["reasons"] = json.loads(item["reasons"])
        except (TypeError, ValueError):
            item["reasons"] = [item["reasons"]] if item["reasons"] else []
        if item["risk_level"] == "LOW":  # nothing noteworthy, incl. rows saved by earlier versions
            item["decision_type"] = "routine"
            item["title"] = DECISION_TITLES["routine"]
        out.append(item)
    return out


class ClearDataRequest(BaseModel):
    confirm: bool = False


@app.post("/admin/clear-data")
def clear_monitoring_data(body: ClearDataRequest, current_user: str = Depends(get_current_user)):
    """Settings -> 'Delete All Monitoring Data'. Permanently removes every detection,
    alert and decision, plus the saved evidence photos. Cameras, users and Telegram
    subscribers are kept, so the system keeps working and you can start fresh."""
    if not body.confirm:
        raise HTTPException(status_code=400, detail="Confirmation is required to delete data.")

    conn = get_db()
    cur = conn.cursor()
    counts = {}
    for table in ("decisions", "alerts", "detections"):
        cur.execute(f"SELECT COUNT(*) AS c FROM {table}")
        counts[table] = cur.fetchone()["c"]

    # alerts point at detections, so remove them first
    cur.execute("DELETE FROM decisions")
    cur.execute("DELETE FROM alerts")
    cur.execute("DELETE FROM detections")
    try:  # start the id numbers from 1 again
        cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('decisions', 'alerts', 'detections')")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    try:  # give the freed disk space back
        conn.execute("VACUUM")
    except sqlite3.OperationalError:
        pass
    conn.close()

    # saved evidence photos (only image files inside the evidence folder)
    images_removed = 0
    if os.path.isdir(EVIDENCE_FOLDER):
        for filename in os.listdir(EVIDENCE_FOLDER):
            path = os.path.join(EVIDENCE_FOLDER, filename)
            if os.path.isfile(path) and filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                try:
                    os.remove(path)
                    images_removed += 1
                except OSError:
                    pass

    _groq_cache.clear()  # the AI assistant must not answer from the old data
    print(f"Monitoring data cleared by {current_user}: {counts}, {images_removed} photos")
    return {
        "detections": counts["detections"],
        "alerts": counts["alerts"],
        "decisions": counts["decisions"],
        "images": images_removed,
    }


class ChatTurn(BaseModel):
    role: str
    content: str


class AssistantQuery(BaseModel):
    question: str
    history: List[ChatTurn] = []


def build_assistant_context():
    """Compact, time-aware snapshot for the assistant. Counts are pre-computed
    here (per time window, species, location and zone) instead of handing the
    model raw rows: that is cheaper in tokens AND far more accurate, and it lets
    the assistant answer questions like 'this week' or 'which zone'."""
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT name, location_name, zone, status FROM cameras")
    cameras = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT d.species, d.confidence, d.timestamp,
               c.name AS camera, c.location_name AS location, c.zone
        FROM detections d LEFT JOIN cameras c ON d.camera_id = c.id
        ORDER BY d.timestamp DESC
    """)
    dets = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT a.alert_type, a.status, a.created_at,
               c.name AS camera, c.location_name AS location, c.zone
        FROM alerts a LEFT JOIN cameras c ON a.camera_id = c.id
        ORDER BY a.created_at DESC
    """)
    alerts = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT x.species, x.decision_type, x.risk_level, x.title, x.reasons, x.action, x.telegram, x.created_at,
               c.name AS camera, c.location_name AS location, c.zone
        FROM decisions x LEFT JOIN cameras c ON x.camera_id = c.id
        ORDER BY x.created_at DESC
    """)
    decisions = [dict(r) for r in cur.fetchall()]
    conn.close()

    for r in decisions:
        try:
            r["reasons"] = " ".join(json.loads(r["reasons"]))
        except (TypeError, ValueError):
            pass

    # the location a user typed for the camera, falling back to the camera name
    for row in dets + alerts + decisions:
        row["location"] = row.get("location") or row.get("camera") or "unknown"

    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=7)).isoformat()
    windows = {
        "today": lambda ts: ts[:10] == today,
        "last_7_days": lambda ts: ts >= week_ago,
        "all_time": lambda ts: True,
    }

    def tally(rows, key):
        out = {}
        for r in rows:
            k = r.get(key) or "unknown"
            out[k] = out.get(k, 0) + 1
        return dict(sorted(out.items(), key=lambda kv: -kv[1]))

    def species_by_zone(rows):
        out = {}
        for r in rows:
            zone = r.get("zone") or "unknown"
            out.setdefault(r["species"], {})
            out[r["species"]][zone] = out[r["species"]].get(zone, 0) + 1
        return out

    summary = {}
    for name, keep in windows.items():
        d = [r for r in dets if keep(r["timestamp"] or "")]
        a = [r for r in alerts if keep(r["created_at"] or "")]
        x = [r for r in decisions if keep(r["created_at"] or "")]
        summary[name] = {
            "noteworthy_decisions_by_type": tally([r for r in x if r["risk_level"] != "LOW"], "title"),
            "resident_alerts_sent_on_telegram": sum(1 for r in x if r["telegram"] == "sent"),
            "detections": len(d),
            "alerts": len(a),
            "unresolved_alerts": sum(1 for r in a if r["status"] == "unresolved"),
            "detections_by_species": tally(d, "species"),
            "detections_by_location": tally(d, "location"),
            "detections_by_zone": tally(d, "zone"),
            "species_by_zone": species_by_zone(d),
            "alerts_by_type": tally(a, "alert_type"),
            "alerts_by_zone": tally(a, "zone"),
            "alerts_by_location": tally(a, "location"),
        }

    return {
        "now": now.strftime("%A %Y-%m-%d %H:%M"),
        "cameras": cameras,
        "summary": summary,
        "recent_detections": [
            {"time": (r["timestamp"] or "")[:16], "species": r["species"],
             "confidence": round(r["confidence"], 2), "location": r["location"], "zone": r["zone"]}
            for r in dets[:10]
        ],
        "recent_noteworthy_decisions": [
            {"time": (r["created_at"] or "")[:16], "decision": r["title"],
             "species": r["species"], "location": r["location"], "why": r["reasons"], "action": r["action"]}
            for r in [r for r in decisions if r["risk_level"] != "LOW"][:8]
        ],
        "recent_alerts": [
            {"time": (r["created_at"] or "")[:16], "type": r["alert_type"],
             "status": r["status"], "location": r["location"], "zone": r["zone"]}
            for r in alerts[:10]
        ],
    }


# ---- Groq resilience state (in-memory, resets on server restart) ----
_groq_cooldowns = {}   # (key_index, model) -> unix time when it may be used again
_groq_cache = {}       # cache_key -> (expires_at, answer, model)
GROQ_CACHE_TTL = 120   # seconds: identical question + unchanged data = free answer
GROQ_MAX_HISTORY = 6   # previous messages sent for follow-up questions


def _retry_after_seconds(response, default=60):
    """Reads Groq's Retry-After header (seconds), falling back to a default."""
    try:
        return max(1, int(float(response.headers.get("retry-after", default))))
    except (TypeError, ValueError):
        return default


@app.post("/assistant/ask")
def ask_assistant(query: AssistantQuery, current_user: str = Depends(get_current_user)):
    if not GROQ_API_KEYS:
        raise HTTPException(status_code=400, detail="Groq is not configured - set GROQ_API_KEY in .env")

    question = query.question.strip()[:500]
    if not question:
        raise HTTPException(status_code=400, detail="Please type a question.")

    history = [
        {"role": t.role, "content": t.content[:600]}
        for t in query.history[-GROQ_MAX_HISTORY:]
        if t.role in ("user", "assistant") and t.content.strip()
    ]

    try:
        context = build_assistant_context()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Could not read the monitoring data: {e}")
    context_json = json.dumps(context, default=str, separators=(",", ":"))

    # Cache: same question + same history + same data -> no API call at all.
    # ('now' is left out so the key doesn't change every minute.)
    stable = {k: v for k, v in context.items() if k != "now"}
    fingerprint = hashlib.md5((json.dumps(stable, default=str, sort_keys=True) + json.dumps(history)).encode()).hexdigest()
    cache_key = (question.lower(), fingerprint)
    now = time.time()
    cached = _groq_cache.get(cache_key)
    if cached and cached[0] > now:
        return {"answer": cached[1], "model": cached[2], "cached": True}

    system_prompt = (
        "You are the AI assistant for ForestSentinel, an AI wildlife monitoring system used by forest officers. "
        "Answer using ONLY the JSON data below. Never invent numbers or events. "
        "'now' is the current local time. In 'summary': 'today' = today's calendar date, "
        "'this week' / 'recent' = 'last_7_days', and 'all_time' = everything recorded. "
        "Zones: deep_buffer (inside the forest), near_farmland, village_edge (closest to people). "
        "A decision engine reviews every detection. Noteworthy decisions are listed with their reasons and actions "
        "(recent_noteworthy_decisions); the rest are routine and only logged. Conflict and zone-based decisions can "
        "trigger a Telegram alert to residents; suspicious human activity, unusual wildlife activity and possible "
        "injury are for forest officials on the dashboard. Never mention risk levels like low/medium/high. "
        "'location' is the place name the operator gave the camera. "
        "Give a direct answer with the actual numbers, concisely. If the data truly cannot answer "
        "(for example injuries, or a custom date range), say what it CAN tell instead of just refusing. "
        "Brief greetings are fine.\n\n"
        f"DATA:{context_json}"
    )
    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": question}]

    # Try every (model, key) combination, best model first, skipping any that
    # are cooling down from an earlier rate limit.
    attempts = [(ki, m) for m in GROQ_MODELS for ki in range(len(GROQ_API_KEYS))]
    last_error = None

    for key_index, model in attempts:
        if _groq_cooldowns.get((key_index, model), 0) > time.time():
            continue

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": 700 if model.startswith("openai/gpt-oss") else 400,
            "temperature": 0.3,
        }
        if model.startswith("openai/gpt-oss"):
            payload["reasoning_effort"] = "low"  # far fewer hidden reasoning tokens

        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEYS[key_index]}", "Content-Type": "application/json"},
                json=payload,
                timeout=25,
            )
        except requests.exceptions.RequestException as e:
            last_error = f"Could not reach Groq: {e}"
            continue

        if response.status_code == 429:
            _groq_cooldowns[(key_index, model)] = time.time() + _retry_after_seconds(response)
            continue
        if response.status_code in (401, 403):
            _groq_cooldowns[(key_index, model)] = time.time() + 3600
            last_error = f"Groq key #{key_index + 1} was rejected (invalid or revoked)."
            continue
        if response.status_code in (400, 404):
            # usually a retired/unavailable model name - skip it for a while
            _groq_cooldowns[(key_index, model)] = time.time() + 3600
            last_error = f"Groq model '{model}' unavailable: {response.text[:150]}"
            continue
        if response.status_code != 200:
            last_error = f"Groq API error: {response.text[:200]}"
            continue

        try:
            answer = (response.json()["choices"][0]["message"].get("content") or "").strip()
        except (KeyError, IndexError, ValueError):
            last_error = "Unexpected response from Groq"
            continue
        if not answer:
            last_error = "Groq returned an empty answer"
            continue

        _groq_cache[cache_key] = (time.time() + GROQ_CACHE_TTL, answer, model)
        if len(_groq_cache) > 200:  # keep the cache small
            for k in [k for k, v in _groq_cache.items() if v[0] < time.time()]:
                _groq_cache.pop(k, None)
        return {"answer": answer, "model": model, "cached": False}

    # Nothing worked. If everything is simply rate-limited, tell the UI how long to wait.
    waits = [t - time.time() for t in _groq_cooldowns.values() if t > time.time()]
    if waits and not last_error:
        retry_after = int(min(waits)) + 1
        return JSONResponse(
            status_code=429,
            content={
                "detail": "The AI is at its free-tier limit right now. Try again shortly.",
                "retry_after": retry_after,
            },
        )
    raise HTTPException(status_code=502, detail=last_error or "The AI assistant is unavailable right now.")


def draw_yellow_annotations(image_path, frame_boxes, output_path):
    """Draws a yellow box + species/confidence label for every detection in
    this frame onto a copy of the image. Used so Telegram alerts show the
    actual annotated photo, not a bare unmarked one."""
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    for species, confidence, bbox in frame_boxes:
        x1, y1, x2, y2 = bbox
        draw.rectangle([x1, y1, x2, y2], outline="#FFD400", width=4)

        label = f"{species} {int(confidence * 100)}%"
        try:
            text_w = draw.textlength(label)
        except AttributeError:
            text_w = len(label) * 7  # fallback for older Pillow versions
        label_y = max(0, y1 - 20)
        draw.rectangle([x1, label_y, x1 + text_w + 10, label_y + 20], fill="#FFD400")
        draw.text((x1 + 5, label_y + 3), label, fill="#1B1710")

    img.save(output_path, quality=90)


# ---------------- DECISION ENGINE ----------------
# Every detection gets ONE stored decision (database): a type, a risk level
# (LOW / MEDIUM / HIGH - backend only, never shown in the UI), the reasons and a
# recommended action. The alert TYPE shown in the UI (Boundary Alert, Proximity
# Watch, ...) is separate and still comes from the camera's zone.
#
# WHO GETS TOLD:
#   Residents / villagers (Telegram) - only Human-Wildlife Conflict and Zone-Based
#       Risk, and only when the engine rates them HIGH. Sent as a plain safety
#       notice, at most once per cooldown per species + camera.
#   Forest officials (dashboard)     - Suspicious Human Activity, Unusual Wildlife
#       Activity and Possible Injury. These never go to residents.
#
# Rules (a detection can match several; the highest rating wins, all reasons kept):
#   1. Human-Wildlife Conflict - the same dangerous species seen repeatedly at a
#      camera near farms / a village.                                   -> residents
#   2. Suspicious Human Activity - a person in a restricted zone (deep_buffer),
#      worse at night.                                                   -> officials
#   3. Possible Injury / Distress - PLACEHOLDER, see assess_injury().    -> officials
#   4. Unusual Wildlife Activity - a burst of sightings far above the species'
#      own historical pattern.                                           -> officials
#   5. Zone-Based Risk - the same animal is routine deep in the forest and a
#      concern at the village edge.                                      -> residents
#
# All the numbers below are meant to be tuned - change them here.

SPECIES_TIER = {  # anything not listed counts as "low"
    "tiger": "high", "leopard": "high", "elephant": "high", "bear": "high",
    "hyena": "moderate", "wolf": "moderate", "bison": "moderate", "wild_boar": "moderate",
}
TIER_PHRASE = {"high": "a dangerous species", "moderate": "a species that can cause conflict"}

# Rule 5: rating by (zone, species tier)
ZONE_RISK = {
    "deep_buffer":   {"high": "LOW",    "moderate": "LOW",    "low": "LOW"},
    "near_farmland": {"high": "MEDIUM", "moderate": "MEDIUM", "low": "LOW"},
    "village_edge":  {"high": "HIGH",   "moderate": "MEDIUM", "low": "LOW"},
}
PEOPLE_ZONES = ("near_farmland", "village_edge")   # conflict rule applies here
RESTRICTED_ZONES = ("deep_buffer",)                # rule 2: people shouldn't be here

# Decision types that are for RESIDENTS (everything else is for forest officials)
RESIDENT_DECISION_TYPES = ("human_wildlife_conflict", "zone_risk")

# Rule 3 (injury) will only run for these species once a model exists
INJURY_CHECK_SPECIES = ("tiger", "leopard", "wild_boar")

CONFLICT_WINDOW_HOURS = 6      # rule 1: look back this far...
CONFLICT_HIGH_COUNT = 3        # ...3+ sightings of the species at this camera

NIGHT_START_HOUR = 20          # rule 2: 8 PM ...
NIGHT_END_HOUR = 5             # ... to 5 AM counts as night

UNUSUAL_WINDOW_MIN = 30        # rule 4: burst window
UNUSUAL_MIN_COUNT = 4          # at least this many sightings in the window...
UNUSUAL_FACTOR = 5             # ...AND at least 5x what is normal for that window
BASELINE_DAYS = 14             # "normal" = the species' last 14 days of history
UNUSUAL_MIN_HISTORY_HOURS = 2  # not enough data collected yet -> don't judge

TELEGRAM_COOLDOWN_MIN = 30     # one resident alert per species + camera per 30 min

DECISION_TITLES = {
    "human_wildlife_conflict": "Human-Wildlife Conflict Risk",
    "suspicious_human_activity": "Suspicious Human Activity",
    "possible_injury": "Possible Injury / Distress",
    "unusual_activity": "Unusual Wildlife Activity",
    "zone_risk": "Zone-Based Risk",
    "routine": "Routine - logged only",
}
# alert_type used when a decision needs an alert row but the zone does not
# already create one (deep_buffer cameras only)
DECISION_ALERT_TYPE = {
    "human_wildlife_conflict": "boundary_alert",
    "suspicious_human_activity": "suspicious_activity",
    "possible_injury": "possible_injury",
    "unusual_activity": "unusual_activity",
    "zone_risk": "proximity_watch",
}
_LEVEL_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
_TYPE_PRIORITY = ["suspicious_human_activity", "possible_injury", "human_wildlife_conflict",
                  "unusual_activity", "zone_risk"]  # tie-break: earlier = more important
ZONE_PHRASES = {"deep_buffer": "deep inside the forest", "near_farmland": "near farmland", "village_edge": "at the village edge"}


def assess_injury(image_path, species):
    """RULE 3 - LEFT BLANK ON PURPOSE (injury model is still being trained).

    Planned for tiger, leopard and wild boar (see INJURY_CHECK_SPECIES). When the
    model is ready, return a dict such as
        {"injured": True, "note": "visible wound on left hind leg"}
    or None when there is nothing to report. The engine already turns that into
    a 'Possible Injury' decision for forest officials asking for field verification.
    """
    return None


def _is_night(now):
    return now.hour >= NIGHT_START_HOUR or now.hour < NIGHT_END_HOUR


def _count_sightings(cur, species, since_iso, camera_id=None):
    if camera_id is None:
        cur.execute("SELECT COUNT(*) AS c FROM detections WHERE species = ? AND timestamp >= ?", (species, since_iso))
    else:
        cur.execute("SELECT COUNT(*) AS c FROM detections WHERE species = ? AND camera_id = ? AND timestamp >= ?",
                    (species, camera_id, since_iso))
    return cur.fetchone()["c"]


def evaluate_detection(cur, camera, species, now, image_path=None):
    """Runs all five rules for one detection that is ALREADY saved in the
    detections table (so sighting counts include it). Returns a dict:
    decision_type, risk_level, title, reasons[], action, wants_telegram,
    resident_note (extra sentence for the resident alert)."""
    zone = camera["zone"]
    tier = SPECIES_TIER.get(species, "low")
    name = species.replace("_", " ").title()
    findings = []  # (decision_type, level, reason, action, resident_note)

    # ---- Rule 2: suspicious human activity (officials) ----
    if species == "person":
        if zone in RESTRICTED_ZONES:
            if _is_night(now):
                findings.append(("suspicious_human_activity", "HIGH",
                                 f"A person was detected inside a restricted forest zone at night ({now.strftime('%I:%M %p')}).",
                                 "Send a patrol to verify the area now.", None))
            else:
                findings.append(("suspicious_human_activity", "MEDIUM",
                                 "A person was detected inside a restricted forest zone during the day.",
                                 "Review the photo and verify with the field team.", None))
        else:
            findings.append(("zone_risk", "LOW",
                             "A person in an area where people are expected.", "Logged to database only.", None))
    else:
        # ---- Rule 5: zone-based risk (residents) ----
        level = ZONE_RISK.get(zone, ZONE_RISK["deep_buffer"])[tier]
        zone_phrase = ZONE_PHRASES.get(zone, zone)
        if level == "LOW":
            findings.append(("zone_risk", "LOW",
                             f"{name} detected {zone_phrase} - routine sighting.", "Logged to database only.", None))
        else:
            findings.append(("zone_risk", level,
                             f"{name} is {TIER_PHRASE[tier]}, detected {zone_phrase}.",
                             "Warn nearby residents and keep watch." if level == "HIGH" else "Keep watch for repeat sightings.",
                             None))

        # ---- Rule 1: human-wildlife conflict - repeat sightings near people (residents) ----
        if zone in PEOPLE_ZONES and tier in ("high", "moderate"):
            since = (now - timedelta(hours=CONFLICT_WINDOW_HOURS)).isoformat()
            count = _count_sightings(cur, species, since, camera["id"])
            if count >= CONFLICT_HIGH_COUNT:
                findings.append(("human_wildlife_conflict", "HIGH",
                                 f"{name} detected {count} times in the last {CONFLICT_WINDOW_HOURS} hours at this location.",
                                 "Warn nearby residents and dispatch a patrol team.",
                                 f"It has been seen {count} times in the last {CONFLICT_WINDOW_HOURS} hours nearby."))
            elif count == 2 and tier == "high":
                findings.append(("human_wildlife_conflict", "MEDIUM",
                                 f"{name} detected twice in the last {CONFLICT_WINDOW_HOURS} hours at this location.",
                                 "Watch for further sightings; consider a patrol check.", None))

        # ---- Rule 4: unusual activity vs the species' own history (officials) ----
        recent_start = now - timedelta(minutes=UNUSUAL_WINDOW_MIN)
        recent = _count_sightings(cur, species, recent_start.isoformat())
        if recent >= UNUSUAL_MIN_COUNT:
            cur.execute("SELECT MIN(timestamp) AS first FROM detections WHERE timestamp < ?", (recent_start.isoformat(),))
            first = cur.fetchone()["first"]
            if first:
                history_hours = (recent_start - datetime.fromisoformat(first)).total_seconds() / 3600
                if history_hours >= UNUSUAL_MIN_HISTORY_HOURS:
                    span_days = min(BASELINE_DAYS, max(1.0, history_hours / 24))
                    base_since = (recent_start - timedelta(days=BASELINE_DAYS)).isoformat()
                    cur.execute("SELECT COUNT(*) AS c FROM detections WHERE species = ? AND timestamp >= ? AND timestamp < ?",
                                (species, base_since, recent_start.isoformat()))
                    hist = cur.fetchone()["c"]
                    per_day = hist / span_days
                    expected = per_day * UNUSUAL_WINDOW_MIN / 1440
                    if recent >= UNUSUAL_FACTOR * max(expected, 0.05):
                        level = "HIGH" if (tier == "high" and zone in PEOPLE_ZONES) else "MEDIUM"
                        findings.append(("unusual_activity", level,
                                         f"{name}: {recent} sightings in {UNUSUAL_WINDOW_MIN} minutes, versus a normal ~{per_day:.1f} per day.",
                                         "Review recent photos and check the area for a disturbance.", None))

    # ---- Rule 3: possible injury - blank for now (officials) ----
    injury = None
    if species in INJURY_CHECK_SPECIES:
        try:
            injury = assess_injury(image_path, species)
        except Exception as e:
            print(f"Injury check failed: {e}")
    if injury and injury.get("injured"):
        note = injury.get("note") or "signs of injury or abnormal condition"
        findings.append(("possible_injury", "HIGH",
                         f"{name} may be injured or in distress: {note}.",
                         "Field verification needed - send a team to check the animal.", None))

    # ---- Combine: highest rating wins, ties go to the more important type ----
    findings.sort(key=lambda f: (-_LEVEL_RANK[f[1]], _TYPE_PRIORITY.index(f[0])))
    top_type, top_level, _, top_action, _ = findings[0]
    reasons = [f[2] for f in findings if _LEVEL_RANK[f[1]] >= 1] or [findings[0][2]]
    if top_level == "LOW":
        top_type = "routine"  # nothing noteworthy - stored for the record only

    # ---- Residents: any HIGH conflict / zone finding means a Telegram alert ----
    resident = sorted([f for f in findings if f[0] in RESIDENT_DECISION_TYPES and f[1] == "HIGH"],
                      key=lambda f: _TYPE_PRIORITY.index(f[0]))

    return {
        "decision_type": top_type,
        "risk_level": top_level,
        "title": DECISION_TITLES[top_type],
        "reasons": reasons,
        "action": top_action,
        "wants_telegram": bool(resident),
        "resident_note": (resident[0][4] or "") if resident else "",
    }


def _telegram_on_cooldown(cur, camera_id, species, now):
    """True if residents were already alerted about this species at this camera recently."""
    since = (now - timedelta(minutes=TELEGRAM_COOLDOWN_MIN)).isoformat()
    cur.execute(
        "SELECT 1 FROM decisions WHERE telegram = 'sent' AND camera_id = ? AND species = ? AND created_at >= ? LIMIT 1",
        (camera_id, species, since),
    )
    return cur.fetchone() is not None


# ---- Custom Telegram message (editable in Settings -> Telegram Alert Message) ----
DEFAULT_TELEGRAM_TEMPLATE = (
    "WILDLIFE ALERT\n"
    "{species} detected at {location}.\n"
    "{note}\n"
    "Please stay alert: avoid the area, keep children and livestock indoors, and do not approach the animal.\n"
    "Time: {date}, {time}"
)
TELEGRAM_PLACEHOLDERS = {
    "species":  "Animal detected, e.g. Tiger",
    "location": "Camera location name",
    "zone":     "Zone, e.g. Village Edge",
    "date":     "Date, e.g. 16 Oct 2026",
    "time":     "Time, e.g. 09:42 PM",
    "note":     "Extra detail from the engine (e.g. repeat sightings). Blank if none",
    "title":    "Decision title, e.g. Human-Wildlife Conflict Risk",
    "action":   "Recommended action from the decision engine",
}
TELEGRAM_TEMPLATE_MAX = 1500


def get_setting(key, default=None):
    conn = get_db()
    try:
        row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    finally:
        conn.close()
    return row["value"] if row else default


def set_setting(key, value):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, value))
        conn.commit()
    finally:
        conn.close()


def delete_setting(key):
    conn = get_db()
    try:
        conn.execute("DELETE FROM app_settings WHERE key = ?", (key,))
        conn.commit()
    finally:
        conn.close()


def render_telegram_template(template, values):
    """Fills {placeholders}. Unknown ones are left as typed so typos are easy to
    spot in the preview. A line that held only placeholders which came out empty
    (e.g. {note} with no note) is dropped instead of leaving a blank line."""
    pattern = re.compile(r"\{(\w+)\}")
    out = []
    for line in template.splitlines():
        had_placeholder = bool(pattern.search(line))
        rendered = pattern.sub(lambda m: str(values.get(m.group(1), m.group(0))), line)
        if had_placeholder and not rendered.strip():
            continue
        out.append(rendered)
    return "\n".join(out).strip()


def _build_telegram_message(decision, species, location, now, zone=""):
    """Safety notice for residents. Uses the custom template from Settings if one
    is saved, otherwise the default wording."""
    template = get_setting("telegram_template") or DEFAULT_TELEGRAM_TEMPLATE
    values = {
        "species": species.replace("_", " ").title(),
        "location": location,
        "zone": ZONE_PHRASES.get(zone, zone or ""),
        "date": now.strftime("%d %b %Y"),
        "time": now.strftime("%I:%M %p"),
        "note": decision.get("resident_note") or "",
        "title": decision.get("title") or "",
        "action": decision.get("action") or "",
    }
    return render_telegram_template(template, values)


class TelegramTemplate(BaseModel):
    template: str = ""


@app.get("/settings/telegram")
def get_telegram_settings(current_user: str = Depends(get_current_user)):
    saved = get_setting("telegram_template")
    return {
        "template": saved or DEFAULT_TELEGRAM_TEMPLATE,
        "is_default": not saved,
        "default_template": DEFAULT_TELEGRAM_TEMPLATE,
        "placeholders": TELEGRAM_PLACEHOLDERS,
        "max_length": TELEGRAM_TEMPLATE_MAX,
    }


@app.put("/settings/telegram")
def save_telegram_settings(body: TelegramTemplate, current_user: str = Depends(get_current_user)):
    text = body.template.strip()
    if len(text) > TELEGRAM_TEMPLATE_MAX:
        raise HTTPException(status_code=400, detail=f"Message is too long (max {TELEGRAM_TEMPLATE_MAX} characters).")
    if not text or text == DEFAULT_TELEGRAM_TEMPLATE:
        delete_setting("telegram_template")  # empty / unchanged = back to the default wording
        return {"template": DEFAULT_TELEGRAM_TEMPLATE, "is_default": True}
    set_setting("telegram_template", text)
    return {"template": text, "is_default": False}


@app.post("/settings/telegram/preview")
def preview_telegram_message(body: TelegramTemplate, current_user: str = Depends(get_current_user)):
    """Renders the template with sample values so the Settings page can show a live preview."""
    now = datetime.now()
    sample = {
        "species": "Tiger", "location": "Village Edge North", "zone": ZONE_PHRASES["village_edge"],
        "date": now.strftime("%d %b %Y"), "time": now.strftime("%I:%M %p"),
        "note": "It has been seen 3 times in the last 6 hours nearby.",
        "title": DECISION_TITLES["human_wildlife_conflict"],
        "action": "Warn nearby residents and dispatch a patrol team.",
    }
    return {"message": render_telegram_template(body.template or DEFAULT_TELEGRAM_TEMPLATE, sample)}


def process_image_for_camera(camera_name: str, image_path: str, original_filename: str):
    """
    Core detection pipeline: takes a camera name + path to an image already
    on disk, runs YOLO, saves an evidence copy, logs detections + zone-based
    alerts, generates a yellow-annotated copy for Telegram, and fires
    Telegram alerts. Used by both the /detect HTTP route and the background
    auto-simulator, so the logic lives in one place.
    Returns a dict summary, same shape /detect used to return.
    """
    camera = get_camera_by_name(camera_name)
    if camera is None:
        raise ValueError(f"Camera '{camera_name}' not found")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    saved_filename = f"{camera_name}_{timestamp}_{original_filename}"
    saved_path = os.path.join(EVIDENCE_FOLDER, saved_filename)
    shutil.copyfile(image_path, saved_path)

    # iou=0.45 tightens Non-Max Suppression so the model doesn't log two
    # overlapping boxes for the SAME physical animal as separate detections.
    results = model.predict(saved_path, conf=CONFIDENCE_THRESHOLD, iou=0.45, verbose=False)

    # Collect every box in this frame first - the model can (correctly) find
    # multiple different animals in one photo, and we want ONE annotated
    # image showing all of them, not one image per detection.
    frame_boxes = []
    for r in results:
        for box in r.boxes:
            species = model.names[int(box.cls)]
            confidence = round(float(box.conf), 3)
            bbox_list = [round(x, 1) for x in box.xyxy.tolist()[0]]
            frame_boxes.append((species, confidence, bbox_list))

    annotated_path = saved_path
    if frame_boxes:
        annotated_filename = f"annotated_{saved_filename}"
        annotated_path = os.path.join(EVIDENCE_FOLDER, annotated_filename)
        try:
            draw_yellow_annotations(saved_path, frame_boxes, annotated_path)
        except Exception as e:
            print(f"Annotation drawing failed, falling back to raw image: {e}")
            annotated_path = saved_path

    conn = get_db()
    cur = conn.cursor()

    saved_detections = []
    now_iso = datetime.now().isoformat()
    zone = camera["zone"]

    for species, confidence, bbox_list in frame_boxes:
        bbox = str(bbox_list)

        cur.execute(
            """INSERT INTO detections (camera_id, species, confidence, bbox, image_path, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (camera["id"], species, confidence, bbox, saved_filename, now_iso),
        )
        detection_id = cur.lastrowid
        saved_detections.append({"species": species, "confidence": confidence, "bbox": bbox})

        # ---- Decision engine: one stored decision per detection ----
        display_location = camera["location_name"] if camera["location_name"] else camera["name"]
        now = datetime.now()
        decision = evaluate_detection(cur, camera, species, now, annotated_path)

        telegram_status = "none"
        if decision["wants_telegram"]:
            telegram_status = "cooldown" if _telegram_on_cooldown(cur, camera["id"], species, now) else "sent"

        cur.execute(
            """INSERT INTO decisions (detection_id, camera_id, species, decision_type, risk_level,
                                       title, reasons, action, telegram, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (detection_id, camera["id"], species, decision["decision_type"], decision["risk_level"],
             decision["title"], json.dumps(decision["reasons"]), decision["action"], telegram_status, now_iso),
        )

        # ---- Alert row (dashboard) ----
        # The zone still decides the alert TYPE used for classification:
        #   village_edge -> boundary_alert, near_farmland -> proximity_watch.
        # deep_buffer normally makes no alert, unless the engine rates the
        # detection MEDIUM or HIGH (e.g. a person in a restricted forest zone).
        zone_alert_type = {"village_edge": "boundary_alert", "near_farmland": "proximity_watch"}.get(zone)
        alert_type = zone_alert_type
        if alert_type is None and decision["risk_level"] in ("MEDIUM", "HIGH"):
            alert_type = DECISION_ALERT_TYPE[decision["decision_type"]]

        if alert_type:
            message = f"{species.replace('_', ' ').title()} detected at {display_location}."
            cur.execute(
                """INSERT INTO alerts (detection_id, camera_id, alert_type, message, status, created_at)
                   VALUES (?, ?, ?, ?, 'unresolved', ?)""",
                (detection_id, camera["id"], alert_type, message, now_iso),
            )

        # ---- Telegram: residents only, for HIGH conflict / zone decisions ----
        if telegram_status == "sent":
            send_telegram_alert(_build_telegram_message(decision, species, display_location, now, camera["zone"]), annotated_path)

    conn.commit()
    conn.close()

    return {
        "camera": camera_name,
        "image_saved_to": saved_path,
        "detections_found": len(saved_detections),
        "detections": saved_detections,
    }


@app.post("/detect")
def detect(camera_name: str = Form(...), file: UploadFile = File(...)):
    """
    Takes a camera name + an image file, runs YOLO on it,
    saves each detection to the database, and saves the image as evidence.
    NOTE: left unauthenticated for now since simulate.py calls this directly
    as your local "sensor" - not exposed to the internet in this project.
    """
    camera = get_camera_by_name(camera_name)
    if camera is None:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_name}' not found")

    # Save the uploaded file to a temp path, then hand off to the shared pipeline
    temp_path = os.path.join(EVIDENCE_FOLDER, f"_upload_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}")
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = process_image_for_camera(camera_name, temp_path, file.filename)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return result


MAX_IDENTIFY_BYTES = 15 * 1024 * 1024  # 15 MB


@app.post("/identify")
def identify_animal(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """Manual 'what animal is this?' tool for the dashboard. Runs the model on
    an uploaded photo and returns the boxes so the UI can draw them.
    Nothing is saved and no alerts / Telegram messages are triggered."""
    raw = file.file.read(MAX_IDENTIFY_BYTES + 1)
    if len(raw) > MAX_IDENTIFY_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large (max 15 MB).")

    try:
        img = Image.open(io.BytesIO(raw))
        # apply the phone's rotation flag so box coordinates match what the browser shows
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="That file isn't a valid image.")

    width, height = img.size
    results = model.predict(img, conf=CONFIDENCE_THRESHOLD, iou=0.45, verbose=False)

    detections = []
    for r in results:
        for box in r.boxes:
            detections.append({
                "species": model.names[int(box.cls)],
                "confidence": round(float(box.conf), 3),
                "bbox": [round(x, 1) for x in box.xyxy.tolist()[0]],
            })
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    return {"width": width, "height": height, "detections": detections}


# ---------------- BACKGROUND AUTO-SIMULATOR ----------------
# Loads preloaded images per camera and, once started, feeds a random
# camera + random image through the same detection pipeline at random
# intervals - runs inside the backend itself so it can be started/stopped
# from the Settings page without needing a separate terminal.
#
# NOTE: this is fully independent from the standalone simulate.py script.
# If you also have `python simulate.py` running in another terminal,
# stopping this one will NOT stop that one - only one should run at a time
# unless you deliberately want both feeding data in.

IMAGES_ROOT = "images"
SIM_MIN_DELAY = 15
SIM_MAX_DELAY = 20

sim_thread = None
sim_stop_event = threading.Event()


def load_camera_images():
    camera_images = {}
    if not os.path.exists(IMAGES_ROOT):
        return camera_images
    for camera_name in sorted(os.listdir(IMAGES_ROOT)):
        camera_path = os.path.join(IMAGES_ROOT, camera_name)
        if not os.path.isdir(camera_path):
            continue
        image_files = [
            os.path.join(camera_path, f)
            for f in os.listdir(camera_path)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        if image_files:
            camera_images[camera_name] = image_files
    return camera_images


def simulation_loop(stop_event: threading.Event):
    """Runs until stop_event is set. Each thread gets its OWN stop_event,
    so an old thread winding down can never be accidentally revived by a
    new /simulate/start call clearing a shared flag."""
    camera_images = load_camera_images()

    if not camera_images:
        print("Auto-simulator: no images found in images/<camera_name>/ folders - stopping.")
        return

    camera_names = list(camera_images.keys())
    print(f"Auto-simulator started. Cameras with images: {camera_names}")

    while not stop_event.is_set():
        camera_name = random.choice(camera_names)
        image_path = random.choice(camera_images[camera_name])
        try:
            process_image_for_camera(camera_name, image_path, os.path.basename(image_path))
        except Exception as e:
            print(f"Auto-simulator error: {e}")

        delay = random.randint(SIM_MIN_DELAY, SIM_MAX_DELAY)
        stop_event.wait(delay)

    print("Auto-simulator stopped.")


@app.post("/simulate/start")
def start_simulation(current_user: str = Depends(get_current_user)):
    global sim_thread, sim_stop_event
    if sim_thread and sim_thread.is_alive():
        return {"status": "already_running"}

    sim_stop_event = threading.Event()  # fresh event per thread - no shared-flag race
    sim_thread = threading.Thread(target=simulation_loop, args=(sim_stop_event,), daemon=True)
    sim_thread.start()
    return {"status": "started"}


@app.post("/simulate/stop")
def stop_simulation(current_user: str = Depends(get_current_user)):
    if not sim_thread or not sim_thread.is_alive():
        return {"status": "already_stopped"}
    sim_stop_event.set()
    return {"status": "stopping"}


@app.get("/simulate/status")
def simulation_status(current_user: str = Depends(get_current_user)):
    running = bool(sim_thread and sim_thread.is_alive())
    return {"running": running, "min_delay": SIM_MIN_DELAY, "max_delay": SIM_MAX_DELAY}


class SimConfig(BaseModel):
    min_delay: int
    max_delay: int


@app.post("/simulate/config")
def update_simulation_config(config: SimConfig, current_user: str = Depends(get_current_user)):
    global SIM_MIN_DELAY, SIM_MAX_DELAY
    if config.min_delay < 1 or config.max_delay < config.min_delay:
        raise HTTPException(status_code=400, detail="min_delay must be >= 1 and max_delay must be >= min_delay")
    SIM_MIN_DELAY = config.min_delay
    SIM_MAX_DELAY = config.max_delay
    return {"status": "updated", "min_delay": SIM_MIN_DELAY, "max_delay": SIM_MAX_DELAY}
