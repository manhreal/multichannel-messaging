import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { normalizeMessenger } from '../normalizer';
import { routeMessage } from '../router';

export const messengerRouter = Router();

messengerRouter.get('/', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ Messenger webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

messengerRouter.post('/', async (req: Request, res: Response) => {
  const sig         = req.headers['x-hub-signature-256'] as string;
  const rawBody     = (req as any).rawBody as Buffer | undefined;
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(rawBody ?? Buffer.from(JSON.stringify(req.body)))
    .digest('hex');

  if (process.env.NODE_ENV !== 'development' && sig !== expectedSig) {
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  const message = normalizeMessenger(req.body);
  if (message) {
    console.log(`📨 Messenger [${message.channelUserId}]: ${message.content || '[' + message.type + ']'}`);
    routeMessage(message).catch(err => console.error('Messenger routing error:', err));
  }
});
