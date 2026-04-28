import { Router } from 'express';
import { pool } from '../db/connection';

export const messagesRouter = Router();

messagesRouter.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM messages WHERE id = ?`, [req.params.id]
    );
    const msgs = rows as any[];
    if (!msgs[0]) return res.status(404).json({ error: 'Message not found' });
    res.json(msgs[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

messagesRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['sent', 'delivered', 'read', 'failed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  await pool.execute(`UPDATE messages SET status = ? WHERE id = ?`, [status, req.params.id]);
  res.json({ success: true });
});
