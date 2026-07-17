# backend/app.py
import os
# Configure TensorFlow environment variables BEFORE import to reduce memory overhead
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import io
import json
import base64
import tempfile
import requests
import time
import logging

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import tensorflow as tf
# Optimize TensorFlow threading to reduce memory and CPU overhead in container environments
tf.config.threading.set_intra_op_parallelism_threads(1)
tf.config.threading.set_inter_op_parallelism_threads(1)

from utils import (
    load_image_from_bytes, preprocess_pil,
    green_ratio_pil, array_to_base64_pil,
    overlay_heatmap_on_pil, calculate_spectral_indices,
    extract_gps_coordinates
)
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("earthsense")

load_dotenv()  # load backend/.env in dev

app = Flask(__name__)
CORS(app)

MODEL_FILE = os.getenv("MODEL_FILE", "model/deforestation_model.h5")
MODEL_URL = os.getenv("MODEL_URL", None)
CLASS_IDX_PATH = os.path.join("model", "class_indices.json")

def safe_len(b):
    try:
        return len(b)
    except Exception:
        return "?"

# Helper: if MODEL_FILE doesn't exist but MODEL_URL provided, download it at startup
def ensure_model():
    if os.path.exists(MODEL_FILE):
        return MODEL_FILE
    if MODEL_URL:
        os.makedirs(os.path.dirname(MODEL_FILE), exist_ok=True)
        tmp = MODEL_FILE + ".downloading"
        logger.info("Downloading model from MODEL_URL ...")
        r = requests.get(MODEL_URL, stream=True, timeout=300)
        r.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        os.rename(tmp, MODEL_FILE)
        logger.info("Model downloaded to %s", MODEL_FILE)
        return MODEL_FILE
    raise FileNotFoundError("Model file not found and MODEL_URL not provided.")

# Load model once (compile=False skips optimizer state allocation, saving ~150MB RAM)
model_path = ensure_model()
logger.info("Loading model from %s with compile=False", model_path)
model = tf.keras.models.load_model(model_path, compile=False)

import gc
gc.collect()  # Force free up memory allocated during loading

if os.path.exists(CLASS_IDX_PATH):
    with open(CLASS_IDX_PATH, "r") as f:
        class_idx = json.load(f)
else:
    class_idx = {"deforested": 0, "non-deforested": 1}
inv_map = {v: k for k, v in class_idx.items()}  # {0:'deforested', 1:'non-deforested'}

from tensorflow.keras.layers import Conv2D, DepthwiseConv2D, SeparableConv2D

def find_last_conv_layer(model):
    """
    Try to find the last convolution-like layer for Grad-CAM.
    Falls back to checking 4D output shape if needed.
    """
    # 1) Prefer explicit conv-type layers
    for layer in reversed(model.layers):
        if isinstance(layer, (Conv2D, DepthwiseConv2D, SeparableConv2D)):
            return layer.name

    # 2) Fallback: any layer whose output is 4D
    for layer in reversed(model.layers):
        try:
            if len(layer.output.shape) == 4:
                return layer.name
        except Exception:
            continue

    raise ValueError("No suitable conv layer found for Grad-CAM.")

LAST_CONV = find_last_conv_layer(model)
logger.info("Last conv layer for Grad-CAM: %s", LAST_CONV)


def make_gradcam_pil(img_pil, class_to_explain=0):
    img_array = np.array(img_pil.resize((224,224))).astype(np.float32)/255.0
    x = np.expand_dims(img_array, 0)

    grad_model = tf.keras.models.Model(model.inputs, [model.get_layer(LAST_CONV).output, model.output])
    with tf.GradientTape() as tape:
        conv_outputs, preds = grad_model(x)
        if model.output_shape[-1] == 1:
            # preds -> prob_non_deforested
            target = tf.reduce_mean(1.0 - preds[:,0]) if class_to_explain == 0 else tf.reduce_mean(preds[:,0])
        else:
            target = preds[:, class_to_explain]
    grads = tape.gradient(target, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0,1,2))
    conv_outputs = conv_outputs[0].numpy()
    pooled_grads = pooled_grads.numpy()

    heatmap = np.zeros(conv_outputs.shape[0:2], dtype=np.float32)
    for i in range(pooled_grads.shape[-1]):
        heatmap += pooled_grads[i] * conv_outputs[:,:,i]

    heatmap = np.maximum(heatmap, 0)
    maxv = heatmap.max() if heatmap.max() != 0 else 1e-10
    heatmap /= maxv
    import cv2
    heatmap = cv2.resize(heatmap, img_pil.size)
    overlay = overlay_heatmap_on_pil(img_pil, heatmap)
    return overlay.convert("RGB")

