import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/db.config';
import { DashboardStats, StudentDashboardData, ACTIVE_STATUSES, OFFER_STATUS } from '../types';

const router = Router();

// ダッシュボード統計情報を取得
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    
    // 総学生数
    const totalStudentsResult = await db.get('SELECT COUNT(*) as count FROM students');
    const totalStudents = totalStudentsResult?.count || 0;
    
    // 内定者数
    const offerCountResult = await db.get(`
      SELECT COUNT(DISTINCT s.id) as count 
      FROM students s
      JOIN companies c ON s.id = c.student_id
      WHERE c.status = ?
    `, OFFER_STATUS);
    const offerCount = offerCountResult?.count || 0;
    
    // 活動中の学生数（応募済み〜最終面接のいずれかのステータスを持つ学生）
    const activeStatuses = ACTIVE_STATUSES.join("', '");
    const activeStudentsResult = await db.get(`
      SELECT COUNT(DISTINCT s.id) as count 
      FROM students s
      JOIN companies c ON s.id = c.student_id
      WHERE c.status IN ('${activeStatuses}')
    `);
    const activeStudents = activeStudentsResult?.count || 0;
    
    // 未活動の学生数（応募社数0）
    const inactiveStudentsResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM students s
      LEFT JOIN companies c ON s.id = c.student_id
      WHERE c.id IS NULL
    `);
    const inactiveStudents = inactiveStudentsResult?.count || 0;
    
    // ステータス分布
    const statusDistribution: Record<string, number> = {};
    const allStatuses = [...ACTIVE_STATUSES, OFFER_STATUS, '検討中', 'お見送り'];
    
    for (const status of allStatuses) {
      const result = await db.get(`
        SELECT COUNT(*) as count 
        FROM companies 
        WHERE status = ?
      `, status);
      statusDistribution[status] = result?.count || 0;
    }
    
    // 未活動を追加
    statusDistribution['未活動'] = inactiveStudents;
    
    const stats: DashboardStats = {
      totalStudents,
      activeStudents,
      inactiveStudents,
      offerCount,
      statusDistribution,
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: '統計情報の取得に失敗しました' 
    });
  }
});

// ダッシュボード用学生一覧を取得
router.get('/students', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const { status, search } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    // ステータスフィルター
    if (status) {
      whereClause += ' AND EXISTS (SELECT 1 FROM companies c WHERE c.student_id = s.id AND c.status = ?)';
      params.push(status);
    }
    
    // 検索フィルター（学生名）
    if (search) {
      whereClause += ' AND s.name LIKE ?';
      params.push(`%${search}%`);
    }
    
    // 学生一覧取得
    const students = await db.all(`
      SELECT s.id, s.name 
      FROM students s
      ${whereClause}
      ORDER BY s.id
    `, ...params);
    
    // 各学生の企業情報を取得
    const studentsWithData: StudentDashboardData[] = [];
    
    for (const student of students) {
      const companies = await db.all(`
        SELECT id, student_id, company_name, job_type, status, next_selection_date, created_at
        FROM companies
        WHERE student_id = ?
        ORDER BY created_at DESC
      `, student.id);
      
      // 最新の活動日を取得
      const latestCompany = companies[0];
      const lastActivityDate = latestCompany?.created_at;
      
      // 活動中判定
      const companyStatuses = companies.map(c => c.status);
      const isActive = companyStatuses.some(s => ACTIVE_STATUSES.includes(s as any));
      const hasOffer = companyStatuses.includes(OFFER_STATUS);
      
      studentsWithData.push({
        ...student,
        companies,
        lastActivityDate,
        isActive,
        hasOffer,
      });
    }
    
    res.json({ success: true, data: studentsWithData });
  } catch (error) {
    console.error('Dashboard students error:', error);
    res.status(500).json({ 
      success: false, 
      error: '学生一覧の取得に失敗しました' 
    });
  }
});

export default router;
