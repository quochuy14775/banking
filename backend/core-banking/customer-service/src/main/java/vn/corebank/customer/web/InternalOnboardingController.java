package vn.corebank.customer.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.corebank.customer.application.OnboardingService;
import vn.corebank.customer.config.CustomerProperties;
import vn.corebank.customer.domain.exception.InternalAccessDeniedException;
import vn.corebank.customer.web.dto.VerifiedApplicantResponse;
import vn.corebank.customer.web.dto.VerifyApplicantRequest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/**
 * API nội bộ cho auth-service: kiểm tra hồ sơ đã được duyệt trước khi tạo tài khoản đăng nhập cho khách.
 * Không dùng token người dùng (khách chưa đăng nhập được) mà kiểm mã bí mật nội bộ dùng chung giữa hai service.
 * Ở môi trường thật nên thay bằng token máy-máy (client credentials) hoặc mTLS, và không mở /internal ra internet.
 */
@RestController
@RequestMapping("/internal/onboarding/applications")
@RequiredArgsConstructor
class InternalOnboardingController {

    static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    private final OnboardingService onboardingService;
    private final CustomerProperties properties;

    /** POST /internal/onboarding/applications/{id}/verify-applicant: 404 nếu sai mã, 409 nếu chưa duyệt. */
    @PostMapping("/{applicationId}/verify-applicant")
    VerifiedApplicantResponse verifyApplicant(@PathVariable UUID applicationId,
                                              @RequestHeader(value = INTERNAL_TOKEN_HEADER, required = false) String token,
                                              @Valid @RequestBody VerifyApplicantRequest request) {
        requireInternalToken(token);
        return VerifiedApplicantResponse.from(
                onboardingService.verifyApprovedApplicant(applicationId, request.accessCode()));
    }

    private void requireInternalToken(String token) {
        if (token == null || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),
                properties.internalToken().getBytes(StandardCharsets.UTF_8))) {
            throw new InternalAccessDeniedException();
        }
    }
}
