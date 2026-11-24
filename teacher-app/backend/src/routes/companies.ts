import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/db.config';
import { Company } from '../types';

const router = Router();

// 全企業一覧を取得（ステータスフィルター付き）
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const { status } = req.query;
    
    let query = `
      SELECT c.id, c.student_id, c.company_name, c.job_type, c.status, 
             c.next_selection_date, c.created_at,
             s.name as student_name
      FROM companies c
      JOIN students s ON c.student_id = s.id
    `;
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE c.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const companies = await db.all(query, ...params);
    
    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Companies list error:', error);
    res.status(500).json({ 
      success: false, 
      error: '企業一覧の取得に失敗しました' 
    });
  }
});

// 企業別の統計情報を取得
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    
    // 各企業の応募数とステータス分布
    const stats = await db.all(`
      SELECT 
        company_name,
        job_type,
        status,
        COUNT(*) as count
      FROM companies
      GROUP BY company_name, job_type, status
      ORDER BY company_name, job_type, count DESC
    `);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Companies stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: '企業統計の取得に失敗しました' 
    });
  }
});

export default router;
