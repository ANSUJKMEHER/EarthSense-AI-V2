# 🌲 EarthSense AI - Deforestation Detection

Satellite-based deforestation detection using deep learning. Built for hackathons with React frontend and Flask backend.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Model file: `deforestation_model.h5`

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

## 📦 Deployment

### 🎯 Recommended Setup
**Backend on Render + Frontend on Vercel** - See **[DEPLOY_RENDER_VERCEL.md](./DEPLOY_RENDER_VERCEL.md)** for step-by-step guide!

### Other Options
- See **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** for Render-only deployment
- See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for all deployment options

### Quick Deploy (Render - Free)

1. **Backend:** Deploy to Render as Web Service
2. **Frontend:** Deploy to Render as Static Site or Vercel
3. **Set Environment Variables:**
   - Backend: `MODEL_FILE`, `MODEL_URL` (optional)
   - Frontend: `VITE_API_BASE` (backend URL)

## 🎯 Features

- ✅ Single image deforestation detection
- ✅ Batch image processing
- ✅ Vegetation coverage analysis
- ✅ Grad-CAM heatmap visualization
- ✅ CSV export for batch results

## 🛠️ Tech Stack

- **Frontend:** React + Vite
- **Backend:** Flask + TensorFlow
- **Model:** MobileNetV2 (Transfer Learning)

## 📝 Environment Variables

**Backend (.env):**
```
PORT=5000
MODEL_FILE=model/deforestation_model.h5
MODEL_URL=https://your-storage-url.com/model.h5  # Optional
```

**Frontend (.env):**
```
VITE_API_BASE=http://localhost:5000
```

## 📄 License

MIT

