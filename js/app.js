/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Application Entry Point
 * ============================================================
 * Point d'entrée principal de l'application
 */

import { themeManager } from './components/ThemeManager.js';
import { modalSystem } from './components/ModalSystem.js';
import { toast } from './components/ToastSystem.js';
import { storage } from './core/StorageManager.js';
import { CONFIG } from './core/Config.js';

/**
 * Classe principale de l'application
 */
class HarmonyApp {
  constructor() {
    this.version = CONFIG.VERSION;
    this.initialized = false;
    this.currentPage = '';
  }

  /**
   * Initialise l'application
   */
  async init() {
    if (this.initialized) return;

    console.log(`🌿 Harmony Scheduler v${this.version} - Initialisation...`);

    try {
      // Initialise le gestionnaire de thème
      themeManager.init();

      // Initialise le système de modales
      modalSystem.init();

      // Détecte la page courante
      this.currentPage = this._detectCurrentPage();

      // Initialise les composants globaux
      this._initGlobalComponents();

      // Initialise la navigation
      this._initNavigation();

      // Marque comme initialisé
      this.initialized = true;

      console.log('✅ Harmony Scheduler initialisé avec succès');

      // Affiche un toast de bienvenue (une fois par session)
      this._showWelcomeToast();

    } catch (error) {
      console.error('❌ Erreur d\'initialisation:', error);
      toast.error('Une erreur est survenue lors de l\'initialisation');
    }
  }

  /**
   * Détecte la page courante
   */
  _detectCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    const pageMap = {
      '': 'landing',
      'index.html': 'landing',
      'dashboard.html': 'dashboard',
      'booking.html': 'booking',
      'analytics.html': 'analytics',
      'settings.html': 'settings',
    };
    
    return pageMap[page] || 'landing';
  }

  /**
   * Initialise les composants globaux
   */
  _initGlobalComponents() {
    // Bouton de basculement de thème
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const newTheme = themeManager.toggle();
        const icon = document.getElementById('themeIcon');
        if (icon) {
          icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
        toast.info(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
      });

      // Met à jour l'icône initiale
      const icon = document.getElementById('themeIcon');
      if (icon) {
        icon.textContent = themeManager.isDark() ? '☀️' : '🌙';
      }
    }

    // Tooltips
    this._initTooltips();

    // Smooth scroll pour les ancres
    this._initSmoothScroll();
  }

  /**
   * Initialise la navigation
   */
  _initNavigation() {
    // Marque le lien actif
    const currentPath = window.location.pathname;
    document.querySelectorAll('[data-nav-link]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && currentPath.includes(href)) {
        link.classList.add('hs-nav__link--active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /**
   * Initialise les tooltips
   */
  _initTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
      let tooltip = null;

      el.addEventListener('mouseenter', () => {
        tooltip = document.createElement('div');
        tooltip.className = 'hs-tooltip';
        tooltip.textContent = el.dataset.tooltip;
        document.body.appendChild(tooltip);

        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8 + window.scrollY}px`;

        requestAnimationFrame(() => tooltip.classList.add('hs-tooltip--visible'));
      });

      el.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      });
    });
  }

  /**
   * Initialise le smooth scroll
   */
  _initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Met à jour l'URL sans rechargement
          history.pushState(null, '', targetId);
        }
      });
    });
  }

  /**
   * Affiche le toast de bienvenue
   */
  _showWelcomeToast() {
    const hasSeenWelcome = sessionStorage.getItem('harmony_welcome_shown');
    if (!hasSeenWelcome && this.currentPage === 'landing') {
      setTimeout(() => {
        toast.success('Bienvenue sur Harmony Scheduler 2.0 ! 🌿', {
          duration: 5000,
        });
        sessionStorage.setItem('harmony_welcome_shown', 'true');
      }, 1000);
    }
  }

  /**
   * API publique
   */
  getVersion() {
    return this.version;
  }

  getCurrentPage() {
    return this.currentPage;
  }
}

// Crée et exporte l'instance singleton
export const app = new HarmonyApp();

// Initialise au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Expose globalement pour débogage (en développement uniquement)
if (import.meta.env?.DEV || location.hostname === 'localhost') {
  window.HarmonyApp = app;
  window.HarmonyStorage = storage;
  window.HarmonyModal = modalSystem;
  window.HarmonyToast = toast;
}
