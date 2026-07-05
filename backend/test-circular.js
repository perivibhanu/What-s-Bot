require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

async function runDiagnostics() {
  console.log('\n========================================');
  console.log('   CIRCULAR SEND DIAGNOSTICS');
  console.log('========================================\n');

  // ── 1. Check ENV vars ──────────────────────────────────────────────────────
  console.log('📋 1. Checking Environment Variables...');
  console.log('   META_PHONE_NUMBER_ID :', process.env.META_PHONE_NUMBER_ID || '❌ MISSING');
  console.log('   META_ACCESS_TOKEN    :', process.env.META_ACCESS_TOKEN ? '✅ Set' : '❌ MISSING');
  console.log('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING');
  console.log('   CLOUDINARY_API_KEY   :', process.env.CLOUDINARY_API_KEY || '❌ MISSING');
  console.log('   MONGODB_URI          :', process.env.MONGODB_URI ? '✅ Set' : '❌ MISSING');

  // ── 2. Connect to MongoDB ──────────────────────────────────────────────────
  console.log('\n📦 2. Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('   ✅ MongoDB connected');
  } catch (err) {
    console.error('   ❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  // ── 3. Check registered students ──────────────────────────────────────────
  console.log('\n👥 3. Checking Registered Students...');
  const Student = require('./models/Student');
  const students = await Student.find({ isRegistered: true });
  
  if (students.length === 0) {
    console.log('   ❌ NO registered students found!');
    console.log('   → Go to Students page and check if any student has isRegistered = true');
  } else {
    console.log(`   ✅ Found ${students.length} registered student(s):`);
    students.forEach(s => {
      console.log(`   → Name: ${s.name} | Phone: "${s.phoneNumber}" | Reg: ${s.regNumber}`);
    });
  }

  // ── 4. Check latest circular ───────────────────────────────────────────────
  console.log('\n📄 4. Checking Latest Circular...');
  const Circular = require('./models/Circular');
  const circular = await Circular.findOne().sort({ createdAt: -1 });
  
  if (!circular) {
    console.log('   ❌ No circulars found in database');
  } else {
    console.log(`   Title    : ${circular.title}`);
    console.log(`   FileType : ${circular.fileType}`);
    console.log(`   FileUrl  : ${circular.fileUrl}`);
    console.log(`   Status   : ${circular.status}`);
    
    const isCloudinary = circular.fileUrl?.includes('cloudinary.com');
    const isLocal = circular.fileUrl?.includes('localhost');
    const isNgrok = circular.fileUrl?.includes('ngrok');
    
    if (isCloudinary) {
      console.log('   URL Type : ✅ Cloudinary (WhatsApp can access this)');
    } else if (isLocal) {
      console.log('   URL Type : ❌ LOCALHOST - WhatsApp CANNOT access this!');
    } else if (isNgrok) {
      console.log('   URL Type : ⚠️  Ngrok - may be expired!');
    }
  }

  // ── 5. Test sending a text message to registered student ──────────────────
  if (students.length > 0) {
    const testStudent = students[0];
    console.log(`\n📱 5. Testing WhatsApp TEXT message to: "${testStudent.phoneNumber}"...`);
    
    // Clean the phone number (remove +, spaces, dashes)
    const cleanPhone = testStudent.phoneNumber.replace(/[\s+\-()]/g, '');
    console.log(`   Cleaned phone: "${cleanPhone}"`);

    try {
      const response = await axios.post(WHATSAPP_API_URL, {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: '🔧 Test message from VCET Admin - Diagnostic check ✅' }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('   ✅ Text message sent successfully!');
      console.log('   Response:', JSON.stringify(response.data));
    } catch (err) {
      console.log('   ❌ Text message FAILED!');
      console.log('   Status:', err.response?.status);
      console.log('   Error:', JSON.stringify(err.response?.data, null, 2));
    }
  }

  console.log('\n========================================');
  console.log('   DIAGNOSTICS COMPLETE');
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runDiagnostics().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
