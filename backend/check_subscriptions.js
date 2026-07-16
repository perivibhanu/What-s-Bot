const axios = require('axios');

require('dotenv').config();
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const APP_ACCESS_TOKEN = `${APP_ID}|${APP_SECRET}`;

async function checkSubscriptions() {
  try {
    const response = await axios.get(`https://graph.facebook.com/v17.0/${APP_ID}/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${APP_ACCESS_TOKEN}`
      }
    });
    console.log("SUCCESS! Here are your webhook subscriptions:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("ERROR CHECKING SUBSCRIPTIONS:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

checkSubscriptions();
