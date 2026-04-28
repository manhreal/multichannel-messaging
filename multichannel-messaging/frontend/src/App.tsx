import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API    = import.meta.env.VITE_API_URL as string;
const socket = io(import.meta.env.VITE_SOCKET_URL as string);
if (import.meta.hot) {
  import.meta.hot.dispose(() => socket.disconnect());
}

const ICON: Record<string, string> = {
  messenger: '💬', instagram: '📸', whatsapp: '📱'
};
const CHANNEL_LABEL: Record<string, string> = {
  messenger: 'Messenger', instagram: 'Instagram', whatsapp: 'WhatsApp'
};
const STATUS_COLOR: Record<string, string> = {
  bot: '#f59e0b', open: '#3b82f6', assigned: '#10b981', resolved: '#6b7280'
};
const STATUS_LABEL: Record<string, string> = {
  bot: 'Bot', open: 'Open', assigned: 'Assigned', resolved: 'Resolved'
};

function formatTime(d: string | Date) {
  const date = new Date(d);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000)  return 'vừa xong';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}p`;
  if (diff < 86400_000) return date.toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('vi', { day: '2-digit', month: '2-digit' });
}

export default function App() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected]           = useState<any>(null);
  const [messages, setMessages]           = useState<any[]>([]);
  const [reply, setReply]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();

    socket.on('new_message', (data: any) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === data.conversation.id);
        if (idx === -1) return [{ ...data.conversation, last_message: data.message.content }, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], last_message: data.message.content, last_message_at: new Date() };
        return next;
      });
      setSelected((sel: any) => {
        if (sel?.id === data.conversation.id) {
          setMessages(m => [...m, { ...data.message }]);
        }
        return sel;
      });
    });

    return () => { socket.off('new_message'); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchConversations() {
    const { data } = await axios.get(`${API}/conversations`);
    setConversations(data);
  }

  async function openConversation(conv: any) {
    setSelected(conv);
    setError('');
    const { data } = await axios.get(`${API}/conversations/${conv.id}/messages`);
    setMessages(data);
  }

  async function sendReply() {
    if (!reply.trim() || !selected || loading) return;
    setLoading(true);
    setError('');
    const textToSend = reply;
    setReply('');
    try {
      await axios.post(`${API}/conversations/${selected.id}/reply`, { text: textToSend });
      // socket event từ backend sẽ push message vào UI, không add ở đây tránh duplicate
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Gửi thất bại';
      setError(msg);
      setReply(textToSend);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    await axios.patch(`${API}/conversations/${selected.id}/status`, { status });
    setSelected((s: any) => ({ ...s, status }));
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, status } : c));
  }

  const filtered = channelFilter === 'all'
    ? conversations
    : conversations.filter(c => c.channel === channelFilter);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width: 320, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
              📥 Inbox
            </span>
            <span style={{ fontSize: 12, background: '#4f46e5', color: '#fff', borderRadius: 10, padding: '2px 8px' }}>
              {conversations.length}
            </span>
          </div>

          {/* Channel filter tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'messenger', 'instagram', 'whatsapp'].map(ch => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                style={{
                  flex: 1, padding: '4px 0', fontSize: 11, border: 'none',
                  borderRadius: 6, cursor: 'pointer', fontWeight: 500,
                  background: channelFilter === ch ? '#4f46e5' : '#f1f5f9',
                  color:      channelFilter === ch ? '#fff'    : '#64748b',
                  transition: 'all 0.15s'
                }}
              >
                {ch === 'all' ? 'All' : ICON[ch]}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              Chưa có hội thoại nào.
            </div>
          )}
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => openConversation(c)}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                background: selected?.id === c.id ? '#eef2ff' : undefined,
                borderBottom: '1px solid #f1f5f9',
                borderLeft: selected?.id === c.id ? '3px solid #4f46e5' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                  {ICON[c.channel]} {c.channel_name || c.channel_user_id}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  {c.last_message_at ? formatTime(c.last_message_at) : ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {c.last_message || '...'}
                </div>
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 600, flexShrink: 0,
                  color: STATUS_COLOR[c.status] || '#6b7280'
                }}>
                  {STATUS_LABEL[c.status] || c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            {/* Header */}
            <div style={{
              padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: 28 }}>{ICON[selected.channel]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
                  {selected.channel_name || selected.channel_user_id}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {CHANNEL_LABEL[selected.channel]}
                </div>
              </div>

              {/* Status buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['open', 'resolved'].map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    style={{
                      padding: '4px 12px', fontSize: 12, border: 'none',
                      borderRadius: 12, cursor: 'pointer', fontWeight: 500,
                      background: selected.status === s ? STATUS_COLOR[s] : '#f1f5f9',
                      color:      selected.status === s ? '#fff'           : '#64748b',
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <span style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 10, fontWeight: 600,
                background: (STATUS_COLOR[selected.status] || '#6b7280') + '20',
                color: STATUS_COLOR[selected.status] || '#6b7280'
              }}>
                {STATUS_LABEL[selected.status] || selected.status}
              </span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {messages.map((m: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: m.direction === 'outbound' ? 'flex-end' : 'flex-start',
                    marginBottom: 12
                  }}
                >
                  <div style={{
                    maxWidth: '65%', padding: '10px 14px',
                    borderRadius: m.direction === 'outbound' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.direction === 'outbound'
                      ? (!!m.is_bot ? '#7c3aed' : '#4f46e5')
                      : '#fff',
                    color: m.direction === 'outbound' ? '#fff' : '#1e293b',
                    fontSize: 14, lineHeight: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }}>
                    {!!m.is_bot && (
                      <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2 }}>🤖 Bot</div>
                    )}
                    {m.type === 'image' && m.media_url ? (
                      <img src={m.media_url} alt="img" style={{ maxWidth: 220, borderRadius: 8, display: 'block' }} />
                    ) : (
                      m.content || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>[{m.type}]</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, paddingInline: 4 }}>
                    {m.created_at ? formatTime(m.created_at) : ''}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                margin: '0 24px 8px', padding: '8px 14px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, fontSize: 13, color: '#b91c1c',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 16 }}>×</button>
              </div>
            )}

            {/* Reply box */}
            {selected.status !== 'resolved' && (
              <div style={{
                padding: '12px 24px', background: '#fff', borderTop: '1px solid #e2e8f0',
                display: 'flex', gap: 10, alignItems: 'center'
              }}>
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                  placeholder="Nhập tin nhắn... (Enter để gửi)"
                  disabled={loading}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 24,
                    border: '1px solid #e2e8f0', fontSize: 14, outline: 'none',
                    background: '#f8fafc'
                  }}
                />
                <button
                  onClick={sendReply}
                  disabled={loading || !reply.trim()}
                  style={{
                    padding: '10px 22px',
                    background: (loading || !reply.trim()) ? '#a5b4fc' : '#4f46e5',
                    color: '#fff', border: 'none', borderRadius: 24,
                    cursor: (loading || !reply.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600, transition: 'background 0.15s'
                  }}
                >
                  {loading ? '...' : 'Gửi'}
                </button>
              </div>
            )}

            {selected.status === 'resolved' && (
              <div style={{
                padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                textAlign: 'center', fontSize: 13, color: '#94a3b8'
              }}>
                Hội thoại đã resolved · <button
                  onClick={() => changeStatus('open')}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >Mở lại</button>
              </div>
            )}
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 16, marginBottom: 8, color: '#64748b' }}>Chọn một hội thoại</div>
            <div style={{ fontSize: 13 }}>Hoặc test: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>POST /test/simulate</code></div>
          </div>
        )}
      </div>
    </div>
  );
}
