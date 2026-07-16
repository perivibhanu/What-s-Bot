const axios = require('axios');

require('dotenv').config();
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const TO_NUMBER = "917032055712"; // User's number with country code

async function testMessage() {
  console.log(`Sending test message to ${TO_NUMBER}...`);
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: TO_NUMBER,
        type: 'text',
        text: { body: 'Hello! This is a test message from the backend to verify the Meta Access Token is working perfectly.' }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("SUCCESS! Response from Meta:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("ERROR SENDING MESSAGE:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testMessage();
