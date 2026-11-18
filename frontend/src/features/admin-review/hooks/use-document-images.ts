import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { ReviewError } from '@/models';
import { fetchDocument } from '@/services/admin-review.service';
import type { ApiBlob } from '@/shared/lib/apiClient';

import { useReviewApi } from './use-review-api';

export type DocumentImage =
  | { status: 'loading' }
  | { status: 'ready'; uri: string }
  | { status: 'error'; error: ReviewError };

const LOADING: DocumentImage = { status: 'loading' };

/**
 * Tải ảnh hồ sơ kèm header Authorization (thẻ Image không tự gửi được) và chỉ giữ trong bộ nhớ: web dùng URL blob,
 * thu hồi khi rời màn; máy dùng data URI. Không ghi ảnh xuống máy, nên Image hiển thị phải đặt cachePolicy="none".
 */
export function useDocumentImages(documentUrls: readonly string[]) {
  const run = useReviewApi();
  const [images, setImages] = useState<Record<string, DocumentImage>>({});
  // Một object cố định suốt đời component: effect dọn dẹp đọc đúng danh sách URL blob đã tạo.
  const lifecycle = useRef({ mounted: true, objectUrls: [] as string[] });

  useEffect(() => {
    const state = lifecycle.current;
    state.mounted = true;
    return () => {
      state.mounted = false;
      state.objectUrls.forEach((uri) => URL.revokeObjectURL(uri));
      state.objectUrls = [];
    };
  }, []);

  // Tải một ảnh và trả về kết quả; không đổi state ở đây (state đổi ở nơi gọi, sau khi có kết quả).
  const fetchImage = useCallback(
    async (url: string): Promise<DocumentImage> => {
      const result = await run((accessToken) => fetchDocument(accessToken, url));
      if (!result.ok) return { status: 'error', error: result.error };
      try {
        const uri = await toDisplayUri(result.data);
        if (Platform.OS === 'web') {
          const state = lifecycle.current;
          // Đã rời màn trong lúc tải: thu hồi ngay, không giữ ảnh trong bộ nhớ.
          if (!state.mounted) URL.revokeObjectURL(uri);
          else state.objectUrls.push(uri);
        }
        return { status: 'ready', uri };
      } catch {
        return { status: 'error', error: 'unknown' };
      }
    },
    [run],
  );

  // Chỉ tải khi danh sách ảnh đổi: tải lại chi tiết hồ sơ (cùng các ảnh đó) không tải lại ảnh.
  const key = documentUrls.join('\n');
  useEffect(() => {
    if (!key) return;
    const state = lifecycle.current;
    for (const url of key.split('\n')) {
      fetchImage(url).then((image) => {
        if (state.mounted) setImages((prev) => ({ ...prev, [url]: image }));
      });
    }
  }, [key, fetchImage]);

  const retry = (url: string) => {
    setImages((prev) => ({ ...prev, [url]: LOADING }));
    const state = lifecycle.current;
    fetchImage(url).then((image) => {
      if (state.mounted) setImages((prev) => ({ ...prev, [url]: image }));
    });
  };

  const imageOf = (url: string): DocumentImage => images[url] ?? LOADING;

  return { imageOf, retry };
}

async function toDisplayUri({ blob, contentType }: ApiBlob): Promise<string> {
  if (Platform.OS === 'web') return URL.createObjectURL(blob);
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
  // Blob trên máy có thể mất loại nội dung; đặt lại theo header Content-Type để thư viện ảnh nhận đúng định dạng.
  const mimeType = contentType.split(';')[0].trim();
  return mimeType.startsWith('image/') ? dataUri.replace(/^data:[^;,]*/, `data:${mimeType}`) : dataUri;
}
