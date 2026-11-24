import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Student, Company, GuidanceMemo, SelectionStatus, GuidanceCategory, GUIDANCE_DEFAULT_CATEGORY } from '../types';
import { apiGet, apiPost } from '../api/client';
import API from '../api/endpoints';

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [guidanceMemos, setGuidanceMemos] = useState<GuidanceMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 指導メモフォーム
  const [memoCategory, setMemoCategory] = useState<GuidanceCategory>(GUIDANCE_DEFAULT_CATEGORY);
  const [memoContent, setMemoContent] = useState('');
  const [memoDate, setMemoDate] = useState('');
  const [memoSuccess, setMemoSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  async function fetchStudentData() {
    try {
      setLoading(true);
      setError(null);
      
      if (!studentId) {
        throw new Error('学生IDが指定されていません');
      }
      
      // 学生情報取得
      const studentData = await apiGet<Student>(API.STUDENTS.DETAIL(Number(studentId)));
      setStudent(studentData);
      
      // 応募企業取得
      const companiesData = await apiGet<Company[]>(API.STUDENTS.COMPANIES(Number(studentId)));
      setCompanies(companiesData);
      
      // 指導メモ取得
      const memosData = await apiGet<GuidanceMemo[]>(API.GUIDANCE.LIST(Number(studentId)));
      setGuidanceMemos(memosData);
      
    } catch (err) {
      setError('学生データの取得に失敗しました');
      console.error('Student detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 新しい指導メモを追加
  async function handleAddMemo(e: React.FormEvent) {
    e.preventDefault();
    
    if (!studentId || !memoContent) return;
    
    try {
      const newMemo = await apiPost<GuidanceMemo>(API.GUIDANCE.CREATE(Number(studentId)), {
        category: memoCategory,
        memo: memoContent,
        next_guidance_date: memoDate || '',
        created_at: new Date().toISOString(),
      });
      
      setGuidanceMemos([...guidanceMemos, newMemo]);
      setMemoContent('');
      setMemoDate('');
      setMemoSuccess('指導メモが追加されました');
      
      setTimeout(() => setMemoSuccess(null), 3000);
      
    } catch (err) {
      setError('メモの追加に失敗しました');
      console.error('Add memo error:', err);
    }
  }

  // 画面遷移
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
        <button onClick={fetchStudentData} className="btn btn-sm btn-secondary ml-4">
          再試行
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="alert alert-warning">
        学生が見つかりません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 戻るボタン */}
      <div>
        <Link to="/" className="btn btn-secondary">
          ← ダッシュボードに戻る
        </Link>
      </div>

      {/* 学生基本情報 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {student.name}
            <span className="ml-2 text-muted">(ID: {student.id})</span>
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-muted">応募企業数</p>
              <p className="text-2xl font-bold">{companies.length}</p>
            </div>
            <div>
              <p className="text-muted">指導メモ数</p>
              <p className="text-2xl font-bold">{guidanceMemos.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 応募企業一覧 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">応募企業一覧</h3>
        </div>
        <div className="card-body">
          {companies.length === 0 ? (
            <p className="text-muted">応募企業がありません</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>企業名</th>
                    <th>職種</th>
                    <th>ステータス</th>
                    <th>次回選考日</th>
                    <th>作成日</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(company => (
                    <tr key={company.id}>
                      <td className="font-medium">{company.company_name}</td>
                      <td>{company.job_type}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-badge status-badge-${company.status}`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="text-sm">
                        {company.next_selection_date || '-'}
                      </td>
                      <td className="text-sm text-muted">
                        {new Date(company.created_at).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 指導メモ一覧 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">指導メモ</h3>
        </div>
        <div className="card-body">
          {/* メモ追加フォーム */}
          <form onSubmit={handleAddMemo} className="space-y-4 mb-6">
            <h4 className="font-semibold">新しいメモを追加</h4>
            {memoSuccess && (
              <div className="alert alert-success">{memoSuccess}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">カテゴリ</label>
                <select 
                  value={memoCategory} 
                  onChange={(e) => setMemoCategory(e.target.value as GuidanceCategory)}
                  className="form-select"
                >
                  {(['履歴書', '面接', 'ES', 'その他'] as GuidanceCategory[]).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">次回指導日</label>
                <input 
                  type="date" 
                  value={memoDate}
                  onChange={(e) => setMemoDate(e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group md:col-span-1">
                <label className="form-label">&nbsp;</label>
                <button type="submit" className="btn btn-primary w-full">
                  追加
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">メモ内容</label>
              <textarea 
                value={memoContent}
                onChange={(e) => setMemoContent(e.target.value)}
                placeholder="指導内容を記録..."
                className="form-textarea"
                required
              />
            </div>
          </form>

          {/* メモ一覧 */}
          {guidanceMemos.length === 0 ? (
            <p className="text-muted">指導メモがありません</p>
          ) : (
            <div className="space-y-4">
              {guidanceMemos.map(memo => (
                <div key={memo.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`px-2 py-1 rounded text-xs font-medium mr-2 ${
                        memo.category === '履歴書' ? 'bg-blue-100 text-blue-600' :
                        memo.category === '面接' ? 'bg-green-100 text-green-600' :
                        memo.category === 'ES' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {memo.category}
                      </span>
                      <span className="text-sm text-muted">
                        {new Date(memo.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <p className="mb-2">{memo.memo}</p>
                  {memo.next_guidance_date && (
                    <p className="text-sm text-muted">
                      次回指導日: {memo.next_guidance_date}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
