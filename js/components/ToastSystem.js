/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Toast Notification System
 * ============================================================
 * Système de notifications toast avec micro-interactions
 */

import { CONFIG } from '../core/Config.js';

export class ToastSystem {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.defaultDuration = 4000;
    this.maxToasts = 5;
    this.position = 'bottom-right'; // top-left, top-right, bottom-left, bottom-right, top-center, bottom-center
  }

  init() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = `harmony-toast-container harmony-toast-container--${this.position}`;
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(this.container);
  }

  /**
   * Affiche un toast
   */
  show(options) {
    this.init();
    
    const {
      message,
      type = 'info', // info, success, warning, error
      duration = this.defaultDuration,
      dismissible = true,
      action = null, // { text, onClick }
      icon = null,
      title = null,
    } = typeof options === 'string' ? { message: options } : options;
    
    // Limite le nombre de toasts
    if (this.toasts.size >= this.maxToasts) {
      const oldest = this.toasts.keys().next().value;
      this.dismiss(oldest);
    }
    
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `harmony-toast harmony-toast--${type}`;
    toast.setAttribute('role', 'alert');
    
    const icons = {
      info: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      success: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
      warning: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
      error: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
    };
    
    toast.innerHTML = `
      <div class="harmony-toast__icon">
        ${icon || icons[type]}
      </div>
      <div class="harmony-toast__content">
        ${title ? `<div class="harmony-toast__title">${title}</div>` : ''}
        <div class="harmony-toast__message">${message}</div>
      </div>
      ${action ? `
        <button class="harmony-toast__action" data-action="primary">
          ${action.text}
        </button>
      ` : ''}
      ${dismissible ? `
        <button class="harmony-toast__close" aria-label="Fermer">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      ` : ''}
      <div class="harmony-toast__progress">
        <div class="harmony-toast__progress-bar"></div>
      </div>
    `;
    
    // Bind events
    if (dismissible) {
      const closeBtn = toast.querySelector('.harmony-toast__close');
      closeBtn.addEventListener('click', () => this.dismiss(id));
    }
    
    if (action) {
      const actionBtn = toast.querySelector('[data-action="primary"]');
      actionBtn.addEventListener('click', () => {
        action.onClick();
        this.dismiss(id);
      });
    }
    
    // Pause on hover
    let remainingTime = duration;
    let startTime = Date.now();
    let timerId = null;
    
    const startTimer = () => {
      timerId = setTimeout(() => this.dismiss(id), remainingTime);
      
      // Animation de la barre de progression
      const progressBar = toast.querySelector('.harmony-toast__progress-bar');
      if (progressBar) {
        progressBar.style.animationDuration = `${remainingTime}ms`;
        progressBar.classList.add('harmony-toast__progress-bar--animating');
      }
    };
    
    const pauseTimer = () => {
      if (timerId) {
        clearTimeout(timerId);
        remainingTime -= Date.now() - startTime;
        
        const progressBar = toast.querySelector('.harmony-toast__progress-bar');
        if (progressBar) {
          progressBar.classList.remove('harmony-toast__progress-bar--animating');
          const computedStyle = window.getComputedStyle(progressBar);
          const width = computedStyle.getPropertyValue('width');
          progressBar.style.width = width;
        }
      }
    };
    
    const resumeTimer = () => {
      startTime = Date.now();
      startTimer();
    };
    
    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', resumeTimer);
    
    // Ajoute au DOM
    this.container.appendChild(toast);
    this.toasts.set(id, { element: toast, timerId });
    
    // Animation d'entrée
    requestAnimationFrame(() => {
      toast.classList.add('harmony-toast--entering');
      requestAnimationFrame(() => {
        toast.classList.add('harmony-toast--visible');
        toast.classList.remove('harmony-toast--entering');
      });
    });
    
    // Démarre le timer
    startTimer();
    
    return {
      id,
      dismiss: () => this.dismiss(id),
      update: (newMessage) => this.update(id, newMessage),
    };
  }

  /**
   * Méthodes rapides pour chaque type
   */
  success(message, options = {}) {
    return this.show({ ...options, message, type: 'success' });
  }

  error(message, options = {}) {
    return this.show({ ...options, message, type: 'error', duration: 6000 });
  }

  warning(message, options = {}) {
    return this.show({ ...options, message, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show({ ...options, message, type: 'info' });
  }

  /**
   * Ferme un toast spécifique
   */
  dismiss(id) {
    const toastData = this.toasts.get(id);
    if (!toastData) return;
    
    const { element, timerId } = toastData;
    
    if (timerId) clearTimeout(timerId);
    
    element.classList.add('harmony-toast--leaving');
    element.classList.remove('harmony-toast--visible');
    
    setTimeout(() => {
      element.remove();
      this.toasts.delete(id);
    }, CONFIG.ANIMATION.BASE);
  }

  /**
   * Met à jour le message d'un toast
   */
  update(id, newMessage) {
    const toastData = this.toasts.get(id);
    if (toastData) {
      const messageEl = toastData.element.querySelector('.harmony-toast__message');
      if (messageEl) {
        messageEl.textContent = newMessage;
      }
    }
  }

  /**
   * Ferme tous les toasts
   */
  dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id));
  }

  /**
   * Change la position des toasts
   */
  setPosition(position) {
    this.position = position;
    if (this.container) {
      this.container.className = `harmony-toast-container harmony-toast-container--${position}`;
    }
  }
}

// Singleton instance
export const toast = new ToastSystem();
