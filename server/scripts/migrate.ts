import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function runMigration() {
  console.log('🚀 開始執行 Database Migration (將 quiz_code 遷移為 4 位數字)...');

  const client = await pool.connect();
  try {
    const migrationFile = path.resolve(process.cwd(), 'drizzle/0001_purple_lizard.sql');
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`找不到 Migration 檔案: ${migrationFile}`);
    }

    console.log(`📄 正在讀取並執行: ${path.basename(migrationFile)} ...`);
    const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

    // Drizzle migration files separate statements with '--> statement-breakpoint'
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await client.query('BEGIN');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`▶️  執行步驟 [${i + 1}/${statements.length}]...`);
      await client.query(stmt);
    }

    await client.query('COMMIT');
    console.log('✅ Migration 執行成功！quizzes.quiz_code 已成功改為 4 位純數字且欄位型態為 text。');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration 執行失敗，已回復變更:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

