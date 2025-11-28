import axios from 'axios';

// --- Start of Local Type Definitions ---
// Types are defined locally to bypass a persistent module resolution/caching issue.

export interface Persona {
  id: number;
  persona_text: string;
  preferred_times?: string[];
  focus_duration?: string;
  location?: string;
  created_at: string;
  updated_at?: string;
}

export interface PersonaCreate {
  persona_text: string;
  preferred_times?: string[];
  focus_duration?: string;
  location?: string;
}

export interface Schedule {
  id: number;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_completed: boolean;
  is_ai_generated: boolean;
  ai_reason?: string;
  created_at: string;
}

export interface ScheduleCreate {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_completed?: boolean;
}

export interface ScheduleBulkCreateItemInput {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
}

export interface ScheduleBulkCreate {
    schedules: ScheduleBulkCreateItemInput[];
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

// --- End of Local Type Definitions ---


const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Backend API server address
  headers: {
    'Content-Type': 'application/json',
  },
});

// Persona API
export const getPersona = () => {
    return apiClient.get<Persona>('/persona');
};

export const createOrUpdatePersona = (persona: PersonaCreate) => {
    return apiClient.post<Persona>('/persona', persona);
};


// Schedule API
export const getSchedules = (start_date: string, end_date: string) => {
  return apiClient.get<Schedule[]>('/schedules', {
    params: { start_date, end_date },
  });
};

export const createSchedule = (schedule: ScheduleCreate) => {
  return apiClient.post<Schedule>('/schedules', schedule);
};

export const bulkCreateSchedules = (schedules: ScheduleBulkCreate) => {
    return apiClient.post<Schedule[]>('/schedules/bulk-create', schedules);
}

export const updateSchedule = (id: number, schedule: ScheduleCreate) => {
  return apiClient.put<Schedule>(`/schedules/${id}`, schedule);
};

export const deleteSchedule = (id: number) => {
  return apiClient.delete<Schedule>(`/schedules/${id}`);
};

export const updateScheduleStatus = (id: number, is_completed: boolean) => {
    return apiClient.put<Schedule>(`/schedules/${id}/status`, { is_completed });
};

// AI Recommendation API
export const getAIRecommendations = (prompt: string, start_date: string, end_date: string) => {
  return apiClient.post<AIRecommendationResponse>('/schedules/recommend', {
    prompt,
    start_date,
    end_date,
  });
};
