// APIエンドポイント定義

const API_BASE = '/api';

// Health check
const HEALTH = '/health';

// Dashboard関連
const DASHBOARD = {
  STATS: '/dashboard/stats',
  STUDENTS: '/dashboard/students',
};

// Student関連
const STUDENTS = {
  LIST: '/students',
  DETAIL: (studentId: number) => `/students/${studentId}`,
  COMPANIES: (studentId: number) => `/students/${studentId}/companies`,
  SELECTION_MEMOS: (studentId: number) => `/students/${studentId}/selection-memos`,
};

// Guidance Memo関連
const GUIDANCE = {
  LIST: (studentId: number) => `/students/${studentId}/guidance-memos`,
  CREATE: (studentId: number) => `/students/${studentId}/guidance-memos`,
  UPDATE: (memoId: number) => `/guidance-memos/${memoId}`,
  DELETE: (memoId: number) => `/guidance-memos/${memoId}`,
};

// Company関連
const COMPANIES = {
  LIST: '/companies',
  BY_STUDENT: (studentId: number) => `/students/${studentId}/companies`,
  BY_STATUS: (status: string) => `/companies?status=${status}`,
};

// CSVエクスポート
const EXPORT = {
  CSV: '/export/csv',
};

//全てのAPIパス
export const API = {
  HEALTH,
  DASHBOARD,
  STUDENTS,
  GUIDANCE,
  COMPANIES,
  EXPORT,
};

export default API;
