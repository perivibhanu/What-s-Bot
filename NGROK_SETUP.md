# Ngrok Setup Instructions

## Step 1: Get Your Ngrok Authtoken

1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (it looks like: 2abc123def456ghi789jkl...)

## Step 2: Run the Setup Script

**Option A: Use the batch file**
```bash
start-ngrok.bat
```
Then paste your authtoken when prompted.

**Option B: Manual commands**
```bash
# Add your authtoken (replace YOUR_TOKEN with actual token)
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken YOUR_TOKEN

# Start ngrok
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe http 5000
```

## Step 3: Get Your Callback URL

After running ngrok, you'll see output like:

```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.3.1
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:5000
```

**Your Callback URL is**: `https://abc123def456.ngrok-free.app/webhook`

Copy the HTTPS URL and add `/webhook` at the end.

## Step 4: Configure Meta WhatsApp Webhook

1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" in left sidebar
3. Click "Configuration"
4. In Webhook section:
   - **Callback URL**: `https://your-ngrok-url.ngrok-free.app/webhook`
   - **Verify Token**: `vcet_webhook_token_2024`
5. Click "Verify and Save"
6. Subscribe to "messages" webhook field

## MongoDB Connection Issue

Your network is blocking MongoDB Atlas. Try these solutions:

**Option 1: Check Firewall/VPN**
- Disable VPN if using one
- Check if firewall is blocking MongoDB ports
- Try from a different network

**Option 2: Use Local MongoDB**
- Download: https://www.mongodb.com/try/download/community
- Install and run: `mongod`
- Update `.env`: `MONGODB_URI=mongodb://localhost:27017/whatsapp-automation`

**Option 3: Whitelist IP in MongoDB Atlas**
1. Go to MongoDB Atlas dashboard
2. Network Access → Add IP Address
3. Add your current IP or use 0.0.0.0/0 (allow all - for testing only)

## Current Status

✅ Backend: Running on port 5000
✅ Frontend: Running on http://localhost:3000
❌ MongoDB: Connection blocked by network
⏳ Ngrok: Waiting for authtoken
