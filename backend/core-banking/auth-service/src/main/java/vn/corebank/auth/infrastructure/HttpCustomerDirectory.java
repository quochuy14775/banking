package vn.corebank.auth.infrastructure;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import vn.corebank.auth.config.CustomerServiceProperties;
import vn.corebank.auth.domain.exception.OnboardingNotApprovedException;
import vn.corebank.auth.domain.exception.OnboardingNotFoundException;
import vn.corebank.auth.domain.port.CustomerDirectory;

import java.net.http.HttpClient;
import java.util.Map;
import java.util.UUID;

/**
 * Gọi API nội bộ của customer-service ({@code POST /internal/onboarding/applications/{id}/verify-applicant}) kèm mã bí
 * mật nội bộ trong header {@code X-Internal-Token}.
 */
@Component
class HttpCustomerDirectory implements CustomerDirectory {

    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    private final RestClient restClient;

    HttpCustomerDirectory(CustomerServiceProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(properties.timeout()).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.timeout());
        this.restClient = RestClient.builder()
                .baseUrl(properties.url().toString())
                .requestFactory(requestFactory)
                .defaultHeader(INTERNAL_TOKEN_HEADER, properties.internalToken())
                .build();
    }

    @Override
    public UUID verifyApprovedApplicant(UUID applicationId, String accessCode) {
        try {
            VerifiedApplicant body = restClient.post()
                    .uri("/internal/onboarding/applications/{id}/verify-applicant", applicationId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("accessCode", accessCode))
                    .retrieve()
                    .body(VerifiedApplicant.class);
            if (body == null || body.customerId() == null) {
                throw new IllegalStateException("customer-service trả về thiếu customerId");
            }
            return body.customerId();
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().isSameCodeAs(HttpStatus.NOT_FOUND)) {
                throw new OnboardingNotFoundException();
            }
            if (e.getStatusCode().isSameCodeAs(HttpStatus.CONFLICT)) {
                throw new OnboardingNotApprovedException();
            }
            // 400 (mã sai định dạng) cũng coi như không tìm thấy, để không lộ chi tiết; lỗi khác là lỗi hệ thống.
            if (e.getStatusCode().isSameCodeAs(HttpStatus.BAD_REQUEST)) {
                throw new OnboardingNotFoundException();
            }
            throw new IllegalStateException("customer-service trả lỗi " + e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            throw new IllegalStateException("Không gọi được customer-service", e);
        }
    }

    /** Phần body cần dùng trong kết quả của customer-service. */
    record VerifiedApplicant(UUID customerId, String cifNumber) {
    }
}
