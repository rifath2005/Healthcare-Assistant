-- Migration 08: Field-Level Column Encryption (pgcrypto helper setup)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper functions for database-level symmetric encryption if executing via SQL queries
CREATE OR REPLACE FUNCTION encrypt_clinical_note(content TEXT, secret_key TEXT)
RETURNS BYTEA
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT pgp_sym_encrypt(content, secret_key, 'cipher-algo=aes256');
$$;

CREATE OR REPLACE FUNCTION decrypt_clinical_note(encrypted_content BYTEA, secret_key TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT pgp_sym_decrypt(encrypted_content, secret_key);
$$;
