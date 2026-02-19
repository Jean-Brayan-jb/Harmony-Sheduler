/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Dashboard Page Controller
 * ============================================================
 */

import { storage } from '../core/StorageManager.js';
import { HarmonyEngine } from '../core/HarmonyEngine.js';
import { HarmonyScoreWidget } from '../components/HarmonyScoreWidget.js';
import { modalSystem } from '../components/ModalSystem.js';
import { toast } from '../components/ToastSystem.js';
import { DateUtils } from '../utils/DateUtils.js';
import { CONFIG } from '../core/Config.js';

class DashboardController {
  constructor() {
    this.calendar = null;
    this.harmonyEngine = new HarmonyEngine(storage.getProfessional());
    this.scoreWidget = null;
    this.currentWeekRange = DateUtils.getCurrentWeekRange();
  }

  async init() {
    await this._initCalendar();
    this._initScoreWidget();
    this._updateStats();
    this._loadAlerts();
    this._checkPredictions();
    this._bindEvents();
  }

  _initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const events = storage.getAllEvents({ sortBy: true });
    const formattedEvents = events.map(ev => ({
      id: ev.id,
      title: ev.clientName || ev.title,
      start: ev.start,
      end: ev.end,
      backgroundColor: ev.color || CONFIG.HARMONY_WEIGHTS,
      borderColor: ev.color || '#26A69A',
      extendedProps: {
        clientEmail: ev.clientEmail,
        clientPhone: ev.clientPhone,
        notes: ev.notes,
        status: ev.status,
      },
    }));

    this.calendar = new FullCalendar.Calendar(calendarEl, {
      locale: 'fr',
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      slotMinTime: '06:00:00',
      slotMaxTime: '22:00:00',
      allDaySlot: false,
      nowIndicator: true,
      editable: true,
      selectable: true,
      selectMirror: true,
      events: formattedEvents,
      eventClick: (info) => this._onEventClick(info),
      select: (info) => this._onDateSelect(info),
      eventDrop: (info) => this._onEventDrop(info),
      eventResize: (info) => this._onEventResize(info),
    });

