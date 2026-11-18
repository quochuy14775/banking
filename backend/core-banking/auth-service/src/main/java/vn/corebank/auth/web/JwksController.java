package vn.corebank.auth.web;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * GET /.well-known/jwks.json: khóa CÔNG KHAI dùng để kiểm tra chữ ký token (chuẩn JWK Set).
 * Các service khác (account, ledger...) cấu hình địa chỉ này để tự kiểm tra token. Khóa bí mật không bao giờ được trả ra.
 */
@RestController
@RequiredArgsConstructor
class JwksController {

    private final RSAKey jwtSigningKey;

    @GetMapping("/.well-known/jwks.json")
    Map<String, Object> jwks() {
        return new JWKSet(jwtSigningKey.toPublicJWK()).toJSONObject();
    }
}
