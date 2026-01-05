import { TempoEvent, TempoSession, SessionContext } from '@tempo/contracts';
import { TempoDatabase } from './database';

const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export class SessionManager {
  private currentSession: TempoSession | null = null;

  constructor(private db: TempoDatabase) {}

  public async processEvent(event: TempoEvent) {
    const eventTime = new Date(event.timestamp).getTime();
    const context = this.extractContext(event);

    if (!this.currentSession) {
      this.startNewSession(event, context);
      return;
    }

    const lastActiveTime = new Date(this.currentSession.last_active_time).getTime();
    const gap = eventTime - lastActiveTime;

    if (gap > IDLE_THRESHOLD_MS || !this.isContextMatch(this.currentSession.context, context)) {
      // Close current session and start new one
      this.completeCurrentSession(event.timestamp);
      this.startNewSession(event, context);
    } else {
      // Extend current session
      this.extendCurrentSession(event.timestamp, context);
    }
  }

  private startNewSession(event: TempoEvent, context: SessionContext) {
    const session: TempoSession = {
      start_time: event.timestamp,
      last_active_time: event.timestamp,
      duration_seconds: 0,
      status: 'active',
      context: context,
    };

    const id = this.db.createSession(session);
    this.currentSession = { ...session, id };
    console.log(`Started new session: ${id} (${context.app_name || context.project_path || 'unknown'})`);
  }

  private extendCurrentSession(timestamp: string, context: SessionContext) {
    if (!this.currentSession || !this.currentSession.id) return;

    const startTime = new Date(this.currentSession.start_time).getTime();
    const activeTime = new Date(timestamp).getTime();
    const duration = Math.floor((activeTime - startTime) / 1000);

    // Merge context (e.g., if we didn't have a project path but now we do)
    const mergedContext = { ...this.currentSession.context, ...context };

    this.currentSession.last_active_time = timestamp;
    this.currentSession.duration_seconds = duration;
    this.currentSession.context = mergedContext;

    this.db.updateSession(this.currentSession.id, {
      last_active_time: timestamp,
      duration_seconds: duration,
      context: mergedContext
    });
  }

  private completeCurrentSession(timestamp: string) {
    if (!this.currentSession || !this.currentSession.id) return;

    this.db.updateSession(this.currentSession.id, {
      end_time: timestamp,
      status: 'completed'
    });
    
    console.log(`Completed session: ${this.currentSession.id}. Duration: ${this.currentSession.duration_seconds}s`);
    this.currentSession = null;
  }

  private extractContext(event: TempoEvent): SessionContext {
    const context: SessionContext = {};
    if (event.type === 'app_active') {
      context.app_name = event.payload.app_name;
    } else if ('file_path' in event.payload) {
      context.file_path = event.payload.file_path;
      context.project_path = event.payload.project_path;
      context.language = event.payload.language;
      context.app_name = 'Editor'; // Default if not specified, usually VS Code
    }
    return context;
  }

  private isContextMatch(a: SessionContext, b: SessionContext): boolean {
    // If both have project_path, they must match
    if (a.project_path && b.project_path && a.project_path !== b.project_path) return false;
    
    // If both have app_name, they must match
    if (a.app_name && b.app_name && a.app_name !== b.app_name) return false;

    return true;
  }

  public shutdown() {
    if (this.currentSession) {
      this.completeCurrentSession(new Date().toISOString());
    }
  }
}
