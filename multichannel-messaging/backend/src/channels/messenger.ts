import axios from 'axios';

const GRAPH = 'https://graph.facebook.com/v19.0';

export async function sendMessengerMessage(toId: string, text: string) {
  await axios.post(
    `${GRAPH}/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
    { recipient: { id: toId }, message: { text } }
  );
}

export async function sendMessengerTemplate(toId: string, templatePayload: any) {
  await axios.post(
    `${GRAPH}/me/messages?access_token=${process.env.FB_PAGE_ACCESS_TOKEN}`,
    { recipient: { id: toId }, message: templatePayload }
  );
}
