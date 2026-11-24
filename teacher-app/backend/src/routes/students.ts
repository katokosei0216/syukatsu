import { Router, Request, Response } from 'express';
import { getDatabase } from '../config/db.config';
import { Student, Company, GuidanceMemo, SelectionMemo } from '../types';

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

// 学生の選考メモ一覧を取得
router.get('/:studentId/selection-memos', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const studentId = parseInt(req.params.studentId);
    
    const memos = await db.all(`
      SELECT sm.id, sm.company_id, sm.next_selection_date, sm.memo, sm.created_at,
             c.company_name, c.job_type, c.status
      FROM selection_memos sm
      JOIN companies c ON sm.company_id = c.id
      WHERE c.student_id = ?
      ORDER BY sm.created_at DESC
    `, studentId);
    
    res.json({ success: true, data: memos });
  } catch (error) {
    console.error('Selection memos error:', error);
    res.status(500).json({ 
      success: false, 
      error: '選考メモの取得に失敗しました' 
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

// 指導メモを更新
router.put('/guidance-memos/:memoId', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const memoId = parseInt(req.params.memoId);
    const { category, memo, next_guidance_date } = req.body;
    
    // メモが存在するか確認
    const existingMemo = await db.get('SELECT id FROM guidance_memos WHERE id = ?', memoId);
    if (!existingMemo) {
      return res.status(404).json({ 
        success: false, 
        error: 'メモが見つかりません' 
      });
    }
    
    await db.run(`
      UPDATE guidance_memos 
      SET category = ?, memo = ?, next_guidance_date = ?
      WHERE id = ?
    `, category, memo, next_guidance_date, memoId);
    
    const updatedMemo = await db.get(`
      SELECT id, student_id, category, memo, next_guidance_date, created_at
      FROM guidance_memos
      WHERE id = ?
    `, memoId);
    
    res.json({ success: true, data: updatedMemo, message: '指導メモが更新されました' });
  } catch (error) {
    console.error('Update guidance memo error:', error);
    res.status(500).json({ 
      success: false, 
      error: '指導メモの更新に失敗しました' 
    });
  }
});

// 指導メモを削除
router.delete('/guidance-memos/:memoId', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const memoId = parseInt(req.params.memoId);
    
    // メモが存在するか確認
    const existingMemo = await db.get('SELECT id FROM guidance_memos WHERE id = ?', memoId);
    if (!existingMemo) {
      return res.status(404).json({ 
        success: false, 
        error: 'メモが見つかりません' 
      });
    }
    
    await db.run('DELETE FROM guidance_memos WHERE id = ?', memoId);
    
    res.json({ success: true, message: '指導メモが削除されました' });
  } catch (error) {
    console.error('Delete guidance memo error:', error);
    res.status(500).json({ 
      success: false, 
      error: '指導メモの削除に失敗しました' 
    });
  }
});

export default router;
