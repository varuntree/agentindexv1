import { EventEmitter } from 'node:events';

export type ActivityEventType = 'error' | 'info' | 'success';

export interface ActivityEvent {
  context?: Record<string, unknown>;
  id: number;
  message: string;
  route: string;
  timestamp: string;
  type: ActivityEventType;
}

export interface ActivityEventInput {
  context?: Record<string, unknown>;
  message: string;
  route: string;
  type: ActivityEventType;
}

const HISTORY_LIMIT = 200;

const emitter = new EventEmitter();
let nextId = 1;
const history: ActivityEvent[] = [];

function addToHistory(event: ActivityEvent): void {
  history.push(event);
  if (history.length > HISTORY_LIMIT) {
    history.splice(0, history.length - HISTORY_LIMIT);
  }
}

export function getActivityHistory(): ActivityEvent[] {
  return [...history];
}

export function onActivityEvent(listener: (event: ActivityEvent) => void): () => void {
  emitter.on('activity', listener);
  return () => {
    emitter.off('activity', listener);
  };
}

export function publishActivityEvent(input: ActivityEventInput): ActivityEvent {
  const event: ActivityEvent = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    type: input.type,
    route: input.route,
    message: input.message,
    context: input.context
  };

  addToHistory(event);
  emitter.emit('activity', event);
  return event;
}

