import { Router, Request, Response } from 'express';
import { normalizeInstagram } from '../normalizer';
import { routeMessage } from '../router';

export const instagramRouter = Router();

instagramRouter.get('/', (req: Request, res: Response) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

instagramRouter.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200);
  const message = normalizeInstagram(req.body);
  if (message) {
    console.log(`📸 Instagram [${message.channelUserId}]: ${message.content || '[' + message.type + ']'}`);
    await routeMessage(message);
  }
});
