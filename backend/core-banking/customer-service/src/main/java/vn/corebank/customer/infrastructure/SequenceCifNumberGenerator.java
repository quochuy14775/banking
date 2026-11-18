package vn.corebank.customer.infrastructure;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import vn.corebank.customer.domain.port.CifNumberGenerator;

/** Sinh số CIF từ sequence {@code cif_number_seq} (migration V2): 10 chữ số, đệm số 0 ở đầu. */
@Component
class SequenceCifNumberGenerator implements CifNumberGenerator {

    private final JdbcClient jdbcClient;

    SequenceCifNumberGenerator(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public String next() {
        long sequence = jdbcClient.sql("SELECT nextval('cif_number_seq')")
                .query(Long.class)
                .single();
        return String.format("%010d", sequence);
    }
}
