-- Khách hàng (CIF) và hồ sơ đăng ký mở tài khoản. Đăng nhập/mật khẩu thuộc auth-service, không nằm ở đây.
-- Đã chạy rồi thì KHÔNG sửa file này; muốn đổi cấu trúc bảng thì tạo file V2__..., V3__...

-- Khách hàng chỉ được tạo khi nhân viên duyệt hồ sơ đăng ký, nên mỗi số CCCD có tối đa một khách.
CREATE TABLE customer (
    id            UUID         PRIMARY KEY,
    cif_number    VARCHAR(12)  NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    date_of_birth DATE         NOT NULL,
    gender        VARCHAR(10)  NOT NULL,
    national_id   VARCHAR(12)  NOT NULL,
    old_id_number VARCHAR(9),
    address       VARCHAR(300) NOT NULL,
    id_issue_date DATE,
    phone         VARCHAR(20),
    email         VARCHAR(100),
    status        VARCHAR(20)  NOT NULL,
    version       BIGINT       NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_customer_cif         UNIQUE (cif_number),
    CONSTRAINT uq_customer_national_id UNIQUE (national_id),
    CONSTRAINT ck_customer_national_id CHECK (national_id ~ '^[0-9]{12}$'),
    CONSTRAINT ck_customer_old_id      CHECK (old_id_number IS NULL OR old_id_number ~ '^[0-9]{9}$'),
    CONSTRAINT ck_customer_gender      CHECK (gender IN ('MALE', 'FEMALE')),
    CONSTRAINT ck_customer_status      CHECK (status IN ('ACTIVE', 'BLOCKED'))
);

-- Hồ sơ đăng ký: khách tự gửi (thông tin đọc từ mã QR trên CCCD + ảnh), nhân viên duyệt hoặc từ chối.
-- Hồ sơ chờ duyệt KHÔNG giữ số CCCD: nhiều hồ sơ có thể cùng số CCCD, chỉ một hồ sơ được duyệt thành khách hàng.
CREATE TABLE onboarding_application (
    id               UUID         PRIMARY KEY,
    national_id      VARCHAR(12)  NOT NULL,
    old_id_number    VARCHAR(9),
    full_name        VARCHAR(150) NOT NULL,
    date_of_birth    DATE         NOT NULL,
    gender           VARCHAR(10)  NOT NULL,
    address          VARCHAR(300) NOT NULL,
    id_issue_date    DATE,
    phone            VARCHAR(20),
    email            VARCHAR(100),
    status           VARCHAR(20)  NOT NULL,
    -- Bản băm SHA-256 (hex) của mã tra cứu khách giữ trên máy; không lưu mã gốc.
    access_code_hash VARCHAR(64)  NOT NULL,
    reject_reason    VARCHAR(300),
    -- Mã nhân viên (claim sub trong token của auth-service) đã duyệt hoặc từ chối.
    reviewed_by      UUID,
    reviewed_at      TIMESTAMPTZ,
    customer_id      UUID REFERENCES customer (id),
    version          BIGINT       NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_application_national_id CHECK (national_id ~ '^[0-9]{12}$'),
    CONSTRAINT ck_application_old_id      CHECK (old_id_number IS NULL OR old_id_number ~ '^[0-9]{9}$'),
    CONSTRAINT ck_application_gender      CHECK (gender IN ('MALE', 'FEMALE')),
    CONSTRAINT ck_application_status      CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    -- Chờ duyệt thì chưa có người duyệt; đã duyệt hoặc từ chối thì phải có.
    CONSTRAINT ck_application_reviewed    CHECK ((status = 'PENDING_REVIEW') = (reviewed_at IS NULL)
                                                 AND (reviewed_at IS NULL) = (reviewed_by IS NULL)),
    CONSTRAINT ck_application_rejected    CHECK ((status = 'REJECTED') = (reject_reason IS NOT NULL)),
    CONSTRAINT ck_application_approved    CHECK ((status = 'APPROVED') = (customer_id IS NOT NULL)),
    -- Một khách hàng chỉ sinh ra từ đúng một hồ sơ.
    CONSTRAINT uq_application_customer    UNIQUE (customer_id)
);

-- Nhân viên xem danh sách hồ sơ theo trạng thái, cũ nhất trước.
CREATE INDEX ix_application_status_created ON onboarding_application (status, created_at);
CREATE INDEX ix_application_national_id ON onboarding_application (national_id);

-- Ảnh kèm hồ sơ: mặt trước, mặt sau CCCD và ảnh chân dung. Dữ liệu nhạy cảm: chỉ nhân viên xem, không ghi log.
-- Bản demo lưu thẳng trong database; sau này chuyển sang document-service.
CREATE TABLE application_document (
    id             UUID        PRIMARY KEY,
    application_id UUID        NOT NULL REFERENCES onboarding_application (id),
    type           VARCHAR(20) NOT NULL,
    content_type   VARCHAR(20) NOT NULL,
    content        BYTEA       NOT NULL,
    version        BIGINT      NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_document_type         CHECK (type IN ('ID_FRONT', 'ID_BACK', 'PORTRAIT')),
    CONSTRAINT ck_document_content_type CHECK (content_type IN ('image/jpeg', 'image/png')),
    CONSTRAINT uq_document_type         UNIQUE (application_id, type)
);

-- Sự đồng ý xử lý dữ liệu cá nhân và ảnh khuôn mặt (Nghị định 13/2023), ghi nhận khi khách gửi hồ sơ.
CREATE TABLE biometric_consent (
    id              UUID        PRIMARY KEY,
    application_id  UUID        NOT NULL REFERENCES onboarding_application (id),
    consent_version VARCHAR(20) NOT NULL,
    granted_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    version         BIGINT      NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_biometric_consent_application ON biometric_consent (application_id);
