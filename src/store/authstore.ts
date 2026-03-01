// src/store/authStore.ts
import { create } from 'zustand';
import { User } from 'firebase/auth'; // ✅ Expo modular SDK

export interface UserData {
  uid: string;
  name: string;
  employeeId: string;
  mobile: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Staff';
  division: string;
  artType: 'Road' | 'Rail' | 'Medical' | null; // null for SuperAdmin
  artLocation: string | null;                   // null for SuperAdmin
  approved: boolean;
  rejected: boolean;
  fcmToken?: string;
}

interface AuthState {
  firebaseUser: User | null;                    // ✅ was FirebaseAuthTypes.User
  userData: UserData | null;
  setFirebaseUser: (user: User | null) => void; // ✅ was FirebaseAuthTypes.User
  setUserData: (data: UserData | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  firebaseUser: null,
  userData: null,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setUserData: (data) => set({ userData: data }),

  clearAuth: () => set({
    firebaseUser: null,
    userData: null,
  }),
}));