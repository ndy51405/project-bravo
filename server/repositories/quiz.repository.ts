import { pool } from '../config/db';
import { SeedQuiz } from '../seeds/seedData';

export class QuizRepository {
  /**
   * Sync seed quizzes directly inside a PostgreSQL Transaction
   */
  static async syncQuizzesDirect(quizzesToSync: SeedQuiz[]) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const q of quizzesToSync) {
        await client.query(
          `INSERT INTO public.quizzes (id, creator_id, creator_name, title, description, quiz_code, is_published, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             creator_name = EXCLUDED.creator_name,
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             quiz_code = EXCLUDED.quiz_code,
             is_published = EXCLUDED.is_published,
             updated_at = NOW()`,
          [q.id, q.creatorId, '陳教授 (Prof. Chen)', q.title, q.description, q.quizCode, q.isPublished]
        );

        // Delete old questions to maintain order consistency
        await client.query('DELETE FROM public.questions WHERE quiz_id = $1', [q.id]);

        for (const qst of q.questions) {
          await client.query(
            `INSERT INTO public.questions (id, quiz_id, question_order, question_text, correct_option, explanation, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [qst.id, q.id, qst.order, qst.text, qst.correct, qst.explanation]
          );

          for (const opt of qst.options) {
            await client.query(
              `INSERT INTO public.options (question_id, option_key, option_text)
               VALUES ($1, $2, $3)
               ON CONFLICT (question_id, option_key) DO UPDATE SET option_text = EXCLUDED.option_text`,
              [qst.id, opt.key, opt.text]
            );
          }
        }
      }

      await client.query('COMMIT');
      return { success: true, count: quizzesToSync.length };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Find a published quiz by its unique 6-character code
   */
  static async findByCode(code: string) {
    const quizRes = await pool.query(
      `SELECT q.*, COALESCE(q.creator_name, '出題者') as creator_name 
       FROM public.quizzes q
       WHERE q.quiz_code = $1 AND q.is_published = true`,
      [code]
    );

    if (quizRes.rows.length === 0) {
      return null;
    }

    const quizRow = quizRes.rows[0];

    // Fetch questions
    const qstRes = await pool.query(
      `SELECT * FROM public.questions WHERE quiz_id = $1 ORDER BY question_order ASC`,
      [quizRow.id]
    );

    // Fetch options
    const questionIds = qstRes.rows.map((r) => r.id);
    let optionsRows: any[] = [];
    if (questionIds.length > 0) {
      const optRes = await pool.query(
        `SELECT * FROM public.options WHERE question_id = ANY($1::uuid[]) ORDER BY option_key ASC`,
        [questionIds]
      );
      optionsRows = optRes.rows;
    }

    const questions = qstRes.rows.map((qst) => ({
      id: qst.id,
      quizId: qst.quiz_id,
      questionOrder: qst.question_order,
      questionText: qst.question_text,
      correctOption: qst.correct_option,
      explanation: qst.explanation || '',
      options: optionsRows
        .filter((opt) => opt.question_id === qst.id)
        .map((opt) => ({
          optionKey: opt.option_key,
          optionText: opt.option_text,
        })),
    }));

    return {
      quiz: {
        id: quizRow.id,
        creatorId: quizRow.creator_id,
        creatorName: quizRow.creator_name || '出題者',
        title: quizRow.title,
        description: quizRow.description || '',
        quizCode: quizRow.quiz_code,
        isPublished: quizRow.is_published,
        createdAt: quizRow.created_at,
        updatedAt: quizRow.updated_at,
        questions,
      },
      questions,
    };
  }

  /**
   * Find all quizzes created by a specific user with aggregated stats
   */
  static async findByCreatorId(creatorId: string) {
    const client = await pool.connect();
    try {
      const qRes = await client.query(
        `SELECT q.*, 
                COUNT(DISTINCT r.session_id) as taker_count,
                COALESCE(AVG(CASE WHEN r.is_correct THEN 100.0 ELSE 0.0 END), 0) as average_score
         FROM public.quizzes q
         LEFT JOIN public.responses r ON q.id = r.quiz_id
         WHERE q.creator_id = $1
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [creatorId]
      );

      const quizIds = qRes.rows.map((r) => r.id);
      let questionsRows: any[] = [];
      let optionsRows: any[] = [];

      if (quizIds.length > 0) {
        const qstRes = await client.query(
          `SELECT * FROM public.questions WHERE quiz_id = ANY($1::uuid[]) ORDER BY question_order ASC`,
          [quizIds]
        );
        questionsRows = qstRes.rows;

        const qstIds = questionsRows.map((r) => r.id);
        if (qstIds.length > 0) {
          const optRes = await client.query(
            `SELECT * FROM public.options WHERE question_id = ANY($1::uuid[]) ORDER BY option_key ASC`,
            [qstIds]
          );
          optionsRows = optRes.rows;
        }
      }

      return qRes.rows.map((row) => {
        const qList = questionsRows
          .filter((qst) => qst.quiz_id === row.id)
          .map((qst) => ({
            id: qst.id,
            quizId: qst.quiz_id,
            questionOrder: qst.question_order,
            questionText: qst.question_text,
            correctOption: qst.correct_option,
            explanation: qst.explanation || '',
            options: optionsRows
              .filter((o) => o.question_id === qst.id)
              .map((o) => ({ optionKey: o.option_key, optionText: o.option_text })),
          }));

        return {
          id: row.id,
          creatorId: row.creator_id,
          title: row.title,
          description: row.description || '',
          quizCode: row.quiz_code,
          isPublished: row.is_published,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          questions: qList,
          takerCount: parseInt(row.taker_count || '0', 10),
          averageScore: Math.round(parseFloat(row.average_score || '0')),
        };
      });
    } finally {
      client.release();
    }
  }

  /**
   * Save or update a single quiz with its questions and options inside a transaction
   */
  static async saveQuiz(quizItem: any, creatorItem?: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const saved = await this._saveQuizInternal(client, quizItem, creatorItem);
      await client.query('COMMIT');
      return saved;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Batch save quizzes inside a transaction
   */
  static async batchSync(quizzes: any[], creatorItem?: any) {
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return [];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const synced: any[] = [];
      for (const q of quizzes) {
        const saved = await this._saveQuizInternal(client, q, creatorItem);
        synced.push(saved);
      }
      await client.query('COMMIT');
      return synced;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Internal transactional worker to upsert a quiz and its questions
   */
  private static async _saveQuizInternal(client: any, quizItem: any, creatorItem?: any) {
    const qTitle = (quizItem.title || quizItem.quizData?.title || '').trim();
    const qDesc = (quizItem.description || quizItem.quizData?.description || '').trim();
    let qCode = (quizItem.quizCode || quizItem.generatedCode || quizItem.code || quizItem.quizData?.quizCode || '').trim().toUpperCase();
    const qId = quizItem.id || quizItem.quizData?.id || crypto.randomUUID();
    const cId = creatorItem?.id || quizItem.creatorId || '00000000-0000-0000-0000-000000000001';
    const cName = creatorItem?.displayName || quizItem.creatorName || '出題者';
    const rawQuestions = quizItem.questions || quizItem.quizData?.questions || [];

    if (!qTitle) {
      throw new Error('題組標題不能為空');
    }

    // If updating an existing quiz and quizCode was not provided, look it up from database
    if (!qCode && quizItem.id) {
      const existing = await client.query('SELECT quiz_code FROM public.quizzes WHERE id = $1', [quizItem.id]);
      if (existing.rows.length > 0) {
        qCode = existing.rows[0].quiz_code;
      }
    }

    // If creating a new quiz (or code still missing), generate a valid 6-character uppercase alphanumeric code
    if (!qCode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let isUnique = false;
      while (!isUnique) {
        let candidate = '';
        for (let i = 0; i < 6; i++) {
          candidate += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const check = await client.query('SELECT 1 FROM public.quizzes WHERE quiz_code = $1', [candidate]);
        if (check.rows.length === 0) {
          qCode = candidate;
          isUnique = true;
        }
      }
    }


    await client.query(
      `INSERT INTO public.quizzes (id, creator_id, creator_name, title, description, quiz_code, is_published, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET 
         creator_name = EXCLUDED.creator_name,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         quiz_code = EXCLUDED.quiz_code,
         is_published = EXCLUDED.is_published,
         updated_at = NOW()`,
      [qId, cId, cName, qTitle, qDesc, qCode, true]
    );

    // Delete old questions
    await client.query('DELETE FROM public.questions WHERE quiz_id = $1', [qId]);

    let order = 1;
    for (const qst of rawQuestions) {
      const qstId = qst.id && qst.id.includes('-') && qst.id.length === 36 ? qst.id : crypto.randomUUID();
      const qstOrder = qst.questionOrder || qst.order || order++;
      const qstText = (qst.questionText || qst.text || '').trim();
      const correctOpt = qst.correctOption || qst.correct || 'A';
      const expl = (qst.explanation || '').trim();

      await client.query(
        `INSERT INTO public.questions (id, quiz_id, question_order, question_text, correct_option, explanation, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [qstId, qId, qstOrder, qstText, correctOpt, expl || null]
      );

      const options = qst.options || [];
      for (const opt of options) {
        const optKey = opt.optionKey || opt.key;
        const optText = (opt.optionText || opt.text || '').trim();
        await client.query(
          `INSERT INTO public.options (question_id, option_key, option_text)
           VALUES ($1, $2, $3)
           ON CONFLICT (question_id, option_key) DO UPDATE SET option_text = EXCLUDED.option_text`,
          [qstId, optKey, optText]
        );
      }
    }

    return { id: qId, quizCode: qCode, title: qTitle };
  }

  /**
   * Delete quiz by ID
   */
  static async deleteById(id: string) {
    return pool.query('DELETE FROM public.quizzes WHERE id = $1', [id]);
  }

  /**
   * Get counts for health check
   */
  static async getHealthCounts() {
    const dbRes = await pool.query('SELECT NOW() as current_time');
    const tableCounts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.quizzes) AS quizzes_count,
        (SELECT COUNT(*) FROM public.questions) AS questions_count,
        (SELECT COUNT(*) FROM public.options) AS options_count,
        (SELECT COUNT(*) FROM public.responses) AS responses_count
    `);

    return {
      timestamp: dbRes.rows[0].current_time,
      counts: {
        users: 0,
        quizzes: parseInt(tableCounts.rows[0].quizzes_count, 10),
        questions: parseInt(tableCounts.rows[0].questions_count, 10),
        options: parseInt(tableCounts.rows[0].options_count, 10),
        responses: parseInt(tableCounts.rows[0].responses_count, 10),
      },
    };
  }
}

