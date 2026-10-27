// Tables and columns the app creates for itself. These used to be created
// lazily inside request handlers; they now run once when the server starts.
//
// The core tables (users, events, event_bookings, organizations, meetings,
// news, ...) are not created here: they must already exist in the database.

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS password_reset_codes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reset_user (user_id),
    KEY idx_reset_code (code_hash)
  ) ENGINE=InnoDB`,

  // Finished events are copied here by archiveExpiredEvents().
  `CREATE TABLE IF NOT EXISTS finished_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    original_event_id BIGINT NOT NULL,
    title VARCHAR(255) NULL,
    description TEXT NULL,
    image_url TEXT NULL,
    start_time DATETIME NULL,
    end_time DATETIME NULL,
    created_by_email VARCHAR(255) NULL,
    max_participants INT NULL,
    visibility VARCHAR(20) NULL,
    speaker LONGTEXT NULL,
    agenda LONGTEXT NULL,
    original_created_at DATETIME NULL,
    finished_at DATETIME NULL,
    deleted_at DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_finished_event_original (original_event_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS finished_event_participants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    original_event_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    email VARCHAR(255) NULL,
    first_name VARCHAR(255) NULL,
    last_name VARCHAR(255) NULL,
    company_name VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_finished_event_participant (original_event_id, user_id),
    KEY idx_finished_event_participant_event (original_event_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS event_gallery_images (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    image_url TEXT NOT NULL,
    original_name VARCHAR(255) NULL,
    uploaded_by_email VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_event_gallery_event_id (event_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS event_gallery_settings (
    event_id BIGINT NOT NULL,
    visibility ENUM('participants', 'public') NOT NULL DEFAULT 'participants',
    allow_download TINYINT(1) NOT NULL DEFAULT 1,
    notify_participants TINYINT(1) NOT NULL DEFAULT 1,
    watermark TINYINT(1) NOT NULL DEFAULT 0,
    participant_message VARCHAR(500) NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    published_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS finished_meeting LIKE meetings`,

  // Admin "Лог бүртгэл": who did what, when, from where.
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'ok',
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255) NULL,
    target_detail VARCHAR(255) NULL,
    user_id BIGINT NULL,
    user_email VARCHAR(255) NULL,
    user_role VARCHAR(50) NULL,
    ip VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    request_id VARCHAR(40) NULL,
    details TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_audit_created (created_at),
    KEY idx_audit_type (type, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Public site settings edited by the super admin (home page hero image …).
  `CREATE TABLE IF NOT EXISTS site_settings (
    \`key\` VARCHAR(50) NOT NULL,
    \`value\` TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Payment settings edited by the super admin (fee, receiving account …).
  `CREATE TABLE IF NOT EXISTS payment_settings (
    \`key\` VARCHAR(50) NOT NULL,
    \`value\` TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Event publish fee: one per event, paid by bank transfer, confirmed by a
  // super admin. status: awaiting -> submitted -> confirmed | rejected.
  `CREATE TABLE IF NOT EXISTS publish_fees (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    organization_id BIGINT NULL,
    reference VARCHAR(20) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'awaiting',
    paid_amount DECIMAL(14, 2) NULL,
    payer_note VARCHAR(255) NULL,
    receipt_file VARCHAR(255) NULL,
    reject_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME NULL,
    decided_at DATETIME NULL,
    decided_by BIGINT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_publish_fee_event (event_id),
    KEY idx_publish_fee_status (status, submitted_at),
    KEY idx_publish_fee_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Where an organizer receives ticket income.
  `CREATE TABLE IF NOT EXISTS payout_accounts (
    user_id BIGINT NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Proof of consent: one row per legal document accepted at sign-up.
  `CREATE TABLE IF NOT EXISTS legal_acceptances (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    organization_id BIGINT NULL,
    document VARCHAR(30) NOT NULL,
    version VARCHAR(20) NOT NULL,
    accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(64) NULL,
    user_agent VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_legal_user (user_id),
    KEY idx_legal_org (organization_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Emails collected by the "Долоо хоног бүрийн тойм" form on news pages.
  `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_newsletter_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Money received; the admin dashboard's profit card sums paid rows.
  `CREATE TABLE IF NOT EXISTS payments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'MNT',
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    user_id BIGINT NULL,
    organization_id BIGINT NULL,
    event_id BIGINT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY idx_payments_created (status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Columns added after their table first shipped: [table, column, ALTER].
const COLUMNS = [
  ["finished_event", "deleted_at", "ALTER TABLE finished_event ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL"],
  ["event_gallery_settings", "participant_message", "ALTER TABLE event_gallery_settings ADD COLUMN participant_message VARCHAR(500) NULL AFTER watermark"],
  ["event_gallery_settings", "is_published", "ALTER TABLE event_gallery_settings ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 0 AFTER participant_message"],
  ["event_gallery_settings", "published_at", "ALTER TABLE event_gallery_settings ADD COLUMN published_at DATETIME NULL AFTER is_published"],

  // Dashboard charts need to know when accounts and bookings were created.
  ["users", "created_at", "ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"],
  ["events", "status", "ALTER TABLE events ADD COLUMN status VARCHAR(20) DEFAULT 'published'"],
  // Publish fees approved automatically during the free trial period.
  ["publish_fees", "trial", "ALTER TABLE publish_fees ADD COLUMN trial TINYINT(1) NOT NULL DEFAULT 0"],
  // Events created by an organization; read by the organization pages and
  // the public event list.
  ["events", "organization_id", "ALTER TABLE events ADD COLUMN organization_id BIGINT NULL"],
  ["users", "terms_accepted_at", "ALTER TABLE users ADD COLUMN terms_accepted_at DATETIME NULL"],
  ["users", "terms_version", "ALTER TABLE users ADD COLUMN terms_version VARCHAR(20) NULL"],
  ["users", "privacy_version", "ALTER TABLE users ADD COLUMN privacy_version VARCHAR(20) NULL"],
  ["users", "org_terms_version", "ALTER TABLE users ADD COLUMN org_terms_version VARCHAR(20) NULL"],
  ["event_bookings", "created_at", "ALTER TABLE event_bookings ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"],

  // News publishing workflow (draft / scheduled / published) and admin list.
  ["news", "status", "ALTER TABLE news ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published'"],
  ["news", "publish_at", "ALTER TABLE news ADD COLUMN publish_at DATETIME NULL"],
  ["news", "slug", "ALTER TABLE news ADD COLUMN slug VARCHAR(255) NULL"],
  ["news", "summary", "ALTER TABLE news ADD COLUMN summary VARCHAR(300) NULL"],
  ["news", "category", "ALTER TABLE news ADD COLUMN category VARCHAR(50) NULL"],
  ["news", "author_name", "ALTER TABLE news ADD COLUMN author_name VARCHAR(255) NULL"],
  ["news", "views", "ALTER TABLE news ADD COLUMN views INT NOT NULL DEFAULT 0"],
  ["news", "likes", "ALTER TABLE news ADD COLUMN likes INT NOT NULL DEFAULT 0"],
  ["news", "is_featured", "ALTER TABLE news ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0"],
  ["news", "is_pinned", "ALTER TABLE news ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0"],
  ["news", "updated_at", "ALTER TABLE news ADD COLUMN updated_at DATETIME NULL"],

  // Admin approval of organizations: NULL = waiting, approved / rejected.
  ["organizations", "review_status", "ALTER TABLE organizations ADD COLUMN review_status VARCHAR(20) NULL"],
];

async function columnExists(pool, table, column) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );

  return Number(row?.total) > 0;
}

async function tableExists(pool, table) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );

  return Number(row?.total) > 0;
}

export async function ensureSchema(pool) {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }

  for (const [table, column, sql] of COLUMNS) {
    if (!(await tableExists(pool, table))) continue;
    if (!(await columnExists(pool, table, column))) {
      try {
        await pool.query(sql);
      } catch (error) {
        if (error?.code !== "ER_DUP_FIELDNAME") throw error;
      }
    }
  }
}
