-- 所有客户端禁止直连这些表。仅服务端数据库角色可读写。
CREATE TABLE IF NOT EXISTS app_lock (id integer PRIMARY KEY CHECK(id=1));
INSERT INTO app_lock(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS users_verified_number ON users ((data->>'studentNo'))
  WHERE data->>'verification'='approved';
CREATE TABLE IF NOT EXISTS rooms (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS admin_grants (user_id text PRIMARY KEY REFERENCES users(id), data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS identity_reviews (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS identity_pending ON identity_reviews ((data->>'status'));
CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
  room_id text NOT NULL REFERENCES rooms(id), data jsonb NOT NULL,
  CHECK ((data->>'startAt')::bigint < (data->>'endAt')::bigint),
  CHECK (data->>'status' IN ('pending','approved','rejected','cancelled','expired','completed')),
  CHECK ((data->>'attendees')::integer > 0)
);
CREATE INDEX IF NOT EXISTS reservations_room_day ON reservations(room_id, (data->>'date'));
CREATE INDEX IF NOT EXISTS reservations_owner ON reservations(user_id, (data->>'status'));
CREATE TABLE IF NOT EXISTS idempotency (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (id text PRIMARY KEY, data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS feedback (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), data jsonb NOT NULL,
  CHECK (data->>'status' IN ('pending', 'replied')),
  CHECK (length(btrim(data->>'content')) BETWEEN 1 AND 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS feedback_request ON feedback (user_id, (data->>'requestId'));
CREATE INDEX IF NOT EXISTS feedback_owner_status ON feedback (user_id, (data->>'status'));
CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (((data->>'expiresAt')::bigint));
CREATE TABLE IF NOT EXISTS room_blocks (id text PRIMARY KEY,room_id text NOT NULL REFERENCES rooms(id),data jsonb NOT NULL,
  CHECK ((data->>'startAt')::bigint < (data->>'endAt')::bigint),CHECK (data->>'status' IN ('active','released')));
CREATE INDEX IF NOT EXISTS room_blocks_room ON room_blocks(room_id,(data->>'status'));
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),data jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS notifications_owner ON notifications(user_id);
REVOKE ALL ON room_blocks,notifications FROM PUBLIC;
ALTER TABLE room_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_lock, users, rooms, admin_grants, identity_reviews, reservations, idempotency, audit_logs, feedback, sessions FROM PUBLIC;
-- 无客户端 RLS policy，客户端角色即使被平台授予表权限也不能读写。
-- 服务端须使用表所有者或获授权的 BYPASSRLS 角色。
ALTER TABLE app_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
