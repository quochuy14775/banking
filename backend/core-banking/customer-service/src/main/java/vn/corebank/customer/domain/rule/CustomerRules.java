package vn.corebank.customer.domain.rule;

import vn.corebank.common.support.Validation;
import vn.corebank.customer.domain.model.Customer;
import vn.corebank.customer.domain.model.CustomerStatus;
import vn.corebank.customer.domain.model.Gender;
import vn.corebank.customer.domain.model.IdentityData;

import java.time.LocalDate;
import java.time.Period;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/** Hàm nghiệp vụ của khách hàng: kiểm tra thông tin giấy tờ, tạo khách hàng khi hồ sơ đăng ký được duyệt. */
public final class CustomerRules {

    /** Số CCCD gồm đúng 12 chữ số. */
    private static final Pattern NATIONAL_ID = Pattern.compile("[0-9]{12}");
    /** Số CMND cũ gồm đúng 9 chữ số. */
    private static final Pattern OLD_ID = Pattern.compile("[0-9]{9}");
    private static final Pattern PHONE = Pattern.compile("\\+?[0-9]{9,15}");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");
    /** Chỉ khách đủ tuổi này mới được đăng ký. */
    private static final int MIN_AGE = 15;
    private static final int MAX_NAME_LENGTH = 150;
    private static final int MAX_ADDRESS_LENGTH = 300;

    private CustomerRules() {
    }

    /**
     * Kiểm tra thông tin giấy tờ và trả về bản đã chuẩn hóa (bỏ khoảng trắng thừa, chuỗi rỗng thành null).
     * Dữ liệu sai thì ném {@link IllegalArgumentException} (HTTP 400).
     */
    public static IdentityData validated(IdentityData data, LocalDate today) {
        String nationalId = requireMatch(trimToNull(data.nationalId()), NATIONAL_ID, "Số CCCD");
        String oldIdNumber = trimToNull(data.oldIdNumber());
        if (oldIdNumber != null) {
            requireMatch(oldIdNumber, OLD_ID, "Số CMND cũ");
        }
        String fullName = collapseSpaces(Validation.requireText(trimToNull(data.fullName()), "Họ tên"));
        if (fullName.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("Họ tên tối đa " + MAX_NAME_LENGTH + " ký tự");
        }
        LocalDate dateOfBirth = Objects.requireNonNull(data.dateOfBirth(), "Ngày sinh không được để trống");
        if (dateOfBirth.isAfter(today) || Period.between(dateOfBirth, today).getYears() < MIN_AGE) {
            throw new IllegalArgumentException("Khách hàng phải đủ " + MIN_AGE + " tuổi");
        }
        Gender gender = Objects.requireNonNull(data.gender(), "Giới tính không được để trống");
//        if (!matchesIdNumber(nationalId, dateOfBirth, gender)) {
//            throw new IllegalArgumentException("Số CCCD không khớp với ngày sinh và giới tính");
//        }
        String address = collapseSpaces(Validation.requireText(trimToNull(data.address()), "Nơi thường trú"));
        if (address.length() > MAX_ADDRESS_LENGTH) {
            throw new IllegalArgumentException("Nơi thường trú tối đa " + MAX_ADDRESS_LENGTH + " ký tự");
        }
        LocalDate idIssueDate = data.idIssueDate();
        if (idIssueDate != null && (idIssueDate.isAfter(today) || idIssueDate.isBefore(dateOfBirth))) {
            throw new IllegalArgumentException("Ngày cấp CCCD không hợp lệ");
        }
        String phone = trimToNull(data.phone());
        if (phone != null) {
            requireMatch(phone, PHONE, "Số điện thoại");
        }
        String email = trimToNull(data.email());
        if (email != null) {
            requireMatch(email, EMAIL, "Email");
        }
        return new IdentityData(nationalId, oldIdNumber, fullName, dateOfBirth, gender, address, idIssueDate,
                phone, email);
    }

    /** Tạo khách hàng khi nhân viên duyệt hồ sơ đăng ký: khách hoạt động ngay. */
    public static Customer register(String cifNumber, IdentityData data, LocalDate today) {
        IdentityData identity = validated(data, today);
        Customer customer = new Customer(UUID.randomUUID());
        customer.setCifNumber(Validation.requireText(cifNumber, "cifNumber"));
        customer.setFullName(identity.fullName());
        customer.setDateOfBirth(identity.dateOfBirth());
        customer.setGender(identity.gender());
        customer.setNationalId(identity.nationalId());
        customer.setOldIdNumber(identity.oldIdNumber());
        customer.setAddress(identity.address());
        customer.setIdIssueDate(identity.idIssueDate());
        customer.setPhone(identity.phone());
        customer.setEmail(identity.email());
        customer.setStatus(CustomerStatus.ACTIVE);
        return customer;
    }

    /** Chặn khách hàng, ví dụ khi nghi gian lận. */
    public static void block(Customer customer) {
        customer.setStatus(CustomerStatus.BLOCKED);
    }

    /**
     * Kiểm tra chéo số CCCD với ngày sinh và giới tính: số thứ 4 mã hóa giới tính và thế kỷ sinh
     * (0/1 = nam/nữ sinh 1900–1999, 2/3 = 2000–2099...), số 5–6 là hai số cuối năm sinh.
     */
    static boolean matchesIdNumber(String nationalId, LocalDate dateOfBirth, Gender gender) {
        int code = nationalId.charAt(3) - '0';
        int year = 1900 + (code / 2) * 100 + Integer.parseInt(nationalId.substring(4, 6));
        Gender expected = code % 2 == 0 ? Gender.MALE : Gender.FEMALE;
        return year == dateOfBirth.getYear() && gender == expected;
    }

    /** Giống Validation.requireMatch nhưng không đưa giá trị khách nhập vào câu báo lỗi (tránh lộ vào log). */
    private static String requireMatch(String value, Pattern pattern, String field) {
        if (value == null || !pattern.matcher(value).matches()) {
            throw new IllegalArgumentException(field + " không hợp lệ");
        }
        return value;
    }

    private static String collapseSpaces(String value) {
        return value.replaceAll("\\s+", " ");
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
