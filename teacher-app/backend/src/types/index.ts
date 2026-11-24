// 選考ステータス（共通定義から引用）
export type SelectionStatus = 
  | '検討中' 
  | '応募済み' 
  | '書類選考' 
  | '一次面接' 
  | '二次面接' 
  | '最終面接' 
  | '内定' 
  | 'お見送り';

// 活動中ステータス
const ACTIVE_STATUSES: SelectionStatus[] = [
  '応募済み', '書類選考', '一次面接', '二次面接', '最終面接'
];

// 内定判定
const OFFER_STATUS: SelectionStatus = '内定';

// お見送り判定
const REJECTED_STATUS: SelectionStatus = 'お見送り';

// 指導メモのカテゴリ
export type GuidanceCategory = '履歴書' | '面接' | 'ES' | 'その他';

// 既定のカテゴリ
export const GUIDANCE_DEFAULT_CATEGORY: GuidanceCategory = 'その他';

// データモデル

export interface Student {
  id: number;
  name: string;
}

export interface Company {
  id: number;
  student_id: number;
  company_name: string;
  job_type: string;
  status: SelectionStatus;
}

export interface SelectionMemo {
  id: number;
  company_id: number;
  next_selection_date: string; // YYYY-MM-DD
  memo: string;
  created_at: string; // datetime
}

export interface SelectionMemoWithCompany extends SelectionMemo {
  company_name: string;
  job_type: string;
  company_status: SelectionStatus;
}

export interface GuidanceMemo {
  id: number;
  student_id: number;
  category: GuidanceCategory;
  memo: string;
  next_guidance_date: string; // YYYY-MM-DD
  created_at: string; // datetime
}

// APIレスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  offerCount: number;
  statusDistribution: Record<SelectionStatus, number>;
}

export interface StudentDashboardData extends Student {
  companies: Company[];
  lastActivityDate?: string;
  isActive: boolean;
  hasOffer: boolean;
}

export interface DashboardFilter {
  status?: SelectionStatus;
  search?: string;
}

export {
  ACTIVE_STATUSES,
  OFFER_STATUS,
  REJECTED_STATUS,
};
