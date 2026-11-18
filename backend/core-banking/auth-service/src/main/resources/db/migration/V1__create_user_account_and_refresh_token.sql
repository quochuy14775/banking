-- Tài khoản đăng nhập. Chỉ giữ thông tin phục vụ đăng nhập; họ tên, CCCD, eKYC thuộc customer-service.
-- Đã chạy rồi thì KHÔNG sửa file này; muốn đổi cấu trúc bảng thì tạo file V2__..., V3__...

CREATE TABLE user_account (
    id                    UUID         PRIMARY KEY,
    username              VARCHAR(50)  NOT NULL,
    -- Mật khẩu đã băm, có tiền tố thuật toán, ví dụ {bcrypt}$2a$10$... Không bao giờ lưu mật khẩu gốc.
    password_hash         VARCHAR(100) NOT NULL,
    role                  VARCHAR(20)  NOT NULL,
    status                VARCHAR(20)  NOT NULL,
    failed_login_attempts INTEGER      NOT NULL,
    locked_until          TIMESTAMPTZ,
    last_login_at         TIMESTAMPTZ,
    version               BIGINT       NOT NULL,
    created_at            TIMESTAMPTZ  NOT NULL,
    updated_at            TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_user_account_username UNIQUE (username),
    CONSTRAINT ck_user_account_username CHECK (username ~ '^[a-z0-9._-]{4,50}$'),
    CONSTRAINT ck_user_account_role     CHECK (role IN ('CUSTOMER', 'ADMIN')),
    CONSTRAINT ck_user_account_status   CHECK (status IN ('ACTIVE', 'DISABLED')),
    CONSTRAINT ck_user_account_failed   CHECK (failed_login_attempts >= 0)
);

-- Refresh token. Chỉ lưu bản băm SHA-256, nên lộ database cũng không dùng được token.
-- Mỗi lần đăng nhập mở một phiên (family_id); các token xoay vòng trong phiên dùng chung family_id.
CREATE TABLE refresh_token (
    id             UUID         PRIMARY KEY,
    -- Khóa ngoại được phép vì cả hai bảng cùng thuộc auth-service.
    user_id        UUID         NOT NULL REFERENCES user_account (id),
    family_id      UUID         NOT NULL,
    token_hash     VARCHAR(64)  NOT NULL,
    expires_at     TIMESTAMPTZ  NOT NULL,
    revoked_at     TIMESTAMPTZ,
    replaced_by_id UUID,
    version        BIGINT       NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX ix_refresh_token_user ON refresh_token (user_id);
-- Chỉ đánh chỉ mục các token còn hiệu lực, dùng khi thu hồi cả một phiên.
CREATE INDEX ix_refresh_token_active_family ON refresh_token (family_id) WHERE revoked_at IS NULL;
