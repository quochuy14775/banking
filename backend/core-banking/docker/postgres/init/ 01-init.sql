-- Chỉ chạy một lần, khi volume dữ liệu còn trống. Mật khẩu chỉ dùng trên máy local.
CREATE USER account_svc WITH PASSWORD 'account_svc';
CREATE SCHEMA account AUTHORIZATION account_svc;

CREATE USER ledger_svc WITH PASSWORD 'ledger_svc';
CREATE SCHEMA ledger AUTHORIZATION ledger_svc;

CREATE USER auth_svc WITH PASSWORD 'auth_svc';
CREATE SCHEMA auth AUTHORIZATION auth_svc;

CREATE USER payment_svc WITH PASSWORD 'payment_svc';
CREATE SCHEMA payment AUTHORIZATION payment_svc;

CREATE USER notification_svc WITH PASSWORD 'notification_svc';
CREATE SCHEMA notification AUTHORIZATION notification_svc;

CREATE USER keycloak WITH PASSWORD 'keycloak';
CREATE DATABASE keycloak OWNER keycloak;