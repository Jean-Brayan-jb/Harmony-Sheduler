/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Validator & Security
 * ============================================================
 * Validation des données et sécurité
 */

import { CONFIG } from '../core/Config.js';

export class Validator {
  /**
   * Valide un événement complet
   */
  static validateEvent(event) {
    const errors = {};
    
    // Validation du titre/nom client
    if (!event.clientName || !this.isValidName(event.clientName)) {
      errors.clientName = 'Le nom du client est requis (2-100 caractères)';
    }
    
    // Validation des dates
    const dateValidation = this.validateDateRange(event.start, event.end);
    if (!dateValidation.valid) {
      errors.dateRange = dateValidation.error;
    }
    
    // Validation de l'email (si fourni)
    if (event.clientEmail && !this.isValidEmail(event.clientEmail)) {
      errors.clientEmail = 'Format d\'email invalide';
    }
    
    // Validation du téléphone (si fourni)
    if (event.clientPhone && !this.isValidPhone(event.clientPhone)) {
      errors.clientPhone = 'Format de téléphone invalide';
    }
    
    // Validation de la durée
    const duration = this.calculateDuration(event.start, event.end);
    if (duration < 15) {
      errors.duration = 'La durée minimale est de 15 minutes';
    }
    if (duration > 480) {
      errors.duration = 'La durée maximale est de 8 heures';
    }
    
    // Validation du type
    if (event.type && !Object.values(CONFIG.EVENT_TYPES).includes(event.type)) {
      errors.type = 'Type d\'événement invalide';
    }
    
    // Validation du statut
    if (event.status && !Object.values(CONFIG.STATUS).includes(event.status)) {
      errors.status = 'Statut invalide';
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Valide une plage de dates
   */
  static validateDateRange(start, end) {
    if (!start) {
      return { valid: false, error: 'La date de début est requise' };
    }
    
    if (!end) {
      return { valid: false, error: 'La date de fin est requise' };
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime())) {
      return { valid: false, error: 'Date de début invalide' };
    }
    
    if (isNaN(endDate.getTime())) {
      return { valid: false, error: 'Date de fin invalide' };
    }
    
    if (endDate <= startDate) {
      return { valid: false, error: 'La fin doit être postérieure au début' };
    }
    
    // Vérifie si la date n'est pas trop loin dans le passé
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (startDate < oneYearAgo) {
      return { valid: false, error: 'La date ne peut pas être antérieure à un an' };
    }
    
    // Vérifie si la date n'est pas trop loin dans le futur
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (startDate > twoYearsFromNow) {
      return { valid: false, error: 'La date ne peut pas être dans plus de 2 ans' };
    }
    
    return { valid: true };
  }

  /**
   * Valide les paramètres du professionnel
   */
  static validateProfessionalSettings(settings) {
    const errors = {};
    
    if (settings.name && !this.isValidName(settings.name)) {
      errors.name = 'Nom invalide (2-100 caractères)';
    }
    
    if (settings.email && !this.isValidEmail(settings.email)) {
      errors.email = 'Email invalide';
    }
    
    if (settings.maxDailyAppointments !== undefined) {
      if (settings.maxDailyAppointments < 1 || settings.maxDailyAppointments > 20) {
        errors.maxDailyAppointments = 'Doit être entre 1 et 20';
      }
    }
    
    if (settings.defaultDuration !== undefined) {
      if (settings.defaultDuration < 15 || settings.defaultDuration > 480) {
        errors.defaultDuration = 'Doit être entre 15 et 480 minutes';
      }
    }
    
    if (settings.breakDuration !== undefined) {
      if (settings.breakDuration < 0 || settings.breakDuration > 120) {
        errors.breakDuration = 'Doit être entre 0 et 120 minutes';
      }
    }
    
    if (settings.workingHours) {
      const { start, end } = settings.workingHours;
      if (start && end) {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        if (endMinutes <= startMinutes) {
          errors.workingHours = 'L\'heure de fin doit être postérieure à l\'heure de début';
        }
        
        if (endMinutes - startMinutes > 720) {
          errors.workingHours = 'La journée de travail ne peut pas dépasser 12 heures';
        }
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Valide une réservation client
   */
  static validateBooking(data) {
    const errors = {};
    
    if (!data.clientName || data.clientName.trim().length < 2) {
      errors.clientName = 'Votre nom complet est requis';
    }
    
    if (!data.clientEmail || !this.isValidEmail(data.clientEmail)) {
      errors.clientEmail = 'Un email valide est requis';
    }
    
    if (!data.bookingStart || !data.bookingEnd) {
      errors.booking = 'Veuillez sélectionner un créneau horaire';
    }
    
    if (data.notes && data.notes.length > 1000) {
      errors.notes = 'Le message ne peut pas dépasser 1000 caractères';
    }
    
    // Sanitization des entrées
    if (data.notes) {
      data.notes = this.sanitizeInput(data.notes);
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Vérifie si un email est valide
   */
  static isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) && email.length <= 254;
  }

  /**
   * Vérifie si un nom est valide
   */
  static isValidName(name) {
    return typeof name === 'string' && 
           name.trim().length >= 2 && 
           name.trim().length <= 100;
  }

  /**
   * Vérifie si un numéro de téléphone est valide
   */
  static isValidPhone(phone) {
    const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
    const regex = /^\+?[0-9]{8,15}$/;
    return regex.test(cleaned);
  }

  /**
   * Calcule la durée en minutes entre deux dates
   */
  static calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (endDate - startDate) / 60000;
  }

  /**
   * Sanitize une entrée utilisateur (XSS protection)
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  /**
   * Sanitize un objet complet
   */
  static sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Vérifie si une chaîne est un UUID valide
   */
  static isValidUUID(str) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(str);
  }

  /**
   * Vérifie si une chaîne est une date ISO valide
   */
  static isValidISODate(str) {
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.includes('T');
  }

  /**
   * Valide une couleur hexadécimale
   */
  static isValidHexColor(color) {
    const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return regex.test(color);
  }
}

/**
 * ============================================================
 * Security Utilities
 * ============================================================
 */
export class SecurityUtils {
  /**
   * Génère un ID unique sécurisé
   */
  static generateSecureId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    const random2 = Math.random().toString(36).substring(2, 7);
    return `hs_${timestamp}_${random}_${random2}`;
  }

  /**
   * Génère un token CSRF
   */
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash simple (pour données non sensibles)
   */
  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Vérifie si le stockage local est disponible
   */
  static isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Vérifie si le mode privé est probablement actif
   */
  static isPrivateMode() {
    try {
      localStorage.setItem('__private_test__', 'test');
      localStorage.removeItem('__private_test__');
      return false;
    } catch {
      return true;
    }
  }
}
