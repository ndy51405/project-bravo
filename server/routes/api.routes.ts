import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { AuthController } from '../controllers/auth.controller';
import { QuizController } from '../controllers/quiz.controller';
import { ResponseController } from '../controllers/response.controller';

const router = Router();

// Health
router.get('/health', HealthController.check);

// Auth
router.post('/auth/register', AuthController.register);

// Quizzes
router.post('/sync-quizzes', QuizController.syncSeed);
router.get('/quizzes/code/:code', QuizController.getByCode);
router.get('/quizzes/creator/:creatorId', QuizController.getByCreator);
router.post('/quizzes', QuizController.saveQuiz);
router.post('/quizzes/batch-sync', QuizController.batchSync);
router.delete('/quizzes/:id', QuizController.deleteQuiz);

// Responses
router.post('/responses', ResponseController.submitResponse);

export default router;

