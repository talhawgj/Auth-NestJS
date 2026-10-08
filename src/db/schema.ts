
import {pgEnum, pgTable, text,uuid ,pgSchema, timestamp} from 'drizzle-orm/pg-core';

export const publicSchema = pgSchema('loki');
export const USER_ROLES = ['user', 'admin'] as const;
export type UserRoleType = (typeof USER_ROLES)[number];
export const UserRole = pgEnum('users_roles', USER_ROLES);


export const users = publicSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: UserRole('role').notNull().default('user'),
});


export const refresh_tokens = publicSchema.table('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  userAgent: text('user_agent').notNull(),
  ipAddress: text('ip_address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export type RefreshToken = typeof refresh_tokens.$inferSelect;
export type NewRefreshToken = typeof refresh_tokens.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
