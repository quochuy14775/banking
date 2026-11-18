package vn.corebank.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.auth.domain.exception.InvalidRefreshTokenException;
import vn.corebank.auth.domain.model.RefreshToken;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.repository.RefreshTokenRepository;
import vn.corebank.auth.domain.repository.UserAccountRepository;
import vn.corebank.auth.domain.rule.RefreshTokenRules;
import vn.corebank.auth.domain.rule.UserAccountRules;
import vn.corebank.auth.domain.support.TokenSecrets;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/** Làm mới token và đăng xuất trong một phiên đăng nhập. */
@Service
@RequiredArgsConstructor
public class SessionService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserAccountRepository userAccountRepository;
    private final TokenPairIssuer tokenPairIssuer;
    private final Clock clock;

    /**
     * Đổi refresh token lấy cặp token mới; refresh token cũ hết hiệu lực ngay (xoay vòng).
     *
     * <p>Nếu một refresh token ĐÃ DÙNG lại bị gửi tới, nhiều khả năng nó đã bị đánh cắp: thu hồi cả phiên,
     * cả kẻ trộm lẫn chủ thật đều phải đăng nhập lại. noRollbackFor để việc thu hồi đó được lưu dù hàm ném lỗi.
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public AuthTokens refresh(String rawRefreshToken) {
        Instant now = clock.instant();
        RefreshToken current = refreshTokenRepository.findByTokenHash(TokenSecrets.sha256(rawRefreshToken))
                .orElseThrow(InvalidRefreshTokenException::new);
        if (RefreshTokenRules.isRevoked(current)) {
            revokeSession(current.getFamilyId(), now);
            throw new InvalidRefreshTokenException();
        }
        if (RefreshTokenRules.isExpired(current, now)) {
            throw new InvalidRefreshTokenException();
        }

        UserAccount user = userAccountRepository.findById(current.getUserId())
                .orElseThrow(InvalidRefreshTokenException::new);
        UserAccountRules.ensureCanLogIn(user, now);

        AuthTokens tokens = tokenPairIssuer.issue(user, current.getFamilyId(), now);
        RefreshTokenRules.replaceWith(current, tokens.refreshTokenId(), now);
        return tokens;
    }

    /** Đăng xuất: thu hồi cả phiên. Token không tồn tại cũng coi là đã đăng xuất, không báo lỗi. */
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenHash(TokenSecrets.sha256(rawRefreshToken))
                .ifPresent(token -> revokeSession(token.getFamilyId(), clock.instant()));
    }

    private void revokeSession(UUID familyId, Instant now) {
        refreshTokenRepository.findByFamilyIdAndRevokedAtIsNull(familyId)
                .forEach(token -> RefreshTokenRules.revoke(token, now));
    }
}
