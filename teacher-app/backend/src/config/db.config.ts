import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// データベースパス - 親ディレクトリのapp.dbを使用
const DB_PATH = path.resolve(__dirname, '../../../..', 'app.db');

let db: Database | null = null;

export async function connectDatabase(): Promise<Database> {
  if (db) {
    return db;
  }
  
  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    console.log(`SQLite database connected at: ${DB_PATH}`);
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await connectDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
}

export { DB_PATH };
