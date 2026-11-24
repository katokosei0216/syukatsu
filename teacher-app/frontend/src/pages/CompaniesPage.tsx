import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Company, SelectionStatus } from '../types';
import { apiGet } from '../api/client';
import API from '../api/endpoints';

const statusColors: Record<SelectionStatus, string> = {
  '検討中': 'bg-slate-100 text-slate-600',
  '応募済み': 'bg-blue-100 text-blue-600',
  '書類選考': 'bg-blue-100 text-blue-600',
  '一次面接': 'bg-green-100 text-green-600',
  '二次面接': 'bg-green-100 text-green-600',
  '最終面接': 'bg-green-100 text-green-600',
  '内定': 'bg-emerald-100 text-emerald-600',
  'お見送り': 'bg-red-100 text-red-600',
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SelectionStatus | ''>('');

  useEffect(() => {
    fetchCompanies();
  }, [statusFilter]);

  async function fetchCompanies() {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const data = await apiGet<Company[]>(API.COMPANIES.LIST, params);
      setCompanies(data);
      
    } catch (err) {
      setError('企業データの取得に失敗しました');
      console.error('Companies fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 企業ごとの応募数を集計
  function getCompanyStats() {
    const companyMap = new Map<string, { count: number; statuses: Record<SelectionStatus, number> }>();
    
    companies.forEach(company => {
      const key = `${company.company_name} (${company.job_type})`;
      if (!companyMap.has(key)) {
        companyMap.set(key, { 
          count: 0, 
          statuses: {
            '検討中': 0, '応募済み': 0, '書類選考': 0, 
            '一次面接': 0, '二次面接': 0, '最終面接': 0,
            '内定': 0, 'お見送り': 0
          }
        });
      }
      
      const entry = companyMap.get(key)!;
      entry.count++;
      entry.statuses[company.status]++;
    });
    
    return Array.from(companyMap.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  const companyStats = getCompanyStats();

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
        <button onClick={fetchCompanies} className="btn btn-sm btn-secondary ml-4">
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">企業別応募状況</h2>
        <Link to="/" className="btn btn-secondary">
          ← ダッシュボードに戻る
        </Link>
      </div>

      {/* フィルター */}
      <div className="card">
        <div className="card-body">
          <label className="form-label">ステータスでフィルター</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SelectionStatus | '')}
            className="form-select max-w-xs"
          >
            <option value="">すべてのステータス</option>
            {(['検討中', '応募済み', '書類選考', '一次面接', '二次面接', '最終面接', '内定', 'お見送り'] as SelectionStatus[]).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 企業別集計 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">企業別統計 ({companyStats.length}企業)</h3>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>企業名・職種</th>
                  <th>応募数</th>
                  {(['内定', '最終面接', '二次面接', '一次面接', '書類選考', '応募済み', '検討中', 'お見送り'] as SelectionStatus[]).map(status => (
                    <th key={status} className="text-center">{status}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companyStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center text-muted py-4">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  companyStats.map(stat => (
                    <tr key={stat.key}>
                      <td className="font-medium">{stat.key}</td>
                      <td className="text-center font-semibold">{stat.count}</td>
                      {(['内定', '最終面接', '二次面接', '一次面接', '書類選考', '応募済み', '検討中', 'お見送り'] as SelectionStatus[]).map(status => (
                        <td key={status} className="text-center">
                          {stat.statuses[status] > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-50">{stat.statuses[status]}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 全応募企業一覧 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">全応募企業一覧 ({companies.length}件)</h3>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>学生ID</th>
                  <th>学生名</th>
                  <th>企業名</th>
                  <th>職種</th>
                  <th>ステータス</th>
                  <th>次回選考日</th>
                  <th>登録日</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      応募企業がありません
                    </td>
                  </tr>
                ) : (
                  companies.map(company => (
                    <tr key={company.id}>
                      <td>{company.student_id}</td>
                      <td>
                        <Link 
                          to={`/students/${company.student_id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          学生{company.student_id}
                        </Link>
                      </td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
