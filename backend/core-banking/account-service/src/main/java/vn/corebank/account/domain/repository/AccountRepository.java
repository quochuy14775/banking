package vn.corebank.account.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.account.domain.model.Account;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Truy cập bảng {@code account}. Spring Data tự sinh câu SQL từ tên hàm.
 */
public interface AccountRepository extends JpaRepository<Account, UUID> {

    /** Tài khoản của một người dùng, tài khoản mở trước đứng trước (đúng thứ tự hiển thị trên app). */
    List<Account> findByOwnerIdOrderByOpenedAtAsc(String ownerId);

    /**
     * Chỉ trả về tài khoản khi nó thuộc đúng người dùng. Người khác hỏi thì nhận về rỗng,
     * nên không đoán được tài khoản có tồn tại hay không.
     */
    Optional<Account> findByIdAndOwnerId(UUID id, String ownerId);

    /** Dùng khi sinh số tài khoản mới, để không cấp trùng số. */
    boolean existsByAccountNumber(String accountNumber);
}
