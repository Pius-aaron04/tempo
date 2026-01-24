import Database from 'better-sqlite3';
import { DB_PATH } from './paths';
import { TempoEvent, TempoSession } from '@tempo/contracts';

export class TempoDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.setupPragmas();
    this.initSchema();
    console.log(`Database connection established at ${DB_PATH}`);
  }

  private setupPragmas() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        last_active_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        context TEXT NOT NULL
      );
    `);
  }

  public insertEvent(event: TempoEvent) {
    const stmt = this.db.prepare(
      'INSERT INTO events (type, timestamp, source, payload) VALUES (?, ?, ?, ?)'
    );
    stmt.run(
      event.type,
      event.timestamp,
      event.source,
      JSON.stringify(event.payload)
    );
  }

  public getRecentEvents(limit: number): TempoEvent[] {
    const stmt = this.db.prepare(
      'SELECT type, timestamp, source, payload FROM events ORDER BY timestamp DESC LIMIT ?'
    );
    const rows = stmt.all(limit) as any[];

    return rows.map((row) => ({
      type: row.type,
      timestamp: row.timestamp,
      source: row.source,
      payload: JSON.parse(row.payload),
    })) as TempoEvent[];
  }

  public createSession(session: TempoSession): string {
    const stmt = this.db.prepare(
      'INSERT INTO sessions (start_time, last_active_time, end_time, duration_seconds, status, context) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      session.start_time,
      session.last_active_time,
      session.end_time || null,
      session.duration_seconds,
      session.status,
      JSON.stringify(session.context)
    );
    return result.lastInsertRowid.toString();
  }

  public updateSession(id: string, updates: Partial<TempoSession>) {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.last_active_time) {
      fields.push('last_active_time = ?');
      values.push(updates.last_active_time);
    }
    if (updates.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.end_time || null);
    }
    if (updates.duration_seconds !== undefined) {
      fields.push('duration_seconds = ?');
      values.push(updates.duration_seconds);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.context) {
      fields.push('context = ?');
      values.push(JSON.stringify(updates.context));
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  public getRecentSessions(limit: number, startTime?: string, endTime?: string): TempoSession[] {
    let query = 'SELECT id, start_time, last_active_time, end_time, duration_seconds, status, context FROM sessions';
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (startTime) {
      whereClauses.push('start_time >= ?');
      params.push(startTime);
    }
    if (endTime) {
      whereClauses.push('start_time <= ?');
      params.push(endTime);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY start_time DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id.toString(),
      start_time: row.start_time,
      last_active_time: row.last_active_time,
      end_time: row.end_time || undefined,
      duration_seconds: row.duration_seconds,
      status: row.status,
      context: JSON.parse(row.context),
    })) as TempoSession[];
  }

  public getAnalytics(groupBy: string, startTime?: string, endTime?: string): any[] {
    let groupByClause = '';
    let selectKey = '';

    switch (groupBy) {
      case 'hour':
        // SQLite strftime '%H' returns 00-23
        selectKey = "strftime('%H', start_time) as key";
        groupByClause = "strftime('%H', start_time)";
        break;
      case 'day':
        // SQLite date returns YYYY-MM-DD
        selectKey = "date(start_time) as key";
        groupByClause = "date(start_time)";
        break;
      case 'month':
        selectKey = "strftime('%Y-%m', start_time) as key";
        groupByClause = "strftime('%Y-%m', start_time)";
        break;
      case 'project':
        // Extract project_path from JSON context
        selectKey = "json_extract(context, '$.project_path') as key";
        groupByClause = "json_extract(context, '$.project_path')";
        break;
      case 'language':
        selectKey = "json_extract(context, '$.language') as key";
        groupByClause = "json_extract(context, '$.language')";
        break;
      default:
        throw new Error(`Invalid groupBy: ${groupBy}`);
    }

    const query = `
      SELECT 
        ${selectKey}, 
        SUM(duration_seconds) as total_duration_seconds, 
        COUNT(*) as session_count 
      FROM sessions 
      FROM sessions 
      WHERE key IS NOT NULL
      ${startTime ? `AND start_time >= '${startTime}'` : ''}
      ${endTime ? `AND start_time <= '${endTime}'` : ''}
      GROUP BY ${groupByClause} 
      ORDER BY total_duration_seconds DESC
    `;

    const stmt = this.db.prepare(query);
    return stmt.all();
  }

  public getTrend(groupBy: string, days: number): any[] {
    let groupByClause = '';
    let selectKey = '';

    switch (groupBy) {
      case 'project':
        selectKey = "json_extract(context, '$.project_path')";
        groupByClause = "json_extract(context, '$.project_path')";
        break;
      case 'language':
        selectKey = "json_extract(context, '$.language')";
        groupByClause = "json_extract(context, '$.language')";
        break;
      case 'app':
        selectKey = "json_extract(context, '$.app_name')";
        groupByClause = "json_extract(context, '$.app_name')";
        break;
      default:
        // Default to project
        selectKey = "json_extract(context, '$.project_path')";
        groupByClause = "json_extract(context, '$.project_path')";
    }

    const query = `
      SELECT 
        date(start_time) as date,
        ${selectKey} as name,
        SUM(duration_seconds) as duration
      FROM sessions
      WHERE date(start_time) >= date('now', '-${days} days')
      AND name IS NOT NULL
      GROUP BY date, name
      ORDER BY date ASC
    `;

    const rows = this.db.prepare(query).all() as any[];

    // Pivot the data suitable for Recharts { date: '2023-01-01', ProjectA: 100, ProjectB: 200 }
    const result: Record<string, any> = {};

    rows.forEach(row => {
      if (!result[row.date]) {
        result[row.date] = { date: row.date };
      }
      result[row.date][row.name] = row.duration;
    });

    return Object.values(result);
  }

  public getTrendAnalytics(groupBy: string, startTime?: string, endTime?: string): any[] {
    // Re-implementing getAnalytics with dates if needed, or just relying on base implementation
    // For now, we update the base getAnalytics to accept optional dates
    return this.getAnalytics(groupBy, startTime, endTime);
  }

  public getWorkPattern(days: number): any[] {
    // Logic: 
    // 1. Get all events for last N days.
    // 2. Sort by timestamp.
    // 3. Iterate and sum durations between events (gaps).
    // 4. If gap > IDLE_THRESHOLD (2 mins), ignore it (new session start).
    // 5. If event is 'file_edit', classify gap as writing, else reading.

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const stmt = this.db.prepare(`
      SELECT type, timestamp 
      FROM events 
      WHERE timestamp >= ? 
      ORDER BY timestamp ASC
    `);

    const events = stmt.all(cutoffStr) as { type: string; timestamp: string }[];
    const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes matching SessionManager

    const dailyStats: Record<string, { reading: number; writing: number }> = {};

    if (events.length === 0) return [];

    let prevTime = new Date(events[0].timestamp).getTime();

    // Initialize dates in range to ensure we return 0s for empty days
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyStats[dateStr] = { reading: 0, writing: 0 };
    }

    for (let i = 1; i < events.length; i++) {
      const e = events[i];
      const currTime = new Date(e.timestamp).getTime();
      const gap = currTime - prevTime;
      const dateStr = e.timestamp.split('T')[0];

      // Ensure we handle date boundaries gracefully (assign to the day of the event)
      if (!dailyStats[dateStr]) dailyStats[dateStr] = { reading: 0, writing: 0 };

      if (gap <= IDLE_THRESHOLD_MS) {
        const seconds = gap / 1000;
        if (e.type === 'file_edit') {
          dailyStats[dateStr].writing += seconds;
        } else {
          dailyStats[dateStr].reading += seconds;
        }
      }
      // If gap > threshold, we treat it as idle time (0 duration added)

      prevTime = currTime;
    }

    // Convert to array
    const result: any[] = [];
    // Key-value to sorted array
    Object.entries(dailyStats).forEach(([date, stats]) => {
      // filter out dates older than request if any
      if (date >= cutoffStr.split('T')[0]) {
        result.push({
          date: date,
          reading_seconds: Math.round(stats.reading),
          writing_seconds: Math.round(stats.writing)
        });
      }
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  public close() {
    this.db.close();
  }
}
