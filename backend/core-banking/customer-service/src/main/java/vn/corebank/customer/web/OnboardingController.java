package vn.corebank.customer.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.corebank.customer.application.OnboardingService;
import vn.corebank.customer.web.dto.ApplicationStatusResponse;
import vn.corebank.customer.web.dto.SubmitApplicationRequest;
import vn.corebank.customer.web.dto.SubmitApplicationResponse;

import java.util.UUID;

/**
 * API đăng ký cho khách (công khai vì khách chưa có tài khoản đăng nhập). Chống lạm dụng (giới hạn tần suất gửi hồ sơ)
 * chưa làm.
 */
@RestController
@RequestMapping("/api/onboarding/applications")
@RequiredArgsConstructor
class OnboardingController {

    /** Header chứa mã tra cứu; không đặt trong URL để mã không nằm trong log truy cập. */
    static final String ACCESS_CODE_HEADER = "X-Access-Code";

    private final OnboardingService onboardingService;

    /** POST /api/onboarding/applications: gửi hồ sơ, trả 201 kèm mã tra cứu (chỉ trả lần này). */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    SubmitApplicationResponse submit(@Valid @RequestBody SubmitApplicationRequest request) {
        return SubmitApplicationResponse.from(onboardingService.submit(request.toCommand()));
    }

    /** GET /api/onboarding/applications/{id}: xem trạng thái, phải có header X-Access-Code. Sai mã trả 404. */
    @GetMapping("/{applicationId}")
    ApplicationStatusResponse status(@PathVariable UUID applicationId,
                                     @RequestHeader(ACCESS_CODE_HEADER) String accessCode) {
        return ApplicationStatusResponse.from(onboardingService.findForApplicant(applicationId, accessCode));
    }
}
