# Testing Guide

## Testing the WhatsApp Bot

### Test Scenario 1: New Student Registration

1. **Send Welcome Message**
   - Send: "Hi"
   - Expected: Welcome message with image header and 3 buttons (Register, About, Contact)

2. **Click Register Button**
   - Expected: Message asking for registration number

3. **Enter Registration Number**
   - Send: "TEST001" (or any reg number you added in admin panel)
   - Expected: Confirmation message with student details and Yes/No buttons

4. **Confirm Registration**
   - Click: "Yes"
   - Expected: Success message + Welcome back message with list menu

5. **Access Student Services**
   - Click: "View Options"
   - Select: "Sem Marks"
   - Expected: Display of semester marks

### Test Scenario 2: Registered Student

1. **Send Welcome Message**
   - Send: "Hi"
   - Expected: Welcome back message with list menu (no registration needed)

2. **Check Different Services**
   - Test "Sem Marks" - should show all semester marks
   - Test "Assignment Marks" - should show assignment scores
   - Test "Pay Fee" - should show fee details
   - Test "Attendance" - should show attendance percentage

### Test Scenario 3: About & Contact

1. **Click About Button**
   - Expected: About message with "Visit Website" CTA button

2. **Click Contact Button**
   - Expected: Message with contact number

### Test Scenario 4: Invalid Registration

1. Send: "Hi"
2. Click: "Register"
3. Enter: "INVALID123"
4. Expected: Error message asking to try again

5. Click: "No" on confirmation
6. Expected: Asked to enter registration number again

## Testing the Admin Panel

### Test Admin Authentication

1. **Login**
   - Go to http://localhost:3000/login
   - Enter credentials
   - Expected: Redirect to dashboard

2. **Logout**
   - Click logout button
   - Expected: Redirect to login page

### Test Student Management

1. **View Students List**
   - Go to Students page
   - Expected: Table with all students

2. **Add New Student**
   - Click "Add Student"
   - Fill form with:
     - Reg Number: TEST002
     - Name: John Doe
     - Branch: ECE
     - Section: B
   - Click "Add"
   - Expected: Student appears in list

3. **View Student Details**
   - Click "View" on any student
   - Expected: Full student details page

4. **Edit Student Information**
   - Click "Edit" button
   - Modify marks, fees, or attendance
   - Click "Save"
   - Expected: Changes saved successfully

### Test Settings

1. **Update Bot Messages**
   - Go to Settings page
   - Change welcome message
   - Change about message
   - Update contact number
   - Click "Save Settings"
   - Expected: Settings updated

2. **Test Updated Messages**
   - Send "Hi" on WhatsApp
   - Expected: New welcome message appears

## API Testing with Postman/curl

### 1. Register Admin
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"test123","email":"test@vcet.ac.in"}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"test123"}'
```

### 3. Get All Students
```bash
curl -X GET http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"regNumber":"TEST003","name":"Jane Doe","branch":"IT","section":"A"}'
```

### 5. Update Student
```bash
curl -X PUT http://localhost:5000/api/students/STUDENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"marks":{"sem1":85,"sem2":90}}'
```

## Webhook Testing

### Test Webhook Verification
```bash
curl "http://localhost:5000/webhook?hub.mode=subscribe&hub.verify_token=vcet_webhook_token_2024&hub.challenge=test123"
```
Expected: Returns "test123"

### Simulate Incoming Message
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "type": "text",
            "text": {"body": "Hi"}
          }]
        }
      }]
    }]
  }'
```

## Common Issues & Solutions

### Issue: Webhook not receiving messages
- Solution: Check ngrok is running and URL is updated in Meta console

### Issue: Student not found during registration
- Solution: Ensure student is added in admin panel with correct reg number

### Issue: Bot not responding
- Solution: Check backend logs for errors, verify access token is valid

### Issue: Images not loading in WhatsApp
- Solution: Verify image URL is publicly accessible

### Issue: List menu not appearing
- Solution: Ensure WhatsApp Business API supports interactive messages
