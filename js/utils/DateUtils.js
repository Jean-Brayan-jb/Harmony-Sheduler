/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Date Utilities
 * ============================================================
 * Fonctions utilitaires pour la manipulation des dates
 */

import { CONFIG } from '../core/Config.js';

export class DateUtils {
  /**
   * Retourne le début et la fin de la semaine courante
   */
  static getCurrentWeekRange() {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { 
      start: monday.toISOString(), 
      end: sunday.toISOString(),
      startDate: monday,
      endDate: sunday,
    };
  }

  /**
   * Retourne le début et la fin du mois courant
   */
  static getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return { 
      start: start.toISOString(), 
      end: end.toISOString(),
      startDate: start,
      endDate: end,
    };
  }

  /**
   * Calcule la différence en minutes entre deux dates ISO
   */
  static minutesBetween(startISO, endISO) {
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    return (end - start) / CONFIG.TIME.MINUTE;
  }

  /**
   * Calcule la différence en heures entre deux dates ISO
   */
  static hoursBetween(startISO, endISO) {
    return this.minutesBetween(startISO, endISO) / 60;
  }

  /**
   * Calcule la différence en jours entre deux dates ISO
   */
  static daysBetween(startISO, endISO) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const diffTime = end - start;
    return Math.ceil(diffTime / CONFIG.TIME.DAY);
  }

  /**
   * Regroupe les événements par date (YYYY-MM-DD)
   */
  static groupByDay(events) {
    return events.reduce((acc, ev) => {
      const day = ev.start.slice(0, 10);
      if (!acc[day]) acc[day] = [];
      acc[day].push(ev);
      return acc;
    }, {});
  }

  /**
   * Trie les événements par heure de début
   */
  static sortByStartTime(events) {
    return [...events].sort((a, b) => 
      new Date(a.start) - new Date(b.start)
    );
  }

  /**
   * Trie les événements par heure de fin
   */
  static sortByEndTime(events) {
    return [...events].sort((a, b) => 
      new Date(a.end) - new Date(b.end)
    );
  }

  /**
   * Formate une date ISO en format lisible
   */
  static formatDate(dateISO, options = {}) {
    const defaultOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'long',
      ...options 
    };
    try {
      return new Date(dateISO).toLocaleDateString('fr-FR', defaultOptions);
    } catch {
      return dateISO;
    }
  }

  /**
   * Formate une heure depuis une date ISO
   */
  static formatTime(dateISO, options = {}) {
    const defaultOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      ...options 
    };
    try {
      return new Date(dateISO).toLocaleTimeString('fr-FR', defaultOptions);
    } catch {
      return '--:--';
    }
  }

  /**
   * Formate une date et heure complète
   */
  static formatDateTime(dateISO) {
    return `${this.formatDate(dateISO)} à ${this.formatTime(dateISO)}`;
  }

  /**
   * Parse une date et heure à partir d'une date ISO et d'une chaîne HH:MM
   */
  static parseDateTime(dateISO, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateISO);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Vérifie si une date est aujourd'hui
   */
  static isToday(dateISO) {
    const date = new Date(dateISO);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Vérifie si une date est dans le futur
   */
  static isFuture(dateISO) {
    return new Date(dateISO) > new Date();
  }

  /**
   * Vérifie si une date est dans le passé
   */
  static isPast(dateISO) {
    return new Date(dateISO) < new Date();
  }

  /**
   * Ajoute des minutes à une date ISO
   */
  static addMinutes(dateISO, minutes) {
    const date = new Date(dateISO);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  }

  /**
   * Ajoute des heures à une date ISO
   */
  static addHours(dateISO, hours) {
    return this.addMinutes(dateISO, hours * 60);
  }

  /**
   * Ajoute des jours à une date ISO
   */
  static addDays(dateISO, days) {
    const date = new Date(dateISO);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  /**
   * Retourne le début de la journée (00:00:00)
   */
  static startOfDay(dateISO) {
    const date = new Date(dateISO);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  /**
   * Retourne la fin de la journée (23:59:59)
   */
  static endOfDay(dateISO) {
    const date = new Date(dateISO);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  /**
   * Vérifie si deux plages horaires se chevauchent
   */
  static hasOverlap(start1, end1, start2, end2, bufferMinutes = 0) {
    const s1 = new Date(start1).getTime() - bufferMinutes * CONFIG.TIME.MINUTE;
    const e1 = new Date(end1).getTime() + bufferMinutes * CONFIG.TIME.MINUTE;
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();
    
    return s1 < e2 && e1 > s2;
  }

  /**
   * Trouve les créneaux libres entre deux plages
   */
  static findFreeSlots(busySlots, startTime, endTime, durationMinutes) {
    const freeSlots = [];
    let currentTime = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    const sortedBusy = busySlots
      .map(slot => ({
        start: new Date(slot.start).getTime(),
        end: new Date(slot.end).getTime(),
      }))
      .sort((a, b) => a.start - b.start);
    
    for (const busy of sortedBusy) {
      if (currentTime + durationMinutes * CONFIG.TIME.MINUTE <= busy.start) {
        freeSlots.push({
          start: new Date(currentTime).toISOString(),
          end: new Date(Math.min(currentTime + durationMinutes * CONFIG.TIME.MINUTE, busy.start)).toISOString(),
        });
      }
      currentTime = Math.max(currentTime, busy.end);
    }
    
    if (currentTime + durationMinutes * CONFIG.TIME.MINUTE <= end) {
      freeSlots.push({
        start: new Date(currentTime).toISOString(),
        end: new Date(currentTime + durationMinutes * CONFIG.TIME.MINUTE).toISOString(),
      });
    }
    
    return freeSlots;
  }

  /**
   * Génère un label de semaine
   */
  static getWeekLabel(weekRange) {
    const start = this.formatDate(weekRange.start, { day: 'numeric', month: 'long' });
    const end = this.formatDate(weekRange.end, { day: 'numeric', month: 'long' });
    return `Semaine du ${start} au ${end}`;
  }

  /**
   * Retourne le nom du jour de la semaine
   */
  static getDayName(dateISO, format = 'long') {
    return new Date(dateISO).toLocaleDateString('fr-FR', { weekday: format });
  }

  /**
   * Retourne le jour de la semaine (0-6)
   */
  static getDayOfWeek(dateISO) {
    return new Date(dateISO).getDay();
  }

  /**
   * Crée une plage de dates entre deux dates
   */
  static generateDateRange(startISO, endISO) {
    const dates = [];
    let current = new Date(startISO);
    const end = new Date(endISO);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
}
