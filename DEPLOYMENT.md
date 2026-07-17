# EarthSense AI - Deployment Guide

This guide covers deploying both the Flask backend and React frontend.

## 📋 Prerequisites

- Git installed
- Python 3.8+ installed
- Node.js 16+ installed
- Model file (`deforestation_model.h5`) ready
- GitHub account (for easy deployment)

---

## 🚀 Deployment Options

### Option 1: Render (Recommended - Free Tier Available)

#### Backend Deployment (Flask)

1. **Prepare Backend:**
   ```bash
   cd backend
   ```

2. **Create `Procfile` in backend folder:**
   ```
   web: gunicorn app:app --bind 0.0.0.0:$PORT
   ```

3. **Create `runtime.txt` in backend folder:**
   ```
   python-3.11.0
   ```

4. **Upload Model File:**
   - Option A: Upload to cloud storage (AWS S3, Google Cloud Storage, etc.) and use `MODEL_URL`
   - Option B: Include in Git (if < 100MB) - not recommended for large models
   - Option C: Use Render's persistent disk (paid plans)

5. **Deploy on Render:**
   - Go to [render.com](https://render.com) and sign up
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Name:** earthsense-backend
     - **Environment:** Python 3
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
     - **Root Directory:** `backend`
   - Add Environment Variables:
     ```
     PORT=5000
     MODEL_FILE=model/deforestation_model.h5
     MODEL_URL=https://your-storage-url.com/model.h5  (if using cloud storage)
     ```
   - Click "Create Web Service"

#### Frontend Deployment (React)

1. **Build Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Create `.env.production` in frontend folder:**
   ```
   VITE_API_BASE=https://your-backend-url.onrender.com
   ```

3. **Deploy on Render:**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Settings:
     - **Name:** earthsense-frontend
     - **Build Command:** `cd frontend && npm install && npm run build`
     - **Publish Directory:** `frontend/dist`
   - Add Environment Variable:
     ```
     VITE_API_BASE=https://your-backend-url.onrender.com
     ```
   - Click "Create Static Site"

---

### Option 2: Railway (Easy & Fast)

#### Backend Deployment

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy Backend:**
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Set Environment Variables:**
   ```bash
   railway variables set MODEL_FILE=model/deforestation_model.h5
   railway variables set PORT=5000
   ```

4. **Upload Model:**
   - Use Railway's volume storage or cloud storage URL

#### Frontend Deployment

1. **Deploy Frontend:**
   ```bash
   cd frontend
   railway init
   railway up
   ```

2. **Set Environment Variable:**
   ```bash
   railway variables set VITE_API_BASE=https://your-backend-url.railway.app
   ```

---

### Option 3: Vercel (Frontend) + Render/Railway (Backend)

#### Frontend on Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variable:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add: `VITE_API_BASE=https://your-backend-url.com`

4. **Redeploy after adding env var**

---

### Option 4: Heroku (Classic)

#### Backend on Heroku

1. **Install Heroku CLI:**
   ```bash
   # Download from heroku.com
   heroku login
   ```

2. **Create App:**
   ```bash
   cd backend
   heroku create earthsense-backend
   ```

3. **Create `Procfile`:**
   ```
   web: gunicorn app:app --bind 0.0.0.0:$PORT
   ```

4. **Deploy:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a earthsense-backend
   git push heroku main
   ```

5. **Set Config Vars:**
   ```bash
   heroku config:set MODEL_FILE=model/deforestation_model.h5
   heroku config:set MODEL_URL=https://your-storage-url.com/model.h5
   ```

6. **Upload Model:**
   - Use Heroku's ephemeral filesystem (temporary) or cloud storage

---

## 🔧 Environment Variables Setup

### Backend Environment Variables

Create `.env` file in `backend/` folder (for local) or set in deployment platform:

```env
PORT=5000
MODEL_FILE=model/deforestation_model.h5
MODEL_URL=https://your-storage-url.com/deforestation_model.h5
```

### Frontend Environment Variables

Create `.env.production` in `frontend/` folder:

```env
VITE_API_BASE=https://your-backend-url.com
```

**Important:** For Vite, environment variables must start with `VITE_`

---

## 📦 Model File Handling

Since model files are large, here are options:

### Option 1: Cloud Storage (Recommended)

1. **Upload to AWS S3:**
   ```bash
   aws s3 cp model/deforestation_model.h5 s3://your-bucket/models/
   ```
   - Make it publicly accessible or use signed URLs
   - Set `MODEL_URL` to the public URL

2. **Upload to Google Cloud Storage:**
   ```bash
   gsutil cp model/deforestation_model.h5 gs://your-bucket/models/
   ```

3. **Upload to GitHub Releases:**
   - Create a release and attach the model file
   - Use the direct download URL

### Option 2: Git LFS (For smaller models)

```bash
git lfs install
git lfs track "*.h5"
git add .gitattributes
git add model/deforestation_model.h5
git commit -m "Add model file"
```

---

## 🛠️ Local Testing Before Deployment

### Test Backend Locally

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend should run on `http://localhost:5000`

### Test Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Frontend should run on `http://localhost:5173`

### Update Frontend API URL

In `frontend/.env`:
```
VITE_API_BASE=http://localhost:5000
```

---

## ✅ Post-Deployment Checklist

- [ ] Backend is accessible (test `/ping` endpoint)
- [ ] Frontend environment variable `VITE_API_BASE` points to backend URL
- [ ] Model file is accessible (either uploaded or via URL)
- [ ] CORS is configured correctly (already done in `app.py`)
- [ ] Test image upload and prediction
- [ ] Test batch upload
- [ ] Check logs for any errors

---

## 🔍 Troubleshooting

### Backend Issues

1. **Model not found:**
   - Check `MODEL_FILE` path
   - Verify model file exists or `MODEL_URL` is correct

2. **Memory errors:**
   - TensorFlow models can be memory-intensive
   - Consider using a platform with more RAM (Render Pro, Railway Pro)

3. **Timeout errors:**
   - Increase timeout in platform settings
   - Model loading can take time on first request

### Frontend Issues

1. **API calls failing:**
   - Check `VITE_API_BASE` is set correctly
   - Verify backend URL is accessible
   - Check browser console for CORS errors

2. **Build errors:**
   - Run `npm install` before building
   - Check Node.js version (16+)

---

## 📝 Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Backend
cd backend
pip install -r requirements.txt
# Deploy to your platform

# Frontend
cd ../frontend
npm install
npm run build
# Deploy dist/ folder to your platform
```

---

## 🌐 Recommended Free Tier Stack

- **Backend:** Render (Free tier: 750 hours/month)
- **Frontend:** Vercel (Free tier: Unlimited)
- **Model Storage:** GitHub Releases or AWS S3 (free tier)

---

## 📞 Need Help?

- Check platform-specific documentation
- Review error logs in deployment dashboard
- Test locally first to isolate issues

