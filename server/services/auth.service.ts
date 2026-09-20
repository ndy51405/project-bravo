import { adminSupabase } from '../config/db';

export class AuthService {
  /**
   * Register a user via Supabase Auth Admin API (bypasses email delivery & auto-confirms)
   */
  static async registerUser(email: string, password: string, displayName?: string) {
    if (!email || !password) {
      throw new Error('請提供電子郵件與密碼');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const name = String(displayName || '').trim() || cleanEmail.split('@')[0];

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password: String(password).trim(),
      email_confirm: true, // Auto-confirm email so no verification link is required
      user_metadata: {
        display_name: name,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      },
    });

    if (error) {
      console.warn('[AuthService.registerUser] Supabase error:', error.message);
      if (error.message.includes('already been registered') || error.message.includes('already registered')) {
        throw new Error('此電子信箱已註冊，請直接進行登入');
      }
      throw new Error(error.message);
    }

    const user = data.user;
    return {
      id: user.id,
      email: user.email,
      displayName: name,
      authProvider: 'supabase',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id)}`,
      createdAt: user.created_at,
    };
  }
}

