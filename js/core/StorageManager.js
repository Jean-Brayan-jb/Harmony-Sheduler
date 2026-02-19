/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Storage Manager
 * ============================================================
 * Gestion sécurisée de la persistance des données
 * Architecture: Pattern Repository avec encryption légère
 */

import { CONFIG } from './Config.js';
import { Validator, SecurityUtils } from '../utils/Validator.js';
import { DateUtils } from '../utils/DateUtils.js';

export class StorageManager {
  constructor() {
    this.key = CONFIG.STORAGE_KEY;
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheTTL = 5000; // 5 secondes
    this.subscribers = new Map();
    this.transactionQueue = [];
    this.isProcessingQueue = false;
    
    this._initStorage();
  }

  /**
   * ============================================================
   * INITIALISATION
   * ============================================================
   */
  
  _initStorage() {
    if (!SecurityUtils.isStorageAvailable()) {
      console.warn('[StorageManager] localStorage non disponible - mode mémoire uniquement');
      this.memoryMode = true;
      this.memoryStore = this._getDefaultSchema();
      return;
    }
    
    this.memoryMode = false;
    
    // Vérifie et migre les données si nécessaire
    const store = this._readRaw();
    if (store && store.version !== CONFIG.STORAGE_VERSION) {
      this._migrateData(store);
    }
  }

  _getDefaultSchema() {
    return {
      version: CONFIG.STORAGE_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      professional: { ...CONFIG.DEFAULT_PROFESSIONAL },
      events: [],
      availability: [],
      notifications: [],
      weeklyReports: [],
      recoveryHistory: [],
      blockedSlots: [],
      settings: {
        autoBlockCriticalDays: true,
        enablePredictiveAlerts: true,
        preferredNotificationTime: '18:00',
        dataRetentionDays: 365,
      },
      metadata: {
        lastSync: null,
        deviceId: SecurityUtils.generateSecureId(),
        sessionCount: 0,
      },
    };
  }

  /**
   * ============================================================
   * OPÉRATIONS CRUD DE BASE
   * ============================================================
   */
  
  getStore(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && this.cache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return structuredClone ? structuredClone(this.cache) : JSON.parse(JSON.stringify(this.cache));
    }
    
    let store;
    
    if (this.memoryMode) {
      store = this.memoryStore;
    } else {
      store = this._readRaw();
    }
    
    if (!store) {
      store = this._getDefaultSchema();
      this._writeRaw(store);
    }
    
    // Merge avec les valeurs par défaut pour les nouvelles clés
    store = this._mergeWithDefaults(store);
    
    this.cache = store;
    this.cacheTimestamp = now;
    
