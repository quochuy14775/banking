package vn.corebank.customer.domain.model;

/** Loại ảnh kèm hồ sơ đăng ký; hồ sơ phải có đủ cả ba loại. */
public enum DocumentType {

    /** Mặt trước CCCD. */
    ID_FRONT,

    /** Mặt sau CCCD. */
    ID_BACK,

    /** Ảnh chân dung chụp lúc đăng ký, để nhân viên so với ảnh trên CCCD. */
    PORTRAIT
}
