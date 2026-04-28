import { pool } from '../db/connection';
import { UnifiedMessage } from '../normalizer';
import { sendMessage } from '../channels';

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
    }

    await sendMessage(msg.channel, msg.channelUserId, replyText, msg.pageId);

    await conn.execute(
      `INSERT INTO messages (conversation_id, direction, type, content, is_bot)
       VALUES (?, 'outbound', 'text', ?, 1)`,
      [conversationId, replyText]
    );

    console.log(`🤖 Bot replied: "${replyText.substring(0, 50)}"`);

  } finally {
    conn.release();
  }
}
