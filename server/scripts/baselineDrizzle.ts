import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool } from '../config/db';

async function baselineDrizzle() {
  console.log('🚀 開始建立 Drizzle Migration Baseline 基準點...');

  const drizzleFolder = path.resolve(process.cwd(), 'drizzle');
  const journalPath = path.join(drizzleFolder, 'meta/_journal.json');

  if (!fs.existsSync(journalPath)) {
    throw new Error(`找不到 migration journal 檔案: ${journalPath}，請先執行 npx drizzle-kit generate`);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  const firstEntry = journal.entries[0];

  if (!firstEntry) {
    throw new Error('drizzle journal 中無任何 migration 項目');
  }

  const sqlFilePath = path.join(drizzleFolder, `${firstEntry.tag}.sql`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
  const hash = crypto.createHash('sha256').update(sqlContent).digest('hex');
  const folderMillis = firstEntry.when;

  const client = await pool.connect();
  try {
    // 1. 建立 drizzle schema 與 __drizzle_migrations 表
    await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    // 2. 檢查是否已經存在此 baseline 紀錄
    const existing = await client.query(
      'SELECT id FROM "drizzle"."__drizzle_migrations" WHERE created_at = $1',
      [folderMillis]
    );

    if (existing.rows.length > 0) {
      console.log(`ℹ️  Baseline 紀錄已存在 (ID: ${existing.rows[0].id}, Tag: ${firstEntry.tag})，跳過寫入。`);
    } else {
      const res = await client.query(
        'INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2) RETURNING id',
        [hash, folderMillis]
      );
      console.log(`✅ 成功建立 Baseline 紀錄！(ID: ${res.rows[0].id}, Tag: ${firstEntry.tag}, Hash: ${hash.slice(0, 10)}...)`);
    }

    console.log('🎉 Drizzle Migration 基準點設置完成！現有資料庫資料表與資料完整無損。');
  } catch (err: any) {
    console.error('❌ 設定 Baseline 失敗:', err.message || err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

baselineDrizzle();

