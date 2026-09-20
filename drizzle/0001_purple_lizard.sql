-- 1. 若有既有非 4 位數字的代碼，動態將其安全轉換為未被使用的 4 位數字
DO $$
DECLARE
    r RECORD;
    new_code TEXT;
    counter INT := 1000;
BEGIN
    FOR r IN SELECT id, quiz_code FROM "quizzes" WHERE "quiz_code" !~ '^[0-9]{4}$' LOOP
        LOOP
            new_code := LPAD(counter::text, 4, '0');
            counter := counter + 1;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM "quizzes" WHERE "quiz_code" = new_code);
        END LOOP;
        UPDATE "quizzes" SET "quiz_code" = new_code WHERE id = r.id;
    END LOOP;
END $$;
--> statement-breakpoint

-- 2. 調整欄位型態為 text
ALTER TABLE "quizzes" ALTER COLUMN "quiz_code" SET DATA TYPE text;
--> statement-breakpoint

-- 3. 更新 CHECK 約束：確保 quiz_code 僅為 4 位純數字
ALTER TABLE "quizzes" DROP CONSTRAINT IF EXISTS "quiz_code_uppercase_alphanumeric";
--> statement-breakpoint
ALTER TABLE "quizzes" DROP CONSTRAINT IF EXISTS "quiz_code_four_digits";
--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quiz_code_four_digits" CHECK ("quiz_code" ~ '^[0-9]{4}$');