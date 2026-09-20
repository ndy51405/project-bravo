import { pool } from '../config/db';

export interface ResponseItem {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}

export class ResponseRepository {
  /**
   * Save student quiz responses in a batch transaction
   */
  static async saveBatchResponses(params: {
    sessionId: string;
    quizId: string;
    userId?: string | null;
    userName?: string | null;
    items: ResponseItem[];
  }) {
    const { sessionId, quizId, userId, userName, items } = params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        await client.query(
          `INSERT INTO public.responses 
            (id, session_id, quiz_id, question_id, user_id, user_name, selected_option, is_correct, time_spent_seconds, answer_time)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            sessionId,
            quizId,
            item.questionId,
            userId || null,
            userName || null,
            item.selectedOption,
            item.isCorrect,
            item.timeSpentSeconds || 0,
          ]
        );
      }

      await client.query('COMMIT');
      return { success: true, count: items.length };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

