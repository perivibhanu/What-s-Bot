require('dotenv').config();
const axios = require('axios');

const WABA_ID = process.env.META_WABA_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

async function subscribeWABA() {
  try {
    const url = `https://graph.facebook.com/v17.0/${WABA_ID}/subscribed_apps`;
    console.log(`Subscribing WABA ID ${WABA_ID} to App using Access Token...`);
    
    const response = await axios.post(url, {}, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    console.log("SUCCESS! WABA subscribed to App successfully:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("ERROR SUBSCRIBING WABA:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

subscribeWABA();
