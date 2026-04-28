import axios from 'axios';

const GRAPH = 'https://graph.facebook.com/v19.0';

export async function sendInstagramMessage(toId: string, text: string) {
  await axios.post(
    `${GRAPH}/${process.env.IG_ACCOUNT_ID}/messages?access_token=${process.env.IG_PAGE_ACCESS_TOKEN}`,
    { recipient: { id: toId }, message: { text } }
  );
}
