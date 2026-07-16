require('dotenv').config();
const axios = require('axios');

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const APP_ACCESS_TOKEN = `${APP_ID}|${APP_SECRET}`;

async function subscribeWebhook() {
  try {
    const url = `https://graph.facebook.com/v17.0/${APP_ID}/subscriptions`;
    console.log(`Subscribing webhook for App ID: ${APP_ID}...`);
    
    const response = await axios.post(url, {
      object: 'whatsapp_business_account',
      callback_url: `${process.env.BASE_URL}/webhook`,
      verify_token: process.env.WEBHOOK_VERIFY_TOKEN,
      fields: ['messages']
    }, {
      headers: {
        'Authorization': `Bearer ${APP_ACCESS_TOKEN}`
      }
    });

    console.log("SUCCESS! Webhook subscribed successfully:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("ERROR SUBSCRIBING WEBHOOK:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

subscribeWebhook();
