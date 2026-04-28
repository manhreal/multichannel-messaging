import axios from 'axios';

const GRAPH = 'https://graph.facebook.com/v21.0';

export async function sendMessage(
  channel: 'messenger' | 'instagram' | 'whatsapp',
  toId:    string,
  text:    string,
  pageId?: string
) {
  try {
    if (channel === 'messenger') {
      await axios.post(
        `${GRAPH}/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
        { recipient: { id: toId }, message: { text } }
      );

    } else if (channel === 'instagram') {
      await axios.post(
        `${GRAPH}/${process.env.FB_PAGE_ID}/messages`,
        { recipient: { id: toId }, message: { text } },
        { params: { access_token: process.env.IG_PAGE_ACCESS_TOKEN } }
      );

    } else if (channel === 'whatsapp') {
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

    console.log(`✅ Sent [${channel}] → ${toId}`);
  } catch (err: any) {
    console.error(`❌ Send failed [${channel}]:`, err.response?.data || err.message);
  }
}
