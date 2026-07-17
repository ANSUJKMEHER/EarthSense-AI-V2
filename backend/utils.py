# backend/utils.py
import io
import base64
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
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

def calculate_spectral_indices(img):
    """Calculate professional RGB spectral vegetation indices: VARI, GLI, and NGRDI."""
    img = img.convert("RGB")
    arr = np.array(img).astype(float)
    if arr.size == 0:
        return {"vari": 0.0, "gli": 0.0, "ngrdi": 0.0}
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    
    # VARI: (g - r) / (g + r - b)
    denom_vari = g + r - b
    denom_vari[denom_vari == 0] = 1e-5
    vari = (g - r) / denom_vari
    
    # GLI: (2*g - r - b) / (2*g + r + b)
    denom_gli = 2 * g + r + b
    denom_gli[denom_gli == 0] = 1e-5
    gli = (2 * g - r - b) / denom_gli
    
    # NGRDI: (g - r) / (g + r)
    denom_ngrdi = g + r
    denom_ngrdi[denom_ngrdi == 0] = 1e-5
    ngrdi = (g - r) / denom_ngrdi
    
    return {
        "vari": float(np.clip(vari.mean(), -1.0, 1.0)),
        "gli": float(np.clip(gli.mean(), -1.0, 1.0)),
        "ngrdi": float(np.clip(ngrdi.mean(), -1.0, 1.0))
    }

def get_exif_data(img):
    exif_data = {}
    try:
        info = img._getexif()
        if info:
            for tag, value in info.items():
                decoded = TAGS.get(tag, tag)
                if decoded == "GPSInfo":
                    gps_data = {}
                    for t in value:
                        sub_decoded = GPSTAGS.get(t, t)
                        gps_data[sub_decoded] = value[t]
                    exif_data[decoded] = gps_data
                else:
                    exif_data[decoded] = value
    except Exception:
        pass
    return exif_data

def convert_to_degrees(value):
    """Convert GPS coordinates stored as EXIF tuples to decimal degrees."""
    try:
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        return None

def extract_gps_coordinates(img):
    """Extract decimal GPS coordinates from satellite JPEG EXIF tags."""
    try:
        exif = get_exif_data(img)
        gps_info = exif.get("GPSInfo")
        if not gps_info:
            return None

        gps_latitude = gps_info.get("GPSLatitude")
        gps_latitude_ref = gps_info.get("GPSLatitudeRef")
        gps_longitude = gps_info.get("GPSLongitude")
        gps_longitude_ref = gps_info.get("GPSLongitudeRef")

        if gps_latitude and gps_latitude_ref and gps_longitude and gps_longitude_ref:
            lat = convert_to_degrees(gps_latitude)
            lon = convert_to_degrees(gps_longitude)
            if lat is not None and lon is not None:
                if gps_latitude_ref != "N":
                    lat = 0 - lat
                if gps_longitude_ref != "E":
                    lon = 0 - lon
                return {"lat": round(lat, 6), "lon": round(lon, 6)}
    except Exception:
        pass
    return None

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
