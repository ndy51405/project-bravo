import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';
import { logger } from '../utils/logger';

export class QuizController {
  static async syncSeed(req: Request, res: Response) {
    try {
      logger.info('[API] Syncing example quizzes to Supabase via DATABASE_URL & SUPABASE_SECRET_KEY...');
      const result = await QuizService.syncSeedQuizzes();
      logger.info({ count: result.count }, 'Sync seed quizzes completed successfully');
      res.json({
        success: true,
        count: result.count,
        quizzes: result.quizzes,
        message: '已成功使用 DATABASE_URL & SUPABASE_SECRET_KEY 將範例題組同步至 Supabase PostgreSQL 資料庫！',
      });
    } catch (err: any) {
      logger.error({ err }, '[API] Sync seed quizzes failed');
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to sync quizzes to database',
      });
    }
  }

  static async getByCode(req: Request, res: Response) {
    const code = req.params.code;
    try {
      const data = await QuizService.getQuizByCode(code);
      res.json(data);
    } catch (err: any) {
      const isNotFound = err.message?.includes('查無此題組密碼') || err.message?.includes('請輸入題組代碼');
      if (isNotFound) {
        logger.warn({ code, reason: err?.message }, 'Quiz code not found or invalid');
      } else {
        logger.error({ err, code }, 'Get quiz by code failed');
      }
      res.status(isNotFound ? 404 : 500).json({ error: err?.message || 'Database query error' });
    }
  }

  static async getByCreator(req: Request, res: Response) {
    const { creatorId } = req.params;
    try {
      const quizzes = await QuizService.getQuizzesByCreator(creatorId);
      res.json(quizzes);
    } catch (err: any) {
      logger.error({ err, creatorId }, 'Fetch creator quizzes error');
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }

  static async getPublished(req: Request, res: Response) {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    try {
      const quizzes = await QuizService.getPublishedQuizzes(limit);
      res.json(quizzes);
    } catch (err: any) {
      logger.error({ err, limit }, 'Fetch published quizzes error');
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }

  static async saveQuiz(req: Request, res: Response) {
    const { quiz, quizData, creator, generatedCode } = req.body || {};
    try {
      const targetQuiz = quiz || { quizData, generatedCode };
      const saved = await QuizService.saveQuiz(targetQuiz, creator);
      logger.info(
        { quizId: saved.id, quizCode: saved.quizCode, creatorId: creator?.id },
        'Quiz saved successfully'
      );
      res.json({ success: true, quizId: saved.id, quizCode: saved.quizCode });
    } catch (err: any) {
      logger.error({ err, creatorId: creator?.id }, 'Save quiz error');
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }

  static async batchSync(req: Request, res: Response) {
    const { quizzes, creator } = req.body || {};
    try {
      const synced = await QuizService.batchSync(quizzes, creator);
      logger.info(
        { count: synced.length, creatorId: creator?.id },
        'Batch sync quizzes completed successfully'
      );
      res.json({ success: true, count: synced.length, quizzes: synced });
    } catch (err: any) {
      logger.error({ err, count: quizzes?.length, creatorId: creator?.id }, 'Batch sync error');
      res.status(500).json({ error: err?.message || 'Database sync error' });
    }
  }

  static async deleteQuiz(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await QuizService.deleteQuiz(id);
      logger.info({ quizId: id }, 'Quiz deleted successfully');
      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err, quizId: id }, 'Delete quiz error');
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }
}

