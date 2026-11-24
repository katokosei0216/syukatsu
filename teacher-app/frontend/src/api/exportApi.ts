import { apiGet } from './client';
import API from './endpoints';

// CSVをダウンロード
// file-saverライブラリを使わない場合は、直接aタグでダウンロード
// export function downloadCSV(filter?: { status?: string; search?: string }) {
export async function downloadCSV(filter?: { status?: string; search?: string }) {
  // フィルターパラメータを構築
  const params = new URLSearchParams();
  if (filter?.status) {
    params.append('status', filter.status);
  }
  if (filter?.search) {
    params.append('search', filter.search);
  }
  
  // API URLを構築
  const url = `${API.EXPORT.CSV}?${params.toString()}`;
  
  // aタグを使って直接ダウンロード
  const link = document.createElement('a');
  link.href = url;
  link.download = 'students_export.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
