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

// Discriminated union for events
export const TempoEventSchema = z.discriminatedUnion('type', [
  BaseEventSchema.extend({ type: z.literal('app_active'), payload: AppActivePayload }),
  BaseEventSchema.extend({ type: z.literal('file_open'), payload: FileEventPayload }),
  BaseEventSchema.extend({ type: z.literal('file_edit'), payload: FileEventPayload }),
  BaseEventSchema.extend({ type: z.literal('file_close'), payload: FileEventPayload }),
  BaseEventSchema.extend({ type: z.literal('idle_start'), payload: z.object({}) }),
  BaseEventSchema.extend({ type: z.literal('idle_end'), payload: z.object({}) }),
  BaseEventSchema.extend({ type: z.literal('shutdown'), payload: z.object({}) }),
]);

export type TempoEvent = z.infer<typeof TempoEventSchema>;


// --- IPC Definitions ---

export const IpcRequestType = z.enum(['emit_event', 'query_events', 'ping']);

export const IpcRequestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('emit_event'), event: TempoEventSchema }),
  z.object({ type: z.literal('query_events'), limit: z.number().optional().default(50) }),
  z.object({ type: z.literal('ping') }),
]);

export type IpcRequest = z.infer<typeof IpcRequestSchema>;

export const IpcResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type IpcResponse = z.infer<typeof IpcResponseSchema>;
