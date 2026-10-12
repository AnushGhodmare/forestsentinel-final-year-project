"""
DAY 1 - Detection Pipeline Test
--------------------------------
This script loads your custom-trained YOLOv8n model (best.pt) and runs it
on a folder of sample camera trap images. It prints and saves the results
(species, confidence, bounding box) so you can confirm your model works
end-to-end before building anything else on top of it.
"""

import os
import json
from datetime import datetime
from ultralytics import YOLO

# ---------------- CONFIG ----------------
MODEL_PATH = "best.pt"              # path to your trained model
IMAGES_FOLDER = "sample_images"     # folder with a few test images
OUTPUT_FILE = "day1_results.json"   # where results get saved
CONFIDENCE_THRESHOLD = 0.4          # ignore detections below this confidence
# -----------------------------------------

def run_detection_on_folder():
    print("Loading model...")
    model = YOLO(MODEL_PATH)
    print("Model loaded. Classes it can detect:")
    print(model.names)

    if not os.path.exists(IMAGES_FOLDER):
        print(f"\nERROR: '{IMAGES_FOLDER}' folder not found.")
        print("Create it and put a few sample .jpg/.png images inside before running this script.")
        return

    image_files = [
        f for f in os.listdir(IMAGES_FOLDER)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    if not image_files:
        print(f"\nNo images found in '{IMAGES_FOLDER}'. Add some test images and re-run.")
        return

    print(f"\nFound {len(image_files)} image(s). Running detection...\n")

    all_results = []

    for filename in image_files:
        image_path = os.path.join(IMAGES_FOLDER, filename)
        results = model.predict(image_path, conf=CONFIDENCE_THRESHOLD, verbose=False)

        detections_for_image = []

        for r in results:
            for box in r.boxes:
                species = model.names[int(box.cls)]
                confidence = round(float(box.conf), 3)
                bbox = [round(x, 1) for x in box.xyxy.tolist()[0]]  # [x1, y1, x2, y2]

                detections_for_image.append({
                    "species": species,
                    "confidence": confidence,
                    "bbox": bbox,
                })

        if detections_for_image:
            print(f"{filename}:")
            for d in detections_for_image:
                print(f"   -> {d['species']} (confidence: {d['confidence']})  box: {d['bbox']}")
        else:
            print(f"{filename}: no detections above confidence threshold")

        all_results.append({
            "image": filename,
            "timestamp": datetime.now().isoformat(),
            "detections": detections_for_image,
        })

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_results, f, indent=2)

    print(f"\nDone. Results saved to '{OUTPUT_FILE}'.")


if __name__ == "__main__":
    run_detection_on_folder()
