export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
} as const;

export const ART_TYPES = {
  ROAD: 'Road',
  RAIL: 'Rail',
  MEDICAL: 'Medical',
} as const;

export const DIVISIONS = [
  'Western',
  'Central',
  'Eastern',
  'Northern',
  'Southern',
];

export const ART_LOCATIONS = {
  KALYAN: 'Kalyan',
  KURLA: 'Kurla',
  CSMT: 'CSMT',
  DADAR: 'Dadar',
  BYCULLA: 'Byculla',
} as const;

export const ALERT_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
} as const;

export const PERMISSIONS = {
  RECEIVE_ALERT: 'receive_alert',
  ACKNOWLEDGE_ALERT: 'acknowledge_alert',
  SHARE_GPS: 'share_gps',
  SEND_ALERT: 'send_alert',
  VIEW_ACKNOWLEDGEMENTS: 'view_acknowledgements',
  VIEW_LIVE_MAP: 'view_live_map',
  ACCESS_ADMIN_PANEL: 'access_admin_panel',
} as const;