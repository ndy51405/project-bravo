import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password, displayName } = req.body || {};
    try {
      const user = await AuthService.registerUser(email, password, displayName);
      logger.info({ userId: user.id, email: user.email }, 'User registration succeeded');
      return res.json({
        success: true,
        user,
      });
    } catch (err: any) {
      const isClientError = err.message?.includes('請提供') || err.message?.includes('此電子信箱已註冊');
      if (isClientError) {
        logger.warn({ email, reason: err?.message }, 'User registration rejected (client validation)');
      } else {
        logger.error({ email, err }, 'User registration failed (server error)');
      }
      return res.status(isClientError ? 400 : 500).json({
        error: err?.message || '註冊失敗',
      });
    }
  }
}

