# 🚀 Deploy: Backend (Render) + Frontend (Vercel)

This guide walks you through deploying the backend on Render and frontend on Vercel - the perfect combination!

---

## 📋 Prerequisites

- GitHub account
- Render account (free tier available)
- Vercel account (free tier available)
- Your code pushed to GitHub

---

## 🔧 Step 1: Prepare Your Repository

### 1.1 Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - EarthSense AI"

# Create GitHub repository, then:
git remote add origin https://github.com/yourusername/earthsense.git
git branch -M main
git push -u origin main
```

### 1.2 Verify Files Are Ready

Make sure you have:
- ✅ `backend/Procfile` (already created)
- ✅ `backend/requirements.txt` (with all dependencies)
- ✅ `backend/app.py` (your Flask app)
- ✅ `frontend/package.json` (React app)
- ✅ Model file ready (or cloud storage URL)

---

## 🐍 Step 2: Deploy Backend on Render

### 2.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for easy repo connection)

### 2.2 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Click **"Connect account"** if not connected to GitHub
3. Select your repository: `earthsense` (or your repo name)
4. Click **"Connect"**

### 2.3 Configure Backend Service

Fill in the following:

- **Name:** `earthsense-backend`
- **Region:** Choose closest to you (e.g., `Oregon (US West)`)
- **Branch:** `main` (or your default branch)
- **Root Directory:** `backend` ⚠️ **Important!**
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`

### 2.4 Set Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

```
PORT=5000
MODEL_FILE=model/deforestation_model.h5
```

**If using cloud storage for model:**
```
MODEL_URL=https://your-storage-url.com/deforestation_model.h5
```

**If model is in the repo:**
```
MODEL_FILE=model/deforestation_model.h5
```

### 2.5 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Once deployed, copy your service URL:
   - Example: `https://earthsense-backend.onrender.com`
   - ⚠️ **Save this URL - you'll need it for frontend!**

### 2.6 Test Backend

Open in browser: `https://your-backend-url.onrender.com/ping`

Should return: `{"status":"ok"}`

---

## ⚛️ Step 3: Deploy Frontend on Vercel

### 3.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended)

### 3.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository: `earthsense`
3. Click **"Import"**

### 3.3 Configure Frontend

Vercel should auto-detect Vite, but verify:

- **Framework Preset:** `Vite`
- **Root Directory:** `frontend` ⚠️ **Important!**
- **Build Command:** `npm run build` (auto-filled)
- **Output Directory:** `dist` (auto-filled)
- **Install Command:** `npm install` (auto-filled)

### 3.4 Set Environment Variables

**Before deploying**, add environment variable:

1. In the project configuration, find **"Environment Variables"**
2. Click **"Add"**
3. Add:
   - **Key:** `VITE_API_BASE`
   - **Value:** `https://your-backend-url.onrender.com`
     - ⚠️ Use the backend URL from Step 2.5 (no trailing slash)
   - **Environment:** Select all (Production, Preview, Development)

### 3.5 Deploy

1. Click **"Deploy"**
2. Wait for build (2-3 minutes)
3. Once deployed, you'll get a URL like:
   - `https://earthsense.vercel.app`

### 3.6 Verify Deployment

1. Visit your Vercel URL
2. Check if backend status shows **"Online"**
3. If offline, verify `VITE_API_BASE` is correct
4. Test image upload

---

## 📦 Step 4: Handle Model File

### Option A: Cloud Storage (Recommended)

