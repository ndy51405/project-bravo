-- ========================================================================
-- Supabase RLS 權限更新腳本 (針對 Publishable Key / 前端應用程式直接讀寫)
-- 請複製以下 SQL，至 Supabase Dashboard -> SQL Editor 執行此腳本即可開通權限！
-- ========================================================================

-- 解除資料表 RLS 嚴格限制，允許前端使用 Publishable Key 進行新增、讀取與刪除
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responses DISABLE ROW LEVEL SECURITY;

-- 授權 anon (未登入/訪客/Publishable Key) 與 authenticated (登入者) 角色存取權限
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.quizzes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.questions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.options TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.responses TO anon, authenticated, service_role;

-- 確保序列 (如有) 權限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 插入一筆系統預設使用者，避免出題者 UUID 外鍵關聯失敗
INSERT INTO public.users (id, display_name, email, auth_provider)
VALUES ('00000000-0000-0000-0000-000000000001', '預設出題者 (Prof. Chen)', 'chen.quiz@example.edu.tw', 'anonymous')
ON CONFLICT (id) DO NOTHING;
