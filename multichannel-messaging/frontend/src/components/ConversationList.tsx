import React from 'react';

const ICON: Record<string, string> = {
  messenger: '💬', instagram: '📸', whatsapp: '📱'
};
const STATUS_COLOR: Record<string, string> = {
  bot: '#f59e0b', open: '#3b82f6', assigned: '#10b981', resolved: '#6b7280'
};

interface Props {
  conversations: any[];
  selectedId:    string | null;
  onSelect:      (conv: any) => void;
}

export default function ConversationList({ conversations, selectedId, onSelect }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {conversations.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          Chưa có hội thoại nào.
        </div>
      )}
      {conversations.map(c => (
        <div
          key={c.id}
          onClick={() => onSelect(c)}
          style={{
            padding: '14px 20px', cursor: 'pointer',
            background: selectedId === c.id ? '#eef2ff' : undefined,
            borderBottom: '1px solid #f1f5f9',
            borderLeft: selectedId === c.id ? '3px solid #4f46e5' : '3px solid transparent',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>
              {ICON[c.channel]} {c.channel_name || c.channel_user_id}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: STATUS_COLOR[c.status] || '#6b7280' }}>
              {c.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.last_message || '...'}
          </div>
        </div>
      ))}
    </div>
  );
}
