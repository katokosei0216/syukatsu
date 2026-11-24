import { apiGet } from './client';
import { DashboardStats, StudentDashboardData, DashboardFilter } from '../types';
import API from './endpoints';

// ダッシュボード統計情報を取得
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>(API.DASHBOARD.STATS);
}

// ダッシュボード用学生一覧を取得
export async function getDashboardStudents(filter?: DashboardFilter): Promise<StudentDashboardData[]> {
  return apiGet<StudentDashboardData[]>(API.DASHBOARD.STUDENTS, filter);
}
