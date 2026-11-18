package vn.corebank.common.web;

import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Xử lý lỗi chung cho mọi service: đổi mọi lỗi thành JSON theo chuẩn ProblemDetail (RFC 9457),
 * thêm trường {@code code} để app xử lý theo mã. Được bật tự động qua
 * {@link vn.corebank.common.autoconfigure.CommonAutoConfiguration}, service không cần khai báo lại.
 *
 * <p>Lớp cha {@link ResponseEntityExceptionHandler} đã lo các lỗi có sẵn của Spring (sai kiểu tham số, 401...).
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    /** Lỗi nghiệp vụ: mã HTTP lấy theo {@link ErrorType} của lỗi. */
    @ExceptionHandler(DomainException.class)
    ProblemDetail handleDomain(DomainException ex) {
        return problem(statusOf(ex.getType()), ex.getMessage(), ex.getCode());
    }

    /** Hai request sửa cùng một bản ghi cùng lúc (@Version): request sau bị từ chối. */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    ProblemDetail handleConcurrentUpdate(OptimisticLockingFailureException ex) {
        return problem(HttpStatus.CONFLICT, "Dữ liệu vừa được thay đổi bởi thao tác khác, vui lòng thử lại.",
                "CONCURRENT_UPDATE");
    }

    /** Dữ liệu sai bị domain từ chối (ví dụ định dạng không hợp lệ). */
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        return problem(HttpStatus.BAD_REQUEST, ex.getMessage(), "INVALID_REQUEST");
    }

    /** Request body sai: trả về danh sách trường lỗi để app hiện ngay dưới ô nhập. */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ.", "VALIDATION_FAILED");
        body.setProperty("errors", errors);
        return handleExceptionInternal(ex, body, headers, HttpStatus.BAD_REQUEST, request);
    }

    private static HttpStatus statusOf(ErrorType type) {
        return switch (type) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case UNAUTHORIZED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT -> HttpStatus.CONFLICT;
        };
    }

    private static ProblemDetail problem(HttpStatus status, String detail, String code) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("code", code);
        return problem;
    }
}
