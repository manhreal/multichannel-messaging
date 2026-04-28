# CLAUDE.md — Multichannel Messaging System

Hệ thống inbox hợp nhất nhận và trả lời tin nhắn từ **Facebook Messenger**, **Instagram DM**, **WhatsApp Business** qua Meta Graph API v21.0.

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 18+, TypeScript, Express 4, tsx (dev runner) |
| Database | MySQL 8, driver `mysql2/promise` |
| Realtime | Socket.IO 4 (server ↔ frontend agent) |
| Frontend | React 18, Vite 5, TypeScript, axios, socket.io-client |
| Tunnel (dev) | ngrok (expose localhost ra internet cho Meta webhook) |
| Meta API | Graph API v21.0 |

---

## Cấu trúc thư mục

```
multichannel-messaging/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point, Express app, routes mount
│   │   ├── config/
│   │   │   ├── env.ts            # Validate env vars (chưa dùng nhiều)
│   │   │   └── database.ts       # DB config helper
│   │   ├── db/
│   │   │   ├── connection.ts     # mysql2 pool singleton + testConnection()
│   │   │   └── migrations/
│   │   │       └── 001_init.sql  # Schema + seed data
│   │   ├── normalizer/
│   │   │   └── index.ts          # UnifiedMessage interface + 3 normalize functions
│   │   ├── webhooks/
│   │   │   ├── messenger.ts      # GET verify + POST receive Messenger
│   │   │   ├── instagram.ts      # GET verify + POST receive Instagram
│   │   │   └── whatsapp.ts       # GET verify + POST receive WhatsApp
│   │   ├── router/
│   │   │   └── index.ts          # routeMessage(): upsert conversation/message, trigger bot
│   │   ├── handlers/
│   │   │   ├── chatbot.ts        # handleBot(): keyword matching từ bot_rules, auto-reply
│   │   │   └── agent.ts          # (placeholder cho agent assignment logic)
│   │   ├── channels/
│   │   │   ├── index.ts          # sendMessage() dispatcher — dùng cái này, không dùng file riêng
│   │   │   ├── messenger.ts      # (legacy, không dùng trực tiếp)
│   │   │   ├── instagram.ts      # (legacy, không dùng trực tiếp)
│   │   │   └── whatsapp.ts       # (legacy, không dùng trực tiếp)
│   │   ├── api/
│   │   │   ├── conversations.ts  # CRUD conversations + POST reply endpoint
│   │   │   ├── messages.ts       # GET messages của 1 conversation
│   │   │   └── agents.ts         # GET danh sách agents
│   │   ├── scheduler/
│   │   │   └── index.ts          # startScheduler(): auto-revert conversation về bot sau 24h không hoạt động
│   │   └── realtime/
│   │       └── socket.ts         # initSocket(), notifyAgents()
│   ├── .env                      # Secret — KHÔNG commit
│   ├── .env.example              # Template — commit cái này
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── main.tsx              # React entry
    │   └── App.tsx               # Toàn bộ UI: sidebar + chat window
    ├── vite.config.ts            # port 3301
    ├── index.html
    └── package.json
```

---

## Luồng dữ liệu

```
Meta Platform
    │  webhook POST
    ▼
/webhook/{messenger|instagram|whatsapp}
    │  normalizeX(body) → UnifiedMessage
    ▼
routeMessage(msg)
    │  upsert conversations + insert messages (inbound)
    │  notifyAgents('new_message', ...) → Socket.IO → FE
    │  if status==='bot' → handleBot()
    ▼
handleBot(msg, conversationId)
    │  match bot_rules by keyword
    │  sendMessage(channel, userId, replyText)  → Meta API
    │  insert messages (outbound, is_bot=1)
    ▼
Agent (FE) POST /api/conversations/:id/reply
    │  sendMessage(channel, userId, text)       → Meta API
    │  insert messages (outbound, is_bot=0)
    │  notifyAgents('new_message', ...) → Socket.IO → FE
```

---

## Database Schema

