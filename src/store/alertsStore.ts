// src/store/alertsStore.ts
import { create } from 'zustand';

// ── Types matching your Firestore schema ──────────────────────
export interface ARTAlert {
  id: string;                          // Firestore doc ID
  division: string;
  artType: 'Road' | 'Rail' | 'Medical';
  artLocation: string;
  createdBy: string;                   // uid of Admin/SuperAdmin
  timestamp: number;                   // epoch ms
  status: 'active' | 'closed';
}

export interface Acknowledgement {
  id: string;                          // Firestore doc ID
  alertId: string;
  userId: string;
  division: string;
  artType: string;
  artLocation: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface AlertsState {
  // Active alert for this unit (Staff/Admin sees this)
  activeAlert: ARTAlert | null;

  // List of alerts (Admin/SuperAdmin dashboard)
  alerts: ARTAlert[];

  // Acknowledgements for current alert
  acknowledgements: Acknowledgement[];

  // Loading states
  alertsLoading: boolean;
  acksLoading: boolean;

  // Setters
  setActiveAlert: (alert: ARTAlert | null) => void;
  setAlerts: (alerts: ARTAlert[]) => void;
  setAcknowledgements: (acks: Acknowledgement[]) => void;
  setAlertsLoading: (loading: boolean) => void;
  setAcksLoading: (loading: boolean) => void;

  // Clear on logout
  clearAlerts: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  activeAlert: null,
  alerts: [],
  acknowledgements: [],
  alertsLoading: false,
  acksLoading: false,

  setActiveAlert: (alert) => set({ activeAlert: alert }),
  setAlerts: (alerts) => set({ alerts }),
  setAcknowledgements: (acks) => set({ acknowledgements: acks }),
  setAlertsLoading: (loading) => set({ alertsLoading: loading }),
  setAcksLoading: (loading) => set({ acksLoading: loading }),

  clearAlerts: () => set({
    activeAlert: null,
    alerts: [],
    acknowledgements: [],
  }),
}));