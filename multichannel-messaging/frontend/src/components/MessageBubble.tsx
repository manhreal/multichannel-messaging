import React from 'react';

interface Props {
  message: {
    direction: 'inbound' | 'outbound';
    type:      string;
    content?:  string;
    is_bot?:   number | boolean;
    created_at: string | Date;
  };
}

export default function MessageBubble({ message: m }: Props) {
  const isOut = m.direction === 'outbound';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isOut ? 'flex-end' : 'flex-start',
      marginBottom: 10
    }}>
      <div style={{
        maxWidth: '65%', padding: '10px 14px',
        borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isOut ? (m.is_bot ? '#7c3aed' : '#4f46e5') : '#fff',
        color: isOut ? '#fff' : '#1e293b',
        fontSize: 14, lineHeight: 1.5,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        {!!m.is_bot && <span style={{ fontSize: 11, opacity: 0.8 }}>🤖 Bot · </span>}
        {m.content}
      </div>
    </div>
  );
}
