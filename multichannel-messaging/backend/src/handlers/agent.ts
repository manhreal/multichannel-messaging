import { pool } from '../db/connection';
import { sendMessage } from '../channels';
import { notifyAgents } from '../realtime/socket';

export async function agentReply(conversationId: string, text: string, agentId: string) {
  const conn = await pool.getConnection();
  try {
    const [rows]: any = await conn.execute(
      `SELECT * FROM conversations WHERE id = ?`, [conversationId]
    );
    const conv = rows[0];
    if (!conv) throw new Error('Conversation not found');

    await sendMessage(conv.channel, conv.channel_user_id, text, conv.page_id);

    await conn.execute(
      `INSERT INTO messages (conversation_id, direction, type, content, sent_by_agent_id)
       VALUES (?, 'outbound', 'text', ?, ?)`,
      [conversationId, text, agentId]
    );

    await conn.execute(
      `UPDATE conversations SET last_message = ?, last_message_at = NOW(), status = 'assigned' WHERE id = ?`,
      [text, conversationId]
    );

    notifyAgents('new_message', {
      conversation: { ...conv, last_message: text },
      message: { direction: 'outbound', type: 'text', content: text, created_at: new Date(), is_bot: 0 }
    });
  } finally {
    conn.release();
  }
}
