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
    // 1. Flip IV bytes using bitwise NOT
    const newIvBuffer = Buffer.alloc(initialVectorBuffer.length);
    for (let i = 0; i < initialVectorBuffer.length; i++) {
      newIvBuffer[i] = ~initialVectorBuffer[i];
    }

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
      if (screen === 'SELECTION_SCREEN' && data.type === 'fetch_students') {
        const { department, year, section } = data;
        
        // Fetch students from MongoDB (broad case-insensitive matching)
        const query = {
          branch: { $regex: department, $options: 'i' }, 
          section: { $regex: section.replace('Section ', '').trim(), $options: 'i' }
        };

        // If the frontend sends a batch year (e.g. "2023" or "23"), filter by the 5th and 6th digits of regNumber
        if (year) {
          const shortYear = String(year).slice(-2);
          if (/^\d{2}$/.test(shortYear)) {
            query.regNumber = { $regex: `^\\d{4}${shortYear}\\d+`, $options: 'i' };
          }
        }

        const students = await Student.find(query).sort('regNumber');

        // Build checklist array
        const studentChecklist = students.map(s => {
          const last3 = s.regNumber ? s.regNumber.slice(-3) : '000';
          return {
            id: s._id.toString(),
            title: `${last3} - ${s.name}`
          };
        });

        if (students.length === 0) {
          const totalInDept = await Student.countDocuments({ branch: { $regex: department, $options: 'i' } });
          const totalInDeptSec = await Student.countDocuments({ 
            branch: { $regex: department, $options: 'i' },
            section: { $regex: section.replace('Section ', '').trim(), $options: 'i' }
          });
          
          studentChecklist.push({
            id: 'debug',
            title: `DEBUG: dept=${department}, sec=${section}, yr=${year}`
          });
          studentChecklist.push({
            id: 'debug2',
            title: `MATCHES: Dept=${totalInDept}, Dept+Sec=${totalInDeptSec}`
          });
        }

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

        // Send WhatsApp Notifications to Absentees/Leave
        if (actualStudents.length > 0) {
          try {
            const whatsappService = require('../services/whatsappService');
            const studentsToNotify = await Student.find({ _id: { $in: actualStudents } });
            
            const actionWord = action_type === 'absentees' ? 'Absent' : 'on Leave';
            const dateStr = new Date().toLocaleDateString('en-IN');
            
            for (const student of studentsToNotify) {
              const studentMsg = `⚠️ *Attendance Alert*\n\nDear ${student.name},\nYou have been marked as *${actionWord}* today (${dateStr}) for ${department.toUpperCase()} - Section ${section}.\n\nIf this is a mistake, please contact your class advisor immediately.`;
              const parentMsg = `⚠️ *Velammal Attendance Alert*\n\nDear Parent,\nYour ward *${student.name}* (Reg: ${student.regNumber}) has been marked as *${actionWord}* today (${dateStr}).\n\nIf you are unaware of this, please contact the department.`;
              
              // We do not await these so we don't block the Webhook response, ensuring the UI closes quickly
              if (student.phoneNumber) {
                whatsappService.sendTextMessage(student.phoneNumber, studentMsg).catch(e => console.error(`Failed to notify student ${student.name}:`, e.message));
              }
              if (student.parentPhoneNumber) {
                whatsappService.sendTextMessage(student.parentPhoneNumber, parentMsg).catch(e => console.error(`Failed to notify parent of ${student.name}:`, e.message));
              }
            }
          } catch (err) {
            console.error('Error in sending attendance notifications:', err);
          }
        }

        responseData = {
          screen: 'SUCCESS_SCREEN',
          data: {
            message: `Attendance recorded successfully for ${department} ${year}-${section}. Notifications dispatched.`
          }
        };
      }
    }

    const encryptedResponse = encryptResponseCorrectly(responseData, decrypted.aesKeyBuffer, decrypted.initialVectorBuffer);
    return res.status(200).send(encryptedResponse);

  } catch (error) {
    console.error('Flow Webhook Error:', error);
    return res.status(500).send(`Flow Error: ${error.message} \nStack: ${error.stack}`);
  }
};
