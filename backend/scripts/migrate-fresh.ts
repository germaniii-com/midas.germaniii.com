import 'dotenv/config';
import { execSync } from 'child_process';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('Dropping all tables...');

  await pool.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN (current_schema(), 'drizzle')) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  await pool.end();

  console.log('Running migrations...');
  execSync('npx drizzle-kit migrate', { stdio: 'inherit' });

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
