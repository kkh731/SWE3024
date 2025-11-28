// src/types/index.ts

export interface Persona {
  id: number;
  persona_text: string;
  preferred_times?: string[];
  focus_duration?: string;
  location?: string;
  created_at: string; // ISO 8601 date string
  updated_at?: string; // ISO 8601 date string
}

export interface Schedule {
  id: number;
  title: string;
  description?: string;
  start_datetime: string; // ISO 8601 date string
  end_datetime: string; // ISO 8601 date string
  is_completed: boolean;
  is_ai_generated: boolean;
  ai_reason?: string;
  created_at: string; // ISO 8601 date string
}

export interface ScheduleCreate {
  title: string;
  description?: string;
  start_datetime: string; // ISO 8601 date string
  end_datetime: string; // ISO 8601 date string
  is_completed?: boolean;
}

export interface AIRecommendation {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface AIRecommendationResponse {
  schedules: AIRecommendation[];
  summary: string;
}
