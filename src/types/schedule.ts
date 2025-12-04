/**
 * Types for unified scheduling system
 */

import { Platform } from '../core/interfaces.js';

export interface ScheduleRequest {
  platforms: Platform[];
  type: 'stream' | 'post';
  title?: string;
  description?: string;
  scheduledAt: string;
}

export interface ScheduleResponse {
  success: boolean;
  jobId: string;
}

export interface ScheduledJobData {
  id: string;
  userId: string;
  platforms: Platform[];
  type: 'stream' | 'post';
  title?: string;
  description?: string;
  scheduledAt: Date;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleEventResult {
  status: 'scheduled' | 'failed' | 'unsupported';
  broadcastId?: string;
  error?: string;
}
