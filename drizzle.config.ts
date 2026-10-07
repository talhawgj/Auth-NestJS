import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql', // assuming PostgreSQL since you are using Supabase
  schema: './src/db/schema.ts', // update this to the exact path of your schema file(s)
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // your supabase connection string
  },
});
