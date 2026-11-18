-- Bảng tài khoản ngân hàng. Số dư không nằm ở đây mà do ledger-service quản lý.
-- Đã chạy rồi thì KHÔNG sửa file này; muốn đổi cấu trúc bảng thì tạo file V2__..., V3__...

CREATE TABLE account (
    id             UUID         PRIMARY KEY,
    account_number VARCHAR(20)  NOT NULL,
    owner_id       VARCHAR(64)  NOT NULL,
    product_code   VARCHAR(30)  NOT NULL,
    currency       VARCHAR(3)   NOT NULL,
    status         VARCHAR(20)  NOT NULL,
    opened_at      TIMESTAMPTZ  NOT NULL,
    closed_at      TIMESTAMPTZ,
    version        BIGINT       NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_account_number   UNIQUE (account_number),
    CONSTRAINT ck_account_status   CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    CONSTRAINT ck_account_currency CHECK (currency ~ '^[A-Z]{3}$'),
    -- Đã đóng thì phải có thời điểm đóng, chưa đóng thì không có.
    CONSTRAINT ck_account_closed   CHECK ((status = 'CLOSED') = (closed_at IS NOT NULL))
);

-- Màn hình chính của app luôn tìm tài khoản theo người dùng.
CREATE INDEX ix_account_owner ON account (owner_id);
