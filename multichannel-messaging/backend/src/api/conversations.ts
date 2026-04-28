import { Router } from 'express';
import { pool } from '../db/connection';
import { sendMessage } from '../channels';
import { notifyAgents } from '../realtime/socket';

export const conversationsRouter = Router();

conversationsRouter.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
       FROM conversations c
       ORDER BY c.last_message_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

conversationsRouter.get('/:id/messages', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

conversationsRouter.post('/:id/reply', async (req, res) => {
  try {
    const { text, agentId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const [convRows]: any = await pool.execute(
      `SELECT * FROM conversations WHERE id = ?`, [req.params.id]
    );
    const conv = convRows[0];
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    await sendMessage(conv.channel, conv.channel_user_id, text, conv.page_id);

    await pool.execute(
      `INSERT INTO messages (conversation_id, direction, type, content, sent_by_agent_id)
       VALUES (?, 'outbound', 'text', ?, ?)`,
      [conv.id, text, agentId || null]
    );

    const replyMsg = { direction: 'outbound', type: 'text', content: text, created_at: new Date() };
    notifyAgents('new_message', { conversation: conv, message: replyMsg });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

conversationsRouter.patch('/:id/assign', async (req, res) => {
  const { agentId } = req.body;
  await pool.execute(
    `UPDATE conversations SET assigned_agent_id = ?, status = 'assigned' WHERE id = ?`,
    [agentId, req.params.id]
  );
  res.json({ success: true });
});

conversationsRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  await pool.execute(
    `UPDATE conversations SET status = ? WHERE id = ?`,
    [status, req.params.id]
  );
  res.json({ success: true });
});