### `conversations`
| Column | Type | Ghi chú |
|--------|------|---------|
| id | VARCHAR(36) PK | UUID tự động |
| channel | ENUM | `messenger` \| `instagram` \| `whatsapp` |
| channel_user_id | VARCHAR(100) | ID người dùng phía kênh |
| channel_name | VARCHAR(150) | Tên hiển thị |
| page_id | VARCHAR(100) | Facebook Page ID / Phone Number ID |
| status | ENUM | `bot` → `open` → `assigned` → `resolved` |
| assigned_agent_id | VARCHAR(36) FK | NULL nếu chưa assign |
| last_message | TEXT | Preview tin cuối |
| last_message_at | DATETIME | Dùng để sort sidebar |

**UNIQUE KEY**: `(channel, channel_user_id)` — mỗi user trên mỗi kênh chỉ có 1 conversation.

### `messages`
| Column | Type | Ghi chú |
|--------|------|---------|
| id | VARCHAR(36) PK | UUID |
| conversation_id | VARCHAR(36) FK | CASCADE delete |
| direction | ENUM | `inbound` \| `outbound` |
| type | ENUM | `text` \| `image` \| `video` \| `audio` \| `file` \| `template` |
| content | TEXT | NULL nếu là media |
| media_url | VARCHAR(500) | URL ảnh/video |
| is_bot | TINYINT(1) | 1 = bot reply, 0 = agent reply |
| sent_by_agent_id | VARCHAR(36) FK | NULL nếu là bot hoặc inbound |

### `agents`
Seed sẵn 1 agent: `id = 'agent-001-0000-0000-000000000001'`, email `admin@company.com`.

### `bot_rules`
| Column | Ý nghĩa |
|--------|---------|
| keyword | Từ khóa match |
| match_type | `exact` \| `contains` \| `startswith` |
| response | Nội dung trả lời |
| priority | Số cao hơn = ưu tiên hơn |
| is_active | 1/0 bật tắt rule |

---

## Interface chính: `UnifiedMessage`

```typescript
interface UnifiedMessage {
  channel:        'messenger' | 'instagram' | 'whatsapp';
  channelUserId:  string;   // sender ID
  channelMsgId:   string;   // ID tin nhắn phía kênh
  pageId:         string;   // Facebook Page ID hoặc WA phone number ID
  senderName?:    string;   // Tên người gửi (WhatsApp cung cấp, Messenger không)
  type:           'text' | 'image' | 'video' | 'audio' | 'file';
  content?:       string;   // Nội dung text, undefined nếu là media
  mediaUrl?:      string;   // URL hoặc media ID (WA)
  mediaMimeType?: string;
  timestamp:      Date;
  rawPayload:     any;      // Body gốc từ Meta webhook
}
```

Khi thêm kênh mới: implement `normalizeX()` trả về `UnifiedMessage | null`, rồi mount router vào `index.ts`. Phần còn lại (`routeMessage`, `handleBot`, `sendMessage`) dùng chung.

---

## API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Health check |
| POST | `/test/simulate` | Giả lập nhận tin (dev only) |
| GET | `/webhook/messenger` | Verify webhook Meta |
| POST | `/webhook/messenger` | Nhận tin Messenger |
| GET | `/webhook/instagram` | Verify webhook Meta |
| POST | `/webhook/instagram` | Nhận tin Instagram |
| GET | `/webhook/whatsapp` | Verify webhook Meta |
| POST | `/webhook/whatsapp` | Nhận tin WhatsApp |
| GET | `/api/conversations` | Danh sách conversations (sort by last_message_at DESC) |
| GET | `/api/conversations/:id/messages` | Tin nhắn của 1 conversation |
| POST | `/api/conversations/:id/reply` | Agent gửi reply `{ text: string }` |
| PATCH | `/api/conversations/:id/assign` | Gán agent `{ agentId: string }` |
| PATCH | `/api/conversations/:id/status` | Đổi status `{ status: string }` |
| GET | `/api/agents` | Danh sách agents |

---

## Socket.IO Events

