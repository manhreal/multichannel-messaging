import { pool } from '../db/connection';
import { UnifiedMessage } from '../normalizer';
import { handleBot } from '../handlers/chatbot';
import { notifyAgents } from '../realtime/socket';

export async function routeMessage(msg: UnifiedMessage) {
  const conn = await pool.getConnection();
  try {
    const [rows]: any = await conn.execute(
      `SELECT * FROM conversations WHERE channel = ? AND channel_user_id = ?`,
      [msg.channel, msg.channelUserId]
    );

    let conversation = rows[0];

    if (!conversation) {
      await conn.execute(
        `INSERT INTO conversations
         (channel, channel_user_id, channel_name, page_id, status, last_message, last_message_at)
         VALUES (?, ?, ?, ?, 'bot', ?, NOW())`,
        [msg.channel, msg.channelUserId, msg.senderName || msg.channelUserId, msg.pageId || null, msg.content || null]
      );
      const [newRows]: any = await conn.execute(
        `SELECT * FROM conversations WHERE channel = ? AND channel_user_id = ?`,
        [msg.channel, msg.channelUserId]
      );
      conversation = newRows[0];
    } else {
      await conn.execute(
        `UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?`,
        [msg.content || null, conversation.id]
      );
    }

    await conn.execute(
      `INSERT INTO messages
       (conversation_id, channel_msg_id, direction, type, content, media_url, sender_id, sender_name)
       VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?)`,
      [
        conversation.id, msg.channelMsgId || null, msg.type,
        msg.content || null, msg.mediaUrl || null,
        msg.channelUserId, msg.senderName || null
      ]
    );

    notifyAgents('new_message', {
      conversation,
      message: {
        direction: 'inbound',
        type: msg.type,
        content: msg.content,
        created_at: new Date()
      }
    });

    if (conversation.status === 'bot' && msg.type === 'text' && msg.content) {
      await handleBot(msg, conversation.id);
    }

  } finally {
    conn.release();
  }
}
