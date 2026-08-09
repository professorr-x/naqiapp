# Deploying NAQI Backend to Render

This guide will help you deploy your FastAPI backend to Render for free.

## Prerequisites

1. GitHub account with your code pushed to: `git@github.com:professorr-x/naqiapp.git`
2. Firebase service account JSON file (from Firebase Console)
3. Render account (sign up at https://render.com)

## Step 1: Prepare Firebase Credentials

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your NAQI project
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. **Copy the entire contents** of the JSON file - you'll need to paste this as a single-line string in Render

## Step 2: Create New Web Service on Render

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub account if not already connected
4. Select your repository: `professorr-x/naqiapp`
5. Click **Connect**

## Step 3: Configure the Web Service

Render will automatically detect the `render.yaml` file. Configure these settings:

### Basic Settings
- **Name**: `naqi-backend` (or your preferred name)
- **Region**: Choose closest to your users (e.g., Oregon, Frankfurt)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:socket_app --host 0.0.0.0 --port $PORT`

### Environment Variables

Click **Advanced** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `PYTHON_VERSION` | `3.13` | Python version |
| `SECRET_KEY` | *Auto-generate or create a secure random string* | Used for JWT tokens |
| `DEBUG` | `False` | Disable debug mode in production |
| `ALLOWED_ORIGINS` | `https://your-frontend-url.com,https://www.your-frontend-url.com` | Add your React Native app URL or admin dashboard URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | *Paste entire JSON contents here* | **Important**: Must be the raw JSON on a single line |

**For `FIREBASE_SERVICE_ACCOUNT_JSON`:**
- Open your downloaded Firebase service account JSON file
- Copy the ENTIRE contents (including the outer curly braces)
- Paste it as-is into the value field
- Example format: `{"type":"service_account","project_id":"naqi-app",...}`

### Plan
- Select **Free** plan (includes 750 hours/month)

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will start building and deploying your app
3. Wait for the deployment to complete (usually 3-5 minutes)
4. You'll get a URL like: `https://naqi-backend.onrender.com`

## Step 5: Test Your Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://naqi-backend.onrender.com/health

# API root
curl https://naqi-backend.onrender.com/

# API documentation (interactive)
# Open in browser: https://naqi-backend.onrender.com/docs
```

## Step 6: Update Your React Native App

Update the API URL in your React Native app:

1. Edit `NaqiApp/src/constants/index.ts` (or wherever your API URL is configured)
2. Change the backend URL to: `https://naqi-backend.onrender.com`
3. Rebuild your app

## Important Notes

### Free Tier Limitations
- **Cold Starts**: The free tier spins down after 15 minutes of inactivity
- First request after inactivity will take ~30 seconds to respond
- **Hours**: 750 hours/month (enough for continuous operation)
- **Memory**: 512 MB RAM

### Socket.IO Considerations
- Socket.IO works on Render's free tier
- Consider upgrading to paid tier ($7/month) for:
  - No cold starts
  - Better WebSocket performance
  - More memory (512 MB → 2 GB+)

### Monitoring
1. Go to your service dashboard on Render
2. Check **Logs** tab for real-time logs
3. Check **Metrics** tab for performance data
4. Set up **Alerts** for service health

### Custom Domain (Optional)
1. Go to service **Settings**
2. Scroll to **Custom Domain**
3. Add your domain (e.g., `api.naqi.app`)
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check logs in Render dashboard
- Verify all packages in `requirements.txt` are compatible
- Ensure Python version is 3.13

### Firebase Connection Error
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is correctly formatted
- Ensure JSON is on a single line with no extra spaces
- Check Firebase project ID matches your app

### CORS Errors
- Update `ALLOWED_ORIGINS` to include your frontend URLs
- Format: comma-separated URLs with no spaces
- Example: `https://app1.com,https://app2.com`

### Cold Start Issues
- First request after inactivity will be slow (30s+)
- Consider using a service like UptimeRobot to ping your API every 10 minutes
- Or upgrade to paid tier ($7/month) to eliminate cold starts

## Updating Your Deployment

Render automatically deploys when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "Update backend"
git push origin main

# Render will automatically rebuild and redeploy
```

## Useful Commands

```bash
# View logs
# Go to: https://dashboard.render.com → Your Service → Logs

# Manual deploy
# Go to: https://dashboard.render.com → Your Service → Manual Deploy

# Environment variables
# Go to: https://dashboard.render.com → Your Service → Environment
```

## Next Steps

1. Set up monitoring alerts
2. Configure custom domain (optional)
3. Set up database backups (if using PostgreSQL)
4. Consider upgrading to paid tier for better performance
5. Set up CI/CD for automated testing before deployment

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- FastAPI Documentation: https://fastapi.tiangolo.com
