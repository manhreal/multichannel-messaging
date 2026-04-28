import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { testConnection } from './db/connection';
import { initSocket } from './realtime/socket';
import { messengerRouter } from './webhooks/messenger';
import { instagramRouter } from './webhooks/instagram';
import { whatsappRouter } from './webhooks/whatsapp';
import { conversationsRouter } from './api/conversations';
import { messagesRouter } from './api/messages';
import { agentsRouter } from './api/agents';

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Webhooks
app.use('/webhook/messenger', messengerRouter);
app.use('/webhook/instagram', instagramRouter);
app.use('/webhook/whatsapp',  whatsappRouter);

// API
app.use('/api/conversations', conversationsRouter);
app.use('/api/messages',      messagesRouter);
app.use('/api/agents',        agentsRouter);

// Test endpoint — giả lập nhận tin (dùng khi chưa có Meta app)
app.post('/test/simulate', async (req, res) => {
  const { channel = 'messenger', userId = 'test-user-001', text = 'xin chào', name } = req.body;
  const { routeMessage } = require('./router');
  await routeMessage({
    channel,
    channelUserId: userId,
    channelMsgId:  `test-${Date.now()}`,
    pageId:        'test-page',
    senderName:    name || userId,
    type:          'text',
    content:       text,
    timestamp:     new Date(),
    rawPayload:    req.body,
  });
  res.json({ success: true, message: `Simulated ${channel} message: "${text}"` });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date(), env: process.env.NODE_ENV });
});

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  await testConnection();
  initSocket(server);
  server.listen(PORT, () => {
    const base = process.env.WEBHOOK_BASE_URL || `http://localhost:${PORT}`;
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`\n📌 Webhook URLs (dùng cho Meta Dashboard):`);
    console.log(`   Messenger : ${base}/webhook/messenger`);
    console.log(`   Instagram : ${base}/webhook/instagram`);
    console.log(`   WhatsApp  : ${base}/webhook/whatsapp`);
    console.log(`\n🧪 Test simulate: POST http://localhost:${PORT}/test/simulate`);
  });
}

main().catch(console.error);
