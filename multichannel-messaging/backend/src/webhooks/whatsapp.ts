import { Router, Request, Response } from 'express';
import { normalizeWhatsApp } from '../normalizer';
import { routeMessage } from '../router';

export const whatsappRouter = Router();

whatsappRouter.get('/', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

whatsappRouter.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200);
  if (req.body.object !== 'whatsapp_business_account') return;

  const message = normalizeWhatsApp(req.body);
  if (message) {
    console.log(`📱 WhatsApp [${message.channelUserId}]: ${message.content || '[' + message.type + ']'}`);
    routeMessage(message).catch(err => console.error('WhatsApp routing error:', err));
  }
});
