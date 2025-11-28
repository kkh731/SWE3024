import { create } from 'zustand';
import * as api from '../api';
// import { Persona, PersonaCreate } from '../api'; // Removed due to module resolution issues

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
// --- End of Local Type Definitions ---

interface PersonaState {
  persona: Persona | null;
  isLoading: boolean;
  error: any | null; // Changed to any to be more flexible
  fetchPersona: () => Promise<void>;
  savePersona: (personaData: PersonaCreate) => Promise<boolean>;
}

export const usePersonaStore = create<PersonaState>((set) => ({
  persona: null,
  isLoading: true,
  error: null,

  fetchPersona: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getPersona();
      set({ persona: response.data, isLoading: false });
    } catch (error: any) {
      // It's a 404 if not found, which is an expected state
      if (error.response && error.response.status === 404) {
          set({ persona: null, isLoading: false });
      } else {
          console.error('Failed to fetch persona:', error);
          set({ error: error, isLoading: false });
      }
    }
  },

  savePersona: async (personaData: PersonaCreate) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.createOrUpdatePersona(personaData);
      set({ persona: response.data, isLoading: false });
      return true;
    } catch (error: any) {
      console.error('Failed to save persona:', error);
      set({ error: error, isLoading: false });
      return false;
    }
  },
}));