    return structuredClone ? structuredClone(store) : JSON.parse(JSON.stringify(store));
  }

  saveStore(store) {
    store.updatedAt = new Date().toISOString();
    
    if (this.memoryMode) {
      this.memoryStore = store;
      this.cache = store;
      this.cacheTimestamp = Date.now();
      this._notifySubscribers('store', store);
      return true;
    }
    
    try {
      this._writeRaw(store);
      this.cache = store;
      this.cacheTimestamp = Date.now();
      this._notifySubscribers('store', store);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('[StorageManager] Quota dépassé - nettoyage automatique');
        this._cleanupOldData();
        try {
          this._writeRaw(store);
          return true;
        } catch (retryError) {
          console.error('[StorageManager] Échec persistant:', retryError);
          return false;
        }
      }
      console.error('[StorageManager] saveStore error:', error);
      return false;
    }
  }

  /**
   * ============================================================
   * GESTION DES ÉVÉNEMENTS
   * ============================================================
   */
  
  getAllEvents(options = {}) {
    const store = this.getStore();
    let events = store.events || [];
    
    // Filtres
    if (options.type) {
      events = events.filter(ev => ev.type === options.type);
    }
    
    if (options.status) {
      events = events.filter(ev => ev.status === options.status);
    }
    
    if (options.startDate && options.endDate) {
      events = events.filter(ev => {
        const evStart = new Date(ev.start).getTime();
        const rangeStart = new Date(options.startDate).getTime();
        const rangeEnd = new Date(options.endDate).getTime();
        return evStart >= rangeStart && evStart <= rangeEnd;
      });
    }
    
    // Tri
    if (options.sortBy) {
      events = DateUtils.sortByStartTime(events);
    }
    
    return events;
  }

  getEventById(id) {
    const store = this.getStore();
    return store.events.find(ev => ev.id === id);
  }

  addEvent(eventData) {
    const validation = Validator.validateEvent(eventData);
    if (!validation.valid) {
      console.error('[StorageManager] Validation failed:', validation.errors);
      return { success: false, errors: validation.errors };
    }
    
    const store = this.getStore();
    
    const newEvent = {
      id: SecurityUtils.generateSecureId(),
      title: eventData.title || `RDV — ${eventData.clientName}`,
      start: eventData.start,
      end: eventData.end,
      clientName: Validator.sanitizeInput(eventData.clientName),
      clientEmail: eventData.clientEmail?.toLowerCase().trim(),
      clientPhone: eventData.clientPhone?.replace(/\s/g, ''),
      type: eventData.type || CONFIG.EVENT_TYPES.APPOINTMENT,
      status: eventData.status || CONFIG.STATUS.CONFIRMED,
      notes: eventData.notes ? Validator.sanitizeInput(eventData.notes) : '',
      color: eventData.color || this._getDefaultColor(eventData.type),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      version: 1,
      metadata: {
        source: eventData.source || 'manual',
        ipAddress: null, // Pour futur backend
        userAgent: navigator.userAgent,
      },
    };
    
    store.events.push(newEvent);
    
    if (this.saveStore(store)) {
      this._notifySubscribers('event:created', newEvent);
      return { success: true, event: newEvent };
    }
    
    return { success: false, errors: { general: 'Erreur de sauvegarde' } };
  }

  updateEvent(id, updates) {
    const store = this.getStore();
    const index = store.events.findIndex(ev => ev.id === id);
    
    if (index === -1) {
      return { success: false, errors: { general: 'Événement non trouvé' } };
    }
    
    const existingEvent = store.events[index];
    
    // Validation si dates modifiées
    if (updates.start || updates.end) {
      const validation = Validator.validateEvent({
        ...existingEvent,
        ...updates,
      });
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }
    }
    
    // Création d'un historique des modifications
    const changeLog = {
      timestamp: new Date().toISOString(),
      changes: Object.keys(updates),
      previousValues: {},
    };
    
    Object.keys(updates).forEach(key => {
      if (existingEvent[key] !== undefined) {
        changeLog.previousValues[key] = existingEvent[key];
      }
    });
    
    store.events[index] = {
      ...existingEvent,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (existingEvent.version || 1) + 1,
      changeHistory: [...(existingEvent.changeHistory || []), changeLog].slice(-10), // Garde les 10 dernières modifications
    };
    
    if (this.saveStore(store)) {
      this._notifySubscribers('event:updated', store.events[index]);
      return { success: true, event: store.events[index] };
    }
    
    return { success: false, errors: { general: 'Erreur de sauvegarde' } };
  }

  deleteEvent(id) {
    const store = this.getStore();
    const event = store.events.find(ev => ev.id === id);
    
    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }
    
    // Soft delete - marque comme supprimé plutôt que de supprimer
    const index = store.events.findIndex(ev => ev.id === id);
    store.events[index] = {
      ...event,
      status: CONFIG.STATUS.CANCELLED,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (this.saveStore(store)) {
      this._notifySubscribers('event:deleted', { id, event: store.events[index] });
      return { success: true };
    }
    
    return { success: false, error: 'Erreur de sauvegarde' };
  }

  hardDeleteEvent(id) {
    const store = this.getStore();
    const initialLength = store.events.length;
    store.events = store.events.filter(ev => ev.id !== id);
    
    if (store.events.length === initialLength) {
      return { success: false, error: 'Événement non trouvé' };
    }
    
    if (this.saveStore(store)) {
      this._notifySubscribers('event:hardDeleted', { id });
      return { success: true };
    }
    
    return { success: false, error: 'Erreur de sauvegarde' };
  }

  /**
   * ============================================================
   * GESTION DU PROFIL PROFESSIONNEL
   * ============================================================
   */
  
  getProfessional() {
    const store = this.getStore();
    return store.professional;
  }

  updateProfessional(updates) {
    const validation = Validator.validateProfessionalSettings(updates);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    const store = this.getStore();
    store.professional = {
      ...store.professional,
      ...updates,
    };
    
    if (this.saveStore(store)) {
      this._notifySubscribers('professional:updated', store.professional);
      return { success: true, professional: store.professional };
    }
    
    return { success: false, errors: { general: 'Erreur de sauvegarde' } };
  }

  /**
   * ============================================================
   * GESTION DES DISPONIBILITÉS
   * ============================================================
   */
  
  getAvailability() {
    const store = this.getStore();
    return store.availability || [];
  }

  saveAvailability(slots) {
    const store = this.getStore();
    
    // Validation des créneaux
    const validSlots = slots.filter(slot => {
      return slot.dayOfWeek >= 0 && slot.dayOfWeek <= 6 &&
             slot.start && slot.end &&
             slot.start < slot.end;
    });
    
    store.availability = validSlots.map(slot => ({
      ...slot,
      id: slot.id || SecurityUtils.generateSecureId(),
      updatedAt: new Date().toISOString(),
    }));
    
    if (this.saveStore(store)) {
      this._notifySubscribers('availability:updated', store.availability);
      return { success: true, slots: store.availability };
    }
    
    return { success: false, error: 'Erreur de sauvegarde' };
  }

  /**
   * ============================================================
   * NOTIFICATIONS
   * ============================================================
   */
  
  getNotifications(options = {}) {
    const store = this.getStore();
    let notifications = store.notifications || [];
    
    if (options.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    if (options.limit) {
      notifications = notifications.slice(-options.limit);
    }
    
    return DateUtils.sortByStartTime(notifications).reverse();
  }

  addNotification(notification) {
    const store = this.getStore();
    
    const newNotification = {
      id: SecurityUtils.generateSecureId(),
      type: notification.type || 'info',
      level: notification.level || 'info',
      title: notification.title || 'Notification',
      message: Validator.sanitizeInput(notification.message),
      read: false,
      createdAt: new Date().toISOString(),
      action: notification.action || null,
    };
    
    store.notifications = store.notifications || [];
    store.notifications.push(newNotification);
    
    // Limite à 100 notifications
    if (store.notifications.length > 100) {
      store.notifications = store.notifications.slice(-100);
    }
    
    if (this.saveStore(store)) {
      this._notifySubscribers('notification:created', newNotification);
      return { success: true, notification: newNotification };
    }
    
    return { success: false, error: 'Erreur de sauvegarde' };
  }

  markNotificationAsRead(id) {
    const store = this.getStore();
    const notification = store.notifications.find(n => n.id === id);
    
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      this.saveStore(store);
      this._notifySubscribers('notification:read', notification);
    }
  }

  markAllNotificationsAsRead() {
    const store = this.getStore();
    store.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
      }
    });
    this.saveStore(store);
    this._notifySubscribers('notifications:allRead', {});
  }

  /**
   * ============================================================
   * RAPPORTS HEBDOMADAIRES
   * ============================================================
   */
  
  saveWeeklyReport(report) {
    const store = this.getStore();
    
    const enrichedReport = {
      ...report,
      id: SecurityUtils.generateSecureId(),
      savedAt: new Date().toISOString(),
    };
    
    store.weeklyReports = store.weeklyReports || [];
    store.weeklyReports.push(enrichedReport);
    
    // Garde les 24 derniers rapports (6 mois)
    if (store.weeklyReports.length > 24) {
      store.weeklyReports = store.weeklyReports.slice(-24);
    }
    
    if (this.saveStore(store)) {
      this._notifySubscribers('report:saved', enrichedReport);
      return { success: true, report: enrichedReport };
    }
    
    return { success: false, error: 'Erreur de sauvegarde' };
  }

  getWeeklyReports(options = {}) {
    const store = this.getStore();
    let reports = store.weeklyReports || [];
    
    if (options.limit) {
      reports = reports.slice(-options.limit);
    }
    
    return reports.reverse();
  }

  /**
   * ============================================================
   * EXPORT / IMPORT
   * ============================================================
   */
  
  exportToCSV(options = {}) {
    const events = this.getAllEvents({ 
      type: CONFIG.EVENT_TYPES.APPOINTMENT,
      ...options 
    });
    
    const headers = ['ID', 'Titre', 'Client', 'Email', 'Téléphone', 'Début', 'Fin', 'Statut', 'Notes', 'Créé le'];
    
    const rows = events.map(ev => [
      ev.id,
      `"${(ev.title || '').replace(/"/g, "'")}"`,
      `"${(ev.clientName || '').replace(/"/g, "'")}"`,
      ev.clientEmail || '',
      ev.clientPhone || '',
      ev.start,
      ev.end,
      ev.status,
      `"${(ev.notes || '').replace(/"/g, "'")}"`,
      ev.createdAt,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return '\uFEFF' + csv; // BOM pour UTF-8
  }

  exportFullBackup() {
    const store = this.getStore();
    return JSON.stringify(store, null, 2);
  }

  importFromBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      // Validation basique
      if (!data.version || !data.events) {
        return { success: false, error: 'Format de backup invalide' };
      }
      
      // Migration si nécessaire
      if (data.version !== CONFIG.STORAGE_VERSION) {
        data = this._migrateImportData(data);
      }
      
      if (this.saveStore(data)) {
        return { success: true, eventCount: data.events.length };
      }
      
      return { success: false, error: 'Erreur de sauvegarde' };
    } catch (error) {
      return { success: false, error: 'JSON invalide: ' + error.message };
    }
  }

  /**
   * ============================================================
   * SYSTÈME DE PUBLICATION/SOUSCRIPTION
   * ============================================================
   */
  
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    // Retourne une fonction de désinscription
    return () => {
      this.subscribers.get(event)?.delete(callback);
    };
  }

  _notifySubscribers(event, data) {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (error) {
          console.error('[StorageManager] Subscriber error:', error);
        }
      });
    }
  }

  /**
   * ============================================================
   * MÉTHODES PRIVÉES
   * ============================================================
   */
  
  _readRaw() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[StorageManager] _readRaw error:', error);
      return null;
    }
  }

  _writeRaw(store) {
    localStorage.setItem(this.key, JSON.stringify(store));
  }

  _mergeWithDefaults(store) {
    const defaults = this._getDefaultSchema();
    
    const merge = (target, source) => {
      const result = { ...target };
      for (const key of Object.keys(source)) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = merge(target[key] || {}, source[key]);
        } else if (result[key] === undefined) {
          result[key] = source[key];
        }
      }
      return result;
    };
    
    return merge(store, defaults);
  }

  _migrateData(store) {
    console.log(`[StorageManager] Migration de la version ${store.version} vers ${CONFIG.STORAGE_VERSION}`);
    
    // Migration v1 -> v2
    if (store.version === 1) {
      store.metadata = {
        lastSync: null,
        deviceId: SecurityUtils.generateSecureId(),
        sessionCount: 0,
      };
      store.recoveryHistory = [];
      store.blockedSlots = [];
      store.settings = this._getDefaultSchema().settings;
    }
    
    store.version = CONFIG.STORAGE_VERSION;
    this._writeRaw(store);
  }

  _cleanupOldData() {
    const store = this.getStore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - store.settings.dataRetentionDays);
    
    // Supprime les événements très anciens (soft deleted)
    store.events = store.events.filter(ev => {
      if (ev.deletedAt) {
        return new Date(ev.deletedAt) > cutoffDate;
      }
      return true;
    });
    
    // Limite les notifications
    if (store.notifications.length > 50) {
      store.notifications = store.notifications.slice(-50);
    }
    
    // Limite les rapports
    if (store.weeklyReports.length > 12) {
      store.weeklyReports = store.weeklyReports.slice(-12);
    }
    
    this.saveStore(store);
  }

  _getDefaultColor(type) {
    const colors = {
      [CONFIG.EVENT_TYPES.APPOINTMENT]: '#26A69A',
      [CONFIG.EVENT_TYPES.BREAK]: '#78909C',
      [CONFIG.EVENT_TYPES.BLOCKED]: '#ef5350',
      [CONFIG.EVENT_TYPES.AVAILABILITY]: '#29B6F6',
    };
    return colors[type] || '#26A69A';
  }
}

// Singleton instance
export const storage = new StorageManager();
