package vn.corebank.auth.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.auth.domain.model.UserAccount;

import java.util.Optional;
import java.util.UUID;

/** Truy cập bảng {@code user_account}. Tên đăng nhập truyền vào phải đã được chuẩn hóa (Usernames.normalize). */
public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {

    Optional<UserAccount> findByUsername(String username);

    boolean existsByUsername(String username);

    /** Khách hàng này đã có tài khoản đăng nhập chưa (mỗi khách tối đa một tài khoản). */
    boolean existsByCustomerId(UUID customerId);
}
