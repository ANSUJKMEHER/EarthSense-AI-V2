// frontend/src/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export async function predictImage(file) {
  const form = new FormData();
  form.append("image", file);

  const res = await axios.post(`${API_BASE}/predict`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function batchPredict(files) {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));

  const res = await axios.post(`${API_BASE}/batch_predict`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}
