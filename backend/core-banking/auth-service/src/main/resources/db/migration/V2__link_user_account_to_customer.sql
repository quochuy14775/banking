-- Gắn tài khoản đăng nhập của khách với khách hàng (CIF) ở customer-service. Tài khoản nhân viên (ADMIN) không có khách.
-- Không dùng khóa ngoại vì bảng customer thuộc service khác (schema khác).
ALTER TABLE user_account ADD COLUMN customer_id UUID;

-- Mỗi khách hàng có tối đa một tài khoản đăng nhập. PostgreSQL cho nhiều giá trị NULL trong UNIQUE nên tài khoản
-- nhân viên không bị ảnh hưởng.
ALTER TABLE user_account ADD CONSTRAINT uq_user_account_customer UNIQUE (customer_id);
