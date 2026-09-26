import { Request, Response } from 'express';
import { ResponseService } from '../services/response.service';
import { logger } from '../utils/logger';

export class ResponseController {
  static async submitResponse(req: Request, res: Response) {
    const { sessionId, quizId, userId, userName, answers, responses } = req.body || {};
    if (!sessionId || !quizId) {
      logger.warn({ sessionId, quizId }, 'Submit response rejected: missing sessionId or quizId');
      return res.status(400).json({ error: '缺少作答 Session 或 Quiz ID' });
    }

    try {
      await ResponseService.submitResponses({
        sessionId,
        quizId,
        userId,
        userName,
        answers,
        responses,
      });
      logger.info(
        { sessionId, quizId, userId: userId || null, answerCount: (answers || responses || []).length },
        'Quiz response submitted successfully'
      );
      res.json({ success: true });
    } catch (err: any) {
      logger.error({ err, sessionId, quizId, userId }, 'Submit response failed');
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }
}

