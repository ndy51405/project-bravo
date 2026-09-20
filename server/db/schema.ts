import { pgTable, uuid, varchar, text, boolean, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';

// 1. Quizzes (題組主表)
export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull(),
  creatorName: varchar('creator_name', { length: 100 }).default('出題者'),
  title: varchar('title', { length: 150 }).notNull(),
  description: text('description'),
  quizCode: text('quiz_code').notNull().unique(),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// 2. Questions (題目表)
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionOrder: integer('question_order').notNull().default(1),
  questionText: text('question_text').notNull(),
  correctOption: varchar('correct_option', { length: 1 }).notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// 3. Options (選項表)
export const options = pgTable('options', {
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  optionKey: varchar('option_key', { length: 1 }).notNull(),
  optionText: text('option_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.questionId, table.optionKey] }),
]);

// 4. Responses (作答記錄表)
export const responses = pgTable('responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(),
  userId: uuid('user_id'),
  userName: varchar('user_name', { length: 100 }),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  selectedOption: varchar('selected_option', { length: 1 }).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').notNull().default(0),
  answerTime: timestamp('answer_time', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

// Relations
export const quizzesRelations = relations(quizzes, ({ many }) => ({
  questions: many(questions),
  responses: many(responses),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  options: many(options),
  responses: many(responses),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.questionId],
    references: [questions.id],
  }),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [responses.quizId],
    references: [quizzes.id],
  }),
  question: one(questions, {
    fields: [responses.questionId],
    references: [questions.id],
  }),
}));

// Export Types
export type SelectQuiz = InferSelectModel<typeof quizzes>;
export type InsertQuiz = InferInsertModel<typeof quizzes>;
export type SelectQuestion = InferSelectModel<typeof questions>;
export type InsertQuestion = InferInsertModel<typeof questions>;
export type SelectOption = InferSelectModel<typeof options>;
export type InsertOption = InferInsertModel<typeof options>;
export type SelectResponse = InferSelectModel<typeof responses>;
export type InsertResponse = InferInsertModel<typeof responses>;

