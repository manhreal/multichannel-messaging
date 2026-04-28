export interface UnifiedMessage {
  channel:        'messenger' | 'instagram' | 'whatsapp';
  channelUserId:  string;
  channelMsgId:   string;
  pageId:         string;
  senderName?:    string;
  type:           'text' | 'image' | 'video' | 'audio' | 'file';
  content?:       string;
  mediaUrl?:      string;
  mediaMimeType?: string;
  timestamp:      Date;
  rawPayload:     any;
}

export function normalizeMessenger(body: any): UnifiedMessage | null {
  try {
    const entry     = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message) return null;

    const msg = messaging.message;
    let type: UnifiedMessage['type'] = 'text';
    let mediaUrl: string | undefined;

    if (msg.attachments?.[0]) {
      const att = msg.attachments[0];
      type     = att.type as any;
      mediaUrl = att.payload?.url;
    }

    return {
      channel:       'messenger',
      channelUserId: messaging.sender.id,
      channelMsgId:  msg.mid,
      pageId:        entry.id,
      type,
      content:       msg.text,
      mediaUrl,
      timestamp:     new Date(messaging.timestamp),
      rawPayload:    body,
    };
  } catch (e) {
    console.error('normalizeMessenger error:', e);
    return null;
  }
}

export function normalizeInstagram(body: any): UnifiedMessage | null {
  try {
    const entry     = body.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message) return null;

    const msg = messaging.message;
    return {
      channel:       'instagram',
      channelUserId: messaging.sender.id,
      channelMsgId:  msg.mid,
      pageId:        entry.id,
      type:          msg.attachments ? msg.attachments[0].type : 'text',
      content:       msg.text,
      mediaUrl:      msg.attachments?.[0]?.payload?.url,
      timestamp:     new Date(messaging.timestamp),
      rawPayload:    body,
    };
  } catch (e) {
    console.error('normalizeInstagram error:', e);
    return null;
  }
}

export function normalizeWhatsApp(body: any): UnifiedMessage | null {
  try {
    const value = body.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages?.[0]) return null;

    const msg     = value.messages[0];
    const contact = value.contacts?.[0];
    let type: UnifiedMessage['type'] = 'text';
    let content: string | undefined;
    let mediaUrl: string | undefined;

    if (msg.type === 'text') {
      content = msg.text?.body;
    } else if (['image', 'video', 'audio', 'document'].includes(msg.type)) {
      type     = msg.type === 'document' ? 'file' : msg.type as any;
      mediaUrl = msg[msg.type]?.id;
    }

    return {
      channel:       'whatsapp',
      channelUserId: msg.from,
      channelMsgId:  msg.id,
      pageId:        value.metadata?.phone_number_id,
      senderName:    contact?.profile?.name,
      type,
      content,
      mediaUrl,
      timestamp:     new Date(parseInt(msg.timestamp) * 1000),
      rawPayload:    body,
    };
  } catch (e) {
    console.error('normalizeWhatsApp error:', e);
    return null;
  }
}
