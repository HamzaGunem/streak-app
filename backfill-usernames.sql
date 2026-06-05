-- Step 1: Insert any auth users who are missing a row in profiles
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Step 2: Assign a temporary username (email prefix, sanitised) to profiles that have none.
--         Users will be redirected to /setup to pick a real one on next login.
UPDATE profiles
SET username = LOWER(REGEXP_REPLACE(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE username IS NULL
  AND email IS NOT NULL;
