import crypto from 'crypto';
import { eq, and, desc, asc, inArray, sql, count } from 'drizzle-orm';
import { db } from '../config/db';
import * as schema from '../db/schema';
import { SeedQuiz } from '../seeds/seedData';

export class QuizRepository {
  /**
   * Sync seed quizzes directly inside a PostgreSQL Transaction using Drizzle
   */
  static async syncQuizzesDirect(quizzesToSync: SeedQuiz[]) {
    return await db.transaction(async (tx) => {
      for (const q of quizzesToSync) {
        await tx
          .insert(schema.quizzes)
          .values({
            id: q.id,
            creatorId: q.creatorId,
            creatorName: '陳教授 (Prof. Chen)',
            title: q.title,
            description: q.description,
            quizCode: q.quizCode,
            isPublished: q.isPublished,
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: schema.quizzes.id,
            set: {
              creatorName: '陳教授 (Prof. Chen)',
              title: q.title,
              description: q.description,
              quizCode: q.quizCode,
              isPublished: q.isPublished,
              updatedAt: new Date().toISOString(),
            },
          });

        // Delete old questions to maintain order consistency
        await tx.delete(schema.questions).where(eq(schema.questions.quizId, q.id));

        for (const qst of q.questions) {
          await tx.insert(schema.questions).values({
            id: qst.id,
            quizId: q.id,
            questionOrder: qst.order,
            questionText: qst.text,
            correctOption: qst.correct,
            explanation: qst.explanation || null,
            updatedAt: new Date().toISOString(),
          });

          for (const opt of qst.options) {
            await tx
              .insert(schema.options)
              .values({
                questionId: qst.id,
                optionKey: opt.key,
                optionText: opt.text,
              })
              .onConflictDoUpdate({
                target: [schema.options.questionId, schema.options.optionKey],
                set: {
                  optionText: opt.text,
                },
              });
          }
        }
      }

      return { success: true, count: quizzesToSync.length };
    });
  }

  /**
   * Find a published quiz by its unique 6-character code using Drizzle Relational Queries
   */
  static async findByCode(code: string) {
    const found = await db.query.quizzes.findFirst({
      where: and(
        eq(schema.quizzes.quizCode, code.toUpperCase()),
        eq(schema.quizzes.isPublished, true)
      ),
      with: {
        questions: {
          orderBy: [asc(schema.questions.questionOrder)],
          with: {
            options: {
              orderBy: [asc(schema.options.optionKey)],
            },
          },
        },
      },
    });

    if (!found) {
      return null;
    }

    const questions = (found.questions || []).map((qst) => ({
      id: qst.id,
      quizId: qst.quizId,
      questionOrder: qst.questionOrder,
      questionText: qst.questionText,
      correctOption: qst.correctOption,
      explanation: qst.explanation || '',
      options: (qst.options || []).map((opt) => ({
        optionKey: opt.optionKey,
        optionText: opt.optionText,
      })),
    }));

    return {
      quiz: {
        id: found.id,
        creatorId: found.creatorId,
        creatorName: found.creatorName || '出題者',
        title: found.title,
        description: found.description || '',
        quizCode: found.quizCode,
        isPublished: found.isPublished,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
        questions,
      },
      questions,
    };
  }

  /**
   * Find all quizzes created by a specific user with aggregated stats
   */
  static async findByCreatorId(creatorId: string) {
    const rows = await db
      .select({
        id: schema.quizzes.id,
        creatorId: schema.quizzes.creatorId,
        creatorName: schema.quizzes.creatorName,
        title: schema.quizzes.title,
        description: schema.quizzes.description,
        quizCode: schema.quizzes.quizCode,
        isPublished: schema.quizzes.isPublished,
        createdAt: schema.quizzes.createdAt,
        updatedAt: schema.quizzes.updatedAt,
        takerCount: sql<number>`count(distinct ${schema.responses.sessionId})::int`,
        averageScore: sql<number>`coalesce(avg(case when ${schema.responses.isCorrect} then 100.0 else 0.0 end), 0)::float`,
      })
      .from(schema.quizzes)
      .leftJoin(schema.responses, eq(schema.quizzes.id, schema.responses.quizId))
      .where(eq(schema.quizzes.creatorId, creatorId))
      .groupBy(schema.quizzes.id)
      .orderBy(desc(schema.quizzes.createdAt));

    const quizIds = rows.map((r) => r.id);
    let questionsWithOpts: any[] = [];

    if (quizIds.length > 0) {
      questionsWithOpts = await db.query.questions.findMany({
        where: inArray(schema.questions.quizId, quizIds),
        orderBy: [asc(schema.questions.questionOrder)],
        with: {
          options: {
            orderBy: [asc(schema.options.optionKey)],
          },
        },
      });
    }

    return rows.map((row) => {
      const qList = questionsWithOpts
        .filter((qst) => qst.quizId === row.id)
        .map((qst) => ({
          id: qst.id,
          quizId: qst.quizId,
          questionOrder: qst.questionOrder,
          questionText: qst.questionText,
          correctOption: qst.correctOption,
          explanation: qst.explanation || '',
          options: (qst.options || []).map((o: any) => ({
            optionKey: o.optionKey,
            optionText: o.optionText,
          })),
        }));

      return {
        id: row.id,
        creatorId: row.creatorId,
        creatorName: row.creatorName || '出題者',
        title: row.title,
        description: row.description || '',
        quizCode: row.quizCode,
        isPublished: row.isPublished,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        questions: qList,
        takerCount: row.takerCount || 0,
        averageScore: Math.round(row.averageScore || 0),
      };
    });
  }

