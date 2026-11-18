-- Phần thân 7 chữ số của số tài khoản (đầu số 4 chữ số + thân 7 chữ số + 1 chữ số kiểm tra = 12 chữ số).
-- Sequence của PostgreSQL không bao giờ cấp trùng, kể cả khi nhiều request mở tài khoản cùng lúc.
-- NO CYCLE: hết số thì báo lỗi thay vì quay vòng cấp lại số cũ.
CREATE SEQUENCE account_number_seq
    START WITH 1
    MINVALUE 1
    MAXVALUE 9999999
    NO CYCLE;
