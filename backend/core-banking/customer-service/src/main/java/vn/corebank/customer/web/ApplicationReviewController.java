package vn.corebank.customer.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.corebank.customer.application.ApplicationReviewService;
import vn.corebank.customer.domain.model.ApplicationDocument;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.web.dto.ApplicationDetailResponse;
import vn.corebank.customer.web.dto.ApplicationSummaryResponse;
import vn.corebank.customer.web.dto.ApprovalResponse;
import vn.corebank.customer.web.dto.PageResponse;
import vn.corebank.customer.web.dto.RejectApplicationRequest;

import java.util.UUID;

/**
 * API duyệt hồ sơ đăng ký cho nhân viên (vai trò ADMIN, kiểm ở SecurityConfig). Người duyệt lấy từ claim {@code sub}
 * của access token. Bản demo dùng Postman/Swagger thay cho màn quản trị.
 */
@RestController
@RequestMapping("/api/admin/onboarding/applications")
@RequiredArgsConstructor
class ApplicationReviewController {

    private final ApplicationReviewService reviewService;

    /** GET /api/admin/onboarding/applications?status=PENDING_REVIEW&page=0&size=20: cũ nhất trước. */
    @GetMapping
    PageResponse<ApplicationSummaryResponse> list(
            @RequestParam(defaultValue = "PENDING_REVIEW") ApplicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return PageResponse.from(reviewService.list(status, page, size), ApplicationSummaryResponse::from);
    }

    @GetMapping("/{applicationId}")
    ApplicationDetailResponse get(@PathVariable UUID applicationId) {
        return ApplicationDetailResponse.from(reviewService.get(applicationId));
    }

    /** Ảnh của hồ sơ. Không cho trình duyệt hay proxy lưu lại (dữ liệu nhạy cảm). */
    @GetMapping("/{applicationId}/documents/{type}")
    ResponseEntity<byte[]> document(@PathVariable UUID applicationId, @PathVariable DocumentType type) {
        ApplicationDocument document = reviewService.document(applicationId, type);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .cacheControl(CacheControl.noStore())
                .body(document.getContent());
    }

    /** POST .../{id}/approve: tạo khách hàng; số CCCD đã có khách thì 409. */
    @PostMapping("/{applicationId}/approve")
    ApprovalResponse approve(@PathVariable UUID applicationId, @AuthenticationPrincipal Jwt jwt) {
        return ApprovalResponse.from(reviewService.approve(applicationId, reviewerOf(jwt)));
    }

    /** POST .../{id}/reject: bắt buộc có lý do. */
    @PostMapping("/{applicationId}/reject")
    ApplicationDetailResponse reject(@PathVariable UUID applicationId, @AuthenticationPrincipal Jwt jwt,
                                     @Valid @RequestBody RejectApplicationRequest request) {
        reviewService.reject(applicationId, reviewerOf(jwt), request.reason());
        return ApplicationDetailResponse.from(reviewService.get(applicationId));
    }

    private static UUID reviewerOf(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
