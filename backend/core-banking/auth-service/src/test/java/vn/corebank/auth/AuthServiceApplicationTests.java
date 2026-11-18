package vn.corebank.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

// Máy chưa có Docker thì JUnit bỏ qua (skip) test này thay vì báo lỗi.
@Testcontainers(disabledWithoutDocker = true)
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class AuthServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}
