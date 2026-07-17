# backend/utils.py
import io
import base64
import numpy as np
from PIL import Image
import cv2

IMAGE_SIZE = 224

def load_image_from_bytes(bytes_data):
    img = Image.open(io.BytesIO(bytes_data)).convert("RGB")
    return img

def preprocess_pil(img, size=IMAGE_SIZE):
    img_resized = img.resize((size, size))
    arr = np.array(img_resized).astype("float32") / 255.0
    return np.expand_dims(arr, 0)

def green_ratio_pil(img):
    """Return simple vegetation score: fraction of 'green' pixels and normalized green intensity."""
    img = img.convert("RGB")
    arr = np.array(img).astype(int)
    if arr.size == 0:
        return 0.0, 0.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green_mask = (g > r + 10) & (g > b + 10) & (g > 60)
    frac = green_mask.sum() / (arr.shape[0] * arr.shape[1])
    norm_green = np.clip((g - (r + b) / 2) / 255.0, 0, 1).mean()
    return float(frac), float(norm_green)

def array_to_base64_pil(img: Image.Image, fmt="JPEG"):
    buffered = io.BytesIO()
    img.save(buffered, format=fmt)
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def overlay_heatmap_on_pil(img_pil, heatmap):
    # heatmap: numpy 0..1, same size as img_pil
    heat = (heatmap * 255).astype('uint8')
    heat = cv2.applyColorMap(heat, cv2.COLORMAP_JET)
    heat = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)
    heat_pil = Image.fromarray(heat)
    overlay = Image.blend(img_pil.convert("RGBA"), heat_pil.convert("RGBA"), alpha=0.45)
    return overlay
