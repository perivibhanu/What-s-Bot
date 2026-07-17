require('dotenv').config();
const axios = require('axios');

const WABA_ID = process.env.META_WABA_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

async function checkWABASubscriptions() {
  try {
    const url = `https://graph.facebook.com/v17.0/${WABA_ID}/subscribed_apps`;
    console.log(`Checking subscribed apps for WABA ID: ${WABA_ID}...`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    });

    console.log("SUCCESS! Here are the WABA subscribed apps:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("ERROR CHECKING WABA SUBSCRIPTIONS:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

checkWABASubscriptions();
