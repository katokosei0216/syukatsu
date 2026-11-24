import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudentDashboardData, DashboardStats, SelectionStatus, ACTIVE_STATUSES, OFFER_STATUS } from '../types';
import { getDashboardStats, getDashboardStudents } from '../api/dashboardApi';

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

const statusOrder: SelectionStatus[] = [
  '未活動', '検討中', '応募済み', '書類選考', '一次面接', '二次面接', '最終面接', '内定', 'お見送り'
] as SelectionStatus[];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<StudentDashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SelectionStatus | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [filter, search]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      
      // 統計情報取得
      const statsData = await getDashboardStats();
      setStats(statsData);
      
      // フィルター適用
      const filterParams: any = {};
      if (filter) filterParams.status = filter;
      if (search) filterParams.search = search;
      
      // 学生一覧取得
      const studentsData = await getDashboardStudents(filterParams);
      setStudents(studentsData);
      
    } catch (err) {
      setError('データの取得に失敗しました');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 学生の活動ステータスを判定
  function getStudentStatus(student: StudentDashboardData): SelectionStatus {
    if (student.companies.length === 0) {
      return '検討中' as SelectionStatus; // 未活動を検討中として扱う
    }
    
    // 最も進んだステータスを返す
    const statuses = student.companies.map(c => c.status);
    for (const status of statusOrder) {
      if (statuses.includes(status)) {
        return status;
      }
    }
    return '検討中';
  }

  // ステータスバッジ
  function StatusBadge({ status }: { status: SelectionStatus }) {
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-600';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {status}
      </span>
    );
  }

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
        <button onClick={fetchData} className="btn btn-sm btn-secondary ml-4">
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">進捗ダッシュボード</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="学生名を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SelectionStatus | '')}
            className="form-select"
          >
            <option value="">すべてのステータス</option>
            {statusOrder.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button onClick={fetchData} className="btn btn-primary">
            検索
          </button>
        </div>
      </div>

      {/* 統計情報 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="総学生数"
            value={stats.totalStudents}
            color="blue"
          />
          <StatCard
            title="活動中"
            value={stats.activeStudents}
            color="green"
          />
          <StatCard
            title="未活動"
            value={stats.inactiveStudents}
            color="slate"
          />
          <StatCard
            title="内定者"
            value={stats.offerCount}
            color="emerald"
          />
          <StatCard
            title="完了率"
            value={`${Math.round((stats.offerCount / stats.totalStudents) * 100)}%`}
            color="purple"
          />
        </div>
      )}

      {/* 学生一覧 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">学生一覧 ({students.length}名)</h3>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>学生名</th>
                  <th>応募企業数</th>
                  <th>最新ステータス</th>
                  <th>最終更新日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      学生データがありません
                    </td>
                  </tr>
                ) : (
                  students.map(student => {
                    const studentStatus = getStudentStatus(student);
                    const offerCompany = student.companies.find(c => c.status === OFFER_STATUS);
                    const latestDate = student.companies.length > 0 
                      ? student.companies.reduce((latest, c) => 
                          c.created_at > latest ? c.created_at : latest, 
                          student.companies[0].created_at
                        )
                      : undefined;
                    
                    return (
                      <tr key={student.id}>
                        <td className="font-medium">
                          <Link 
                            to={`/students/${student.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {student.name}
                          </Link>
                        </td>
                        <td>{student.companies.length}</td>
                        <td>
                          <StatusBadge status={studentStatus} />
                        </td>
                        <td className="text-sm text-muted">
                          {latestDate ? new Date(latestDate).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td>
                          <Link 
                            to={`/students/${student.id}`}
                            className="btn btn-sm btn-secondary"
                          >
                            詳細
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// 統計カードコンポーネント
function StatCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  };
  
  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
  
  return (
    <div className={`card ${colorClass}`}>
      <div className="card-header">
        <h4 className="text-sm font-medium text-muted">{title}</h4>
      </div>
      <div className="card-body">
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}
