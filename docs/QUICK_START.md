# Quick Start - Current Status

## ✅ What's Running

1. **Backend Server**: Running on http://localhost:5000
2. **Frontend**: Running on http://localhost:3000 (with minor warning)
3. **Ngrok**: Installed but needs authentication

## ❌ Issues to Fix

### 1. MongoDB Not Running

**Option A: Install MongoDB Locally**
```bash
# Download from: https://www.mongodb.com/try/download/community
# After installation, start MongoDB:
mongod
```

**Option B: Use MongoDB Atlas (Cloud - Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a free cluster
4. Click "Connect" → "Connect your application"
5. Copy connection string (looks like: mongodb+srv://username:password@cluster.mongodb.net/)
6. Update `backend/.env`:
   ```
   MONGODB_URI=your_connection_string_here
   ```

### 2. Setup Ngrok Authentication

1. **Sign up for Ngrok** (free): https://dashboard.ngrok.com/signup
2. **Get your authtoken**: https://dashboard.ngrok.com/get-started/your-authtoken
3. **Add authtoken**:
   ```bash
   C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken YOUR_TOKEN_HERE
   ```
4. **Start ngrok**:
   ```bash
   C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe http 5000
   ```

## 🚀 After Fixing MongoDB and Ngrok

### Your Ngrok URL will look like:
```
https://abc123.ngrok.io
```

### Configure Meta Webhook:

1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "Configuration"
3. Webhook Settings:
   - **Callback URL**: `https://your-ngrok-url.ngrok.io/webhook`
   - **Verify Token**: `vcet_webhook_token_2024`
4. Click "Verify and Save"
5. Subscribe to "messages" field

### Create Admin Account:

```bash
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\",\"email\":\"admin@vcet.ac.in\"}"
```

### Login to Admin Panel:

1. Open: http://localhost:3000
2. Username: `admin`
3. Password: `admin123`

## 📱 Test WhatsApp Bot

1. Add a test student in admin panel
2. Send "Hi" to your WhatsApp Business number
3. Follow the registration flow

## Current Process IDs (Running)

- Backend: Process ID 2
- Frontend: Process ID 3
- Ngrok: Process ID 6 (needs auth)

All processes are running in the background!
