import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/db.config';

const router = Router();

// CSVエクスポート (REQ-03)
router.get('/csv', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    
    // フィルターがあれば適用
    const { status, search } = req.query;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (status) {
      whereClause += ' AND EXISTS (SELECT 1 FROM companies c WHERE c.student_id = s.id AND c.status = ?)';
      params.push(status);
    }
    
    if (search) {
      whereClause += ' AND s.name LIKE ?';
      params.push(`%${search}%`);
    }
    
    // 学生とその企業情報を取得
    const students = await db.all(`
      SELECT s.id, s.name
      FROM students s
      ${whereClause}
      ORDER BY s.id
    `, ...params);
    
    // CSVヘッダー
    const headers = ['学生ID', '学生名', '企業数', '最新ステータス', '内定フラグ', '最終更新日'];
    let csvContent = headers.join(',') + '\n';
    
    // 各学生のデータ
    for (const student of students) {
      const companies = await db.all(`
        SELECT status, created_at
        FROM companies
        WHERE student_id = ?
        ORDER BY created_at DESC
      `, student.id);
      
      const companyCount = companies.length;
      const latestStatus = companies.length > 0 ? companies[0].status : '未活動';
      const hasOffer = companies.some(c => c.status === '内定');
      const latestDate = companies.length > 0 ? companies[0].created_at : '';
      
      // CSV行を追加
      const row = [
        student.id,
        `"${student.name.replace(/"/g, '""')}"`,
        companyCount,
        latestStatus,
        hasOffer ? 'YES' : 'NO',
        latestDate
      ].join(',');
      
      csvContent += row + '\n';
    }
    
    // CSVファイルとしてレスポンス
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename=students_export.csv');
    res.send(csvContent);
    
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'CSVエクスポートに失敗しました' 
    });
  }
});

export default router;
