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
