package vn.corebank.auth.domain.port;

import vn.corebank.auth.domain.model.AccessToken;
import vn.corebank.auth.domain.model.UserAccount;

import java.time.Instant;

/**
 * Cấp access token cho một người dùng.
 * Là interface để tầng application không phụ thuộc vào định dạng token (JWT, thư viện ký...),
 * và để test thay được bằng bản giả. Bản cài đặt thật nằm ở tầng infrastructure.
 */
public interface AccessTokenIssuer {

    AccessToken issue(UserAccount user, Instant issuedAt);
}
