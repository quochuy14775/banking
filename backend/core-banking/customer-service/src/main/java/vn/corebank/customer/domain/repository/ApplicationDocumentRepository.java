package vn.corebank.customer.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.customer.domain.model.ApplicationDocument;
import vn.corebank.customer.domain.model.DocumentType;

import java.util.Optional;
import java.util.UUID;

/** Truy cập bảng {@code application_document}. */
public interface ApplicationDocumentRepository extends JpaRepository<ApplicationDocument, UUID> {

    Optional<ApplicationDocument> findByApplicationIdAndType(UUID applicationId, DocumentType type);
}
