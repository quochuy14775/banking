package vn.corebank.customer;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaConstructorCall;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import jakarta.persistence.Entity;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Kiểm tra quy tắc kiến trúc trên code đã biên dịch: vi phạm thì test (và build) thất bại.
 * Nội dung class này GIỐNG HỆT ở mọi service, chỉ khác hằng số {@link #BASE}.
 */
class ArchitectureTest {

    private static final String BASE = "vn.corebank.customer";

    private static final JavaClasses CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages(BASE);

    @Test
    void domainDoesNotDependOnOuterLayers() {
        noClasses().that().resideInAPackage(BASE + ".domain..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        BASE + ".application..", BASE + ".web..", BASE + ".infrastructure..", BASE + ".config..")
                .check(CLASSES);
    }

    @Test
    void applicationDoesNotDependOnWebOrInfrastructure() {
        noClasses().that().resideInAPackage(BASE + ".application..")
                .should().dependOnClassesThat().resideInAnyPackage(BASE + ".web..", BASE + ".infrastructure..")
                .check(CLASSES);
    }

    /** Chỉ domain.rule được gọi setter của entity: dữ liệu luôn thay đổi theo đúng quy tắc nghiệp vụ. */
    @Test
    void onlyRulesChangeEntities() {
        noClasses().that().resideOutsideOfPackages(BASE + ".domain.rule..", BASE + ".domain.model..")
                .should().callMethodWhere(DescribedPredicate.describe("setter của entity trong domain.model",
                        (JavaMethodCall call) -> call.getTargetOwner().getPackageName().startsWith(BASE + ".domain.model")
                                && call.getName().startsWith("set")))
                .check(CLASSES);
    }

    /** Chỉ domain.rule được tạo entity mới: entity luôn được tạo ở trạng thái hợp lệ. */
    @Test
    void onlyRulesCreateEntities() {
        noClasses().that().resideOutsideOfPackages(BASE + ".domain.rule..", BASE + ".domain.model..")
                .should().callConstructorWhere(DescribedPredicate.describe("constructor của entity",
                        (JavaConstructorCall call) -> call.getTargetOwner().isAnnotatedWith(Entity.class)))
                .check(CLASSES);
    }
}
