# 🚀 Start Ngrok and Get Callback URL

## ✅ Current Status
- ✅ Backend: Running on port 5000
- ✅ Frontend: Running on http://localhost:3000
- ✅ MongoDB: Connected successfully
- ✅ Admin Account: Created (username: admin, password: admin123)

## 📱 Next Steps

### Step 1: Get Your Ngrok Authtoken

1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (looks like: 2abc123def456...)

### Step 2: Configure Ngrok

Open a NEW terminal/command prompt and run:

```bash
# Add your authtoken (replace YOUR_AUTHTOKEN with actual token)
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken YOUR_AUTHTOKEN
```

### Step 3: Start Ngrok Tunnel

```bash
C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe http 5000
```

### Step 4: Get Your Callback URL

After starting ngrok, you'll see:

```
Session Status                online
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:5000
```

**Your Callback URL is**: `https://abc123def456.ngrok-free.app/webhook`

(Copy the HTTPS URL and add `/webhook` at the end)

### Step 5: Configure Meta WhatsApp Webhook

1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "Configuration"
3. In Webhook section:
   - **Callback URL**: `https://your-ngrok-url.ngrok-free.app/webhook`
   - **Verify Token**: `vcet_webhook_token_2024`
4. Click "Verify and Save"
5. Subscribe to "messages" webhook field

## 🎯 Access Admin Panel

1. Open: http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `admin123`

## 📝 Add Test Student

1. Go to "Students" page
2. Click "Add Student"
3. Add details:
   - Reg Number: TEST001
   - Name: Test Student
   - Branch: CSE
   - Section: A

## 💬 Test WhatsApp Bot

1. Send "Hi" to your WhatsApp Business number
2. Click "Register"
3. Enter: TEST001
4. Confirm and test!

---

**Note**: Keep all terminals running (backend, frontend, ngrok) for the system to work!