**Using Google Drive:**
1. Upload `model/deforestation_model.h5` to Google Drive
2. Right-click → "Get link" → "Anyone with the link"
3. Get direct download link (use a service like [Direct Link Generator](https://sites.google.com/site/gdocs2direct/))
4. Add to Render environment variables:
   ```
   MODEL_URL=https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
   ```
5. Redeploy backend

**Using GitHub Releases:**
1. Go to your GitHub repo → "Releases" → "Create a new release"
2. Upload `deforestation_model.h5` as an asset
3. Get the direct download URL (right-click asset → "Copy link address")
4. Add to Render:
   ```
   MODEL_URL=https://github.com/yourusername/earthsense/releases/download/v1.0/deforestation_model.h5
   ```
5. Redeploy backend

**Using AWS S3 (if you have it):**
1. Upload to S3 bucket
2. Make it publicly accessible
3. Use the public URL in `MODEL_URL`

### Option B: Include in Git (Not Recommended for Large Files)

Only if model is < 100MB:
1. Make sure model is committed to git
2. Render will use it automatically
3. No `MODEL_URL` needed

---

## 🔄 Step 5: Update Environment Variables (If Needed)

### Update Frontend API URL

If you need to change the backend URL:

1. Go to Vercel Dashboard → Your Project
2. **Settings** → **Environment Variables**
3. Edit `VITE_API_BASE`
4. **Redeploy** (Vercel will auto-redeploy or click "Redeploy")

### Update Backend Model URL

1. Go to Render Dashboard → Your Service
2. **Environment** tab
3. Edit `MODEL_URL` or `MODEL_FILE`
4. **Manual Deploy** → **Clear build cache & deploy**

---

## ✅ Verification Checklist

- [ ] Backend accessible at `https://your-backend.onrender.com/ping`
- [ ] Frontend accessible at `https://your-app.vercel.app`
- [ ] Frontend shows backend status as "Online"
- [ ] Can upload image and get prediction
- [ ] Grad-CAM heatmap displays
- [ ] Batch upload works
- [ ] CSV download works

---

## 🐛 Troubleshooting

### Backend Issues

**"Model file not found" error:**
- Check `MODEL_FILE` path in Render env vars
- Verify `MODEL_URL` is accessible (test in browser)
- Check Render logs for errors

**Backend shows "Offline" in frontend:**
- Verify backend URL is correct
- Check CORS is enabled (already done in `app.py`)
- Test backend directly: `/ping` endpoint

**Memory errors:**
- TensorFlow needs ~1-2GB RAM
- Render free tier has 512MB - may need upgrade
- Consider using lighter model or Render paid tier

**Slow first request:**
- Render free tier spins down after 15 min inactivity
- First request after spin-down takes 30-60 seconds
- This is normal for free tier

### Frontend Issues

**"Backend: Offline" status:**
- Check `VITE_API_BASE` in Vercel environment variables
- Verify backend URL is correct (no trailing slash)
- Rebuild frontend after changing env vars

**CORS errors in browser console:**
- Backend CORS is already configured
- Verify backend URL matches exactly
- Check browser console for exact error

**Build fails on Vercel:**
- Check build logs in Vercel dashboard
- Verify `package.json` has all dependencies
- Try building locally: `cd frontend && npm run build`

---

## 🔐 Security Notes

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform environment variables
   - `.gitignore` already excludes them

2. **CORS:**
   - Backend allows all origins (fine for hackathon)
   - For production, restrict to your Vercel domain

3. **Model File:**
   - If using public URL, anyone can download
   - For production, use signed URLs or authentication

---

## 📊 Free Tier Limits

### Render (Backend)
- ✅ 750 hours/month free
- ✅ 512MB RAM
- ⚠️ Spins down after 15 min inactivity
- ⚠️ First request after spin-down is slow

### Vercel (Frontend)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Fast global CDN
- ✅ Auto-deploy on git push

---

## 🚀 Auto-Deploy Setup

### Vercel Auto-Deploy (Already Enabled)

Vercel automatically deploys when you push to:
- `main` branch → Production
- Other branches → Preview deployments

### Render Auto-Deploy

1. Go to Render Dashboard → Your Service
2. **Settings** → **Auto-Deploy**
3. Enable "Auto-Deploy" (should be on by default)
4. Now every push to `main` triggers deployment

---

## 📝 Quick Reference

**Backend URL:** `https://earthsense-backend.onrender.com`  
**Frontend URL:** `https://earthsense.vercel.app`

**Environment Variables:**

**Render (Backend):**
```
PORT=5000
MODEL_FILE=model/deforestation_model.h5
MODEL_URL=https://your-storage-url.com/model.h5
```

**Vercel (Frontend):**
```
VITE_API_BASE=https://earthsense-backend.onrender.com
```

---

## 🎉 You're Live!

Your EarthSense AI app is now deployed and accessible worldwide!

- **Frontend:** Fast, global CDN via Vercel
- **Backend:** Reliable Python hosting via Render
- **Auto-deploy:** Both platforms deploy on git push

---

## 💡 Pro Tips

1. **Custom Domain:** Both Render and Vercel support custom domains
2. **Monitoring:** Check Render logs for backend issues
3. **Analytics:** Vercel provides built-in analytics
4. **Preview Deployments:** Vercel creates preview URLs for every PR
5. **Rollback:** Both platforms allow easy rollback to previous versions

---

## 📞 Need Help?

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Check Logs:** Both platforms have detailed logs in dashboard

