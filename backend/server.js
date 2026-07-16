require('dotenv').config();
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Set DNS servers to Google's public DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(async () => {
    console.log('MongoDB connected');
    try {
      const db = mongoose.connection.db;
      await db.collection('staffs').dropIndex('employeeId_1');
      console.log('Dropped deprecated employeeId_1 index on staffs');
    } catch (err) {
      if (err.codeName !== 'IndexNotFound') {
        console.warn('Note on index check:', err.message);
      }
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to Velammal WhatsApp Bot Backend API',
    endpoints: {
      webhook: '/webhook',
      admin: '/api/admin',
      students: '/api/students',
      auth: '/api/auth',
      circulars: '/api/circulars',
      marks: '/api/marks',
      timetables: '/api/timetables',
      data: '/api/data',
      collegeMedia: '/api/college-media',
      placement: '/api/placement',
      staff: '/api/staff',
      staffMessages: '/api/staff-messages',
      admissions: '/api/admissions',
      feedback: '/api/feedback',
      wardens: '/api/wardens',
      outings: '/api/outings'
    }
  });
});

app.use('/webhook', require('./routes/webhook'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/students', require('./routes/students'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/circulars', require('./routes/circulars'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/timetables', require('./routes/timetables'));
app.use('/api/data', require('./routes/data'));
app.use('/api/college-media', require('./routes/collegeMedia'));
app.use('/api/placement', require('./routes/placement'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/staff-messages', require('./routes/staffMessages'));
app.use('/api/admissions', require('./routes/admission'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/wardens', require('./routes/wardens'));
app.use('/api/outings', require('./routes/outings'));

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${BASE_URL}/webhook`);
});
