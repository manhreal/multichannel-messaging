import { pool } from '../db/connection';
import { notifyAgents } from '../realtime/socket';

const CHECK_INTERVAL_MS  = 60 * 60 * 1000; // kiểm tra mỗi 1 giờ
const INACTIVITY_HOURS   = 24;

async function revertInactiveConversations() {
  try {
    const [rows]: any = await pool.execute(
      `SELECT id FROM conversations
       WHERE status IN ('open', 'assigned')
         AND last_message_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [INACTIVITY_HOURS]
    );

    if (rows.length === 0) return;

    const ids: string[] = rows.map((r: any) => r.id);
    await pool.execute(
      `UPDATE conversations SET status = 'bot'
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    console.log(`⏰ Auto-revert: ${ids.length} hội thoại → bot (không hoạt động > ${INACTIVITY_HOURS}h)`);

    for (const id of ids) {
      notifyAgents('status_changed', { conversationId: id, status: 'bot' });
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }
}

export function startScheduler() {
  // Chạy ngay lần đầu khi server start, sau đó mỗi giờ
  revertInactiveConversations();
  setInterval(revertInactiveConversations, CHECK_INTERVAL_MS);
  console.log(`⏰ Scheduler: auto-revert → bot sau ${INACTIVITY_HOURS}h không hoạt động`);
}
