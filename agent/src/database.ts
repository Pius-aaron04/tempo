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

  public getRecentSessions(limit: number): TempoSession[] {
    const stmt = this.db.prepare(
      'SELECT id, start_time, last_active_time, end_time, duration_seconds, status, context FROM sessions ORDER BY start_time DESC LIMIT ?'
    );
    const rows = stmt.all(limit) as any[];

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

  public getAnalytics(groupBy: string): any[] {
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
      WHERE key IS NOT NULL
      GROUP BY ${groupByClause} 
      ORDER BY total_duration_seconds DESC
    `;

    const stmt = this.db.prepare(query);
    return stmt.all();
  }

  public close() {
    this.db.close();
  }
}