@app.route("/ping")
def ping():
    return jsonify({"status": "ok"})

@app.route("/predict_nograd", methods=["POST"])
def predict_nograd():
    """
    FAST test endpoint: performs only image load + preprocess + model.predict
    Skips Grad-CAM and extra processing so we can measure model predict time.
    """
    start = time.time()
    logger.info("predict_nograd: request started")
    if 'image' not in request.files:
        logger.info("predict_nograd: no image provided. keys=%s", list(request.files.keys()))
        return jsonify({"error": "no image provided"}), 400

    file = request.files['image']
    filename = getattr(file, "filename", "<nofile>")
    logger.info("predict_nograd: received file name=%s content_length=%s", filename, request.content_length)

    try:
        bytes_data = file.read()
        logger.info("predict_nograd: read bytes=%s", safe_len(bytes_data))
    except Exception as e:
        logger.exception("predict_nograd: failed reading file")
        return jsonify({"error": "failed to read file", "detail": str(e)}), 400

    try:
        img = load_image_from_bytes(bytes_data)
    except Exception as e:
        logger.exception("predict_nograd: invalid image")
        return jsonify({"error": "invalid image", "detail": str(e)}), 400

    t_pre = time.time()
    x = preprocess_pil(img)
    logger.info("predict_nograd: preprocess done (%.3fs)", time.time() - t_pre)

    t_pred_start = time.time()
    try:
        pred = model(x, training=False).numpy()
    except Exception as e:
        logger.exception("predict_nograd: model.predict failed")
        return jsonify({"error": "model prediction failed", "detail": str(e)}), 500
    t_pred = time.time() - t_pred_start
    logger.info("predict_nograd: model.predict returned in %.3fs", t_pred)

    # normalize output robustly
    try:
        # pred might be array shape (1,1) or (1,N)
        pval = pred[0]
        if hasattr(pval, "__len__"):
            prob_non_def = float(pval[0])
        else:
            prob_non_def = float(pval)
    except Exception:
        try:
            prob_non_def = float(pred)
        except Exception:
            prob_non_def = 0.0

    prob_def = 1.0 - prob_non_def
    label = "Deforested" if prob_def >= prob_non_def else "Not Deforested"
    confidence = round(max(prob_def, prob_non_def) * 100.0, 3)

    total_time = time.time() - start
    logger.info("predict_nograd: finished total_time=%.3fs pred_time=%.3fs", total_time, t_pred)

    return jsonify({
        "label": label,
        "confidence": confidence,
        "prob_deforested": round(prob_def, 4),
        "prob_non_deforested": round(prob_non_def, 4),
        "timings": {"total": round(total_time, 3), "predict": round(t_pred, 3)}
    })


