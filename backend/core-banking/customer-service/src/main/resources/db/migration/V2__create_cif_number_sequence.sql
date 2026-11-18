-- Số CIF: 10 chữ số lấy từ sequence. Sequence của PostgreSQL không bao giờ cấp trùng, kể cả khi nhiều khách đăng ký cùng lúc.
-- NO CYCLE: hết số thì báo lỗi thay vì quay vòng cấp lại số cũ.
CREATE SEQUENCE cif_number_seq
    START WITH 1
    MINVALUE 1
    MAXVALUE 9999999999
    NO CYCLE;
