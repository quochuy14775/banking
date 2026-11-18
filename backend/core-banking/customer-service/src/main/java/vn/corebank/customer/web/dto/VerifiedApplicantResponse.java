package vn.corebank.customer.web.dto;

import vn.corebank.customer.domain.model.Customer;

import java.util.UUID;

/** Khách hàng của hồ sơ đã duyệt, trả cho auth-service. */
public record VerifiedApplicantResponse(UUID customerId, String cifNumber) {

    public static VerifiedApplicantResponse from(Customer customer) {
        return new VerifiedApplicantResponse(customer.getId(), customer.getCifNumber());
    }
}
