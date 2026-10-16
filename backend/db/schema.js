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
];

// Columns added after their table first shipped: [table, column, ALTER].
const COLUMNS = [
  ["finished_event", "deleted_at", "ALTER TABLE finished_event ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL"],
  ["event_gallery_settings", "participant_message", "ALTER TABLE event_gallery_settings ADD COLUMN participant_message VARCHAR(500) NULL AFTER watermark"],
  ["event_gallery_settings", "is_published", "ALTER TABLE event_gallery_settings ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 0 AFTER participant_message"],
  ["event_gallery_settings", "published_at", "ALTER TABLE event_gallery_settings ADD COLUMN published_at DATETIME NULL AFTER is_published"],
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

export async function ensureSchema(pool) {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }

  for (const [table, column, sql] of COLUMNS) {
    if (!(await columnExists(pool, table, column))) {
      try {
        await pool.query(sql);
      } catch (error) {
        if (error?.code !== "ER_DUP_FIELDNAME") throw error;
      }
    }
  }
}
