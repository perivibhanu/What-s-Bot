const whatsappService = require('../services/whatsappService');
const chatService = require('../services/chatService');

exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

exports.handleMessage = async (req, res) => {
  try {
    const body = req.body;
    console.log('Received webhook:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        const message = value.messages[0];
        const from = message.from;
        
        console.log('Processing message from:', from, 'Message:', message);
        await chatService.handleIncomingMessage(from, message);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error stack:', error.stack);
    // Always return 200 so Meta doesn't retry and spam the webhook
    res.sendStatus(200);
  }
};
