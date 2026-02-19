/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Configuration Centrale
 * ============================================================
 * Constantes, seuils et paramètres de l'application.
 * Architecture: Module de configuration immutable
 */

export const CONFIG = Object.freeze({
  // Versioning
  VERSION: '2.0.0',
  BUILD_DATE: new Date().toISOString(),
  
  // Storage
  STORAGE_KEY: 'harmonyScheduler_v2',
  STORAGE_VERSION: 2,
  
  // Time constants (ms)
  TIME: {
    MINUTE: 60000,
    HOUR: 3600000,
    DAY: 86400000,
    WEEK: 604800000,
  },
  
  // Harmony Score Weights (somme = 100)
  HARMONY_WEIGHTS: {
    DAILY_LOAD: 25,           // Charge journalière
    BREAK_COMPLIANCE: 20,     // Respect des pauses
    EVENING_WORK: 15,         // Travail en soirée
    WEEKLY_BALANCE: 20,       // Équilibre hebdomadaire
    RECOVERY_ADEQUACY: 15,    // Adéquation récupération (NOUVEAU)
    PREDICTIVE_STRESS: 5,     // Stress prédictif (NOUVEAU)
  },
  
  // Seuils dynamiques (ajustables selon le profil)
  THRESHOLDS: {
    SCORE: {
      EXCELLENT: { min: 85, max: 100, color: '#22c55e', label: 'Excellente' },
      GOOD: { min: 70, max: 84, color: '#4ade80', label: 'Équilibrée' },
      MODERATE: { min: 50, max: 69, color: '#fb923c', label: 'À surveiller' },
      WARNING: { min: 30, max: 49, color: '#f97316', label: 'Préoccupante' },
      CRITICAL: { min: 0, max: 29, color: '#f87171', label: 'Critique' },
    },
    DAILY: {
      OPTIMAL: 4,
      GOOD: 6,
      WARNING: 8,
      DANGER: 10,
      CRITICAL: 12,
    },
    WEEKLY: {
      OPTIMAL_HOURS: 25,
      GOOD_HOURS: 32,
      WARNING_HOURS: 40,
      DANGER_HOURS: 50,
      CRITICAL_HOURS: 60,
    },
    EVENING_HOUR: 18,
    NIGHT_HOUR: 21,
    RECOVERY: {
      MIN_HOURS_BETWEEN_DAYS: 12,    // Heures min entre fin et début
      IDEAL_BREAK_RATIO: 0.25,        // 25% du temps en pause
      MAX_CONSECUTIVE_INTENSIVE: 3,   // Jours intenses max consécutifs
    },
  },
  
  // Paramètres par défaut du professionnel
  DEFAULT_PROFESSIONAL: {
    name: '',
    email: '',
    profession: '',
    timezone: 'Europe/Paris',
    workingHours: { start: '08:00', end: '18:00' },
    defaultDuration: 60,
    breakDuration: 20,
    maxDailyAppointments: 8,
    maxWeeklyHours: 40,
    preferredEveningEnd: '19:00',
    autoBlockCriticalDays: true,
    enablePredictiveAlerts: true,
    darkMode: false,
    notificationPreferences: {
      email: true,
      browser: true,
      criticalOnly: false,
    },
  },
  
  // Types d'événements
  EVENT_TYPES: {
    APPOINTMENT: 'appointment',
    BREAK: 'break',
    BLOCKED: 'blocked',
    AVAILABILITY: 'availability',
    RECOVERY: 'recovery',
  },
  
  // Statuts
  STATUS: {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show',
  },
  
  // Animation timings
  ANIMATION: {
    FAST: 150,
    BASE: 250,
    SLOW: 400,
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
    BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // API Simulation (pour futur backend)
  API: {
    ENDPOINTS: {
      BASE: '/api/v1',
      AUTH: '/auth',
      EVENTS: '/events',
      ANALYTICS: '/analytics',
      SETTINGS: '/settings',
    },
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
  },
});

// Helper pour obtenir un seuil par score
export const getScoreLevel = (score) => {
  const levels = Object.entries(CONFIG.THRESHOLDS.SCORE);
  for (const [key, value] of levels) {
    if (score >= value.min && score <= value.max) {
      return { key, ...value };
    }
  }
  return { key: 'CRITICAL', ...CONFIG.THRESHOLDS.SCORE.CRITICAL };
};

// Helper pour calculer la charge relative
export const getLoadIntensity = (value, type = 'daily') => {
  const thresholds = type === 'daily' ? CONFIG.THRESHOLDS.DAILY : CONFIG.THRESHOLDS.WEEKLY;
  if (value <= thresholds.OPTIMAL) return 'optimal';
  if (value <= thresholds.GOOD || value <= thresholds.OPTIMAL_HOURS) return 'good';
  if (value <= thresholds.WARNING || value <= thresholds.WARNING_HOURS) return 'warning';
  if (value <= thresholds.DANGER || value <= thresholds.DANGER_HOURS) return 'danger';
  return 'critical';
};
