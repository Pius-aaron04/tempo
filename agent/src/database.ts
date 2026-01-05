import Database from 'better-sqlite3';
import { DB_PATH } from './paths';
import { TempoEvent } from '@tempo/contracts';

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
    })) as TempoEvent[]; // Casting because we trust our storage, but validation on read could be added
  }

  public close() {
    this.db.close();
  }
}
