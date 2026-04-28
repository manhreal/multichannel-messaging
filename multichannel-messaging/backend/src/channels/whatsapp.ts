import axios from 'axios';

const GRAPH = 'https://graph.facebook.com/v19.0';

export async function sendWhatsAppMessage(toId: string, text: string) {
  await axios.post(
    `${GRAPH}/${process.env.WA_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to:   toId,
      type: 'text',
      text: { body: text }
    },
    { headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` } }
  );
}

export async function sendWhatsAppTemplate(toId: string, templateName: string, languageCode = 'vi') {
  await axios.post(
    `${GRAPH}/${process.env.WA_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to:   toId,
      type: 'template',
      template: { name: templateName, language: { code: languageCode } }
    },
    { headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` } }
  );
}
