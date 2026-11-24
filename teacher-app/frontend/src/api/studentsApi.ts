import { apiGet, apiPost, apiPut, apiDelete } from './client';
import { Student, Company, GuidanceMemo, SelectionMemoWithCompany } from '../types';
import API from './endpoints';

// 学生一覧を取得
export async function getStudents(): Promise<Student[]> {
  return apiGet<Student[]>(API.STUDENTS.LIST);
}

// 学生詳細を取得
export async function getStudent(studentId: number): Promise<Student> {
  return apiGet<Student>(API.STUDENTS.DETAIL(studentId));
}

// 学生の応募企業一覧を取得
export async function getStudentCompanies(studentId: number): Promise<Company[]> {
  return apiGet<Company[]>(API.STUDENTS.COMPANIES(studentId));
}

// 学生の選考メモ一覧を取得
export async function getStudentSelectionMemos(studentId: number): Promise<SelectionMemoWithCompany[]> {
  return apiGet<SelectionMemoWithCompany[]>(API.STUDENTS.SELECTION_MEMOS(studentId));
}

// 学生の指導メモ一覧を取得
export async function getStudentGuidanceMemos(studentId: number): Promise<GuidanceMemo[]> {
  return apiGet<GuidanceMemo[]>(API.GUIDANCE.LIST(studentId));
}

// 新しい指導メモを作成
export async function createGuidanceMemo(
  studentId: number,
  data: { category: string; memo: string; next_guidance_date: string }
): Promise<GuidanceMemo> {
  return apiPost<GuidanceMemo>(API.GUIDANCE.CREATE(studentId), data);
}

// 指導メモを更新
export async function updateGuidanceMemo(
  memoId: number,
  data: { category: string; memo: string; next_guidance_date: string }
): Promise<GuidanceMemo> {
  return apiPut<GuidanceMemo>(API.GUIDANCE.UPDATE(memoId), data);
}

// 指導メモを削除
export async function deleteGuidanceMemo(memoId: number): Promise<void> {
  return apiDelete<void>(API.GUIDANCE.DELETE(memoId));
}
