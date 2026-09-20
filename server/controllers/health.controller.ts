import { Request, Response } from 'express';
import { QuizRepository } from '../repositories/quiz.repository';

export class HealthController {
  static async check(req: Request, res: Response) {
    try {
      const { timestamp, counts } = await QuizRepository.getHealthCounts();

      res.json({
        status: 'ok',
        connection: 'connected',
        method: 'DATABASE_URL (Direct PostgreSQL) & SUPABASE_SECRET_KEY',
        timestamp,
        counts,
      });
    } catch (err: any) {
      console.error('Health check error:', err);
      res.status(500).json({
        status: 'error',
        connection: 'failed',
        message: err?.message || 'Database connection error',
      });
    }
  }
}

