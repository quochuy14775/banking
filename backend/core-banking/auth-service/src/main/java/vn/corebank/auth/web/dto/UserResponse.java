package vn.corebank.auth.web.dto;

import vn.corebank.auth.domain.model.UserAccount;

import java.util.List;
import java.util.UUID;

/**
 * Thông tin tài khoản đăng nhập trả về cho app. Không bao giờ chứa mật khẩu hay bản băm.
 *
 * @param customerId khách hàng (CIF) của tài khoản; null với tài khoản nhân viên
 */
public record UserResponse(UUID id, String username, List<String> roles, UUID customerId) {

    public static UserResponse from(UserAccount user) {
        return new UserResponse(user.getId(), user.getUsername(), List.of(user.getRole().name()), user.getCustomerId());
    }
}
