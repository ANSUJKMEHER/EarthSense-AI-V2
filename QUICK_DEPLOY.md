# 🚀 Quick Deployment Guide - EarthSense AI

## 🎯 Recommended: Backend (Render) + Frontend (Vercel)

**See [DEPLOY_RENDER_VERCEL.md](./DEPLOY_RENDER_VERCEL.md) for detailed step-by-step guide!**

---

## Fastest Way: Render (Free Tier) - Both Services

### Step 1: Backend Deployment

1. **Go to [render.com](https://render.com)** and sign up/login

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Backend:**
   - **Name:** `earthsense-backend`
   - **Environment:** `Python 3`
   - **Region:** Choose closest to you
   - **Branch:** `main` (or your main branch)
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`

4. **Environment Variables:**
   - Click "Advanced" → "Add Environment Variable"
   - Add:
     ```
     PORT=5000
     MODEL_FILE=model/deforestation_model.h5
     ```
   - If model is in cloud storage, also add:
     ```
     MODEL_URL=https://your-storage-url.com/model.h5
     ```

5. **Click "Create Web Service"**
   - Wait for deployment (5-10 minutes)
   - Copy the URL (e.g., `https://earthsense-backend.onrender.com`)

### Step 2: Frontend Deployment

1. **Still on Render, create Static Site:**
   - Click "New +" → "Static Site"
   - Connect same GitHub repository

2. **Configure Frontend:**
   - **Name:** `earthsense-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `frontend/dist`

3. **Environment Variables:**
   - Add:
     ```
     VITE_API_BASE=https://earthsense-backend.onrender.com
     ```
   - (Use the backend URL from Step 1)

4. **Click "Create Static Site"**
   - Wait for deployment (2-3 minutes)
   - Your app will be live!

### Step 3: Upload Model File

**Option A: Use Cloud Storage (Recommended)**
1. Upload `model/deforestation_model.h5` to:
   - Google Drive (make public)
   - Dropbox (get direct link)
   - AWS S3
   - GitHub Releases
2. Copy the direct download URL
3. Add to backend environment variables:
   ```
   MODEL_URL=https://your-direct-download-url.com/model.h5
   ```
4. Redeploy backend

**Option B: Include in Git (if < 100MB)**
1. Make sure model file is committed
2. Render will use it automatically

---

## Alternative: Vercel (Frontend) + Render (Backend)

### Frontend on Vercel (Faster builds)

1. **Go to [vercel.com](https://vercel.com)** and sign up

2. **Import Project:**
   - Click "Add New" → "Project"
   - Import from GitHub
   - Select your repository

3. **Configure:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. **Environment Variables:**
   - Add:
     ```
     VITE_API_BASE=https://earthsense-backend.onrender.com
     ```

5. **Deploy!**
   - Vercel will auto-deploy on every push

---

## 🎯 Your URLs After Deployment

- **Backend:** `https://earthsense-backend.onrender.com`
- **Frontend:** `https://earthsense-frontend.onrender.com` or `https://your-app.vercel.app`

---

## ✅ Test Your Deployment

1. Visit your frontend URL
2. Check if backend status shows "Online"
3. Upload a test image
4. Verify prediction works

---

## 🔧 Common Issues

**Backend shows "Offline":**
- Check backend logs in Render dashboard
- Verify model file is accessible
- Check environment variables

**Frontend can't connect to backend:**
- Verify `VITE_API_BASE` is set correctly
- Check backend URL is accessible
- Rebuild frontend after changing env vars

**Model loading fails:**
- Verify `MODEL_URL` or model file path is correct
- Check file size (Render free tier has limits)
- Use cloud storage for large models

---

## 📝 Notes

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading for production use
- Model file should be < 500MB for free tier

---

## 🎉 You're Done!

Your EarthSense AI app should now be live and accessible worldwide!

