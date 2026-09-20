import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, displayName } = req.body || {};
      const user = await AuthService.registerUser(email, password, displayName);
      return res.json({
        success: true,
        user,
      });
    } catch (err: any) {
      const isClientError = err.message?.includes('請提供') || err.message?.includes('此電子信箱已註冊');
      return res.status(isClientError ? 400 : 500).json({
        error: err?.message || '註冊失敗',
      });
    }
  }
}

