package vn.corebank.account;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

// public để test ở các package con (ví dụ domain) cũng dùng được.
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgresContainer() {
        // Cùng bản PostgreSQL với máy dev; currentSchema để test dùng schema account như khi chạy thật.
        return new PostgreSQLContainer(DockerImageName.parse("postgres:18"))
                .withUrlParam("currentSchema", "account");
    }

}