@app.route("/predict", methods=["POST"])
def predict():
    start = time.time()
    logger.info("predict: request started")
    if 'image' not in request.files:
        logger.info("predict: no image provided. keys=%s", list(request.files.keys()))
        return jsonify({"error":"no image provided"}), 400

    file = request.files['image']
    filename = getattr(file, "filename", "<nofile>")
    logger.info("predict: received file name=%s content_length=%s", filename, request.content_length)

    try:
        bytes_data = file.read()
        logger.info("predict: read bytes=%s", safe_len(bytes_data))
    except Exception as e:
        logger.exception("predict: failed reading file")
        return jsonify({"error":"failed to read file", "detail": str(e)}), 400

    try:
        img = load_image_from_bytes(bytes_data)
    except Exception as e:
        logger.exception("predict: invalid image")
        return jsonify({"error":"invalid image", "detail": str(e)}), 400

    t_pre = time.time()
    x = preprocess_pil(img)
    logger.info("predict: preprocess done (%.3fs)", time.time() - t_pre)

    t_pred_start = time.time()
    try:
        pred = model(x, training=False).numpy()[0]
    except Exception as e:
        logger.exception("predict: model.predict failed")
        return jsonify({"error":"model prediction failed", "detail": str(e)}), 500
    t_pred = time.time() - t_pred_start
    logger.info("predict: model.predict done (%.3fs)", t_pred)

    try:
        prob_non_def = float(pred[0]) if hasattr(pred, "__len__") else float(pred)
    except Exception:
        try:
            prob_non_def = float(pred)
        except Exception:
            prob_non_def = 0.0
    prob_def = 1.0 - prob_non_def
    label = "Deforested" if prob_def >= prob_non_def else "Not Deforested"
    confidence = round(max(prob_def, prob_non_def) * 100.0, 3)

    veg_frac, veg_norm = green_ratio_pil(img)
    spectral_indices = calculate_spectral_indices(img)
    gps_coords = extract_gps_coordinates(img)

    gradcam_b64 = None
    t_gc_start = time.time()
    try:
        class_to_explain = 0 if prob_def >= prob_non_def else 1
        overlay = make_gradcam_pil(img, class_to_explain=class_to_explain)
        gradcam_b64 = array_to_base64_pil(overlay, fmt="JPEG")
        t_gc = time.time() - t_gc_start
        logger.info("predict: gradcam done (%.3fs)", t_gc)
    except Exception as e:
        t_gc = time.time() - t_gc_start
        logger.exception("predict: gradcam failed (%.3fs) %s", t_gc, str(e))
        gradcam_b64 = None

    total_time = time.time() - start
    logger.info("predict: finished total_time=%.3fs pred=%.3fs gradcam=%.3fs", total_time, t_pred, t_gc if 't_gc' in locals() else 0.0)

    return jsonify({
        "label": label,
        "confidence": confidence,
        "prob_deforested": round(prob_def, 4),
        "prob_non_deforested": round(prob_non_def, 4),
        "veg_fraction": round(veg_frac, 4),
        "veg_norm": round(veg_norm, 4),
        "spectral_indices": spectral_indices,
        "gps": gps_coords,
        "gradcam_base64": gradcam_b64,
        "timings": {"total": round(total_time, 3), "predict": round(t_pred, 3), "gradcam": round(t_gc if 't_gc' in locals() else 0.0, 3)}
    })


@app.route("/batch_predict", methods=["POST"])
def batch_predict():
    logger.info("batch_predict: request started")
    files = request.files.getlist("images")
    results = []
    for f in files:
        try:
            bytes_data = f.read()
            img = load_image_from_bytes(bytes_data)
            x = preprocess_pil(img)
            pred = model(x, training=False).numpy()[0]
            prob_non_def = float(pred[0]) if hasattr(pred, "__len__") else float(pred)
            prob_def = 1.0 - prob_non_def
            label = "Deforested" if prob_def >= prob_non_def else "Not Deforested"
            veg_frac, veg_norm = green_ratio_pil(img)
            spectral_indices = calculate_spectral_indices(img)
            gps_coords = extract_gps_coordinates(img)
            results.append({
                "filename": f.filename,
                "label": label,
                "confidence": round(max(prob_def, prob_non_def), 4),
                "prob_deforested": round(prob_def, 4),
                "prob_non_deforested": round(prob_non_def, 4),
                "veg_fraction": round(veg_frac, 4),
                "spectral_indices": spectral_indices,
                "gps": gps_coords
            })
        except Exception as e:
            logger.exception("batch_predict: error for file %s", getattr(f, "filename", "<nofile>"))
            results.append({"filename": getattr(f, "filename", "<nofile>"), "error": str(e)})

    total = len([r for r in results if "label" in r])
    defo = sum(1 for r in results if r.get("label") == "Deforested")
    non = sum(1 for r in results if r.get("label") == "Not Deforested")
    summary = {"total": total, "deforested": defo, "not_deforested": non}
    logger.info("batch_predict: finished summary=%s", summary)
    return jsonify({"summary": summary, "results": results})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
