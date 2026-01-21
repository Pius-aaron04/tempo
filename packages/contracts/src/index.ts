import { z } from 'zod';

// --- Event Definitions ---

export const EventType = z.enum([
  'app_active', // App became active/focused
  'file_open',  // File opened in editor
  'file_edit',  // File modified
  'file_close', // File closed
  'idle_start', // User went idle (detected by integration or agent)
  'idle_end',   // User returned
  'shutdown',   // Agent or System shutting down
  'user_activity', // Interactions like scrolling or cursor movement
]);

export type EventType = z.infer<typeof EventType>;

export const BaseEventSchema = z.object({
  type: EventType,
  timestamp: z.string().datetime(), // ISO 8601
  source: z.string(), // e.g., "vscode", "chrome", "macos"
});

export const AppActivePayload = z.object({
  app_name: z.string(),
  window_title: z.string().optional(),
});

export const FileEventPayload = z.object({
  file_path: z.string(),
  language: z.string().optional(),
  project_path: z.string().optional(),
});

export const UserActivityPayload = z.object({
  kind: z.enum(['scroll', 'cursor']),
  file_path: z.string().optional(),
  project_path: z.string().optional(),
  language: z.string().optional(),
});

// Discriminated union for events
export const TempoEventSchema = z.discriminatedUnion('type', [
  BaseEventSchema.extend({ type: z.literal('app_active'), payload: AppActivePayload }),
  BaseEventSchema.extend({ type: z.literal('file_open'), payload: FileEventPayload }),
  BaseEventSchema.extend({ type: z.literal('file_edit'), payload: FileEventPayload }),
  BaseEventSchema.extend({ type: z.literal('file_close'), payload: FileEventPayload }),
  BaseEventSchema.extend({ type: z.literal('idle_start'), payload: z.object({}) }),
  BaseEventSchema.extend({ type: z.literal('idle_end'), payload: z.object({}) }),
  BaseEventSchema.extend({ type: z.literal('shutdown'), payload: z.object({}) }),
  BaseEventSchema.extend({ type: z.literal('user_activity'), payload: UserActivityPayload }),
]);

export type TempoEvent = z.infer<typeof TempoEventSchema>;


// --- Session Definitions ---

export const SessionStatus = z.enum(['active', 'completed']);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionContext = z.object({
  project_path: z.string().optional(),
  file_path: z.string().optional(),
  language: z.string().optional(),
  app_name: z.string().optional(),
});
export type SessionContext = z.infer<typeof SessionContext>;

export const SessionSchema = z.object({
  id: z.string().optional(), // Database ID
  start_time: z.string().datetime(),
  last_active_time: z.string().datetime(),
  end_time: z.string().datetime().optional(), // Only set when status is completed
  duration_seconds: z.number().default(0),
  status: SessionStatus,
  context: SessionContext,
});

export type TempoSession = z.infer<typeof SessionSchema>;


// --- Analytics Definitions ---

export const AnalyticsGroupBy = z.enum(['hour', 'day', 'month', 'project', 'language']);
export type AnalyticsGroupBy = z.infer<typeof AnalyticsGroupBy>;

export const AnalyticsResultItem = z.object({
  key: z.string(),
  total_duration_seconds: z.number(),
  session_count: z.number(),
});
export type AnalyticsResultItem = z.infer<typeof AnalyticsResultItem>;

// --- Trend Definitions ---

export const TrendResultItem = z.object({
  date: z.string(), // YYYY-MM-DD
  // Dynamic keys for projects/languages + 'date'
  values: z.record(z.string(), z.number())
});
export type TrendResultItem = z.infer<typeof TrendResultItem>;

// --- IPC Definitions ---

export const IpcRequestType = z.enum(['emit_event', 'query_events', 'query_sessions', 'query_analytics', 'query_trend', 'ping']);

export const IpcRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('emit_event'), event: TempoEventSchema }),
  z.object({ type: z.literal('query_events'), limit: z.number().optional().default(50) }),
  z.object({ type: z.literal('query_sessions'), limit: z.number().optional().default(50), startTime: z.string().optional(), endTime: z.string().optional() }),
  z.object({ type: z.literal('query_analytics'), groupBy: AnalyticsGroupBy, startTime: z.string().optional(), endTime: z.string().optional() }),
  z.object({ type: z.literal('query_trend'), groupBy: AnalyticsGroupBy, days: z.number().optional().default(7) }),
  z.object({ type: z.literal('ping') }),
]);

export type IpcRequest = z.infer<typeof IpcRequestSchema>;

export const IpcResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type IpcResponse = z.infer<typeof IpcResponseSchema>;