package vn.corebank.customer.domain.rule;

import org.junit.jupiter.api.Test;
import vn.corebank.customer.TestData;
import vn.corebank.customer.domain.model.Customer;
import vn.corebank.customer.domain.model.CustomerStatus;
import vn.corebank.customer.domain.model.Gender;
import vn.corebank.customer.domain.model.IdentityData;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static vn.corebank.customer.TestData.TODAY;

class CustomerRulesTest {

    @Test
    void validatedNormalizesText() {
        IdentityData raw = TestData.identity();
        IdentityData data = new IdentityData(" " + raw.nationalId() + " ", "  ", "  Nguyễn   Văn  An ",
                raw.dateOfBirth(), raw.gender(), raw.address(), raw.idIssueDate(), " ", "");

        IdentityData result = CustomerRules.validated(data, TODAY);

        assertThat(result.nationalId()).isEqualTo("001095012345");
        assertThat(result.oldIdNumber()).isNull();
        assertThat(result.fullName()).isEqualTo("Nguyễn Văn An");
        assertThat(result.phone()).isNull();
        assertThat(result.email()).isNull();
    }

    @Test
    void rejectsUnder18() {
        // Nữ sinh 2010 (số thứ 4 là 3: nữ, 2000–2099): 16 tuổi.
        IdentityData minor = new IdentityData("001310012345", null, "Trần Thị Bình", LocalDate.of(2010, 1, 1),
                Gender.FEMALE, "Hà Nội", null, null, null);

        assertThatIllegalArgumentException().isThrownBy(() -> CustomerRules.validated(minor, TODAY))
                .withMessageContaining("18 tuổi");
    }

    @Test
    void turns18OnBirthday() {
        // Nam sinh 2008: số thứ 4 là 2 (nam, 2000–2099).
        IdentityData adult = new IdentityData("001208012345", null, "Lê Minh", LocalDate.of(2008, 11, 17),
                Gender.MALE, "Hà Nội", null, null, null);

        assertThat(CustomerRules.validated(adult, TODAY).nationalId()).isEqualTo("001208012345");
    }

    @Test
    void rejectsNationalIdNotMatchingBirthYearOrGender() {
        IdentityData raw = TestData.identity();
        IdentityData wrongGender = new IdentityData(raw.nationalId(), null, raw.fullName(), raw.dateOfBirth(),
                Gender.FEMALE, raw.address(), null, null, null);
        IdentityData wrongYear = new IdentityData(raw.nationalId(), null, raw.fullName(), LocalDate.of(1996, 5, 20),
                Gender.MALE, raw.address(), null, null, null);

        assertThatIllegalArgumentException().isThrownBy(() -> CustomerRules.validated(wrongGender, TODAY));
        assertThatIllegalArgumentException().isThrownBy(() -> CustomerRules.validated(wrongYear, TODAY));
    }

    @Test
    void rejectsIssueDateInFutureOrBeforeBirth() {
        IdentityData raw = TestData.identity();
        IdentityData future = new IdentityData(raw.nationalId(), null, raw.fullName(), raw.dateOfBirth(), raw.gender(),
                raw.address(), TODAY.plusDays(1), null, null);
        IdentityData beforeBirth = new IdentityData(raw.nationalId(), null, raw.fullName(), raw.dateOfBirth(),
                raw.gender(), raw.address(), LocalDate.of(1990, 1, 1), null, null);

        assertThatIllegalArgumentException().isThrownBy(() -> CustomerRules.validated(future, TODAY));
        assertThatIllegalArgumentException().isThrownBy(() -> CustomerRules.validated(beforeBirth, TODAY));
    }

    /** Câu báo lỗi không chứa giá trị khách nhập, để số CCCD hay SĐT không lọt vào log. */
    @Test
    void errorMessageDoesNotEchoInput() {
        IdentityData raw = TestData.identity();
        IdentityData badPhone = new IdentityData(raw.nationalId(), null, raw.fullName(), raw.dateOfBirth(),
                raw.gender(), raw.address(), null, "09xx-secret", null);

        assertThatIllegalArgumentException().isThrownBy(() -> CustomerRules.validated(badPhone, TODAY))
                .withMessageNotContaining("09xx-secret");
    }

    @Test
    void registerCreatesActiveCustomer() {
        Customer customer = CustomerRules.register("0000000001", TestData.identity(), TODAY);

        assertThat(customer.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
        assertThat(customer.getCifNumber()).isEqualTo("0000000001");
        assertThat(customer.getNationalId()).isEqualTo("001095012345");
        assertThat(customer.getId()).isNotNull();
    }
}
