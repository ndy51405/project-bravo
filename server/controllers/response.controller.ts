import { Request, Response } from 'express';
import { ResponseService } from '../services/response.service';

export class ResponseController {
  static async submitResponse(req: Request, res: Response) {
    try {
      const { sessionId, quizId, userId, userName, answers, responses } = req.body;
      await ResponseService.submitResponses({
        sessionId,
        quizId,
        userId,
        userName,
        answers,
        responses,
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Submit response error:', err);
      res.status(500).json({ error: err?.message || 'Database error' });
    }
  }
}

