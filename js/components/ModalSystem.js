/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Modal System
 * ============================================================
 * Système de modales élégantes avec animations fluides
 * Architecture: Pattern Observer avec gestion de pile
 */

import { CONFIG } from '../core/Config.js';

export class ModalSystem {
  constructor() {
    this.stack = [];
    this.focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];
    this.previousActiveElement = null;
    this.overlay = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    this._createOverlay();
    this._bindKeyboardEvents();
    this._bindOverlayClick();
    
    this.initialized = true;
  }

  /**
   * ============================================================
   * CRÉATION DE MODALES
   * ============================================================
   */
  
  create(options) {
    this.init();
    
    const {
      id = `modal_${Date.now()}`,
      title,
      content,
      size = 'medium', // small, medium, large, fullscreen
      type = 'default', // default, confirm, alert, form
      buttons = [],
      onOpen,
      onClose,
      onConfirm,
      onCancel,
      closeOnOverlay = true,
      closeOnEscape = true,
      showCloseButton = true,
      animation = 'scale', // scale, slide-up, slide-down, fade
    } = options;
    
    // Sauvegarde l'élément focusé
    this.previousActiveElement = document.activeElement;
    
    // Crée la modale
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = `harmony-modal harmony-modal--${size} harmony-modal--${type}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `${id}_title`);
    
    // Construction du contenu
    modal.innerHTML = this._buildModalHTML({
      id,
      title,
      content,
      buttons,
      showCloseButton,
      type,
    });
    
    // Ajoute au DOM
    document.body.appendChild(modal);
    
    // Empile la modale
    const modalData = {
      id,
      element: modal,
      options,
      onClose,
      closeOnEscape,
    };
    
    this.stack.push(modalData);
    
    // Animation d'ouverture
    requestAnimationFrame(() => {
      modal.classList.add('harmony-modal--opening');
      this._showOverlay();
      
      requestAnimationFrame(() => {
        modal.classList.add('harmony-modal--open');
        modal.classList.remove('harmony-modal--opening');
        
        // Focus management
        this._setInitialFocus(modal);
        
        if (onOpen) onOpen(modal);
      });
    });
    
    // Bind des boutons
    this._bindModalButtons(modal, { onConfirm, onCancel });
    
    return {
      id,
      close: () => this.close(id),
      updateContent: (newContent) => this._updateContent(id, newContent),
      setLoading: (loading) => this._setLoading(id, loading),
    };
  }

  /**
   * Crée une modale de confirmation rapide
   */
  confirm(options) {
    const {
      message,
      title = 'Confirmation',
      confirmText = 'Confirmer',
      cancelText = 'Annuler',
      confirmClass = 'btn--primary',
      danger = false,
    } = options;
    
    return new Promise((resolve) => {
      const modal = this.create({
        title,
        size: 'small',
        type: danger ? 'danger' : 'confirm',
        content: `<p class="modal-message">${message}</p>`,
        buttons: [
          {
            text: cancelText,
            class: 'btn--ghost',
            action: 'cancel',
          },
          {
            text: confirmText,
            class: danger ? 'btn--danger' : confirmClass,
            action: 'confirm',
          },
        ],
        onConfirm: () => {
          resolve(true);
          modal.close();
        },
        onCancel: () => {
          resolve(false);
          modal.close();
        },
      });
    });
  }

  /**
   * Crée une modale d'alerte rapide
   */
  alert(message, title = 'Information', type = 'info') {
    return new Promise((resolve) => {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
      };
      
      const modal = this.create({
        title: `${icons[type] || 'ℹ️'} ${title}`,
        size: 'small',
        type,
        content: `<p class="modal-message">${message}</p>`,
        buttons: [
          {
            text: 'OK',
            class: 'btn--primary',
            action: 'confirm',
          },
        ],
        onConfirm: () => {
          resolve();
          modal.close();
        },
      });
    });
  }

  /**
   * Crée une modale de formulaire
   */
  form(options) {
    const {
      title,
      fields = [],
      submitText = 'Enregistrer',
      cancelText = 'Annuler',
      onSubmit,
      validate,
    } = options;
    
    const formHtml = this._buildFormHTML(fields);
    
    const modal = this.create({
      title,
      size: 'medium',
      type: 'form',
      content: `<form class="harmony-form" id="modal_form_${Date.now()}">${formHtml}</form>`,
      buttons: [
        {
          text: cancelText,
          class: 'btn--ghost',
          action: 'cancel',
        },
        {
          text: submitText,
          class: 'btn--primary',
          action: 'submit',
          type: 'submit',
        },
      ],
    });
    
    // Bind du formulaire
    const form = modal.element.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Validation
        if (validate) {
          const errors = validate(data);
          if (errors && Object.keys(errors).length > 0) {
            this._showFormErrors(form, errors);
            return;
          }
        }
        
        modal.setLoading(true);
        
        try {
          await onSubmit(data);
          modal.close();
        } catch (error) {
          this._showFormError(form, error.message);
        } finally {
          modal.setLoading(false);
        }
      });
    }
    
    return modal;
  }

  /**
   * ============================================================
   * FERMETURE DE MODALES
   * ============================================================
   */
  
  close(id) {
    let modalData;
    
    if (id) {
      const index = this.stack.findIndex(m => m.id === id);
      if (index === -1) return;
      modalData = this.stack[index];
      this.stack.splice(index, 1);
    } else {
      modalData = this.stack.pop();
    }
    
    if (!modalData) return;
    
    const { element, options, onClose } = modalData;
    
    // Animation de fermeture
    element.classList.add('harmony-modal--closing');
    element.classList.remove('harmony-modal--open');
    
    setTimeout(() => {
      element.remove();
      
      if (onClose) onClose();
      
      // Restaure le focus
      if (this.stack.length === 0) {
        this._hideOverlay();
        if (this.previousActiveElement) {
          this.previousActiveElement.focus();
        }
      } else {
        // Focus sur la modale précédente
        const previousModal = this.stack[this.stack.length - 1];
        this._setInitialFocus(previousModal.element);
      }
    }, CONFIG.ANIMATION.SLOW);
  }

  closeAll() {
    while (this.stack.length > 0) {
      this.close();
    }
  }

  /**
   * ============================================================
   * MÉTHODES PRIVÉES
   * ============================================================
   */
  
  _createOverlay() {
    if (this.overlay) return;
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'harmony-modal-overlay';
    document.body.appendChild(this.overlay);
  }

  _showOverlay() {
    if (this.overlay) {
      this.overlay.classList.add('harmony-modal-overlay--visible');
      document.body.classList.add('harmony-modal-open');
    }
  }

  _hideOverlay() {
    if (this.overlay) {
      this.overlay.classList.remove('harmony-modal-overlay--visible');
      document.body.classList.remove('harmony-modal-open');
    }
  }

  _buildModalHTML({ id, title, content, buttons, showCloseButton, type }) {
    const buttonsHtml = buttons.map((btn, index) => `
      <button 
        type="${btn.type || 'button'}"
        class="btn ${btn.class || 'btn--primary'}"
        data-action="${btn.action || ''}"
        ${btn.disabled ? 'disabled' : ''}
      >
        ${btn.icon ? `<span class="btn-icon">${btn.icon}</span>` : ''}
        ${btn.text}
      </button>
    `).join('');
    
    return `
      <div class="harmony-modal__container">
        <div class="harmony-modal__header">
          <h2 class="harmony-modal__title" id="${id}_title">${title}</h2>
          ${showCloseButton ? `
            <button class="harmony-modal__close" aria-label="Fermer" data-action="close">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="harmony-modal__body">
          ${content}
        </div>
        ${buttonsHtml ? `
          <div class="harmony-modal__footer">
            ${buttonsHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  _buildFormHTML(fields) {
    return fields.map(field => {
      const {
        name,
        label,
        type = 'text',
        required = false,
        placeholder = '',
        value = '',
        options = [],
        helpText = '',
      } = field;
      
      let inputHtml = '';
      
      switch (type) {
        case 'select':
          inputHtml = `
            <select 
              name="${name}" 
              id="field_${name}"
              class="field ${required ? 'field--required' : ''}"
              ${required ? 'required' : ''}
            >
              ${options.map(opt => `
                <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                  ${opt.label}
                </option>
              `).join('')}
            </select>
          `;
          break;
          
        case 'textarea':
          inputHtml = `
            <textarea 
              name="${name}" 
              id="field_${name}"
              class="field ${required ? 'field--required' : ''}"
              placeholder="${placeholder}"
              ${required ? 'required' : ''}
              rows="4"
            >${value}</textarea>
          `;
          break;
          
        case 'checkbox':
          inputHtml = `
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                name="${name}" 
                id="field_${name}"
                ${value ? 'checked' : ''}
              >
              <span class="checkbox-text">${label}</span>
            </label>
          `;
          break;
          
        default:
          inputHtml = `
            <input 
              type="${type}" 
              name="${name}" 
              id="field_${name}"
              class="field ${required ? 'field--required' : ''}"
              placeholder="${placeholder}"
              value="${value}"
              ${required ? 'required' : ''}
            >
          `;
      }
      
      if (type === 'checkbox') return inputHtml;
      
      return `
        <div class="field-group">
          <label class="field-label" for="field_${name}">
            ${label}
            ${required ? '<span class="required">*</span>' : ''}
          </label>
          ${inputHtml}
          ${helpText ? `<p class="field-help">${helpText}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  _bindModalButtons(modal, callbacks) {
    const buttons = modal.querySelectorAll('[data-action]');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
          case 'close':
            this.close(modal.id);
            break;
          case 'cancel':
            if (callbacks.onCancel) callbacks.onCancel();
            this.close(modal.id);
            break;
          case 'confirm':
            if (callbacks.onConfirm) callbacks.onConfirm();
            break;
        }
      });
    });
  }

  _bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.stack.length > 0) {
        const topModal = this.stack[this.stack.length - 1];
        if (topModal.closeOnEscape !== false) {
          this.close();
        }
      }
      
      // Trap focus dans la modale
      if (e.key === 'Tab' && this.stack.length > 0) {
        const topModal = this.stack[this.stack.length - 1];
        this._trapFocus(e, topModal.element);
      }
    });
  }

  _bindOverlayClick() {
    if (this.overlay) {
      this.overlay.addEventListener('click', () => {
        if (this.stack.length > 0) {
          const topModal = this.stack[this.stack.length - 1];
          if (topModal.options.closeOnOverlay !== false) {
            this.close();
          }
        }
      });
    }
  }

  _setInitialFocus(modal) {
    // Cherche un champ avec autofocus ou le premier champ focusable
    const autofocus = modal.querySelector('[autofocus]');
    if (autofocus) {
      autofocus.focus();
      return;
    }
    
    const focusable = modal.querySelectorAll(this.focusableSelectors.join(','));
    if (focusable.length) {
      // Focus sur le premier bouton primaire ou le premier champ
      const primaryBtn = modal.querySelector('.btn--primary');
      if (primaryBtn) {
        primaryBtn.focus();
      } else {
        focusable[0].focus();
      }
    }
  }

  _trapFocus(e, modal) {
    const focusable = modal.querySelectorAll(this.focusableSelectors.join(','));
    if (!focusable.length) return;
    
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  _updateContent(id, newContent) {
    const modalData = this.stack.find(m => m.id === id);
    if (modalData) {
      const body = modalData.element.querySelector('.harmony-modal__body');
      if (body) {
        body.innerHTML = newContent;
      }
    }
  }

  _setLoading(id, loading) {
    const modalData = this.stack.find(m => m.id === id);
    if (modalData) {
      const submitBtn = modalData.element.querySelector('[data-action="confirm"], [type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = loading;
        if (loading) {
          submitBtn.dataset.originalText = submitBtn.innerHTML;
          submitBtn.innerHTML = `<span class="spinner"></span> Chargement...`;
        } else {
          submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
        }
      }
    }
  }

  _showFormErrors(form, errors) {
    // Nettoie les erreurs précédentes
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('.field--error').forEach(el => el.classList.remove('field--error'));
    
    // Affiche les nouvelles erreurs
    Object.entries(errors).forEach(([field, message]) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('field--error');
        const error = document.createElement('span');
        error.className = 'field-error';
        error.textContent = message;
        input.parentNode.insertBefore(error, input.nextSibling);
      }
    });
  }

  _showFormError(form, message) {
    // Supprime l'erreur globale précédente
    const existing = form.querySelector('.form-error');
    if (existing) existing.remove();
    
    const error = document.createElement('div');
    error.className = 'form-error';
    error.textContent = message;
    form.insertBefore(error, form.firstChild);
  }
}

// Singleton instance
export const modalSystem = new ModalSystem();
