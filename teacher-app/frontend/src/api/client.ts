import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '../types';

// APIクライアントのベースURL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// axiosインスタンス作成
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// インターセプター - エラー処理
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<any>>) => {
    if (error.response) {
      // サーバーからのエラー応答
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // リクエストが送信されたが応答がない
      console.error('API Error: No response received');
    } else {
      // リクエスト設定エラー
      console.error('API Error:', error.message);
    }
    
    // エラーを再throw
    return Promise.reject(error);
  }
);

// ヘルパー関数 - GETリクエスト
export async function apiGet<T>(url: string, params?: any): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(url, { params });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'API request failed');
}

// ヘルパー関数 - POSTリクエスト
export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.post<ApiResponse<T>>(url, data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'API request failed');
}

// ヘルパー関数 - PUTリクエスト
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const response = await apiClient.put<ApiResponse<T>>(url, data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'API request failed');
}

// ヘルパー関数 - DELETEリクエスト
export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiClient.delete<ApiResponse<T>>(url);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error || 'API request failed');
}

export { apiClient, API_BASE_URL };
