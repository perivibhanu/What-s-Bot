# WhatsApp Automation System with Admin Panel

Complete WhatsApp chatbot for VCET with student management admin panel.

## Features

### WhatsApp Bot
- Welcome message with image header and reply buttons
- Student registration flow with confirmation
- Registered student menu with list options (Marks, Fees, Attendance)
- About and Contact information
- Session management

### Admin Panel
- Dashboard with statistics
- Student management (Add, Edit, View, Delete)
- Update marks, fees, attendance
- Settings configuration
- Secure authentication

## Setup Instructions

### 1. Install Dependencies

```bash
npm run install-all
```

### 2. Configure MongoDB

Make sure MongoDB is running locally or update the connection string in `backend/.env`

### 3. Update Environment Variables

Edit `backend/.env` with your credentials (already configured with your Meta credentials)

### 4. Setup Ngrok for Webhook

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 5000
```

Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

### 5. Configure Meta Webhook

1. Go to Meta Developer Console: https://developers.facebook.com/apps/4192295140914596
2. Navigate to WhatsApp > Configuration
3. Set Webhook URL: `https://your-ngrok-url.ngrok.io/webhook`
4. Set Verify Token: `vcet_webhook_token_2024`
5. Subscribe to messages webhook field

### 6. Start the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm start
```

### 7. Create Admin Account

First, register an admin account by sending POST request:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","email":"admin@vcet.ac.in"}'
```

Then login at: http://localhost:3000/login

## Usage

### Admin Panel
1. Login with admin credentials
2. Add students with registration numbers
3. Update student marks, fees, attendance
4. Configure bot messages in Settings

### WhatsApp Bot Flow

**New Student:**
1. Send "Hi" → Receives welcome with Register/About/Contact buttons
2. Click "Register" → Enter registration number
3. Confirm details → Registration complete
4. Access student menu with Marks/Fees/Attendance options

**Registered Student:**
1. Send "Hi" → Receives welcome with list menu
2. Select option to view information

## Project Structure

```
├── backend/
│   ├── controllers/      # Request handlers
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Auth middleware
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   └── styles/      # CSS files
│   └── public/
└── package.json
```

## API Endpoints

- `GET/POST /webhook` - WhatsApp webhook
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Admin registration
- `GET /api/students` - Get all students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `GET /api/admin/settings` - Get bot settings
- `PUT /api/admin/settings` - Update bot settings

## Technologies

- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Frontend:** React, React Router
- **WhatsApp:** Meta Cloud API
- **Auth:** JWT, bcryptjs
