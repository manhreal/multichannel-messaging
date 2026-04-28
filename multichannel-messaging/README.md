# Multi-Channel Messaging System

Hệ thống inbox hợp nhất nhận và trả lời tin nhắn từ Facebook Messenger, Instagram DM, WhatsApp Business qua Meta Graph API.

**Stack:** Node.js · TypeScript · Express · MySQL (XAMPP) · Socket.IO · React · Vite

---

## Yêu cầu

- Node.js >= 18
- XAMPP (MySQL)
- ngrok >= 3.20.0
- Tài khoản Meta Developer + Facebook Page

---

## Cấu trúc thư mục

```
multichannel-messaging/
├── backend/
│   ├── src/
│   │   ├── api/            # REST endpoints
│   │   ├── channels/       # Gửi tin ra Meta API
│   │   ├── config/         # Env + DB config
│   │   ├── db/
│   │   │   ├── connection.ts
│   │   │   └── migrations/001_init.sql
│   │   ├── handlers/       # Bot + Agent reply
│   │   ├── normalizer/     # Chuẩn hóa payload 3 kênh
│   │   ├── realtime/       # Socket.IO
│   │   ├── router/         # routeMessage()
│   │   ├── webhooks/       # Nhận webhook từ Meta
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   └── App.tsx
    ├── index.html
    └── package.json
```

---

## 1. Cài đặt lần đầu

### 1.1 Clone và install

```bash
# Backend
cd multichannel-messaging/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 1.2 Tạo database MySQL

1. Mở **XAMPP Control Panel** → Start **MySQL**
2. Mở **MySQL Workbench** → kết nối `127.0.0.1:3306` user `root`
3. **File → Open SQL Script** → chọn `backend/src/db/migrations/001_init.sql`
4. Click **⚡ Execute All**

Kết quả: database `multichannel_messaging` với 4 bảng:
- `agents` — nhân viên hỗ trợ
- `conversations` — hội thoại
- `messages` — tin nhắn
- `bot_rules` — luật auto-reply của bot

### 1.3 Cấu hình .env

Mở `backend/.env` và điền:

```env
PORT=3300
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=         # password MySQL của bạn (XAMPP mặc định để trống)
DB_NAME=multichannel_messaging

REDIS_URL=redis://localhost:6379

META_APP_ID=         # lấy từ Meta Developer Dashboard
META_APP_SECRET=     # lấy từ Meta Developer Dashboard
META_VERIFY_TOKEN=my_custom_verify_token_123

FB_PAGE_ACCESS_TOKEN=   # xem Phần 3
FB_PAGE_ID=             # ID trang Facebook

IG_PAGE_ACCESS_TOKEN=
IG_ACCOUNT_ID=

WA_PHONE_NUMBER_ID=
WA_BUSINESS_ACCOUNT_ID=
WA_ACCESS_TOKEN=

WEBHOOK_BASE_URL=https://xxxx.ngrok-free.app   # điền sau khi chạy ngrok
```

---

## 2. Khởi động

```bash
# Terminal 1 — Backend (port 3300)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3301)
cd frontend
npm run dev

# Terminal 3 — Expose ra internet
ngrok http 3300
```

Sau khi ngrok chạy, copy URL dạng `https://xxxx.ngrok-free.app` vào `WEBHOOK_BASE_URL` trong `.env` rồi restart backend.

> **Lưu ý ngrok trên Windows:** Nếu `ngrok` không nhận ra trong PATH, chạy trực tiếp:
> ```powershell
> & "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe" http 3300
> ```
> Hoặc dùng bản mới hơn đã download tự động:
> ```powershell
> & "$env:APPDATA\ngrok\extracted\ngrok.exe" http 3300
> ```

Mở trình duyệt:
- **Inbox UI:** http://localhost:3301
- **API health:** http://localhost:3300/health

---

## 3. Cấu hình Facebook Messenger

### 3.1 Tạo Meta App

1. Vào https://developers.facebook.com → **Ứng dụng của tôi → Tạo ứng dụng**
2. Chọn use case **"Tương tác với khách hàng trên Messenger from Meta"**
3. Vào **Cài đặt ứng dụng → Cơ bản** → copy **App ID** và **App Secret** vào `.env`

### 3.2 Cấu hình Webhook Messenger

1. Menu trái → **Trường hợp sử dụng → Tùy chỉnh** (cạnh Messenger)
2. Click **Cài đặt API Messenger**
3. Phần **"1. Đặt cấu hình webhook"**:
   - **URL gọi lại:** `https://xxxx.ngrok-free.app/webhook/messenger`
   - **Xác minh mã:** `my_custom_verify_token_123`
   - Click **Xác minh và lưu** → backend log `✅ Messenger webhook verified`

