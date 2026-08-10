# Deploying Admin Dashboard to Vercel

This guide will help you deploy your Next.js admin dashboard to Vercel for free.

## Prerequisites

1. GitHub account with code pushed to: `git@github.com:professorr-x/naqiapp.git`
2. Vercel account (sign up at https://vercel.com)
3. Firebase configuration (already in `.env.local`)

## Step 1: Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click **Sign Up** or **Log In**
3. Connect with your GitHub account

## Step 2: Import Your Project

1. From Vercel dashboard, click **Add New...** → **Project**
2. Find and select your repository: `professorr-x/naqiapp`
3. Click **Import**

## Step 3: Configure Project Settings

### Framework Preset
- **Framework**: Next.js (should be auto-detected)

### Root Directory
- **IMPORTANT**: Set **Root Directory** to: `admin-dashboard`
- Click **Edit** next to Root Directory
- Enter: `admin-dashboard`
- Click **Continue**

### Build Settings (should be auto-configured)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

## Step 4: Configure Environment Variables

Click **Environment Variables** and add these from your `.env.local` file:

| Name | Value | Notes |
|------|-------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyCIEC5if9OzPwORZpc2n9lCYDLyFtS7Qn8` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `naqi-9f4ba.firebaseapp.com` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `naqi-9f4ba` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `naqi-9f4ba.firebasestorage.app` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `782817829642` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:782817829642:android:af61837afc46b12c3690f3` | From Firebase Console |
| `NEXT_PUBLIC_API_BASE_URL` | `https://naqiapp.onrender.com/api` | Your backend URL |

**Important Notes:**
- All variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Make sure to copy values exactly from your `.env.local` file
- Set these for **Production**, **Preview**, and **Development** environments

## Step 5: Deploy

1. Review all settings
2. Click **Deploy**
3. Wait for build to complete (usually 1-3 minutes)
4. You'll get a URL like: `https://your-project.vercel.app`

## Step 6: Update Backend CORS

After deployment, update your backend's `ALLOWED_ORIGINS`:

1. Go to Render dashboard: https://dashboard.render.com
2. Click on **naqi-backend**
3. Go to **Environment**
4. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   http://localhost:3000,https://your-project.vercel.app
   ```
5. Click **Save Changes**
6. Service will auto-redeploy

## Step 7: Test Your Deployment

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Try logging in with admin credentials
3. Verify it connects to your backend at `naqiapp.onrender.com`
4. Test all dashboard features

## Vercel Free Tier

### What's Included (Free Hobby Plan)
- **Bandwidth**: 100 GB/month
- **Builds**: Unlimited
- **Deployments**: Unlimited
- **Serverless Function Executions**: 100 GB-Hours
- **Serverless Function Duration**: 10 seconds max
- **Domains**: Unlimited custom domains
- **SSL**: Automatic HTTPS
- **CDN**: Global edge network

### Automatic Features
- **Preview Deployments**: Every pull request gets a unique URL
- **Auto-scaling**: Handles traffic spikes automatically
- **Zero Downtime**: Deployments with no downtime
- **Analytics**: Basic analytics included

## Custom Domain (Optional)

### Add Your Own Domain

1. Go to your project settings in Vercel
2. Click **Domains**
3. Add your domain (e.g., `admin.naqi.app`)
4. Follow DNS configuration instructions
5. Vercel provides automatic SSL

### DNS Configuration Example
Add these records to your domain DNS:

```
Type: A
Name: admin (or @)
Value: 76.76.19.19

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes to admin dashboard
cd admin-dashboard
# ... make your changes ...

# Commit and push
git add .
git commit -m "Update admin dashboard"
git push origin main

# Vercel automatically builds and deploys!
```

### Branch Deployments
- **main branch**: Deploys to production
- **Other branches**: Get preview URLs for testing

## Environment Variables Management

### Update Environment Variables

1. Go to Project Settings → Environment Variables
2. Edit or add variables
3. **Important**: Redeploy for changes to take effect
   - Go to Deployments
   - Click **...** → **Redeploy**

### Per-Environment Variables

You can set different values for:
- **Production**: Your live site
- **Preview**: Pull request previews
- **Development**: Local development (via Vercel CLI)

## Monitoring & Logs

### View Deployment Logs
1. Go to **Deployments** tab
2. Click on any deployment
3. View **Build Logs** and **Function Logs**

### Analytics
1. Go to **Analytics** tab
2. View page views, top pages, and performance metrics
3. Upgrade to Pro for detailed analytics

## Troubleshooting

### Build Fails
- Check **Build Logs** in deployment details
- Verify all dependencies in `package.json`
- Ensure environment variables are set correctly

### API Connection Errors
- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Check backend CORS settings include Vercel URL
- Check browser console for specific errors

### Firebase Errors
- Verify all Firebase environment variables are correct
- Check Firebase Console for API key restrictions
- Ensure domain is whitelisted in Firebase

### Styles Not Loading
- Check if Tailwind CSS is building correctly
- Verify `postcss.config.js` is in admin-dashboard directory
- Check build logs for CSS compilation errors

## Vercel CLI (Optional)

Install Vercel CLI for local development and testing:

```bash
# Install globally
npm install -g vercel

# Login
vercel login

# Link project
cd admin-dashboard
vercel link

# Run development with Vercel environment
vercel dev

# Deploy from CLI
vercel --prod
```

## Team Collaboration

### For Client Projects

If deploying for a client:

1. **Option A**: Deploy on your Vercel account, transfer later
   - Deploy on your account
   - Transfer project to client's account when ready
   - Settings → Advanced → Transfer Project

2. **Option B**: Have client create Vercel account
   - Client creates Vercel account
   - Client adds you as team member
   - You deploy to their account

## Next Steps

1. Set up custom domain (optional)
2. Configure preview deployments for testing
3. Set up monitoring and alerts
4. Consider upgrading to Pro for:
   - Priority support
   - Advanced analytics
   - Higher limits
   - Team collaboration features

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Vercel Support: https://vercel.com/support

## Summary

Your deployment flow:
1. **Code Changes** → Push to GitHub
2. **Vercel** → Automatically builds and deploys
3. **Live URL** → Instantly available globally
4. **Backend** → Connects to Render backend

This setup gives you:
- Frontend on Vercel (fast, global CDN)
- Backend on Render (persistent server for Socket.IO)
- Best of both platforms!
