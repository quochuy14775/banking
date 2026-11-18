// Gọi API của backend và đổi lỗi ProblemDetail (RFC 9457) mà mọi service trả về thành kết quả có kiểu.
// Không ném lỗi: mọi trường hợp, kể cả mất mạng hay quá thời gian, đều trả về ApiResult để service ở app xử lý.

const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiProblem {
  /** Mã HTTP; 0 nếu không gọi được máy chủ (mất mạng, sai địa chỉ, quá thời gian, bị chặn CORS). */
  status: number;
  /** Mã lỗi backend trả về trong trường "code", ví dụ AUTH_USERNAME_TAKEN. */
  code?: string;
  /** Câu thông báo backend trả về trong trường "detail". */
  message?: string;
  /** Lỗi theo từng trường khi backend trả VALIDATION_FAILED (trường "errors"). */
  fieldErrors?: Record<string, string>;
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; problem: ApiProblem };

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Access token; có thì gửi kèm header Authorization: Bearer ... */
  accessToken?: string;
  /** Header riêng của từng API, ví dụ mã tra cứu hồ sơ đăng ký. */
  headers?: Record<string, string>;
  timeoutMs?: number;
  /**
   * false: log khi chạy dev chỉ in method, URL và mã trạng thái, không in nội dung trả về. Dùng cho API trả dữ liệu
   * cá nhân, ví dụ hồ sơ đăng ký (số CCCD, địa chỉ, số điện thoại) ở màn quản trị.
   */
  logResponse?: boolean;
}

/** Tùy chọn khi tải dữ liệu nhị phân (vd ảnh hồ sơ) bằng apiRequestBlob. */
export type ApiBlobRequestOptions = Pick<ApiRequestOptions, 'accessToken' | 'headers' | 'timeoutMs'>;

/** Dữ liệu nhị phân tải về, kèm loại nội dung (header Content-Type) máy chủ trả. */
export interface ApiBlob {
  blob: Blob;
  contentType: string;
}

export async function apiRequest<T>(baseUrl: string, path: string, options: ApiRequestOptions = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  const method = options.method ?? 'GET';
  const url = `${baseUrl}${path}`;
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const payload = await readJson(response);
    logRequest(method, url, startedAt, response.status, options.logResponse === false ? undefined : payload);
    if (response.ok) return { ok: true, status: response.status, data: payload as T };
    return { ok: false, problem: toProblem(response.status, payload) };
  } catch (error) {
    logRequest(method, url, startedAt, 0, error instanceof Error ? error.message : error);
    return { ok: false, problem: { status: 0, code: 'NETWORK_ERROR' } };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET dữ liệu nhị phân (vd ảnh hồ sơ đăng ký) với cùng header và cách báo lỗi như apiRequest. Dữ liệu chỉ nằm trong
 * bộ nhớ, không ghi xuống máy; log khi chạy dev chỉ có dòng trạng thái, không có nội dung.
 */
export async function apiRequestBlob(
  baseUrl: string,
  path: string,
  options: ApiBlobRequestOptions = {},
): Promise<ApiResult<ApiBlob>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // Không đặt Accept: lỗi trả về dạng JSON (ProblemDetail), còn ảnh có Content-Type riêng.
  const headers: Record<string, string> = { ...options.headers };
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  const url = `${baseUrl}${path}`;
  const startedAt = Date.now();

  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      const payload = await readJson(response);
      logRequest('GET', url, startedAt, response.status, payload);
      return { ok: false, problem: toProblem(response.status, payload) };
    }
    const blob = await response.blob();
    logRequest('GET', url, startedAt, response.status);
    const contentType = response.headers.get('content-type') ?? blob.type;
    return { ok: true, status: response.status, data: { blob, contentType } };
  } catch (error) {
    logRequest('GET', url, startedAt, 0, error instanceof Error ? error.message : error);
    return { ok: false, problem: { status: 0, code: 'NETWORK_ERROR' } };
  } finally {
    clearTimeout(timer);
  }
}

// Chỉ khi chạy dev: in mỗi request ra Console của DevTools và terminal Expo, vì tab Network
// của React Native DevTools bị tắt khi chạy trong Expo Go. Không in body gửi đi (có mật khẩu, ảnh CCCD)
// và che các trường bí mật (token, mã tra cứu hồ sơ) trong kết quả trả về. Bản build thật không in gì.
function logRequest(method: string, url: string, startedAt: number, status: number, result?: unknown) {
  if (!__DEV__) return;
  const label = status === 0 ? 'NETWORK ERROR' : String(status);
  const line = `[API] ${method} ${url} -> ${label} (${Date.now() - startedAt}ms)`;
  if (result === undefined) console.log(line);
  else console.log(line, maskTokens(result));
}

function maskTokens(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, /token|accessCode/i.test(key) ? '***' : item]),
  );
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toProblem(status: number, payload: unknown): ApiProblem {
  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  return {
    status,
    code: typeof body.code === 'string' ? body.code : undefined,
    message: typeof body.detail === 'string' ? body.detail : undefined,
    fieldErrors: isStringRecord(body.errors) ? body.errors : undefined,
  };
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return !!value && typeof value === 'object' && Object.values(value).every((item) => typeof item === 'string');
}
