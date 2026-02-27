import create from 'zustand';

interface Alert {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AlertsState {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id'>) => void;
  removeAlert: (id: number) => void;
}

const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => ({
    alerts: [...state.alerts, { id: Date.now(), ...alert }],
  })),
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter(alert => alert.id !== id),
  })),
}));

export default useAlertsStore;