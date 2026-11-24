import express from 'express';
import cors from 'cors';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Route imports
import dashboardRoutes from './routes/dashboard';
import studentsRoutes from './routes/students';
import companiesRoutes from './routes/companies';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイル（フロントエンドのビルドファイル）
app.use(express.static(path.join(__dirname, '../public')));

// APIルート
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/companies', companiesRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: '教員側APIサーバーは動作中',
    timestamp: new Date().toISOString() 
  });
});

// 404ハンドラー
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `エンドポイント ${req.method} ${req.path} は見つかりません`
  });
});

// エラーハンドラー
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'サーバーエラーが発生しました'
  });
});

export default app;
