package vn.corebank.auth;

import org.springframework.boot.SpringApplication;

// Chạy auth-service với một PostgreSQL tạm (Testcontainers), không cần PostgreSQL cài trên máy. Cần Docker.
public class TestAuthServiceApplication {

    public static void main(String[] args) {
        SpringApplication.from(AuthServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
