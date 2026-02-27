import { StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────
export const C = {
  // Backgrounds
  bg:          '#020617',
  surface:     '#0B1120',
  surfaceAlt:  '#111827',
  overlay:     'rgba(0,0,0,0.75)',

  // Borders
  border:      '#1F2937',
  borderLight: '#374151',

  // Text
  text:        '#F9FAFB',
  textSec:     '#9CA3AF',
  textMuted:   '#6B7280',

  // Accent
  accent:      '#2563EB',
  accentLight: '#60A5FA',
  accentBg:    '#1E3A5F',

  // Semantic
  success:     '#22C55E',
  successDark: '#14532D',
  danger:      '#EF4444',
  dangerDark:  '#7F1D1D',
  warning:     '#F59E0B',
  warningDark: '#78350F',
  purple:      '#7C3AED',
};

// ─── Spacing ─────────────────────────────────────────────────
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

// ─── Radii ───────────────────────────────────────────────────
export const R = { sm: 6, md: 10, lg: 12, xl: 16, pill: 999 } as const;

// ─── Shared Styles ───────────────────────────────────────────
export const T = StyleSheet.create({
  // Screen
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 44) + 12 : 56,
    paddingHorizontal: S.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.lg,
    paddingBottom: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },

  // Cards
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLive: {
    borderColor: C.danger,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    borderLeftColor: C.danger,
  },
  cardName: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardMeta: {
    color: C.textSec,
    fontSize: 12,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: S.sm,
    letterSpacing: -0.2,
  },

  // Inputs
  input: {
    height: 48,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: S.md,
    color: C.text,
    fontSize: 15,
    marginBottom: S.md,
  },
  textArea: {
    minHeight: 100,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    padding: S.md,
    color: C.text,
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: S.md,
  },

  // Primary button
  primaryBtn: {
    height: 48,
    borderRadius: R.pill,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Action buttons (approve, reject, edit, remove)
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Outline button (logout, cancel, edit profile)
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  outlineBtnText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '500',
  },
  outlineBtnAccent: {
    borderColor: C.accentLight,
  },

  // Pill tab bar
  tabBar: {
    flexGrow: 0,
    marginBottom: S.lg,
  },
  tabBarRow: {
    flexDirection: 'row',
    paddingRight: S.sm,
    paddingBottom: S.sm,
    gap: S.sm,
  },
  tab: {
    paddingVertical: S.sm,
    paddingHorizontal: S.lg,
    borderRadius: R.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: C.accentBg,
    borderColor: C.accent,
  },
  tabText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: C.accentLight,
    fontWeight: '600',
  },

  // Sub-tabs (directory admins/contacts)
  subTabRow: {
    flexDirection: 'row',
    marginBottom: S.md,
    gap: S.sm,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: R.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.border,
  },
  subTabActive: {
    backgroundColor: C.accentBg,
    borderColor: C.accent,
  },
  subTabText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },
  subTabTextActive: {
    color: C.accentLight,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.xxl,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: S.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: S.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: S.sm,
    marginTop: S.sm,
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: C.text,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeApproved: { backgroundColor: C.successDark },
  badgePending:  { backgroundColor: C.warningDark },
  badgeRejected: { backgroundColor: C.dangerDark },
  badgeLive:     { backgroundColor: C.danger },

  // Row actions
  rowActions: {
    flexDirection: 'row',
    marginTop: S.md,
    gap: S.sm,
  },

  // Live indicator
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.danger,
    marginRight: 6,
  },
  liveLabel: {
    color: C.danger,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Empty state
  emptyText: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },

  // Center content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Alert message text
  alertMsg: {
    color: C.text,
    fontSize: 15,
    marginBottom: 4,
  },

  // Progress bar
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.success,
  },

  // Log expand
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expandChevron: {
    color: C.textSec,
    fontSize: 14,
    marginLeft: S.sm,
    marginTop: 2,
  },
  logExpanded: {
    marginTop: S.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: S.md,
  },
  logResponseItem: {
    paddingVertical: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Responses
  responseMsg: {
    color: C.accentLight,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
