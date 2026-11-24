import app from './app';
import { connectDatabase, closeDatabase } from './config/db.config';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // データベース接続
    await connectDatabase();
    
    // Expressサーバー起動
    const server = app.listen(PORT, () => {
      console.log(`教員側APIサーバーがポート ${PORT} で起動しました`);
      console.log(`http://localhost:${PORT}/api/health`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      await closeDatabase();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      console.log('SIGINT received. Shutting down gracefully...');
      await closeDatabase();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
