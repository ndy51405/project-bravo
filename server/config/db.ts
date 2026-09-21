import dotenv from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../db/schema';
import { logger } from '../utils/logger';

dotenv.config();

const dbUrl = process.env.DATABASE_URL?.trim();

if (!dbUrl) {
  logger.warn(
    '\n⚠️  [Database Warning] 未在 .env 檔案中偵測到有效的 DATABASE_URL！\n' +
    '👉 系統目前嘗試連線至本機預設 (127.0.0.1:5432)。\n' +
    '👉 若您是使用 Supabase 雲端資料庫，請至專案根目錄的 .env 檔案中填入 DATABASE_URL。\n'
  );
}

// PostgreSQL Connection Pool using DATABASE_URL
export const pool = new Pool({
  connectionString: dbUrl || 'postgresql://postgres:postgres@localhost:5432/postgres',
  ssl: (!dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Drizzle ORM instance wrapping the existing pool
export const db = drizzle(pool, { schema });

pool.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    logger.error(
      `\n❌ [Database Connection Error] 無法連線至 PostgreSQL (${err.address}:${err.port})\n` +
      `📌 原因：目前連線目標為本機 127.0.0.1:5432，但您的本機 WSL 尚未啟動 PostgreSQL 服務，或尚未在 .env 設定 Supabase 的 DATABASE_URL。\n` +
      `💡 解法：\n` +
      `   1. 雲端模式（推薦）：開啟專案根目錄 .env，填入 Supabase Dashboard 提供的 DATABASE_URL。\n` +
      `   2. 本機模式：於 WSL 終端機執行 sudo service postgresql start 啟動本地資料庫。\n`
    );
  } else {
    logger.error({ err }, '[DB Pool Error]');
  }
});

// Admin Supabase Client using SUPABASE_SECRET_KEY (bypasses RLS and Supabase Auth)
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkagibktealrcxlslqzu.supabase.co';
export const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_dFYFg_OoCmEcvZU9CD4pwg_6AMkyx1i';

export const adminSupabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
