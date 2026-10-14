const ADMIN_ROLES = new Set(["admin", "super_admin"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveUserId(pool, user) {
  const id = Number(user?.id);

  if (Number.isSafeInteger(id) && id > 0) return id;

  const email = normalizeEmail(user?.email);

  if (!email) return null;

  const [[row]] = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`,
    [email],
  );

  return row ? Number(row.id) : null;
}

// Who may see an event's member-only data (participant list, files):
// its creator, people who joined it, and admins. Looks in both the live
// events table and the finished_event archive.
export async function getEventAccess(pool, eventId, user) {
  const email = normalizeEmail(user?.email);

  const [[active]] = await pool.query(
    `SELECT created_by_email, visibility, archived
     FROM events
     WHERE id = ?
     LIMIT 1`,
    [eventId],
  );

  let finished = null;

  if (!active) {
    try {
      [[finished]] = await pool.query(
        `SELECT created_by_email, visibility
         FROM finished_event
         WHERE original_event_id = ?
         LIMIT 1`,
        [eventId],
      );
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE") throw error;
    }
  }

  const event = active || finished;

  if (!event) {
    return { exists: false, isPublic: false, isMember: false };
  }

  const isPublic =
    String(event.visibility || "public").toLowerCase() === "public" &&
    Number(event.archived || 0) === 0;

  if (ADMIN_ROLES.has(String(user?.role || ""))) {
    return { exists: true, isPublic, isMember: true };
  }

  if (email && normalizeEmail(event.created_by_email) === email) {
    return { exists: true, isPublic, isMember: true };
  }

  const userId = await resolveUserId(pool, user);

  if (!userId) {
    return { exists: true, isPublic, isMember: false };
  }

  const [[booking]] = await pool.query(
    `SELECT 1 AS ok FROM event_bookings WHERE event_id = ? AND user_id = ? LIMIT 1`,
    [eventId, userId],
  );

  if (booking) {
    return { exists: true, isPublic, isMember: true };
  }

  try {
    const [[archived]] = await pool.query(
      `SELECT 1 AS ok
       FROM finished_event_participants
       WHERE original_event_id = ? AND user_id = ?
       LIMIT 1`,
      [eventId, userId],
    );

    return { exists: true, isPublic, isMember: Boolean(archived) };
  } catch (error) {
    if (error?.code !== "ER_NO_SUCH_TABLE") throw error;

    return { exists: true, isPublic, isMember: false };
  }
}
