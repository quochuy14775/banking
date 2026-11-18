package vn.corebank.customer.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.customer.domain.model.BiometricConsent;

import java.util.UUID;

/** Truy cập bảng {@code biometric_consent}. */
public interface BiometricConsentRepository extends JpaRepository<BiometricConsent, UUID> {
}
