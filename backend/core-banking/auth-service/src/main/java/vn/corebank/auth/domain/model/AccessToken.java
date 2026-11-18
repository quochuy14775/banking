package vn.corebank.auth.domain.model;

import java.time.Instant;

/** Access token đã ký và thời điểm hết hạn của nó. Không lưu vào database. */
public record AccessToken(String value, Instant expiresAt) {
}
