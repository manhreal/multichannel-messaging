import { Router } from 'express';
import { pool } from '../db/connection';

export const agentsRouter = Router();

agentsRouter.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM agents ORDER BY name ASC`);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

agentsRouter.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['online', 'offline', 'busy'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  await pool.execute(`UPDATE agents SET status = ? WHERE id = ?`, [status, req.params.id]);
  res.json({ success: true });
});