### 3.3 Tạo Access Token

1. Phần **"2. Tạo mã truy cập"** → chọn Facebook Page của bạn
2. Click **"Thêm đăng ký"** → tick ✅ `messages` ✅ `messaging_postbacks` → Lưu
3. Click **"Tạo"** → copy token → điền vào `FB_PAGE_ACCESS_TOKEN`
4. Điền `FB_PAGE_ID` = ID trang (hiện bên dưới tên trang trong màn hình đó)

### 3.4 Chế độ Development vs Live

- **Development mode:** Chỉ nhận webhook từ tài khoản có role trong app (Admin, Developer, Tester)
  - Thêm tester: **Vai trò trong ứng dụng → Vai trò → Thêm người kiểm tra**
  - Tài khoản được mời vào https://developers.facebook.com để chấp nhận
- **Live mode:** Mọi người dùng Facebook đều nhắn được
  - Menu trái → **Đăng** → gạt toggle sang **Live**

### 3.5 Kiểm tra hoạt động

Nhắn tin vào Facebook Page từ tài khoản có quyền → terminal backend hiện:
```
📨 Messenger [user_id]: nội dung tin nhắn
🤖 Bot replied: "Xin chào! Tôi là bot hỗ trợ..."
```

---

## 4. Cấu hình Instagram

### 4.1 Yêu cầu

- Tài khoản Instagram **Business hoặc Creator** (không phải cá nhân)
- Instagram đã **liên kết với Facebook Page**

### 4.2 Thiết lập API Instagram

1. **Trường hợp sử dụng → Tùy chỉnh** (cạnh Instagram) → **Thiết lập API bằng thông tin đăng nhập**
2. Phần **"1. Thêm quyền nhắn tin bắt buộc"** → xác nhận các quyền:
   - `instagram_business_basic`
   - `instagram_manage_comments`
   - `instagram_business_manage_messages`

### 4.3 Tạo Access Token Instagram

1. Phần **"2. Tạo mã truy cập"** → click **"Thêm tài khoản"**
   - Lỗi **"Insufficient Developer Role"** → vào **Vai trò trong ứng dụng → Vai trò → Thêm người kiểm tra Instagram** → nhập username → tài khoản đó vào `instagram.com/accounts/manage_access/` chấp nhận lời mời
2. Sau khi kết nối → click **"Tạo"** → copy token → điền vào `IG_PAGE_ACCESS_TOKEN`
3. Copy **ID tài khoản Instagram** → điền vào `IG_ACCOUNT_ID` (dạng `17841xxxxxxxxx`)

### 4.4 Cấu hình Webhook Instagram

1. Phần **"3. Đặt cấu hình webhook"**:
   - **URL gọi lại:** `https://xxxx.ngrok-free.app/webhook/instagram`
   - **Xác minh mã:** `my_custom_verify_token_123`
   - Click **Xác minh và lưu**
2. Phần **"Trường webhook"** → bật toggle ✅ `messages`, `messaging_postbacks`, `message_reactions`

> **Lưu ý quan trọng:**
> - Instagram webhook **yêu cầu app ở trạng thái Live** mới nhận được tin
> - Token Instagram hết hạn sau ~60 ngày → cần tạo lại định kỳ
> - App Development mode: chỉ nhận webhook từ tài khoản tester được thêm vào app

### 4.5 Chuyển app sang Live

Bắt buộc để Instagram hoạt động:

1. Menu trái → **Đăng**
2. Điền **Privacy Policy URL** (vd: `https://yoursite.com/privacy-policy`)
3. Thêm **App Icon** và **App Domain**
4. Click **Đăng** → chuyển sang Live mode

---

## 5. Cấu hình WhatsApp Business

### 5.1 Thiết lập API WhatsApp

1. **Trường hợp sử dụng → Tùy chỉnh** (cạnh WhatsApp) → **Thiết lập API**
2. Ghi lại các thông tin:
   - **ID số điện thoại** → điền vào `WA_PHONE_NUMBER_ID`
   - **ID tài khoản WhatsApp Business** → điền vào `WA_BUSINESS_ACCOUNT_ID`
3. Click **"Tạo mã truy cập"** → copy token → điền vào `WA_ACCESS_TOKEN`

> **Lưu ý:** Token WhatsApp tạm thời **hết hạn sau 24h**. Mỗi lần restart cần tạo lại. Để có token vĩnh viễn → dùng System User Token từ `business.facebook.com`

