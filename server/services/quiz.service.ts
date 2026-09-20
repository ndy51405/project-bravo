import { QuizRepository } from '../repositories/quiz.repository';
import { SEED_QUIZZES } from '../seeds/seedData';

export class QuizService {
  /**
   * Sync official seed quizzes to the database
   */
  static async syncSeedQuizzes() {
    const result = await QuizRepository.syncQuizzesDirect(SEED_QUIZZES);
    return {
      count: result.count,
      quizzes: SEED_QUIZZES.map((q) => ({ id: q.id, code: q.quizCode, title: q.title })),
    };
  }

  /**
   * Find published quiz by 6-char access code
   */
  static async getQuizByCode(code: string) {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('請輸入題組代碼');
    }
    const data = await QuizRepository.findByCode(cleanCode);
    if (!data) {
      throw new Error('查無此題組密碼或該測驗尚未公開');
    }
    return data;
  }

  /**
   * Get all quizzes belonging to a specific creator
   */
  static async getQuizzesByCreator(creatorId: string) {
    if (!creatorId) {
      throw new Error('請提供建立者 ID');
    }
    return QuizRepository.findByCreatorId(creatorId);
  }

  /**
   * Save or update quiz
   */
  static async saveQuiz(quizItem: any, creatorItem?: any) {
    return QuizRepository.saveQuiz(quizItem, creatorItem);
  }

  /**
   * Batch sync quizzes
   */
  static async batchSync(quizzes: any[], creatorItem?: any) {
    return QuizRepository.batchSync(quizzes, creatorItem);
  }

  /**
   * Delete a quiz
   */
  static async deleteQuiz(id: string) {
    if (!id) {
      throw new Error('請提供題組 ID');
    }
    return QuizRepository.deleteById(id);
  }
}

