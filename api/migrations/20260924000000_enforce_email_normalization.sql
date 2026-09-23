-- Normalize existing emails in users table
UPDATE users SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));

-- Normalize existing emails in user_administrators table
UPDATE user_administrators SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));

-- Add check constraints to enforce lowercase and trimmed email addresses
ALTER TABLE users
    ADD CONSTRAINT check_users_email_normalized CHECK (email = LOWER(TRIM(email)));

ALTER TABLE user_administrators
    ADD CONSTRAINT check_user_administrators_email_normalized CHECK (email = LOWER(TRIM(email)));