### 5.2 Thêm số điện thoại test

1. Phần **"Đến"** → **"Quản lý danh sách số điện thoại"** → thêm số WhatsApp thật → xác minh OTP
2. Chọn số vừa thêm ở dropdown **"Đến"** → click **"Gửi tin nhắn"** để test outbound

### 5.3 Cấu hình Webhook WhatsApp

1. Menu trái → **Cấu hình** → **"Đặt cấu hình webhook"**:
   - **URL gọi lại:** `https://xxxx.ngrok-free.app/webhook/whatsapp`
   - **Xác minh mã:** `my_custom_verify_token_123`
   - Click **Xác minh và lưu**
2. Phần **"Trường webhook"** → scroll tìm `messages` → bật toggle ✅ **Đã đăng ký**

> **Quan trọng:** Bước bật toggle `messages` hay bị bỏ sót — đây là nguyên nhân phổ biến nhất khiến không nhận được tin nhắn WhatsApp.

### 5.4 Test nhận tin nhắn WhatsApp

Từ điện thoại cá nhân → mở WhatsApp → nhắn tin đến số test `+1 555 655 9965` → terminal backend hiện:
```
📱 WhatsApp [số_điện_thoại]: nội dung
🤖 Bot replied: "..."
✅ Sent [whatsapp] → số_điện_thoại
```

---

## 6. Test không cần Meta App

Giả lập tin nhắn đến trực tiếp qua endpoint `/test/simulate`:

```powershell
# Messenger
Invoke-WebRequest -Uri "http://localhost:3300/test/simulate" `
  -Method POST -ContentType "application/json" -UseBasicParsing `
  -Body '{"channel":"messenger","userId":"user-001","name":"Nguyen Van A","text":"xin chao"}'

# WhatsApp
Invoke-WebRequest -Uri "http://localhost:3300/test/simulate" `
  -Method POST -ContentType "application/json" -UseBasicParsing `
  -Body '{"channel":"whatsapp","userId":"0901234567","name":"Tran Thi B","text":"gia bao nhieu"}'

# Instagram
Invoke-WebRequest -Uri "http://localhost:3300/test/simulate" `
  -Method POST -ContentType "application/json" -UseBasicParsing `
  -Body '{"channel":"instagram","userId":"insta-user","text":"agent"}'
```

---

## 7. REST API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/conversations` | Danh sách hội thoại |
| GET | `/api/conversations/:id/messages` | Tin nhắn của 1 hội thoại |
| POST | `/api/conversations/:id/reply` | Agent gửi tin trả lời |
| PATCH | `/api/conversations/:id/assign` | Gán agent |
| PATCH | `/api/conversations/:id/status` | Đổi trạng thái |
| GET | `/api/agents` | Danh sách agents |
| GET | `/health` | Health check |
| POST | `/test/simulate` | Giả lập tin nhắn |

---

## 8. Webhook URLs

| Kênh | URL |
|------|-----|
| Messenger | `https://xxxx.ngrok-free.app/webhook/messenger` |
| Instagram | `https://xxxx.ngrok-free.app/webhook/instagram` |
| WhatsApp | `https://xxxx.ngrok-free.app/webhook/whatsapp` |

Verify Token cho tất cả: `my_custom_verify_token_123`

---

## 9. Bot Rules

Bot tự động trả lời theo keyword được lưu trong bảng `bot_rules`. Mặc định đã seed sẵn:

| Keyword | Phản hồi |
|---------|----------|
| xin chào | Xin chào! Gõ "agent" để gặp nhân viên thật |
| hello / hi | Hello! Type "agent" to speak with a human |
| agent | Đang kết nối với nhân viên hỗ trợ... (chuyển status → open) |
| giá / price | Liên hệ sales@company.com |
| giờ | Làm việc 8:00–17:30, T2–T6 |

Thêm rule mới trực tiếp trong MySQL:
```sql
INSERT INTO bot_rules (keyword, match_type, response, priority)
VALUES ('từ_khóa', 'contains', 'Nội dung trả lời', 5);
```

---

## 10. Lưu ý vận hành

- **Mỗi lần restart máy:** Start MySQL trong XAMPP → chạy lại backend + frontend + ngrok
- **Ngrok URL thay đổi mỗi lần chạy** (free plan) → phải cập nhật `WEBHOOK_BASE_URL` trong `.env` và webhook URL trong Meta Dashboard
- **App ở Development mode:** Restart backend sau mỗi lần thay đổi `.env`
- **Redis:** Hiện chưa dùng, có thể bỏ qua nếu chưa cài
