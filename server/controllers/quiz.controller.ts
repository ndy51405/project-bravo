import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';

export class QuizController {
  static async syncSeed(req: Request, res: Response) {
    try {
      console.log('[API] Syncing example quizzes to Supabase via DATABASE_URL & SUPABASE_SECRET_KEY...');
      const result = await QuizService.syncSeedQuizzes();
      res.json({
        success: true,
        count: result.count,
        quizzes: result.quizzes,
        message: '已成功使用 DATABASE_URL & SUPABASE_SECRET_KEY 將範例題組同步至 Supabase PostgreSQL 資料庫！',
      });
    } catch (err: any) {
      console.error('[API] Sync error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to sync quizzes to database',
      });
    }
  }

  static async getByCode(req: Request, res: Response) {
    try {
      const code = req.params.code;
      const data = await QuizService.getQuizByCode(code);
      res.json(data);
    } catch (err: any) {
      const isNotFound = err.message?.includes('查無此題組密碼');
      res.status(isNotFound ? 404 : 500).json({ error: err?.message || 'Database query error' });
    }
  }

  static async getByCreator(req: Request, res: Response) {
    try {
      const { creatorId } = req.params;
      const quizzes = await QuizService.getQuizzesByCreator(creatorId);
      res.json(quizzes);
    } catch (err: any) {
      console.error('Fetch creator quizzes error:', err);
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }

  static async getPublished(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const quizzes = await QuizService.getPublishedQuizzes(limit);
      res.json(quizzes);
    } catch (err: any) {
      console.error('Fetch published quizzes error:', err);
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }

  static async saveQuiz(req: Request, res: Response) {
    try {
      const { quiz, quizData, creator, generatedCode } = req.body;
      const targetQuiz = quiz || { quizData, generatedCode };
      const saved = await QuizService.saveQuiz(targetQuiz, creator);
      res.json({ success: true, quizId: saved.id, quizCode: saved.quizCode });
    } catch (err: any) {
      console.error('Save quiz error:', err);
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }

  static async batchSync(req: Request, res: Response) {
    try {
      const { quizzes, creator } = req.body;
      const synced = await QuizService.batchSync(quizzes, creator);
      res.json({ success: true, count: synced.length, quizzes: synced });
    } catch (err: any) {
      console.error('Batch sync error:', err);
      res.status(500).json({ error: err?.message || 'Database sync error' });
    }
  }

  static async deleteQuiz(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await QuizService.deleteQuiz(id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete quiz error:', err);
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }
}