  /**
   * Save or update a single quiz with its questions and options inside a transaction
   */
  static async saveQuiz(quizItem: any, creatorItem?: any) {
    return await db.transaction(async (tx) => {
      return await this._saveQuizInternal(tx, quizItem, creatorItem);
    });
  }

  /**
   * Batch save quizzes inside a transaction
   */
  static async batchSync(quizzes: any[], creatorItem?: any) {
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return [];
    }

    return await db.transaction(async (tx) => {
      const synced: any[] = [];
      for (const q of quizzes) {
        const saved = await this._saveQuizInternal(tx, q, creatorItem);
        synced.push(saved);
      }
      return synced;
    });
  }

  /**
   * Internal transactional worker to upsert a quiz and its questions
   */
  private static async _saveQuizInternal(tx: any, quizItem: any, creatorItem?: any) {
    const qTitle = (quizItem.title || quizItem.quizData?.title || '').trim();
    const qDesc = (quizItem.description || quizItem.quizData?.description || '').trim();
    let qCode = (
      quizItem.quizCode ||
      quizItem.generatedCode ||
      quizItem.code ||
      quizItem.quizData?.quizCode ||
      ''
    )
      .trim()
      .toUpperCase();
    const qId = quizItem.id || quizItem.quizData?.id || crypto.randomUUID();
    const cId = creatorItem?.id || quizItem.creatorId || '00000000-0000-0000-0000-000000000001';
    const cName = creatorItem?.displayName || quizItem.creatorName || '出題者';
    const rawQuestions = quizItem.questions || quizItem.quizData?.questions || [];

    if (!qTitle) {
      throw new Error('題組標題不能為空');
    }

    // If updating an existing quiz and quizCode was not provided, look it up from database
    if (!qCode && quizItem.id) {
      const existing = await tx
        .select({ quizCode: schema.quizzes.quizCode })
        .from(schema.quizzes)
        .where(eq(schema.quizzes.id, quizItem.id))
        .limit(1);

      if (existing.length > 0) {
        qCode = existing[0].quizCode;
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
        const check = await tx
          .select({ id: schema.quizzes.id })
          .from(schema.quizzes)
          .where(eq(schema.quizzes.quizCode, candidate))
          .limit(1);

        if (check.length === 0) {
          qCode = candidate;
          isUnique = true;
        }
      }
    }

    await tx
      .insert(schema.quizzes)
      .values({
        id: qId,
        creatorId: cId,
        creatorName: cName,
        title: qTitle,
        description: qDesc,
        quizCode: qCode,
        isPublished: true,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.quizzes.id,
        set: {
          creatorName: cName,
          title: qTitle,
          description: qDesc,
          quizCode: qCode,
          isPublished: true,
          updatedAt: new Date().toISOString(),
        },
      });

    // Delete old questions
    await tx.delete(schema.questions).where(eq(schema.questions.quizId, qId));

    let order = 1;
    for (const qst of rawQuestions) {
      const qstId =
        qst.id && qst.id.includes('-') && qst.id.length === 36 ? qst.id : crypto.randomUUID();
      const qstOrder = qst.questionOrder || qst.order || order++;
      const qstText = (qst.questionText || qst.text || '').trim();
      const correctOpt = qst.correctOption || qst.correct || 'A';
      const expl = (qst.explanation || '').trim();

      await tx.insert(schema.questions).values({
        id: qstId,
        quizId: qId,
        questionOrder: qstOrder,
        questionText: qstText,
        correctOption: correctOpt,
        explanation: expl || null,
        updatedAt: new Date().toISOString(),
      });

      const options = qst.options || [];
      for (const opt of options) {
        const optKey = opt.optionKey || opt.key;
        const optText = (opt.optionText || opt.text || '').trim();
        await tx
          .insert(schema.options)
          .values({
            questionId: qstId,
            optionKey: optKey,
            optionText: optText,
          })
          .onConflictDoUpdate({
            target: [schema.options.questionId, schema.options.optionKey],
            set: { optionText: optText },
          });
      }
    }

    return { id: qId, quizCode: qCode, title: qTitle };
  }

  /**
   * Delete quiz by ID
   */
  static async deleteById(id: string) {
    return await db.delete(schema.quizzes).where(eq(schema.quizzes.id, id));
  }

  /**
   * Get counts for health check
   */
  static async getHealthCounts() {
    const [qCount] = await db.select({ val: count() }).from(schema.quizzes);
    const [qstCount] = await db.select({ val: count() }).from(schema.questions);
    const [optCount] = await db.select({ val: count() }).from(schema.options);
    const [resCount] = await db.select({ val: count() }).from(schema.responses);

    return {
      timestamp: new Date().toISOString(),
      counts: {
        users: 0,
        quizzes: Number(qCount?.val || 0),
        questions: Number(qstCount?.val || 0),
        options: Number(optCount?.val || 0),
        responses: Number(resCount?.val || 0),
      },
    };
  }
}