**Server → Client** (`notifyAgents(event, data)`):

| Event | Payload | Khi nào |
|-------|---------|---------|
| `new_message` | `{ conversation, message }` | Mỗi khi có tin mới (inbound hoặc outbound — kể cả bot reply) |
| `status_changed` | `{ conversationId, status }` | Bot match keyword 'agent', agent đổi status, assign agent |

Socket server cho phép CORS từ `localhost:3301` và `localhost:3001`.

**Vite HMR gotcha:** Socket được tạo ở module level trong App.tsx. Có dùng `import.meta.hot.dispose(() => socket.disconnect())` để tránh duplicate connection khi hot-reload.

---

## Environment Variables

File: `backend/.env` (dựa theo `backend/.env.example`)

| Var | Dùng ở đâu | Lưu ý |
|-----|-----------|-------|
| `PORT` | `index.ts` | Default 3000, project dùng 3300 |
| `DB_*` | `db/connection.ts` | Kết nối MySQL (host, port, user, password, database) |
| `META_APP_SECRET` | `webhooks/messenger.ts` | Verify HMAC signature (bỏ qua trong dev mode) |
| `META_VERIFY_TOKEN` | Tất cả webhook GET | `my_custom_verify_token_123` |
| `FB_PAGE_ACCESS_TOKEN` | `channels/index.ts` Messenger | Lấy từ Messenger API Settings dashboard, **không có hạn** nhưng bị thu hồi khi app thay đổi quyền |
| `FB_PAGE_ID` | `channels/index.ts` Instagram | ID trang Facebook (số) |
| `IG_PAGE_ACCESS_TOKEN` | `channels/index.ts` Instagram | Hết hạn sau **~60 ngày**, cần tạo lại định kỳ |
| `IG_ACCOUNT_ID` | (không dùng trong channels/index.ts hiện tại) | ID Instagram Business Account |
| `WA_PHONE_NUMBER_ID` | `channels/index.ts` WhatsApp | ID số điện thoại WA Business |
| `WA_ACCESS_TOKEN` | `channels/index.ts` WhatsApp | **System User Token — không hết hạn**. Xem hướng dẫn lấy bên dưới. |
| `WEBHOOK_BASE_URL` | `index.ts` (chỉ log) | URL ngrok, cập nhật mỗi lần restart ngrok (free plan đổi URL) |

---

## Gửi tin ra Meta (`channels/index.ts`)

Hàm duy nhất cần dùng:

```typescript
sendMessage(channel, toId, text, pageId?)
```

- **Messenger**: `POST /me/messages?access_token=FB_PAGE_ACCESS_TOKEN`
- **Instagram**: `POST /{FB_PAGE_ID}/messages?access_token=IG_PAGE_ACCESS_TOKEN`
- **WhatsApp**: `POST /{WA_PHONE_NUMBER_ID}/messages` với `Authorization: Bearer WA_ACCESS_TOKEN`

Hàm **throw** khi Axios lỗi (log trước rồi rethrow). Caller phải tự quyết định xử lý:
- Agent reply (`api/conversations.ts`): lỗi được bubble lên, trả 500 cho frontend, **không** insert message.
- Bot reply (`handlers/chatbot.ts`): có inner try/catch riêng — lỗi được log, message vẫn được insert với `status='failed'`.

---

## Trạng thái Token Meta theo kênh

| Kênh | Token | Hạn dùng | Cách lấy lại |
|------|-------|----------|-------------|
| Messenger | Page Access Token | Không hết (trừ khi thu hồi) | Messenger API Settings → Tạo mã truy cập |
| Instagram | IG Page Access Token | ~60 ngày | Instagram API Settings → Tạo mã truy cập |
| WhatsApp | System User Token | **Không hết hạn** | Xem hướng dẫn bên dưới |

Dấu hiệu token hết hạn: log `❌ Send failed` với error code `190` (token expired) hoặc `100/33` (object not found / invalid token context).

### Lấy WhatsApp System User Token (vĩnh viễn)

> Làm một lần duy nhất, token không bao giờ hết hạn.

