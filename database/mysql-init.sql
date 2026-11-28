-- 由 scripts/db-sql.js 依据 server/schema.mysql.sql 与 server/seed.js 生成，请勿手工编辑。
-- 重新生成：npm run db:sql
--
-- 纯 SQL 初始化（需要 MySQL 8.0.16+ 的 mysql 客户端，项目根目录执行）：
--   mysql -uroot -p --default-character-set=utf8mb4 < database/mysql-init.sql
-- 更推荐 npm run db:init：它会按 .env 自动建库、建表、写入同样的初始数据并打印摘要。
--
-- 目标库：`meeting_room_booking`（改用其他库名时，把文件里三处库名一起替换，或直接跑 npm run db:init）

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS `meeting_room_booking` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER DATABASE `meeting_room_booking` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `meeting_room_booking`;

-- MySQL 8.0.16+ normalized schema. Core business values are columns, not JSON.
CREATE TABLE IF NOT EXISTS app_lock (id INT NOT NULL PRIMARY KEY, CONSTRAINT app_lock_singleton CHECK (id = 1)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO app_lock (id) VALUES (1);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) NOT NULL PRIMARY KEY, password VARCHAR(255) NULL, name VARCHAR(100) NOT NULL DEFAULT '', student_no VARCHAR(64) NOT NULL DEFAULT '',
  identity_type VARCHAR(20) NULL, verification VARCHAR(20) NOT NULL DEFAULT 'unsubmitted', phone VARCHAR(20) NOT NULL DEFAULT '', avatar_url TEXT NULL, avatar_updated_at BIGINT NULL,
  UNIQUE KEY users_verified_number (student_no, verification), KEY users_verification (verification)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(191) NOT NULL PRIMARY KEY, number VARCHAR(50) NOT NULL, capacity INT NULL, location VARCHAR(255) NOT NULL, equipment VARCHAR(255) NOT NULL, open_time VARCHAR(50) NOT NULL,
  photo MEDIUMTEXT NULL, photo_note VARCHAR(255) NULL, settings_version VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_grants (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY, source VARCHAR(100) NULL, created_at BIGINT NULL,
  CONSTRAINT admin_grants_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS identity_reviews (
  id VARCHAR(191) NOT NULL PRIMARY KEY, user_id VARCHAR(191) NOT NULL, profile_name VARCHAR(100) NOT NULL, profile_student_no VARCHAR(64) NOT NULL,
  profile_identity_type VARCHAR(20) NOT NULL, profile_phone VARCHAR(20) NOT NULL, status VARCHAR(20) NOT NULL, submitted_at BIGINT NOT NULL, reviewed_by VARCHAR(191) NULL, reviewed_at BIGINT NULL, reason VARCHAR(500) NULL,
  KEY identity_pending (status), CONSTRAINT identity_reviews_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(191) NOT NULL PRIMARY KEY, user_id VARCHAR(191) NOT NULL, room_id VARCHAR(191) NOT NULL, date_value DATE NOT NULL, start_time CHAR(5) NOT NULL, end_time CHAR(5) NOT NULL,
  start_at BIGINT NOT NULL, end_at BIGINT NOT NULL, responsible_teacher VARCHAR(100) NOT NULL, borrower_name VARCHAR(100) NOT NULL, purpose VARCHAR(500) NOT NULL, attendees INT NOT NULL,
  phone VARCHAR(20) NOT NULL, notes VARCHAR(1000) NOT NULL DEFAULT '', applicant_name VARCHAR(100) NOT NULL, student_no VARCHAR(64) NOT NULL, identity_type VARCHAR(20) NULL, status VARCHAR(20) NOT NULL,
  created_at BIGINT NOT NULL, state_changed_at BIGINT NULL, reviewed_by VARCHAR(191) NULL, reviewed_at BIGINT NULL, reason VARCHAR(500) NULL, cancelled_by VARCHAR(191) NULL, cancelled_at BIGINT NULL, cancellation_type VARCHAR(50) NULL, block_id VARCHAR(191) NULL,
  KEY reservations_room_day (room_id, date_value), KEY reservations_owner (user_id, status), KEY reservations_time (room_id, start_at, end_at),
  CONSTRAINT reservations_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id), CONSTRAINT reservations_room_fk_v2 FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT reservations_time_check_v2 CHECK (start_at < end_at), CONSTRAINT reservations_attendees_check_v2 CHECK (attendees > 0),
  CONSTRAINT reservations_status_check_v2 CHECK (status IN ('pending','approved','rejected','cancelled','expired','completed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS idempotency (
  id VARCHAR(191) NOT NULL PRIMARY KEY, user_id VARCHAR(191) NOT NULL, fingerprint CHAR(64) NOT NULL, reservation_id VARCHAR(191) NOT NULL, created_at BIGINT NOT NULL,
  CONSTRAINT idempotency_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(191) NOT NULL PRIMARY KEY, actor_id VARCHAR(191) NULL, object_id VARCHAR(191) NULL, operation VARCHAR(100) NOT NULL, detail VARCHAR(1000) NULL, at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feedback (
  id VARCHAR(191) NOT NULL PRIMARY KEY, user_id VARCHAR(191) NOT NULL, category VARCHAR(30) NOT NULL, content VARCHAR(1000) NOT NULL, request_id VARCHAR(100) NOT NULL, fingerprint CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL, reply VARCHAR(1000) NULL, replied_by VARCHAR(191) NULL, replied_at BIGINT NULL, created_at BIGINT NOT NULL,
  UNIQUE KEY feedback_request (user_id, request_id), KEY feedback_owner_status (user_id, status),
  CONSTRAINT feedback_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id), CONSTRAINT feedback_status_check_v2 CHECK (status IN ('pending','replied')),
  CONSTRAINT feedback_content_check_v2 CHECK (CHAR_LENGTH(TRIM(content)) BETWEEN 1 AND 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(191) NOT NULL PRIMARY KEY, user_id VARCHAR(191) NOT NULL, expires_at BIGINT NOT NULL, KEY sessions_expiry (expires_at), CONSTRAINT sessions_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_blocks (
  id VARCHAR(191) NOT NULL PRIMARY KEY, room_id VARCHAR(191) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, start_time CHAR(5) NOT NULL, end_time CHAR(5) NOT NULL,
  start_at BIGINT NOT NULL, end_at BIGINT NOT NULL, reason VARCHAR(200) NOT NULL, request_id VARCHAR(100) NULL, fingerprint CHAR(64) NOT NULL, status VARCHAR(20) NOT NULL, created_by VARCHAR(191) NOT NULL, created_at BIGINT NOT NULL, cancelled_count INT NOT NULL DEFAULT 0,
  released_at BIGINT NULL, released_by VARCHAR(191) NULL, release_reason VARCHAR(200) NULL, KEY room_blocks_room (room_id, status),
  CONSTRAINT room_blocks_room_fk_v2 FOREIGN KEY (room_id) REFERENCES rooms(id), CONSTRAINT room_blocks_time_check_v2 CHECK (start_at < end_at), CONSTRAINT room_blocks_status_check_v2 CHECK (status IN ('active','released'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(191) NOT NULL PRIMARY KEY, user_id VARCHAR(191) NOT NULL, reservation_id VARCHAR(191) NULL, type VARCHAR(100) NOT NULL, content VARCHAR(1000) NOT NULL, created_at BIGINT NOT NULL, read_at BIGINT NULL,
  KEY notifications_owner (user_id), CONSTRAINT notifications_user_fk_v2 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 会议室：五间固定房间，重复执行只刷新资料，不删房间。
INSERT INTO rooms (id,number,capacity,location,equipment,open_time,photo,photo_note,settings_version) VALUES
('7060','7060',10,'南湖校区综合楼七楼','屏幕','08:00—22:00','/assets/meeting.png','原型示意图，非该房间实拍','pixso-2026-11-23'),
('7081','7081',10,'南湖校区综合楼七楼','屏幕','08:00—22:00','/assets/meeting.png','原型示意图，非该房间实拍','pixso-2026-11-23'),
('7091','7091',10,'南湖校区综合楼七楼','屏幕','08:00—22:00','/assets/meeting.png','原型示意图，非该房间实拍','pixso-2026-11-23'),
('7119','7119',100,'南湖校区综合楼七楼','投影、音响、话筒','08:00—22:00','/assets/meeting.png','原型示意图，非该房间实拍','pixso-2026-11-23'),
('7052','7052',40,'南湖校区综合楼七楼','屏幕','08:00—22:00','/assets/meeting.png','原型示意图，非该房间实拍','pixso-2026-11-23')
ON DUPLICATE KEY UPDATE number=VALUES(number), capacity=VALUES(capacity), location=VALUES(location), equipment=VALUES(equipment), open_time=VALUES(open_time), photo=VALUES(photo), photo_note=VALUES(photo_note), settings_version=VALUES(settings_version);

-- 演示账号：仅用于本地开发登录，不代表真实身份；重复执行会把密码重置为默认值。
INSERT INTO users (id,password,name,student_no,identity_type,verification,phone) VALUES
('demo-student','student123','测试学生甲','DEMO-S001','student','approved','13800000001'),
('demo-student2','student123','测试学生乙','DEMO-S002','student','approved','13800000002'),
('demo-teacher','teacher123','测试教师','DEMO-T001','teacher','approved','13800000003'),
('demo-admin','admin123','测试负责人','DEMO-A001','student','approved','13800000004'),
('demo-guest','guest123','','',NULL,'unsubmitted','')
ON DUPLICATE KEY UPDATE password=VALUES(password), name=VALUES(name), student_no=VALUES(student_no), identity_type=VALUES(identity_type), verification=VALUES(verification), phone=VALUES(phone);

-- 负责人授权：与师生核验状态解耦，只授予演示负责人。
INSERT INTO admin_grants (user_id,source,created_at) VALUES
('demo-admin','local-demo-seed',1767196800000)
ON DUPLICATE KEY UPDATE source=VALUES(source), created_at=VALUES(created_at);

-- 初始化结果概览
SELECT (SELECT COUNT(*) FROM rooms) AS rooms, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM admin_grants) AS admins;
