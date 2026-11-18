package vn.corebank.customer.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.customer.domain.model.Customer;

import java.util.UUID;

/** Truy cập bảng {@code customer}. */
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    boolean existsByNationalId(String nationalId);
}
