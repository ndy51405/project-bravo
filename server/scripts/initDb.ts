import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db';
import { SEED_QUIZZES } from '../seeds/seedData';
import { QuizRepository } from '../repositories/quiz.repository';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('🚀 開始初始化 Supabase PostgreSQL 資料庫...');

  const client = await pool.connect();
  try {
    // 1. 讀取並執行 database/create_table.sql
    const sqlPath = path.resolve(process.cwd(), 'database/create_table.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`找不到結構檔案: ${sqlPath}`);
    }

    console.log('📄 正在執行 database/create_table.sql 建立資料表結構與 RLS 政策...');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    await client.query(sqlContent);
    console.log('✅ 資料表 (quizzes, questions, options, responses) 建立完成！');

    // 3. 寫入範例題組 (SEED_QUIZZES)
    console.log('📚 正在寫入初始範例題組 (SEED_QUIZZES)...');
    await QuizRepository.syncQuizzesDirect(SEED_QUIZZES);
    console.log(`✅ 成功同步 ${SEED_QUIZZES.length} 組範例題組！`);

    console.log('\n🎉 資料庫已就緒！您可以重新啟動專案進行偵錯與測試。');
  } catch (err: any) {
    console.error('\n❌ 資料庫初始化失敗:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();

