/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Settings Page Controller
 * ============================================================
 */

import { storage } from '../core/StorageManager.js';
import { modalSystem } from '../components/ModalSystem.js';
import { toast } from '../components/ToastSystem.js';
import { Validator } from '../utils/Validator.js';

class SettingsController {
  constructor() {
    this.professional = null;
    this.availability = [];
  }

  async init() {
    this.professional = storage.getProfessional();
    this.availability = storage.getAvailability();
    
    this._loadProfile();
    this._loadAvailability();
    this._loadHarmonySettings();
    this._loadNotificationSettings();
    this._bindEvents();
    this._initNavigation();
  }

  _loadProfile() {
    document.getElementById('settingName').value = this.professional.name || '';
    document.getElementById('settingProfession').value = this.professional.profession || '';
    document.getElementById('settingEmail').value = this.professional.email || '';
    document.getElementById('settingTimezone').value = this.professional.timezone || 'Europe/Paris';
  }

  _loadAvailability() {
    const container = document.getElementById('availabilityList');
    if (!container) return;

    // Disponibilités par défaut si vide
    if (this.availability.length === 0) {
      this.availability = [
        { id: 'mon', dayOfWeek: 1, start: '09:00', end: '18:00', enabled: true },
        { id: 'tue', dayOfWeek: 2, start: '09:00', end: '18:00', enabled: true },
        { id: 'wed', dayOfWeek: 3, start: '09:00', end: '18:00', enabled: true },
        { id: 'thu', dayOfWeek: 4, start: '09:00', end: '18:00', enabled: true },
        { id: 'fri', dayOfWeek: 5, start: '09:00', end: '18:00', enabled: true },
      ];
    }

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    container.innerHTML = this.availability.map(slot => `
      <div class="availability-slot" data-slot-id="${slot.id || slot.dayOfWeek}">
        <label style="display: flex; align-items: center; gap: var(--hs-space-2); cursor: pointer">
          <input type="checkbox" class="availability-enabled" ${slot.enabled !== false ? 'checked' : ''}>
          <span class="availability-slot__day">${dayNames[slot.dayOfWeek]}</span>
        </label>
        <div class="availability-slot__times">
          <input type="time" class="hs-field availability-start" value="${slot.start}" ${slot.enabled === false ? 'disabled' : ''}>
          <span>à</span>
          <input type="time" class="hs-field availability-end" value="${slot.end}" ${slot.enabled === false ? 'disabled' : ''}>
        </div>
      </div>
    `).join('');

    // Bind les checkboxes
    container.querySelectorAll('.availability-enabled').forEach((cb, i) => {
      cb.addEventListener('change', () => {
        const slot = container.children[i];
        const inputs = slot.querySelectorAll('input[type="time"]');
        inputs.forEach(input => input.disabled = !cb.checked);
      });
    });
  }

  _loadHarmonySettings() {
    document.getElementById('settingDefaultDuration').value = this.professional.defaultDuration || 60;
    document.getElementById('settingBreakDuration').value = this.professional.breakDuration || 20;
    document.getElementById('settingMaxDaily').value = this.professional.maxDailyAppointments || 8;
    document.getElementById('settingMaxWeekly').value = this.professional.maxWeeklyHours || 40;
    document.getElementById('settingAutoBlock').checked = this.professional.autoBlockCriticalDays !== false;
    document.getElementById('settingPredictiveAlerts').checked = this.professional.enablePredictiveAlerts !== false;

    // Mise à jour des labels des sliders
    this._updateSliderLabels();
  }

  _updateSliderLabels() {
    const maxDaily = document.getElementById('settingMaxDaily');
    const maxWeekly = document.getElementById('settingMaxWeekly');

    maxDaily?.addEventListener('input', (e) => {
      document.getElementById('maxDailyValue').textContent = `${e.target.value} RDV`;
    });

    maxWeekly?.addEventListener('input', (e) => {
      document.getElementById('maxWeeklyValue').textContent = `${e.target.value}h`;
    });
  }

