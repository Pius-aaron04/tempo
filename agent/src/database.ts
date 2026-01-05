import Database from 'better-sqlite3';
import { DB_PATH } from './paths';

export class TempoDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.setupPragmas();
    console.log(`Database connection established at ${DB_PATH}`);
  }

  private setupPragmas() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
  }

  public close() {
    this.db.close();
  }
}
