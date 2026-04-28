import { pool } from '../db/connection';
import { UnifiedMessage } from '../normalizer';
import { sendMessage } from '../channels';
import { notifyAgents } from '../realtime/socket';

export async function handleBot(msg: UnifiedMessage, conversationId: string) {
  const text = msg.content!.toLowerCase().trim();
  const conn = await pool.getConnection();

  try {
    const [rules]: any = await conn.execute(
      `SELECT * FROM bot_rules WHERE is_active = 1 ORDER BY priority DESC`
    );

    let matched: any = null;
    for (const rule of rules) {
      const kw = rule.keyword.toLowerCase();
      if (rule.match_type === 'exact'      && text === kw)           { matched = rule; break; }
      if (rule.match_type === 'contains'   && text.includes(kw))     { matched = rule; break; }
      if (rule.match_type === 'startswith' && text.startsWith(kw))   { matched = rule; break; }
    }

    const replyText = matched
      ? matched.response
      : 'Cảm ơn bạn đã liên hệ! Nhân viên sẽ phản hồi sớm nhất có thể.';

    if (matched?.keyword === 'agent') {
      await conn.execute(
        `UPDATE conversations SET status = 'open' WHERE id = ?`, [conversationId]
      );
      notifyAgents('status_changed', { conversationId, status: 'open' });
    }

    let sendOk = true;
    try {
      await sendMessage(msg.channel, msg.channelUserId, replyText, msg.pageId);
    } catch {
      sendOk = false;
    }

    const msgStatus = sendOk ? 'sent' : 'failed';
    await conn.execute(
      `UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?`,
      [replyText, conversationId]
    );
    await conn.execute(
      `INSERT INTO messages (conversation_id, direction, type, content, is_bot, status)
       VALUES (?, 'outbound', 'text', ?, 1, ?)`,
      [conversationId, replyText, msgStatus]
    );

    notifyAgents('new_message', {
      conversation: { id: conversationId },
      message: { direction: 'outbound', type: 'text', content: replyText, is_bot: 1, created_at: new Date(), status: msgStatus }
    });

    console.log(`🤖 Bot replied: "${replyText.substring(0, 50)}" [${msgStatus}]`);

  } finally {
    conn.release();
  }
}