  _loadNotificationSettings() {
    const prefs = this.professional.notificationPreferences || {};
    document.getElementById('notifEmail').checked = prefs.email !== false;
    document.getElementById('notifBrowser').checked = prefs.browser !== false;
    document.getElementById('notifCriticalOnly').checked = prefs.criticalOnly === true;
  }

  _bindEvents() {
    // Formulaire Profil
    document.getElementById('formProfile')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      const result = storage.updateProfessional({
        name: data.name,
        profession: data.profession,
        email: data.email,
        timezone: data.timezone,
      });

      if (result.success) {
        toast.success('Profil mis à jour');
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    });

    // Sauvegarde Disponibilités
    document.getElementById('btnSaveAvailability')?.addEventListener('click', () => {
      const slots = [];
      document.querySelectorAll('.availability-slot').forEach(slotEl => {
        const enabled = slotEl.querySelector('.availability-enabled').checked;
        const start = slotEl.querySelector('.availability-start').value;
        const end = slotEl.querySelector('.availability-end').value;
        const dayOfWeek = parseInt(slotEl.dataset.slotId, 10);

        slots.push({
          dayOfWeek,
          start,
          end,
          enabled,
        });
      });

      const result = storage.saveAvailability(slots);
      if (result.success) {
        toast.success('Disponibilités enregistrées');
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    });

    // Formulaire Harmony
    document.getElementById('formHarmony')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      const result = storage.updateProfessional({
        defaultDuration: parseInt(data.defaultDuration, 10),
        breakDuration: parseInt(data.breakDuration, 10),
        maxDailyAppointments: parseInt(data.maxDailyAppointments, 10),
        maxWeeklyHours: parseInt(data.maxWeeklyHours, 10),
        autoBlockCriticalDays: data.autoBlockCriticalDays === 'on',
        enablePredictiveAlerts: data.enablePredictiveAlerts === 'on',
      });

      if (result.success) {
        toast.success('Paramètres Harmony enregistrés');
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    });

    // Formulaire Notifications
    document.getElementById('formNotifications')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      const result = storage.updateProfessional({
        notificationPreferences: {
          email: data.emailNotifications === 'on',
          browser: data.browserNotifications === 'on',
          criticalOnly: data.criticalOnly === 'on',
        },
      });

      if (result.success) {
        toast.success('Préférences de notification enregistrées');
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    });

    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      const csv = storage.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `harmony-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    });

    // Backup JSON
    document.getElementById('btnBackupJSON')?.addEventListener('click', () => {
      const json = storage.exportFullBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `harmony-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Sauvegarde téléchargée');
    });

    // Import JSON
    document.getElementById('btnImportJSON')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = storage.importFromBackup(text);

        if (result.success) {
          toast.success(`${result.eventCount} événements importés`);
          setTimeout(() => location.reload(), 1000);
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error('Fichier invalide');
      }
    });

    // Reset All
    document.getElementById('btnResetAll')?.addEventListener('click', async () => {
      const confirmed = await modalSystem.confirm({
        title: 'Réinitialiser toutes les données ?',
        message: 'Cette action est irréversible. Tous vos rendez-vous, paramètres et données seront supprimés.',
        danger: true,
        confirmText: 'Oui, tout supprimer',
        cancelText: 'Annuler',
      });

      if (confirmed) {
        localStorage.removeItem('harmonyScheduler_v2');
        toast.success('Données réinitialisées');
        setTimeout(() => location.reload(), 1000);
      }
    });
  }

  _initNavigation() {
    // Navigation smooth scroll
    document.querySelectorAll('[data-settings-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const target = document.querySelector(targetId);
        
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Met à jour la classe active
          document.querySelectorAll('[data-settings-link]').forEach(l => 
            l.classList.remove('settings-nav__link--active')
          );
          link.classList.add('settings-nav__link--active');
        }
      });
    });

    // Observer pour mettre à jour la navigation au scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          document.querySelectorAll('[data-settings-link]').forEach(link => {
            link.classList.toggle('settings-nav__link--active', 
              link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    document.querySelectorAll('.settings-section').forEach(section => {
      observer.observe(section);
    });
  }
}

// Initialise le contrôleur
const controller = new SettingsController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
  controller.init();
}
