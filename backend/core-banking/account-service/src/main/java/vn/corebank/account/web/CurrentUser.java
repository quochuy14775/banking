package vn.corebank.account.web;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Mã người dùng đang gọi API.
 *
 * <p>TẠM THỜI đọc từ header {@value #HEADER} vì chưa có Keycloak, nên ai cũng giả mạo được người khác:
 * chỉ dùng trên máy local. Phần 3 sẽ đổi sang đọc claim {@code sub} trong token; controller và service
 * không phải sửa gì vì chỉ gọi {@link #id()}.
 */
@Component
@RequiredArgsConstructor
public class CurrentUser {

    public static final String HEADER = "X-User-Id";

    // Spring tiêm vào một proxy trỏ tới request đang xử lý, nên dùng được trong bean singleton.
    private final HttpServletRequest request;

    public String id() {
        String userId = request.getHeader(HEADER);
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Thiếu thông tin người dùng (header " + HEADER + ").");
        }
        return userId;
    }
}
