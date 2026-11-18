package vn.corebank.auth.infrastructure;

import com.nimbusds.jose.jwk.RSAKey;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;
import vn.corebank.auth.config.AuthProperties;
import vn.corebank.auth.domain.model.AccessToken;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.port.AccessTokenIssuer;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Cấp access token dạng JWT, ký bằng RS256.
 *
 * <p>Nội dung token: {@code iss} (nơi cấp), {@code sub} (mã người dùng, các service dùng làm owner),
 * {@code preferred_username}, {@code roles}, {@code customer_id} (khách hàng ở customer-service, chỉ tài khoản khách có),
 * {@code iat}/{@code exp} (thời điểm cấp và hết hạn), {@code jti} (mã token).
 * Token KHÔNG mã hóa nội dung (ai có token cũng đọc được), nên không đưa dữ liệu nhạy cảm vào.
 */
@Component
@RequiredArgsConstructor
class JwtAccessTokenIssuer implements AccessTokenIssuer {

    private final JwtEncoder jwtEncoder;
    private final RSAKey jwtSigningKey;
    private final AuthProperties properties;

    @Override
    public AccessToken issue(UserAccount user, Instant issuedAt) {
        Instant expiresAt = issuedAt.plus(properties.accessTokenTtl());
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .id(UUID.randomUUID().toString())
                .claim("preferred_username", user.getUsername())
                .claim("roles", List.of(user.getRole().name()));
        if (user.getCustomerId() != null) {
            claims.claim("customer_id", user.getCustomerId().toString());
        }
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(jwtSigningKey.getKeyID()).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
        return new AccessToken(token, expiresAt);
    }
}
