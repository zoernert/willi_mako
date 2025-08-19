-- test-connection.sql
-- Simple SQL script to test the database connection

SELECT current_database() AS "Current Database",
       current_user AS "Current User",
       version() AS "PostgreSQL Version";

-- Show all tables in the current schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
