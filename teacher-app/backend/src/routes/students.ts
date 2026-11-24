import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/db.config';
import { Student, Company, GuidanceMemo } from '../types';

const router = Router();

// 学生一覧を取得
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const students = await db.all('SELECT id, name FROM students ORDER BY id');
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Students list error:', error);
    res.status(500).json({ 
      success: false, 
      error: '学生一覧の取得に失敗しました' 
    });
  }
});

// 学生詳細を取得
router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const studentId = parseInt(req.params.studentId);
    
    const student = await db.get(
      'SELECT id, name FROM students WHERE id = ?',
      studentId
    );
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: '学生が見つかりません' 
      });
    }
    
    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Student detail error:', error);
    res.status(500).json({ 
      success: false, 
      error: '学生情報の取得に失敗しました' 
    });
  }
});

// 学生の応募企業一覧を取得
router.get('/:studentId/companies', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const studentId = parseInt(req.params.studentId);
    
    const companies = await db.all(`
      SELECT id, student_id, company_name, job_type, status, next_selection_date, created_at
      FROM companies
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, studentId);
    
    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Student companies error:', error);
    res.status(500).json({ 
      success: false, 
      error: '応募企業一覧の取得に失敗しました' 
    });
  }
});

// 学生の指導メモ一覧を取得
router.get('/:studentId/guidance-memos', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const studentId = parseInt(req.params.studentId);
    
    const memos = await db.all(`
      SELECT id, student_id, category, memo, next_guidance_date, created_at
      FROM guidance_memos
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, studentId);
    
    res.json({ success: true, data: memos });
  } catch (error) {
    console.error('Guidance memos error:', error);
    res.status(500).json({ 
      success: false, 
      error: '指導メモの取得に失敗しました' 
    });
  }
});

// 新しい指導メモを作成
router.post('/:studentId/guidance-memos', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const studentId = parseInt(req.params.studentId);
    const { category, memo, next_guidance_date } = req.body;
    
    // 学生が存在するか確認
    const student = await db.get('SELECT id FROM students WHERE id = ?', studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: '学生が見つかりません' 
      });
    }
    
    const result = await db.run(`
      INSERT INTO guidance_memos (student_id, category, memo, next_guidance_date, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `, studentId, category, memo, next_guidance_date);
    
    const newMemo = await db.get(`
      SELECT id, student_id, category, memo, next_guidance_date, created_at
      FROM guidance_memos
      WHERE id = ?
    `, result.lastID);
    
    res.json({ success: true, data: newMemo, message: '指導メモが作成されました' });
  } catch (error) {
    console.error('Create guidance memo error:', error);
    res.status(500).json({ 
      success: false, 
      error: '指導メモの作成に失敗しました' 
    });
  }
});

export default router;