    this.calendar.render();
  }

  _initScoreWidget() {
    const widgetEl = document.getElementById('harmonyScoreWidget');
    if (!widgetEl) return;

    const events = storage.getAllEvents({
      startDate: this.currentWeekRange.start,
      endDate: this.currentWeekRange.end,
    });

    const scoreData = this.harmonyEngine.computeWeeklyScore(events, {
      weekRange: this.currentWeekRange,
    });

    this.scoreWidget = new HarmonyScoreWidget('harmonyScoreWidget', {
      size: 140,
      showBreakdown: true,
      showTrend: true,
    });

    this.scoreWidget.render(scoreData);

    // Score du jour
    const today = new Date().toISOString().split('T')[0];
    const dailyScore = this.harmonyEngine.computeDailyScore(today, events);
    this._updateDailyScore(dailyScore);

    // Récupération recommandée
    if (scoreData.recoveryRecommendation?.recommendedHours > 0) {
      this._showRecoveryRecommendation(scoreData.recoveryRecommendation);
    }
  }

  _updateDailyScore(dailyScore) {
    const bar = document.getElementById('dailyScoreBar');
    const label = document.getElementById('dailyScoreLabel');
    const details = document.getElementById('dailyScoreDetails');

    if (bar) {
      bar.style.width = `${dailyScore.score}%`;
      bar.dataset.level = dailyScore.level;
    }

    if (label) {
      const labels = {
        excellent: 'Excellente journée 🌟',
        good: 'Bonne journée 🌿',
        moderate: 'À surveiller 🟠',
        warning: 'Préoccupante ⚠️',
        critical: 'Critique 🔴',
      };
      label.textContent = labels[dailyScore.level] || '—';
    }

    if (details) {
      details.innerHTML = `
        <strong>${dailyScore.appointmentCount}</strong> rendez-vous ·
        <strong>${dailyScore.totalWorkHours}h</strong> de travail
        ${dailyScore.hasEveningWork ? ' · <span style="color: var(--hs-warning)">Travail en soirée</span>' : ''}
      `;
    }
  }

  _showRecoveryRecommendation(recovery) {
    const card = document.getElementById('recoveryCard');
    const content = document.getElementById('recoveryContent');
    if (!card || !content) return;

    const priorityColors = {
      high: 'var(--hs-danger)',
      medium: 'var(--hs-warning)',
      low: 'var(--hs-sage)',
    };

    content.innerHTML = `
      <div style="display: flex; align-items: baseline; gap: var(--hs-space-2); margin-bottom: var(--hs-space-3)">
        <span style="font-family: var(--hs-font-display); font-size: var(--hs-text-2xl); color: ${priorityColors[recovery.priority]}">
          ${recovery.recommendedHours}h
        </span>
        <span style="font-size: var(--hs-text-sm); color: var(--hs-text-muted)">de repos recommandé</span>
      </div>
      ${recovery.recoveryDebt > 0 ? `
        <div style="font-size: var(--hs-text-sm); color: var(--hs-danger); margin-bottom: var(--hs-space-3)">
          Déficit cumulé: ${recovery.recoveryDebt}h
        </div>
      ` : ''}
      ${recovery.suggestions?.length ? `
        <ul style="font-size: var(--hs-text-sm); color: var(--hs-text-soft); margin: 0; padding-left: var(--hs-space-4)">
          ${recovery.suggestions.map(s => `<li style="margin-bottom: var(--hs-space-1)">${s}</li>`).join('')}
        </ul>
      ` : ''}
    `;

    card.style.display = 'block';
  }

  _updateStats() {
    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const byDay = DateUtils.groupByDay(events);
    
    // RDV semaine
    const weekEvents = events.filter(ev => {
      const evDate = new Date(ev.start);
      return evDate >= new Date(this.currentWeekRange.start) && 
             evDate <= new Date(this.currentWeekRange.end);
    });
    
    const weeklyCount = weekEvents.length;
    document.getElementById('statWeeklyCount').textContent = weeklyCount;

    // RDV aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = byDay[today] || [];
    document.getElementById('statTodayCount').textContent = todayEvents.length;

    // En attente
    const pendingEvents = events.filter(ev => ev.status === CONFIG.STATUS.PENDING);
    document.getElementById('statPendingCount').textContent = pendingEvents.length;

    // Heures semaine
    const weekHours = weekEvents.reduce((sum, ev) => {
      return sum + DateUtils.hoursBetween(ev.start, ev.end);
    }, 0);
    document.getElementById('statHoursCount').textContent = `${Math.round(weekHours)}h`;

    const hoursStatus = document.getElementById('statHoursStatus');
    if (weekHours > CONFIG.THRESHOLDS.WEEKLY.WARNING_HOURS) {
      hoursStatus.textContent = '⚠️ Approche du maximum';
      hoursStatus.className = 'hs-stat-card__change hs-stat-card__change--negative';
    } else if (weekHours > CONFIG.THRESHOLDS.WEEKLY.GOOD_HOURS) {
      hoursStatus.textContent = 'Charge élevée';
      hoursStatus.className = 'hs-stat-card__change';
    } else {
      hoursStatus.textContent = '✓ Équilibre optimal';
      hoursStatus.className = 'hs-stat-card__change hs-stat-card__change--positive';
    }
  }

  _loadAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const criticalDays = this.harmonyEngine.detectCriticalDays(events);
    const blockSuggestions = this.harmonyEngine.suggestOptimalBlocks(events);

    const alerts = [];

    // Alertes de journées critiques
    criticalDays.forEach(day => {
      alerts.push({
        type: 'danger',
        title: `⚠️ Journée critique: ${DateUtils.formatDate(day.date, { day: 'numeric', month: 'long' })}`,
        message: `${day.eventCount} RDV prévus · ${day.totalHours}h de travail`,
        action: { text: 'Voir', onClick: () => this._goToDate(day.date) },
      });
    });

    // Suggestions de blocage
    blockSuggestions.immediate?.forEach(block => {
      alerts.push({
        type: 'warning',
        title: `🔒 Suggestion: bloquer ${block.timeLabel}`,
        message: block.reason,
        action: { text: 'Bloquer', onClick: () => this._blockSlot(block) },
      });
    });

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: var(--hs-space-6) 0; color: var(--hs-text-muted)">
          <div style="font-size: 2rem; margin-bottom: var(--hs-space-3)">🌿</div>
          <p>Aucune alerte active. Votre planning est équilibré !</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="hs-alert hs-alert--${alert.type}" style="margin-bottom: var(--hs-space-3)">
        <span class="hs-alert__icon">${alert.type === 'danger' ? '🔴' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <div class="hs-alert__content">
          <div class="hs-alert__title">${alert.title}</div>
          <p class="hs-alert__message">${alert.message}</p>
        </div>
        ${alert.action ? `
          <button class="hs-btn hs-btn--sm hs-btn--ghost" onclick="this.closest('.hs-alert').dispatchEvent(new CustomEvent('action'))">
            ${alert.action.text}
          </button>
        ` : ''}
      </div>
    `).join('');

    // Bind actions
    container.querySelectorAll('.hs-alert').forEach((el, i) => {
      el.addEventListener('action', () => alerts[i].action?.onClick?.());
    });
  }

  _checkPredictions() {
    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const predictions = this.harmonyEngine.predictOverloadRisk(events, 7);

    if (predictions.overallRisk === 'high') {
      const section = document.getElementById('overloadPrediction');
      const message = document.getElementById('predictionMessage');
      
      if (section && message) {
        message.textContent = predictions.actionableInsights?.[0] || 
          'Nous anticipons une charge élevée dans les jours à venir.';
        section.style.display = 'block';
      }
    }
  }

  _bindEvents() {
    // Nouveau RDV
    document.getElementById('btnNewEvent')?.addEventListener('click', () => {
      this._openNewEventModal();
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

    // Voir prédictions
    document.getElementById('btnViewPredictions')?.addEventListener('click', () => {
      window.location.href = 'analytics.html#predictions';
    });
  }

  _openNewEventModal() {
    modalSystem.form({
      title: 'Nouveau rendez-vous',
      fields: [
        { name: 'clientName', label: 'Nom du client', type: 'text', required: true },
        { name: 'clientEmail', label: 'Email', type: 'email' },
        { name: 'clientPhone', label: 'Téléphone', type: 'tel' },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'time', label: 'Heure', type: 'time', required: true },
        { name: 'duration', label: 'Durée (min)', type: 'number', value: '60' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ],
      onSubmit: async (data) => {
        const start = new Date(`${data.date}T${data.time}`);
        const end = new Date(start.getTime() + data.duration * 60000);

        const result = storage.addEvent({
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          start: start.toISOString(),
          end: end.toISOString(),
          notes: data.notes,
        });

        if (result.success) {
          this.calendar.addEvent({
            id: result.event.id,
            title: result.event.clientName,
            start: result.event.start,
            end: result.event.end,
            backgroundColor: '#26A69A',
          });
          this._updateStats();
          this._loadAlerts();
          toast.success('Rendez-vous créé');
        } else {
          throw new Error(Object.values(result.errors).join(', '));
        }
      },
    });
  }

  _onEventClick(info) {
    const event = info.event;
    const props = event.extendedProps;

    modalSystem.create({
      title: event.title,
      content: `
        <div style="margin-bottom: var(--hs-space-4)">
          <p><strong>📅</strong> ${DateUtils.formatDateTime(event.start)}</p>
          <p><strong>⏱</strong> ${DateUtils.hoursBetween(event.start, event.end)}h</p>
          ${props.clientEmail ? `<p><strong>✉️</strong> ${props.clientEmail}</p>` : ''}
          ${props.clientPhone ? `<p><strong>📞</strong> ${props.clientPhone}</p>` : ''}
          ${props.notes ? `<p style="margin-top: var(--hs-space-3); padding: var(--hs-space-3); background: var(--hs-surface-2); border-radius: var(--hs-radius-md)"><strong>📝</strong> ${props.notes}</p>` : ''}
        </div>
      `,
      buttons: [
        { text: 'Fermer', class: 'hs-btn hs-btn--ghost', action: 'cancel' },
        { text: 'Modifier', class: 'hs-btn hs-btn--secondary', action: 'edit' },
        { text: 'Supprimer', class: 'hs-btn hs-btn--danger', action: 'delete' },
      ],
      onConfirm: () => {
        // Modifier
        toast.info('Fonctionnalité à venir');
      },
    });
  }

  _onDateSelect(info) {
    this._openNewEventModalWithDate(info.start, info.end);
  }

  _openNewEventModalWithDate(start, end) {
    const duration = Math.round((end - start) / 60000);
    
    modalSystem.form({
      title: 'Nouveau rendez-vous',
      fields: [
        { name: 'clientName', label: 'Nom du client', type: 'text', required: true },
        { name: 'clientEmail', label: 'Email', type: 'email' },
        { name: 'clientPhone', label: 'Téléphone', type: 'tel' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ],
      onSubmit: async (data) => {
        const result = storage.addEvent({
          ...data,
          start: start.toISOString(),
          end: end.toISOString(),
        });

        if (result.success) {
          this.calendar.addEvent({
            id: result.event.id,
            title: result.event.clientName,
            start: result.event.start,
            end: result.event.end,
          });
          this._updateStats();
          toast.success('Rendez-vous créé');
        }
      },
    });
  }

  _onEventDrop(info) {
    storage.updateEvent(info.event.id, {
      start: info.event.start.toISOString(),
      end: info.event.end.toISOString(),
    });
    toast.success('Rendez-vous déplacé');
  }

  _onEventResize(info) {
    storage.updateEvent(info.event.id, {
      end: info.event.end.toISOString(),
    });
    toast.success('Durée modifiée');
  }

  _goToDate(dateStr) {
    this.calendar.gotoDate(dateStr);
  }

  _blockSlot(block) {
    storage.addEvent({
      title: '🚫 Bloqué',
      start: block.start,
      end: block.end,
      type: CONFIG.EVENT_TYPES.BLOCKED,
      color: '#ef5350',
    });
    this.calendar.refetchEvents();
    toast.success('Créneau bloqué');
  }
}

// Initialise le contrôleur
const controller = new DashboardController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
  controller.init();
}
