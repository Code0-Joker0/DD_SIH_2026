-- ============================================================================
-- Singularity Enterprise - PostgreSQL Database Schema
-- Problem Statement: Secure On-Premise Enterprise File Storage & Workbench
-- Encryption: AES-256-GCM with per-file unique IV, Auth Tag, and SHA-256 Checksum
-- ============================================================================

-- Ensure pgcrypto extension is available for UUID generation (Native in PGlite)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Users Table (Enterprise Personnel & Authentication)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' 
        CHECK (role IN ('admin', 'manager', 'engineer', 'employee', 'auditor')),
    department VARCHAR(100) NOT NULL DEFAULT 'Engineering',
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- ----------------------------------------------------------------------------
-- 2. Company Files Table (Encrypted File Storage & Metadata)
-- Encrypted Binary Payload (BYTEA) is stored directly in PostgreSQL with AES-256-GCM
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,              -- Internal unique filename
    original_name VARCHAR(255) NOT NULL,         -- Original uploaded filename
    mime_type VARCHAR(120) NOT NULL,             -- MIME type (e.g. application/pdf)
    file_size BIGINT NOT NULL,                   -- Original unencrypted size in bytes
    encrypted_size BIGINT NOT NULL,             -- Ciphertext size in bytes
    encrypted_data BYTEA NOT NULL,               -- AES-256-GCM encrypted binary file payload
    encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    encryption_iv VARCHAR(64) NOT NULL,          -- Hex-encoded 96-bit Initialization Vector
    encryption_auth_tag VARCHAR(64) NOT NULL,    -- Hex-encoded 128-bit GCM Authentication Tag
    checksum_sha256 VARCHAR(64) NOT NULL,        -- SHA-256 integrity hash of original content
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'General',
    category VARCHAR(50) NOT NULL DEFAULT 'Document'
        CHECK (category IN ('PDF', 'DOCX', 'Spreadsheet', 'Data', 'Image', 'Code', 'Document', 'Other')),
    status VARCHAR(50) NOT NULL DEFAULT 'Verified'
        CHECK (status IN ('Verified', 'Pending', 'Quarantined', 'Archived')),
    is_company_wide BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,          -- Extracted tags, OCR summaries, notes
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_files_uploaded_by ON company_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_company_files_department ON company_files(department);
CREATE INDEX IF NOT EXISTS idx_company_files_category ON company_files(category);
CREATE INDEX IF NOT EXISTS idx_company_files_created_at ON company_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_files_status ON company_files(status);

-- ----------------------------------------------------------------------------
-- 3. File Audit Logs Table (Access Logs & Security Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS file_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    file_id UUID REFERENCES company_files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL 
        CHECK (action IN ('UPLOAD', 'DOWNLOAD', 'VIEW', 'DELETE', 'UPDATE_PERMISSIONS', 'VERIFY_INTEGRITY')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' 
        CHECK (status IN ('SUCCESS', 'FAILED', 'DENIED')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_audit_logs_file_id ON file_audit_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_user_id ON file_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_audit_logs_created_at ON file_audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_company_files_updated_at ON company_files;
CREATE TRIGGER trg_company_files_updated_at
BEFORE UPDATE ON company_files
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

