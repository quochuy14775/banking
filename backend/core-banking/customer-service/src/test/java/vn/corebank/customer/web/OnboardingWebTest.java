package vn.corebank.customer.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.corebank.common.autoconfigure.CommonAutoConfiguration;
import vn.corebank.customer.application.ApplicationReviewService;
import vn.corebank.customer.application.OnboardingService;
import vn.corebank.customer.config.CustomerProperties;
import vn.corebank.customer.config.SecurityConfig;
import vn.corebank.customer.domain.model.ApplicationStatus;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Chỉ dựng tầng web (controller, bảo mật, xử lý lỗi, JSON); tầng application được thay bằng mock nên không cần database.
@WebMvcTest(controllers = {OnboardingController.class, ApplicationReviewController.class,
        InternalOnboardingController.class},
        properties = "corebank.customer.internal-token=test-internal-token")
@Import(SecurityConfig.class)
@EnableConfigurationProperties(CustomerProperties.class)
@ImportAutoConfiguration(CommonAutoConfiguration.class)
class OnboardingWebTest {

    private static final String ADMIN_LIST = "/api/admin/onboarding/applications";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OnboardingService onboardingService;

    @MockitoBean
    private ApplicationReviewService reviewService;

    // SecurityConfig cần bộ kiểm tra token; các test dùng token giả của spring-security-test nên không gọi tới bộ này.
    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Test
    void adminApiNeedsToken() throws Exception {
        mockMvc.perform(get(ADMIN_LIST)).andExpect(status().isUnauthorized());
    }

    @Test
    void customerTokenCannotReviewApplications() throws Exception {
        mockMvc.perform(get(ADMIN_LIST).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(reviewService);
    }

    @Test
    void adminCanListPendingApplications() throws Exception {
        given(reviewService.list(eq(ApplicationStatus.PENDING_REVIEW), anyInt(), anyInt())).willReturn(Page.empty());

        mockMvc.perform(get(ADMIN_LIST).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void internalApiRejectsWrongToken() throws Exception {
        mockMvc.perform(post("/internal/onboarding/applications/" + UUID.randomUUID() + "/verify-applicant")
                        .header("X-Internal-Token", "wrong")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"abc\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CUSTOMER_INTERNAL_FORBIDDEN"));
        verifyNoInteractions(onboardingService);
    }

    @Test
    void submitWithoutConsentOrImagesIsRejected() throws Exception {
        mockMvc.perform(post("/api/onboarding/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nationalId": "001095012345", "fullName": "Nguyễn Văn An",
                                 "dateOfBirth": "1995-05-20", "gender": "MALE", "address": "Hà Nội",
                                 "consentVersion": "2026-01", "consent": false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.consent").exists())
                .andExpect(jsonPath("$.errors.portraitImage").exists());
        verifyNoInteractions(onboardingService);
    }

    @Test
    void statusNeedsAccessCodeHeader() throws Exception {
        mockMvc.perform(get("/api/onboarding/applications/" + UUID.randomUUID()))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(onboardingService);
    }
}
