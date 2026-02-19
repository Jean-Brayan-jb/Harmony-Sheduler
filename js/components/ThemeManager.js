/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Theme Manager
 * ============================================================
 * Gestion du thème clair/sombre avec détection système
 */

import { storage } from '../core/StorageManager.js';

export class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.systemPreference = 'light';
    this.mediaQuery = null;
    this.subscribers = new Set();
    this.cssVariables = {
      light: {
        '--hs-bg': '#F7F5F0',
        '--hs-surface': '#FFFFFF',
        '--hs-surface-2': '#F0EDE6',
        '--hs-border': '#E2DDD6',
        '--hs-text': '#1A1A1A',
        '--hs-text-soft': '#6B6460',
        '--hs-text-muted': '#A8A4A0',
        '--hs-sage': '#5A7A6A',
        '--hs-sage-light': '#7A9A8A',
        '--hs-sage-pale': '#D6E8DF',
        '--hs-slate': '#2C3E50',
        '--hs-shadow-sm': '0 1px 3px rgba(0,0,0,.06)',
        '--hs-shadow-md': '0 4px 16px rgba(0,0,0,.08)',
        '--hs-shadow-lg': '0 12px 48px rgba(0,0,0,.10)',
      },
      dark: {
        '--hs-bg': '#0F1117',
        '--hs-surface': '#1A1D27',
        '--hs-surface-2': '#242836',
        '--hs-border': '#2E3347',
        '--hs-text': '#F0EDE6',
        '--hs-text-soft': '#9A97A0',
        '--hs-text-muted': '#5A5870',
        '--hs-sage': '#7A9A8A',
        '--hs-sage-light': '#8AABA0',
        '--hs-sage-pale': '#1A3028',
        '--hs-slate': '#D0D8E8',
        '--hs-shadow-sm': '0 1px 3px rgba(0,0,0,.3)',
        '--hs-shadow-md': '0 4px 16px rgba(0,0,0,.4)',
        '--hs-shadow-lg': '0 12px 48px rgba(0,0,0,.5)',
      },
    };
  }

  init() {
    // Détecte la préférence système
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPreference = this.mediaQuery.matches ? 'dark' : 'light';
    
    // Écoute les changements de préférence système
    this.mediaQuery.addEventListener('change', (e) => {
      this.systemPreference = e.matches ? 'dark' : 'light';
      const settings = storage.getProfessional();
      if (!settings.darkMode && !settings.lightMode) {
        // Auto-detect si pas de préférence explicite
        this.setTheme(this.systemPreference, false);
      }
    });
    
    // Charge la préférence sauvegardée
    this.loadSavedTheme();
  }

  loadSavedTheme() {
    const settings = storage.getProfessional();
    
    if (settings.darkMode) {
      this.setTheme('dark', false);
    } else if (settings.lightMode) {
      this.setTheme('light', false);
    } else {
      // Utilise la préférence système
      this.setTheme(this.systemPreference, false);
    }
  }

  setTheme(theme, savePreference = true) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn('[ThemeManager] Thème invalide:', theme);
      return;
    }
    
    this.currentTheme = theme;
    const root = document.documentElement;
    
    // Applique les variables CSS
    const variables = this.cssVariables[theme];
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Met à jour les classes
    if (theme === 'dark') {
      root.classList.add('harmony-dark');
      root.classList.remove('harmony-light');
    } else {
      root.classList.add('harmony-light');
      root.classList.remove('harmony-dark');
    }
    
    // Met à jour le meta theme-color pour mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0F1117' : '#F7F5F0');
    }
    
    // Sauvegarde la préférence
    if (savePreference) {
      storage.updateProfessional({
        darkMode: theme === 'dark',
        lightMode: theme === 'light',
      });
    }
    
    // Notifie les abonnés
    this._notifySubscribers(theme);
    
    // Émet un événement personnalisé
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  isDark() {
    return this.currentTheme === 'dark';
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notifySubscribers(theme) {
    this.subscribers.forEach(cb => {
      try {
        cb(theme);
      } catch (error) {
        console.error('[ThemeManager] Subscriber error:', error);
      }
    });
  }

  /**
   * Met à jour dynamiquement une couleur du thème
   */
  setCustomColor(variable, color) {
    document.documentElement.style.setProperty(variable, color);
  }

  /**
   * Réinitialise les couleurs personnalisées
   */
  resetCustomColors() {
    const variables = this.cssVariables[this.currentTheme];
    Object.keys(variables).forEach(key => {
      document.documentElement.style.removeProperty(key);
    });
    this.setTheme(this.currentTheme, false);
  }
}

// Singleton instance
export const themeManager = new ThemeManager();
