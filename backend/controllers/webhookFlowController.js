const crypto = require('crypto');
const Student = require('../models/Student');
const AttendanceRecord = require('../models/AttendanceRecord');
const whatsappService = require('../services/whatsappService');

// Private key provided via env
const PRIVATE_KEY = process.env.FLOW_PRIVATE_KEY;

// Decrypt request from Meta
const decryptRequest = (body, privateKeyStr) => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;
  const cleanKey = privateKeyStr.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();
  const privateKey = crypto.createPrivateKey({
    key: cleanKey,
    format: 'pem',
  });

  // 1. Decrypt AES key with RSA OAEP
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encrypted_aes_key, 'base64')
  );

  // 2. Decrypt Flow data with AES-GCM
  const ivBuffer = Buffer.from(initial_vector, 'base64');
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  
  // Tag is the last 16 bytes of the encrypted data
  const authTag = flowDataBuffer.slice(flowDataBuffer.length - 16);
  const cipherText = flowDataBuffer.slice(0, flowDataBuffer.length - 16);

  const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, ivBuffer);
  decipher.setAuthTag(authTag);
  
  let decryptedData = decipher.update(cipherText, 'binary', 'utf8');
  decryptedData += decipher.final('utf8');

  return {
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer: ivBuffer,
    decryptedBody: JSON.parse(decryptedData),
  };
};

// Encrypt response to Meta
const encryptResponse = (responseObj, aesKeyBuffer, initialVectorBuffer) => {
  // Flip IV string to create new IV
  const flippedIvStr = initialVectorBuffer.toString('base64').split('').reverse().join('');
  const responseIvBuffer = Buffer.from(flippedIvStr, 'base64');

  const cipher = crypto.createCipheriv('aes-256-gcm', aesKeyBuffer, responseIvBuffer);
  
  let encryptedData = cipher.update(JSON.stringify(responseObj), 'utf8', 'base64');
  encryptedData += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');

  // The tag is appended to the cipher text as per Meta specs, wait actually Meta expects it concatenated if we just send base64
  // Let's just follow standard Meta Flow response format
  return encryptedData; 
  // NOTE: Meta docs for encryption response usually just expect base64 of (ciphertext + authTag)
  // Let's create the full buffer and convert to base64
};

// Fallback for when we want to handle the response completely without encryption just for testing? No, Meta requires it.
const encryptResponseCorrectly = (responseObj, aesKeyBuffer, initialVectorBuffer) => {
    // 1. Flip IV bytes
    const newIvBuffer = Buffer.from(initialVectorBuffer).reverse();

    const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, newIvBuffer);
    
    // 2. Encrypt JSON response
    const cipherText = Buffer.concat([
        cipher.update(JSON.stringify(responseObj), 'utf8'),
        cipher.final()
    ]);
    
    // 3. Get Auth Tag
    const authTag = cipher.getAuthTag();
    
    // 4. Return concatenated base64 string
    return Buffer.concat([cipherText, authTag]).toString('base64');
};


exports.handleFlowEndpoint = async (req, res) => {
  try {
    if (!PRIVATE_KEY) {
      console.error('FLOW_PRIVATE_KEY is missing from environment variables');
      return res.status(500).send('Server configuration error');
    }

    // Ping check (Meta sends this during setup)
    if (req.body?.ping) {
      return res.status(200).send('pong');
    }

    const decrypted = decryptRequest(req.body, PRIVATE_KEY);
    const { action, screen, data } = decrypted.decryptedBody;

    console.log(`Flow Request: ${action} / ${screen}`);
    console.log(data);

    let responseData = {};

    if (action === 'ping') {
      responseData = {
        data: { status: 'active' }
      };
    } 
    else if (action === 'data_exchange') {
      
      // Step 1: Initial load of students (INIT)
      if (screen === 'STUDENT_SELECTION_SCREEN' && data.type === 'fetch_students') {
        const { department, year, section } = data;
        
        // Fetch students from MongoDB
        const students = await Student.find({ 
          branch: department, 
          year: year, 
          section: section 
        }).sort('regNumber');

        // Build checklist array
        const studentChecklist = students.map(s => {
          const last3 = s.regNumber ? s.regNumber.slice(-3) : '000';
          return {
            id: s._id.toString(),
            title: `${last3} - ${s.name}`
          };
        });

        // Add the "0 Absentees" fallback option at the top
        studentChecklist.unshift({
          id: 'none',
          title: '✅ 0 - No Absentees (100% Present)'
        });

        responseData = {
          screen: 'STUDENT_SELECTION_SCREEN',
          data: {
            department, year, section, action_type: data.action_type,
            students_list: studentChecklist
          }
        };
      }
      
      // Step 2: Final submission (SUBMIT)
      else if (screen === 'STUDENT_SELECTION_SCREEN' && data.type === 'submit_attendance') {
        const { department, year, section, action_type, selected_students } = data;
        
        // Determine absentees vs leave
        const absentees = [];
        const leave = [];
        
        // Exclude the 'none' option
        const actualStudents = selected_students.filter(id => id !== 'none');

        if (action_type === 'absentees') {
          absentees.push(...actualStudents);
        } else if (action_type === 'leave') {
          leave.push(...actualStudents);
        }

        // Save to DB (we don't have the staff ID here easily unless passed, we'll use a placeholder 'FlowUser')
        const record = new AttendanceRecord({
          date: new Date(),
          department, year, section,
          absentees, leave,
          recordedBy: 'WhatsApp Flow'
        });
        await record.save();

        responseData = {
          screen: 'SUCCESS_SCREEN',
          data: {
            message: `Attendance recorded successfully for ${department} ${year}-${section}.`
          }
        };

        // You could also trigger a WhatsApp text confirmation to the user here using whatsappService
        // But the Flow Success screen is usually enough.
      }
    }

    const encryptedResponse = encryptResponseCorrectly(responseData, decrypted.aesKeyBuffer, decrypted.initialVectorBuffer);
    return res.status(200).send(encryptedResponse);

  } catch (error) {
    console.error('Flow Webhook Error:', error);
    return res.status(500).send(`Flow Error: ${error.message} \nStack: ${error.stack}`);
  }
};
