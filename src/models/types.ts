export type Role = 'SuperAdmin' | 'Admin' | 'Staff';

export type ArtType = 'Road' | 'Rail' | 'Medical';

export type ArtLocation = 'Kalyan' | 'Kurla' | 'CSMT' | 'Others';

export type AlertStatus = 'active' | 'closed';

export interface User {
  userId: string;
  name: string;
  employeeId: string;
  mobile: string;
  email: string;
  role: Role;
  division: string;
  artType: ArtType | null;
  artLocation: ArtLocation | null;
  fcmToken: string;
  createdAt: number;
  updatedAt: number;
}

export interface Alert {
  alertId: string;
  division: string;
  artType: ArtType;
  artLocation: ArtLocation;
  createdBy: string;
  timestamp: number;
  status: AlertStatus;
  description?: string;
}

export interface Acknowledgement {
  ackId: string;
  alertId: string;
  userId: string;
  division: string;
  artType: ArtType;
  artLocation: ArtLocation;
  latitude: number;
  longitude: number;
  timestamp: number;
}