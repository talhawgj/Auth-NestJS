
import {pgEnum, pgTable, text,uuid ,pgSchema} from 'drizzle-orm/pg-core';

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
