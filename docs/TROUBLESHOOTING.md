# Troubleshooting - WhatsApp Not Receiving Messages

## Current Status
✅ Backend: Running
✅ MongoDB: Connected  
✅ Ngrok: Running (https://dress-hydration-baggy.ngrok-free.dev)
✅ Webhook: Configured
❌ Messages: Not being received

## Most Likely Issues

### 1. Test Phone Number Not Added (MOST COMMON)

WhatsApp Business API in **Development Mode** only sends messages to registered test numbers.

**Solution:**
1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "API Setup"
3. Scroll to "Step 5: Send messages with the API"
4. Click "Add phone number" under "To"
5. Add your WhatsApp number (with country code, e.g., +919876543210)
6. Verify the number via OTP
7. Now try sending "Hi" from that number

### 2. Access Token Expired

Your access token might have expired.

**Solution:**
1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "API Setup"
3. Click "Generate new token" under "Temporary access token"
4. Copy the new token
5. Update `backend/.env`:
   ```
   META_ACCESS_TOKEN=your_new_token_here
   ```
6. Restart backend

### 3. Webhook Not Subscribed

**Solution:**
1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "Configuration"
3. Under "Webhook fields", make sure "messages" is checked/subscribed
4. If not, click "Manage" and subscribe to "messages"

### 4. Wrong Phone Number ID

**Solution:**
1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "API Setup"
3. Copy the "Phone number ID" (should be: 1163101556882204)
4. Verify it matches in `backend/.env`:
   ```
   META_PHONE_NUMBER_ID=1163101556882204
   ```

### 5. Ngrok URL Changed

If you restarted ngrok, the URL changed.

**Current Ngrok URL:** https://dress-hydration-baggy.ngrok-free.dev

**Solution:**
1. Check if ngrok is still running
2. If URL changed, update webhook in Meta console
3. New callback URL format: `https://your-new-url.ngrok-free.app/webhook`

## Testing Steps

### Step 1: Verify Webhook is Working
```bash
curl "https://dress-hydration-baggy.ngrok-free.dev/webhook?hub.mode=subscribe&hub.verify_token=vcet_webhook_token_2024&hub.challenge=test123"
```
Should return: `test123`

### Step 2: Check Backend Logs
The backend should show incoming webhook requests when you send a message.

### Step 3: Test with Meta's Test Button
1. Go to: https://developers.facebook.com/apps/4192295140914596
2. Click "WhatsApp" → "API Setup"
3. Use the "Send test message" button
4. If this works, the issue is with your phone number registration

### Step 4: Verify Phone Number Format
When sending from WhatsApp, the number should be in format: `919876543210` (country code + number, no + or spaces)

## Quick Fixes

### Restart Everything
```bash
# Stop all processes
# Then restart:

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Ngrok  
.\ngrok-new\ngrok.exe http 5000

# Update webhook URL in Meta console with new ngrok URL
```

### Check if Message Reached Backend
Look at backend logs for:
```
Received webhook: {...}
Processing message from: ...
```

If you see these, the webhook is working but WhatsApp API is rejecting the message.

If you DON'T see these, the webhook isn't receiving messages - check ngrok URL and webhook subscription.

## Still Not Working?

1. **Check Meta App Status**: Make sure your app is not restricted
2. **Business Verification**: Some features require business verification
3. **Rate Limits**: Check if you've hit API rate limits
4. **Try Simple Text**: Test with a simple text message first (no buttons/images)

## Contact for Help

If none of these work, share:
1. Backend logs when you send "Hi"
2. Screenshot of Meta WhatsApp Configuration page
3. Screenshot of API Setup page showing your test numbers
