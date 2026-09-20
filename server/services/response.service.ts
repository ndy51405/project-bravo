import { ResponseRepository, ResponseItem } from '../repositories/response.repository';

export class ResponseService {
  /**
   * Submit quiz responses
   */
  static async submitResponses(payload: {
    sessionId: string;
    quizId: string;
    userId?: string | null;
    userName?: string | null;
    answers?: ResponseItem[];
    responses?: ResponseItem[];
  }) {
    const { sessionId, quizId, userId, userName, answers, responses } = payload;
    const items = answers || responses || [];

    if (!sessionId || !quizId) {
      throw new Error('缺少作答 Session 或 Quiz ID');
    }

    return ResponseRepository.saveBatchResponses({
      sessionId,
      quizId,
      userId,
      userName,
      items,
    });
  }
}