1. Vào [business.facebook.com](https://business.facebook.com) → đăng nhập tài khoản quản lý trang
2. **Cài đặt doanh nghiệp** (Business Settings) → **Người dùng** → **Người dùng hệ thống** (System Users)
3. Nhấn **Thêm** → đặt tên bất kỳ (vd: `whatsapp-bot`) → chọn vai trò **Admin** → Tạo
4. Chọn người dùng vừa tạo → nhấn **Thêm tài sản** (Add Assets)
   - Chọn loại tài sản: **Tài khoản WhatsApp Business**
   - Tick vào WA Business Account của bạn → bật **Toàn quyền kiểm soát** → Lưu
5. Nhấn **Tạo token mới** (Generate New Token)
   - Chọn **App** của bạn (app trong Meta Developer)
   - Tick 2 quyền: `whatsapp_business_messaging` và `whatsapp_business_management`
   - Nhấn Tạo token
6. **Copy token ngay** (chỉ hiển thị 1 lần) → dán vào `WA_ACCESS_TOKEN` trong `backend/.env`

Token này gắn với System User (không phải tài khoản cá nhân) nên không bị thu hồi khi đổi mật khẩu hay logout.

---

## Trạng thái kênh hiện tại

| Kênh | Nhận webhook | Gửi reply | Ghi chú |
|------|-------------|-----------|---------|
| Messenger ✅ | Hoạt động | Hoạt động | App Development mode, chỉ tester có quyền |
| WhatsApp ✅ | Hoạt động | Hoạt động | Đã dùng System User Token — không hết hạn |
| Instagram ⚠️ | Hoạt động | Lỗi | IG Business account mới tạo bị Meta restrict; thử account cũ hơn |

---

## Quy tắc khi sửa code

### Backend
- **Không dùng** `undefined` làm bind parameter MySQL — dùng `null`. MySQL2 throw khi gặp `undefined`.
- Mọi DB operation dùng `pool` (connection pool), không tạo connection mới. Nếu cần transaction: `pool.getConnection()` → dùng xong `conn.release()` trong `finally`.
- Webhook handlers luôn `res.sendStatus(200)` **trước** khi xử lý async (Meta yêu cầu response trong 20 giây). Sau khi trả 200, gọi `routeMessage(...).catch(...)` — **không dùng `await` trực tiếp** vì Express 4 không bắt unhandled rejection trong async handler.
- HMAC signature check (`x-hub-signature-256`) dùng **`req.rawBody`** (Buffer được lưu bởi `verify` callback trong `express.json()`), không dùng `JSON.stringify(req.body)`. Chỉ enforce khi `NODE_ENV !== 'development'`.
- `sendMessage()` **throw** khi lỗi. Agent reply: để lỗi bubble lên → trả 500. Bot reply: bọc riêng try/catch, insert message với `status='failed'`.
- Sau khi gửi reply thành công (agent hoặc bot): luôn UPDATE `conversations.last_message` và `last_message_at`.
- Mỗi khi thay đổi `conversations.status`: emit `notifyAgents('status_changed', { conversationId, status })`.
- Duplicate webhook: kiểm tra `channel_msg_id` trước khi insert message. DB có UNIQUE KEY `uq_channel_msg_id` trên `messages.channel_msg_id`.
- Khi thêm kênh mới: tạo file trong `webhooks/` và `channels/`, implement `normalizeX()`, mount vào `src/index.ts`, thêm case vào `sendMessage()` trong `channels/index.ts`.

### Frontend
- Toàn bộ UI trong `App.tsx` (single file, không có component riêng hiện tại).
- Socket tạo ở module level với HMR cleanup — không move vào trong component.
- Không dùng optimistic update cho outbound message — để socket event từ backend push về (tránh duplicate).
- Khi API call thất bại: set `error` state để hiện banner đỏ, restore input nếu cần.
- Tin nhắn outbound của bot: `is_bot = 1`, màu tím `#7c3aed`. Agent: `is_bot = 0`, màu indigo `#4f46e5`.
- `openConversation()` dùng `selectedIdRef` để guard race condition — kiểm tra `selectedIdRef.current !== conv.id` sau khi await, bỏ qua response nếu user đã click sang conversation khác.
- `new_message` socket event: đẩy conversation lên đầu danh sách (filter + unshift) để giữ đúng thứ tự `last_message_at DESC`.

---

## Pitfalls đã gặp

1. **MySQL bind undefined**: Image/video messages không có `content` → `undefined` → MySQL crash. Fix: `msg.content || null`.
2. **React renders "0"**: `{m.is_bot && <span>}` với `is_bot = 0` (number) render chữ "0". Fix: `{!!m.is_bot && ...}`.
3. **Socket duplicate (Vite HMR)**: Module-level `io()` tạo connection mới mỗi lần HMR. Fix: `import.meta.hot.dispose(() => socket.disconnect())`.
4. **agentId FK constraint**: Nếu seed không chạy, INSERT messages với `sent_by_agent_id` hardcoded sẽ fail FK. Fix: dùng `null` thay vì hardcode.
5. **ngrok.yml version**: File config ngrok phải là `version: "2"`, không phải `"3"` với ngrok v3.38+.
6. **Instagram webhook cần Live mode**: App Development mode không nhận IG webhook từ user ngoài danh sách tester.
7. **WhatsApp messages toggle**: Phải bật toggle `messages` trong phần "Trường webhook" — hay bị bỏ sót, là nguyên nhân không nhận được tin WA.
8. **HMAC signature dùng raw bytes**: `express.json()` parse body trước webhook; HMAC phải tính từ `req.rawBody` (Buffer) được lưu qua `verify` callback, không phải `JSON.stringify(req.body)`.
9. **Webhook async handler Express 4**: Sau `res.sendStatus(200)`, dùng `.catch()` thay vì `await` — Express 4 không bắt unhandled rejection từ async handler sau khi response đã gửi.
10. **Duplicate webhook event**: Meta có thể gửi cùng 1 event nhiều lần. Kiểm tra `channel_msg_id` trước khi insert; DB có UNIQUE KEY để làm lưới chặn cuối. Nếu add constraint trên DB đã có data: `ALTER TABLE messages ADD UNIQUE KEY uq_channel_msg_id (channel_msg_id);`
11. **Sidebar order lệch**: Socket `new_message` phải đẩy conversation lên đầu mảng (không sửa in-place) để giữ đúng thứ tự sort của backend.
12. **Race condition openConversation**: Click nhanh A→B có thể load message của A vào khung B. Guard bằng `selectedIdRef` — bỏ qua response nếu `selectedIdRef.current !== conv.id`.

---

## Chạy local

```bash
# Terminal 1 — Backend
cd backend && npm run dev          # port 3300, tsx watch

# Terminal 2 — Frontend
cd frontend && npm run dev         # port 3301

# Terminal 3 — Tunnel
& "$env:APPDATA\ngrok\extracted\ngrok.exe" http 3300
# Copy URL → cập nhật WEBHOOK_BASE_URL trong .env → restart backend
```

Test không cần Meta app:
```powershell
Invoke-WebRequest -Uri "http://localhost:3300/test/simulate" `
  -Method POST -ContentType "application/json" -UseBasicParsing `
  -Body '{"channel":"messenger","userId":"u1","name":"Test User","text":"xin chào"}'
```

---

## Build & Deploy

```bash
# Backend build
cd backend && npm run build   # output: dist/
node dist/index.js

# Frontend build
cd frontend && npm run build  # output: dist/ (static files)
```

Khi deploy production:
- Đổi `NODE_ENV=production` → HMAC signature check được bật
- `WEBHOOK_BASE_URL` = domain thật (không phải ngrok)
- Cập nhật webhook URL trong Meta Developer Dashboard
- Cấu hình CORS trong `realtime/socket.ts` cho domain frontend thật
- WA token: dùng System User Token từ `business.facebook.com` để tránh phải refresh mỗi 24h
