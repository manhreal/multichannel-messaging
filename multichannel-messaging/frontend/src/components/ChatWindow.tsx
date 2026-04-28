import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';

const API = 'http://localhost:3300/api';
const ICON: Record<string, string> = {
  messenger: '💬', instagram: '📸', whatsapp: '📱'
};

interface Props {
  conversation: any;
  messages:     any[];
  onMessageSent: (msg: any) => void;
}

export default function ChatWindow({ conversation, messages, onMessageSent }: Props) {
  const [reply, setReply]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendReply() {
    if (!reply.trim() || loading) return;
    setLoading(true);
    try {
      await axios.post(`${API}/conversations/${conversation.id}/reply`, {
        text: reply, agentId: 'agent-001-0000-0000-000000000001'
      });
      onMessageSent({ direction: 'outbound', type: 'text', content: reply, created_at: new Date(), is_bot: 0 });
      setReply('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '14px 24px', background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <span style={{ fontSize: 24 }}>{ICON[conversation.channel]}</span>
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {conversation.channel_name || conversation.channel_user_id}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            via {conversation.channel} · {conversation.status}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {messages.map((m: any, i: number) => (
          <MessageBubble key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '14px 24px', background: '#fff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex', gap: 10
      }}>
        <input
          value={reply}
          onChange={e => setReply(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
          placeholder="Nhập tin nhắn... (Enter để gửi)"
          disabled={loading}
          style={{
            flex: 1, padding: '10px 16px',
            borderRadius: 24, border: '1px solid #e2e8f0',
            fontSize: 14, outline: 'none', background: '#f8fafc'
          }}
        />
        <button
          onClick={sendReply}
          disabled={loading || !reply.trim()}
          style={{
            padding: '10px 20px',
            background: loading ? '#a5b4fc' : '#4f46e5',
            color: '#fff', border: 'none',
            borderRadius: 24, cursor: 'pointer',
            fontSize: 14, fontWeight: 500
          }}
        >
          {loading ? '...' : 'Gửi'}
        </button>
      </div>
    </div>
  );
}
