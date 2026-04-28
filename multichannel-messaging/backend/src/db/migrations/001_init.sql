CREATE DATABASE IF NOT EXISTS multichannel_messaging
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE multichannel_messaging;

-- Bảng agents (nhân viên hỗ trợ)
CREATE TABLE IF NOT EXISTS agents (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  status      ENUM('online','offline','busy') DEFAULT 'offline',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng conversations
CREATE TABLE IF NOT EXISTS conversations (
  id                VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  channel           ENUM('messenger','instagram','whatsapp') NOT NULL,
  channel_user_id   VARCHAR(100) NOT NULL,
  channel_name      VARCHAR(150),
  channel_avatar    VARCHAR(500),
  page_id           VARCHAR(100),
  status            ENUM('open','assigned','resolved','bot') DEFAULT 'bot',
  assigned_agent_id VARCHAR(36),
  last_message      TEXT,
  last_message_at   DATETIME,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_channel_user (channel, channel_user_id),
  FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_channel (channel),
  INDEX idx_last_message_at (last_message_at)
);

-- Bảng messages
CREATE TABLE IF NOT EXISTS messages (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  conversation_id  VARCHAR(36)  NOT NULL,
  channel_msg_id   VARCHAR(200),
  direction        ENUM('inbound','outbound') NOT NULL,
  type             ENUM('text','image','video','audio','file','template') DEFAULT 'text',
  content          TEXT,
  media_url        VARCHAR(500),
  media_mime_type  VARCHAR(100),
  sender_id        VARCHAR(100),
  sender_name      VARCHAR(150),
  sent_by_agent_id VARCHAR(36),
  is_bot           TINYINT(1) DEFAULT 0,
  status           ENUM('sent','delivered','read','failed') DEFAULT 'sent',
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_conversation (conversation_id),
  INDEX idx_created_at (created_at)
);

-- Bảng bot_rules (luật chatbot tự động trả lời)
CREATE TABLE IF NOT EXISTS bot_rules (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  keyword     VARCHAR(200) NOT NULL,
  match_type  ENUM('exact','contains','startswith') DEFAULT 'contains',
  response    TEXT NOT NULL,
  is_active   TINYINT(1) DEFAULT 1,
  priority    INT DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed data mẫu
INSERT IGNORE INTO agents (id, name, email, status)
VALUES ('agent-001-0000-0000-000000000001', 'Admin Agent', 'admin@company.com', 'online');

INSERT INTO bot_rules (keyword, match_type, response, priority) VALUES
('xin chào', 'contains', 'Xin chào! Tôi là bot hỗ trợ. Gõ "agent" để gặp nhân viên thật.', 10),
('hello',    'contains', 'Hello! I am a support bot. Type "agent" to speak with a human.', 10),
('hi',       'contains', 'Hi there! Type "agent" to speak with a human agent.', 9),
('agent',    'contains', 'Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ...', 20),
('giá',      'contains', 'Để biết thông tin giá, vui lòng liên hệ email sales@company.com', 5),
('price',    'contains', 'For pricing information, please email sales@company.com', 5),
('giờ',      'contains', 'Chúng tôi làm việc từ 8:00 - 17:30, Thứ 2 đến Thứ 6.', 5);
