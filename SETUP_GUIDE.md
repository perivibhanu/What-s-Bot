# Complete Setup Guide

## Step-by-Step Setup

### 1. Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or cloud)
- Ngrok account (free)

### 2. Installation

```bash
# Install all dependencies
npm run install-all
```

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `backend/.env`

### 4. Ngrok Setup

```bash
# Download and install ngrok
# Windows: Download from https://ngrok.com/download
# Mac: brew install ngrok
# Linux: snap install ngrok

# Start ngrok tunnel
ngrok http 5000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 5. Configure Meta WhatsApp Webhook

1. Go to https://developers.facebook.com/apps/4192295140914596
2. Click on "WhatsApp" in left sidebar
3. Click "Configuration"
4. In "Webhook" section:
   - Callback URL: `https://your-ngrok-url.ngrok.io/webhook`
   - Verify Token: `vcet_webhook_token_2024`
   - Click "Verify and Save"
5. Click "Manage" and subscribe to "messages" webhook field

### 6. Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB connected
Webhook URL: http://localhost:5000/webhook
```

### 7. Start Frontend

Open a new terminal:

```bash
cd frontend
npm start
```

Browser will open at http://localhost:3000

### 8. Create Admin Account

**Option A: Using curl**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\",\"email\":\"admin@vcet.ac.in\"}"
```

**Option B: Using Postman**
- Method: POST
- URL: http://localhost:5000/api/auth/register
- Body (JSON):
```json
{
  "username": "admin",
  "password": "admin123",
  "email": "admin@vcet.ac.in"
}
```

### 9. Login to Admin Panel

1. Go to http://localhost:3000/login
2. Username: `admin`
3. Password: `admin123`

### 10. Add Test Student

1. Click "Students" in sidebar
2. Click "Add Student"
3. Fill in details:
   - Reg Number: TEST001
   - Name: Test Student
   - Branch: CSE
   - Section: A
4. Click "Add"

### 11. Test WhatsApp Bot

1. Send "Hi" to your WhatsApp Business number
2. You should receive welcome message with buttons
3. Click "Register"
4. Enter: TEST001
5. Confirm details
6. Access student menu

## Troubleshooting

### Webhook Not Receiving Messages
- Check ngrok is running
- Verify webhook URL in Meta console
- Check verify token matches
- Look at backend console for errors

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in .env
- Verify network access (if using Atlas)

### Frontend Not Loading
- Check if port 3000 is available
- Clear browser cache
- Check console for errors

### WhatsApp API Errors
- Verify access token is valid
- Check phone number ID is correct
- Ensure app is in production mode (or test number is added)

## Important Notes

- Ngrok URL changes every restart (free plan) - update webhook URL each time
- Access token expires - regenerate if needed
- Keep backend running for webhook to work
- Test with registered test numbers in development mode
