import { create } from 'zustand';
import * as api from '../api';
import dayjs from 'dayjs';

// --- Start of Local Type Definitions ---
// Types are defined locally to bypass a persistent module resolution/caching issue.
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
// --- End of Local Type Definitions ---

interface ScheduleState {
  schedules: Schedule[];
  selectedDate: string; // YYYY-MM-DD
  fetchSchedules: (startDate: string, endDate: string) => Promise<void>;
  addSchedule: (schedule: api.ScheduleCreate) => Promise<void>;
  bulkAddSchedules: (schedules: api.ScheduleBulkCreateItemInput[]) => Promise<void>;
  editSchedule: (id: number, schedule: api.ScheduleCreate) => Promise<void>;
  removeSchedule: (id: number) => Promise<void>;
  toggleScheduleStatus: (id: number, isCompleted: boolean) => Promise<void>;
  setSelectedDate: (date: string) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  selectedDate: dayjs().format('YYYY-MM-DD'),
  
  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  fetchSchedules: async (startDate: string, endDate: string) => {
    try {
      const response = await api.getSchedules(startDate, endDate);
      set({ schedules: response.data });
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  },

  addSchedule: async (schedule: api.ScheduleCreate) => {
    try {
      const response = await api.createSchedule(schedule);
      set((state) => ({
        schedules: [...state.schedules, response.data],
      }));
    } catch (error) {
      console.error('Failed to add schedule:', error);
    }
  },
  
  bulkAddSchedules: async (schedules: api.ScheduleBulkCreateItemInput[]) => {
    try {
      const response = await api.bulkCreateSchedules({ schedules });
      set((state) => ({
        schedules: [...state.schedules, ...response.data],
      }));
    } catch (error) {
        console.error('Failed to bulk add schedules:', error);
    }
  },

  editSchedule: async (id: number, schedule: api.ScheduleCreate) => {
    try {
      const response = await api.updateSchedule(id, schedule);
      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === id ? response.data : s
        ),
      }));
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  },

  removeSchedule: async (id: number) => {
    try {
      await api.deleteSchedule(id);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  },

  toggleScheduleStatus: async (id: number, isCompleted: boolean) => {
    try {
        const response = await api.updateScheduleStatus(id, isCompleted);
        set((state) => ({
            schedules: state.schedules.map((s) =>
                s.id === id ? response.data : s
            ),
        }));
    } catch (error) {
        console.error('Failed to update schedule status:', error);
    }
  }
}));
