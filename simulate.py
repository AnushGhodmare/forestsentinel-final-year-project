"""
SIMULATE.PY (upgraded) - Continuous Random Camera Trap Simulation
--------------------------------------------------------------------
Real camera traps don't fire in a neat, predictable order - an animal
walks past Camera_6, nothing happens for a while, then Camera_2 fires,
then Camera_6 again, etc. This version mimics that:

  - Runs forever (until you press Ctrl+C), not just once
  - Each "event" picks a RANDOM camera and a RANDOM image from that
    camera's folder (images can repeat - that's realistic, the same
    spot gets photographed multiple times over a season)
  - Waits a RANDOM amount of time between events (not a fixed delay),
    so it doesn't look like a robotic loop

BEFORE RUNNING:
1. app.py must already be running (uvicorn app:app --reload)
2. images/Camera_1 ... images/Camera_8 folders must have images in them

Run with:  python simulate.py
Stop with: Ctrl+C
"""

import os
import time
import random
import requests

# ---------------- CONFIG ----------------
API_URL = "http://127.0.0.1:8000/detect"
IMAGES_ROOT = "images"

# Random delay range between simulated trigger events (seconds).
# Kept short for a live demo - real traps go minutes/hours between
# triggers, but that's not watchable in a viva, so this compresses
# time while still feeling event-driven rather than robotic.
MIN_DELAY_SECONDS = 15
MAX_DELAY_SECONDS = 20
# -----------------------------------------


def load_camera_images():
    """Scans the images/ folder once and builds a dict: {camera_name: [file paths]}"""
    camera_images = {}

    if not os.path.exists(IMAGES_ROOT):
        print(f"ERROR: '{IMAGES_ROOT}' folder not found.")
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


def send_detection_event(camera_name, image_path):
    filename = os.path.basename(image_path)

    with open(image_path, "rb") as f:
        files = {"file": (filename, f, "image/jpeg")}
        data = {"camera_name": camera_name}

        try:
            response = requests.post(API_URL, data=data, files=files)
        except requests.exceptions.ConnectionError:
            print("ERROR: Could not reach the backend. Is 'uvicorn app:app --reload' running?")
            return False

    if response.status_code == 200:
        result = response.json()
        if result["detections_found"] > 0:
            species_list = [d["species"] for d in result["detections"]]
            print(f"[{camera_name}] {filename} -> detected: {species_list}")
        else:
            print(f"[{camera_name}] {filename} -> no detections")
        return True
    else:
        print(f"[{camera_name}] {filename} -> ERROR: {response.status_code} {response.text}")
        return True  # still counts as an event, just a failed one


def simulate_forever():
    camera_images = load_camera_images()

    if not camera_images:
        print("No camera folders with images found. Check your images/ folder structure.")
        return

    print(f"Loaded images for {len(camera_images)} camera(s): {list(camera_images.keys())}")
    print(f"Simulating random trap events every {MIN_DELAY_SECONDS}-{MAX_DELAY_SECONDS} seconds.")
    print("Press Ctrl+C to stop.\n")

    camera_names = list(camera_images.keys())
    event_count = 0

    try:
        while True:
            camera_name = random.choice(camera_names)
            image_path = random.choice(camera_images[camera_name])

            ok = send_detection_event(camera_name, image_path)
            if ok:
                event_count += 1

            delay = random.randint(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS)
            time.sleep(delay)

    except KeyboardInterrupt:
        print(f"\nStopped. Sent {event_count} simulated trap event(s) this run.")


if __name__ == "__main__":
    simulate_forever()
