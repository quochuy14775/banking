package vn.corebank.account.infrastructure;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import vn.corebank.account.config.AccountProperties;
import vn.corebank.account.domain.port.AccountNumberGenerator;
import vn.corebank.account.domain.support.LuhnCheckDigit;

/**
 * Sinh số tài khoản từ sequence {@code account_number_seq} (migration V2).
 * Cấu trúc 12 chữ số: đầu số (4) + số thứ tự từ sequence (7) + chữ số kiểm tra Luhn (1).
 * Ví dụ đầu số 1903, số thứ tự 1 → {@code 19030000001} + chữ số kiểm tra.
 */
@Component
class SequenceAccountNumberGenerator implements AccountNumberGenerator {

    private final JdbcClient jdbcClient;
    private final String prefix;

    SequenceAccountNumberGenerator(JdbcClient jdbcClient, AccountProperties properties) {
        this.jdbcClient = jdbcClient;
        this.prefix = properties.numberPrefix();
    }

    @Override
    public String next() {
        long sequence = jdbcClient.sql("SELECT nextval('account_number_seq')")
                .query(Long.class)
                .single();
        String body = prefix + String.format("%07d", sequence);
        return body + LuhnCheckDigit.compute(body);
    }
}
