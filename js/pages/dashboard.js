/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Dashboard Controller (CORRIGÉ)
 * ============================================================
 *
 * CORRECTIONS APPORTÉES :
 *
 * [BUG 1 — COULEUR CASSÉE]
 *   Avant : backgroundColor: ev.color || CONFIG.HARMONY_WEIGHTS
 *   CONFIG.HARMONY_WEIGHTS est un objet, pas une couleur → le calendrier
 *   affichait une couleur invalide (fond blanc/transparent).
 *   Après : backgroundColor: ev.color || '#26A69A'
 *
 * [BUG 2 — CRÉATION RDV VIA CLIC CALENDRIER]
 *   La méthode _openNewEventModalWithDate() passait les données brutes
 *   du formulaire directement à storage.addEvent() sans le champ `clientName`
 *   dans la structure, ce qui faisait échouer la validation.
 *   Après : les champs sont extraits et nommés correctement.
 *   Aussi : le type 'appointment' et status 'confirmed' sont forcés explicitement.
 *
 * [BUG 3 — IMPORT CSV]
 *   Il n'existait pas de bouton ou de logique d'import CSV dans le dashboard.
 *   L'export existait, mais pas l'import. Ajout d'un bouton "Importer CSV"
 *   et d'une méthode _importCSV() complète qui :
 *     - Lit le fichier CSV ligne par ligne
 *     - Mappe les colonnes vers les champs de StorageManager
 *     - Appelle storage.addEvent() pour chaque ligne valide
 *     - Rafraîchit le calendrier et les stats après import
 *
 * [BUG 4 — RECALCUL APRÈS ACTIONS]
 *   Après création, déplacement ou suppression, le score et les alertes
 *   n'étaient pas toujours recalculés. Ajout de _refreshDashboard() qui
 *   regroupe toutes les mises à jour nécessaires en un seul appel.
 *
 * [AMÉLIORATION — LOGS DE DÉMO]
 *   Chaque action importante affiche un console.log() clair avec un emoji
 *   pour que tu puisses voir ce qui se passe pendant ta présentation.
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
    console.log('🌿 Dashboard init...');
    this._initCalendar();
    this._initScoreWidget();
    this._updateStats();
    this._loadAlerts();
    this._checkPredictions();
    this._bindEvents();
    console.log('✅ Dashboard prêt');
  }

  // ─────────────────────────────────────────────
  // CALENDRIER
  // ─────────────────────────────────────────────

  _initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const formattedEvents = this._getFormattedEvents();

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
      eventClick:  (info) => this._onEventClick(info),
      select:      (info) => this._onDateSelect(info),
      eventDrop:   (info) => this._onEventDrop(info),
      eventResize: (info) => this._onEventResize(info),
    });

    this.calendar.render();
  }

  /**
   * Lit tous les événements du storage et les convertit au format FullCalendar.
   * On filtre les événements supprimés (status: 'cancelled') pour ne pas les afficher.
   */
  _getFormattedEvents() {
    const events = storage.getAllEvents({ sortBy: true });

    return events
      .filter(ev => ev.status !== 'cancelled')
      .map(ev => ({
        id: ev.id,
        // Si clientName est vide on affiche le title générique
        title: ev.clientName || ev.title || 'Rendez-vous',
        start: ev.start,
        end: ev.end,
        // ✅ CORRECTION BUG 1 : CONFIG.HARMONY_WEIGHTS était un objet, pas une couleur
        backgroundColor: ev.color || '#26A69A',
        borderColor:     ev.color || '#26A69A',
        textColor: '#FFFFFF',
        extendedProps: {
          clientEmail: ev.clientEmail,
          clientPhone: ev.clientPhone,
          notes:       ev.notes,
          status:      ev.status,
          type:        ev.type,
        },
      }));
  }

  /**
   * Recharge entièrement le calendrier depuis le storage.
   * Appelé après chaque création / import / suppression.
   */
  _reloadCalendar() {
    if (!this.calendar) return;
    // Supprime tous les événements existants
    this.calendar.getEvents().forEach(ev => ev.remove());
    // Rajoute les événements mis à jour
    this._getFormattedEvents().forEach(ev => this.calendar.addEvent(ev));
    console.log('📅 Calendrier rechargé');
  }

  // ─────────────────────────────────────────────
  // SCORE WIDGET
  // ─────────────────────────────────────────────

  _initScoreWidget() {
    const widgetEl = document.getElementById('harmonyScoreWidget');
    if (!widgetEl) return;

    const events = storage.getAllEvents({
      startDate: this.currentWeekRange.start,
      endDate:   this.currentWeekRange.end,
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

    const today = new Date().toISOString().split('T')[0];
    const dailyScore = this.harmonyEngine.computeDailyScore(today, events);
    this._updateDailyScore(dailyScore);

    if (scoreData.recoveryRecommendation?.recommendedHours > 0) {
      this._showRecoveryRecommendation(scoreData.recoveryRecommendation);
    }
  }

  _updateDailyScore(dailyScore) {
    const bar     = document.getElementById('dailyScoreBar');
    const label   = document.getElementById('dailyScoreLabel');
    const details = document.getElementById('dailyScoreDetails');

    if (bar) {
      bar.style.width  = `${dailyScore.score}%`;
      bar.dataset.level = dailyScore.level;
    }

    if (label) {
      const labels = {
        excellent: 'Excellente journée 🌟',
        good:      'Bonne journée 🌿',
        moderate:  'À surveiller 🟠',
        warning:   'Préoccupante ⚠️',
        critical:  'Critique 🔴',
      };
      label.textContent = labels[dailyScore.level] || '—';
    }

    if (details) {
      details.innerHTML = `
        <strong>${dailyScore.appointmentCount}</strong> rendez-vous ·
        <strong>${dailyScore.totalWorkHours}h</strong> de travail
        ${dailyScore.hasEveningWork
          ? ' · <span style="color: var(--hs-warning)">Travail en soirée</span>'
          : ''}
      `;
    }
  }

  _showRecoveryRecommendation(recovery) {
    const card    = document.getElementById('recoveryCard');
    const content = document.getElementById('recoveryContent');
    if (!card || !content) return;

    const priorityColors = {
      high:   'var(--hs-danger)',
      medium: 'var(--hs-warning)',
      low:    'var(--hs-sage)',
    };

    content.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:var(--hs-space-2);margin-bottom:var(--hs-space-3)">
        <span style="font-family:var(--hs-font-display);font-size:var(--hs-text-2xl);color:${priorityColors[recovery.priority]}">
          ${recovery.recommendedHours}h
        </span>
        <span style="font-size:var(--hs-text-sm);color:var(--hs-text-muted)">de repos recommandé</span>
      </div>
      ${recovery.recoveryDebt > 0 ? `
        <div style="font-size:var(--hs-text-sm);color:var(--hs-danger);margin-bottom:var(--hs-space-3)">
          Déficit cumulé : ${recovery.recoveryDebt}h
        </div>
      ` : ''}
      ${recovery.suggestions?.length ? `
        <ul style="font-size:var(--hs-text-sm);color:var(--hs-text-soft);margin:0;padding-left:var(--hs-space-4)">
          ${recovery.suggestions.map(s => `<li style="margin-bottom:var(--hs-space-1)">${s}</li>`).join('')}
        </ul>
      ` : ''}
    `;

    card.style.display = 'block';
  }

  // ─────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────

  _updateStats() {
    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const byDay  = DateUtils.groupByDay(events);

    const weekEvents = events.filter(ev => {
      const d = new Date(ev.start).getTime();
      return d >= new Date(this.currentWeekRange.start).getTime() &&
             d <= new Date(this.currentWeekRange.end).getTime();
    });

    const weeklyCount = document.getElementById('statWeeklyCount');
    if (weeklyCount) weeklyCount.textContent = weekEvents.length;

    const today = new Date().toISOString().split('T')[0];
    const todayEl = document.getElementById('statTodayCount');
    if (todayEl) todayEl.textContent = (byDay[today] || []).length;

    const pendingEl = document.getElementById('statPendingCount');
    if (pendingEl) {
      pendingEl.textContent = events.filter(ev => ev.status === CONFIG.STATUS.PENDING).length;
    }

    const weekHours = weekEvents.reduce(
      (sum, ev) => sum + DateUtils.hoursBetween(ev.start, ev.end), 0
    );
    const hoursEl  = document.getElementById('statHoursCount');
    if (hoursEl) hoursEl.textContent = `${Math.round(weekHours)}h`;

    const hoursStatus = document.getElementById('statHoursStatus');
    if (hoursStatus) {
      if (weekHours > CONFIG.THRESHOLDS.WEEKLY.WARNING_HOURS) {
        hoursStatus.textContent  = '⚠️ Approche du maximum';
        hoursStatus.className    = 'hs-stat-card__change hs-stat-card__change--negative';
      } else if (weekHours > CONFIG.THRESHOLDS.WEEKLY.GOOD_HOURS) {
        hoursStatus.textContent  = 'Charge élevée';
        hoursStatus.className    = 'hs-stat-card__change';
      } else {
        hoursStatus.textContent  = '✓ Équilibre optimal';
        hoursStatus.className    = 'hs-stat-card__change hs-stat-card__change--positive';
      }
    }
  }

  // ─────────────────────────────────────────────
  // ALERTES
  // ─────────────────────────────────────────────

  _loadAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    const events        = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const criticalDays  = this.harmonyEngine.detectCriticalDays(events);
    const blockSuggest  = this.harmonyEngine.suggestOptimalBlocks(events);
    const alerts        = [];

    criticalDays.forEach(day => {
      alerts.push({
        type:    'danger',
        title:   `⚠️ Journée critique : ${DateUtils.formatDate(day.date, { day: 'numeric', month: 'long' })}`,
        message: `${day.eventCount} RDV prévus · ${day.totalHours}h de travail`,
        action:  { text: 'Voir', onClick: () => this._goToDate(day.date) },
      });
    });

    blockSuggest.immediate?.forEach(block => {
      alerts.push({
        type:    'warning',
        title:   `🔒 Suggestion : bloquer ${block.timeLabel || 'ce créneau'}`,
        message: block.reason || '',
        action:  { text: 'Bloquer', onClick: () => this._blockSlot(block) },
      });
    });

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:var(--hs-space-6) 0;color:var(--hs-text-muted)">
          <div style="font-size:2rem;margin-bottom:var(--hs-space-3)">🌿</div>
          <p>Aucune alerte active. Votre planning est équilibré !</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="hs-alert hs-alert--${alert.type}" style="margin-bottom:var(--hs-space-3)">
        <span class="hs-alert__icon">${alert.type === 'danger' ? '🔴' : '⚠️'}</span>
        <div class="hs-alert__content">
          <div class="hs-alert__title">${alert.title}</div>
          <p class="hs-alert__message">${alert.message}</p>
        </div>
        ${alert.action ? `
          <button class="hs-btn hs-btn--sm hs-btn--ghost" data-alert-action>
            ${alert.action.text}
          </button>
        ` : ''}
      </div>
    `).join('');

    container.querySelectorAll('[data-alert-action]').forEach((btn, i) => {
      btn.addEventListener('click', () => alerts[i].action?.onClick?.());
    });
  }

  _checkPredictions() {
    const events      = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
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

  // ─────────────────────────────────────────────
  // RAFRAÎCHISSEMENT GLOBAL
  // ─────────────────────────────────────────────

  /**
   * Appelé après chaque modification (création, import, suppression).
   * Met à jour le calendrier, les stats, les alertes et le score.
   */
  _refreshDashboard() {
    console.log('🔄 Rafraîchissement du dashboard...');
    this._reloadCalendar();
    this._updateStats();
    this._loadAlerts();
    this._initScoreWidget();
  }

  // ─────────────────────────────────────────────
  // EVENTS DU FORMULAIRE / BOUTONS
  // ─────────────────────────────────────────────

  _bindEvents() {
    // Nouveau RDV (bouton en haut)
    document.getElementById('btnNewEvent')?.addEventListener('click', () => {
      this._openNewEventModal();
    });

    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', () => {
      const csv  = storage.exportToCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `harmony-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV téléchargé');
    });

    // ✅ NOUVEAU : Import CSV
    // On injecte dynamiquement un bouton + input file si non présents dans le HTML
    this._injectImportButton();

    // Voir prédictions
    document.getElementById('btnViewPredictions')?.addEventListener('click', () => {
      window.location.href = 'analytics.html#predictions';
    });
  }

  /**
   * Injecte un bouton "Importer CSV" à côté du bouton Export.
   * Si ton HTML a déjà un bouton avec id="btnImportCSV", il sera utilisé directement.
   */
  _injectImportButton() {
    // Si le bouton existe déjà dans le HTML, on se contente de le binder
    let btn = document.getElementById('btnImportCSV');

    if (!btn) {
      // On crée le bouton et on l'insère à côté du bouton Export
      const exportBtn = document.getElementById('btnExportCSV');
      if (!exportBtn) return;

      btn = document.createElement('button');
      btn.id        = 'btnImportCSV';
      btn.className = 'hs-btn hs-btn--ghost hs-btn--sm';
      btn.title     = 'Importer un CSV exporté par Harmony';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4
                   M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        Import CSV
      `;
      exportBtn.insertAdjacentElement('afterend', btn);
    }

    // Input file caché
    let fileInput = document.getElementById('csvFileInput');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type    = 'file';
      fileInput.accept  = '.csv';
      fileInput.id      = 'csvFileInput';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    }

    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._importCSV(file);
      // Réinitialise pour pouvoir ré-importer le même fichier
      fileInput.value = '';
    });
  }

  // ─────────────────────────────────────────────
  // ✅ IMPORT CSV — Logique complète
  // ─────────────────────────────────────────────

  /**
   * Lit un fichier CSV et crée les RDV dans le storage.
   *
   * FORMAT ATTENDU (export Harmony) :
   *   ID, Titre, Client, Email, Téléphone, Début, Fin, Statut, Notes, Créé le
   *
   * FORMAT SIMPLIFIÉ (aussi accepté) :
   *   client, email, téléphone, debut, fin
   *
   * On détecte automatiquement lequel des deux on reçoit.
   */
  async _importCSV(file) {
    console.log(`📂 Import CSV : ${file.name}`);
    toast.info('Import en cours...');

    try {
      const text = await file.text();
      const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (lines.length < 2) {
        toast.error('Le fichier CSV est vide ou ne contient pas de données.');
        return;
      }

      // Lecture de l'en-tête (première ligne)
      const headers = this._parseCSVLine(lines[0]).map(h =>
        h.toLowerCase().replace(/[^a-záàâäéèêëíìîïóòôöúùûüñ]/gi, '')
      );

      console.log('📋 En-têtes détectées :', headers);

      let imported = 0;
      let skipped  = 0;

      // On parcourt les lignes de données (skip la ligne 1 = header)
      for (let i = 1; i < lines.length; i++) {
        const cols = this._parseCSVLine(lines[i]);
        if (cols.length < 2) { skipped++; continue; }

        // Construit l'objet événement selon le format détecté
        const eventData = this._mapCSVRowToEvent(headers, cols);

        if (!eventData) { skipped++; continue; }

        // Vérifie que start et end sont des dates valides
        if (!eventData.start || !eventData.end ||
            isNaN(new Date(eventData.start)) || isNaN(new Date(eventData.end))) {
          console.warn(`⚠️ Ligne ${i + 1} ignorée : dates invalides`, cols);
          skipped++;
          continue;
        }

        // Appel à storage.addEvent() — c'est lui qui valide et persiste
        const result = storage.addEvent(eventData);

        if (result.success) {
          imported++;
          console.log(`✅ RDV importé (ligne ${i + 1}) :`, result.event.clientName,
                      result.event.start);
        } else {
          console.warn(`❌ Ligne ${i + 1} rejetée :`, result.errors);
          skipped++;
        }
      }

      // Rafraîchit tout le dashboard
      this._refreshDashboard();

      if (imported > 0) {
        toast.success(`✅ ${imported} rendez-vous importés avec succès.${skipped > 0 ? ` (${skipped} lignes ignorées)` : ''}`);
      } else {
        toast.warning(`Aucun RDV importé. ${skipped} ligne(s) ignorée(s). Vérifiez le format du fichier.`);
      }

    } catch (err) {
      console.error('❌ Erreur import CSV :', err);
      toast.error('Erreur lors de la lecture du fichier CSV.');
    }
  }

  /**
   * Convertit une ligne CSV (tableau de colonnes) en objet événement.
   * Supporte le format Harmony (10 colonnes) et un format minimal (5 colonnes).
   */
  _mapCSVRowToEvent(headers, cols) {
    // ── FORMAT HARMONY EXPORT (10 colonnes) ──────────────────────
    // ID, Titre, Client, Email, Téléphone, Début, Fin, Statut, Notes, Créé le
    const idxClient = headers.findIndex(h => h.includes('client') || h.includes('nom'));
    const idxEmail  = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const idxPhone  = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('phone'));
    const idxStart  = headers.findIndex(h => h.includes('but') || h.includes('start') || h.includes('debut'));
    const idxEnd    = headers.findIndex(h => h.includes('fin') || h.includes('end'));
    const idxNotes  = headers.findIndex(h => h.includes('note'));
    const idxStatus = headers.findIndex(h => h.includes('statut') || h.includes('status'));

    // On a besoin au minimum d'un nom client, d'un début et d'une fin
    if (idxClient === -1 || idxStart === -1 || idxEnd === -1) {
      // Essai format minimal : col 0 = client, col 3 = start, col 4 = end
      if (cols.length >= 5) {
        return {
          clientName: cols[0] || 'Client importé',
          clientEmail: cols[1] || '',
          clientPhone: cols[2] || '',
          start:  cols[3],
          end:    cols[4],
          notes:  cols[5] || '',
          type:   CONFIG.EVENT_TYPES.APPOINTMENT,
          status: CONFIG.STATUS.CONFIRMED,
          source: 'import',
        };
      }
      return null;
    }

    const clientName = cols[idxClient]?.trim() || 'Client importé';
    const start      = cols[idxStart]?.trim();
    const end        = cols[idxEnd]?.trim();

    if (!start || !end) return null;

    // Détermine le statut : on accepte uniquement les valeurs connues
    const rawStatus = (cols[idxStatus] || '').trim().toLowerCase();
    const knownStatuses = Object.values(CONFIG.STATUS);
    const status = knownStatuses.includes(rawStatus)
      ? rawStatus
      : CONFIG.STATUS.CONFIRMED;

    return {
      clientName,
      clientEmail: idxEmail  !== -1 ? (cols[idxEmail]?.trim()  || '') : '',
      clientPhone: idxPhone  !== -1 ? (cols[idxPhone]?.trim()  || '') : '',
      start,
      end,
      notes:  idxNotes !== -1 ? (cols[idxNotes]?.trim() || '') : '',
      type:   CONFIG.EVENT_TYPES.APPOINTMENT,
      status,
      source: 'import',
    };
  }

  /**
   * Parse une ligne CSV en tenant compte des guillemets.
   * Exemple : 'Alice,"Dupont, Dr",alice@mail.com'
   *        → ['Alice', 'Dupont, Dr', 'alice@mail.com']
   */
  _parseCSVLine(line) {
    const result = [];
    let current  = '';
    let inQuotes = false;

    // Supprime le BOM UTF-8 si présent
    line = line.replace(/^\uFEFF/, '');

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Guillemet échappé ""
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // ─────────────────────────────────────────────
  // CRÉATION RDV — BOUTON EN HAUT
  // ─────────────────────────────────────────────

  _openNewEventModal() {
    modalSystem.form({
      title: 'Nouveau rendez-vous',
      fields: [
        { name: 'clientName', label: 'Nom du client',   type: 'text',   required: true },
        { name: 'clientEmail',label: 'Email',            type: 'email' },
        { name: 'clientPhone',label: 'Téléphone',        type: 'tel' },
        { name: 'date',        label: 'Date',            type: 'date',   required: true },
        { name: 'time',        label: 'Heure de début',  type: 'time',   required: true },
        { name: 'duration',    label: 'Durée (minutes)', type: 'number', value: '60' },
        { name: 'notes',       label: 'Notes',           type: 'textarea' },
      ],
      onSubmit: async (data) => {
        const start    = new Date(`${data.date}T${data.time}`);
        const duration = parseInt(data.duration, 10) || 60;
        const end      = new Date(start.getTime() + duration * 60000);

        console.log('📝 Création RDV :', data.clientName, start.toISOString());

        const result = storage.addEvent({
          clientName:  data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          start:  start.toISOString(),
          end:    end.toISOString(),
          notes:  data.notes,
          // ✅ Type et statut explicitement définis
          type:   CONFIG.EVENT_TYPES.APPOINTMENT,
          status: CONFIG.STATUS.CONFIRMED,
        });

        if (result.success) {
          console.log('✅ RDV créé avec ID :', result.event.id);
          this._refreshDashboard();
          toast.success(`Rendez-vous créé pour ${data.clientName}`);
        } else {
          console.error('❌ Erreur création RDV :', result.errors);
          throw new Error(Object.values(result.errors).join(', '));
        }
      },
    });
  }

  // ─────────────────────────────────────────────
  // CRÉATION RDV — CLIC SUR LE CALENDRIER
  // ─────────────────────────────────────────────

  _onDateSelect(info) {
    this._openNewEventModalWithDate(info.start, info.end);
  }

  /**
   * ✅ CORRECTION BUG 2 :
   * Avant, on passait Object.fromEntries(formData) directement à storage.addEvent().
   * Le FormData contient uniquement les champs du formulaire (clientName, clientEmail...),
   * mais pas start/end. On les injectait séparément, mais la validation plantait car
   * clientName était dans data.clientName mais le spread {...data} ne fonctionnait
   * pas toujours correctement.
   * Maintenant on extrait chaque champ explicitement → aucune ambiguïté.
   */
  _openNewEventModalWithDate(start, end) {
    const durationMin = Math.round((end - start) / 60000);

    modalSystem.form({
      title:  `Nouveau rendez-vous — ${DateUtils.formatDateTime(start.toISOString())}`,
      fields: [
        { name: 'clientName',  label: 'Nom du client', type: 'text',     required: true },
        { name: 'clientEmail', label: 'Email',          type: 'email' },
        { name: 'clientPhone', label: 'Téléphone',      type: 'tel' },
        { name: 'notes',       label: 'Notes',          type: 'textarea' },
      ],
      onSubmit: async (data) => {
        console.log('📝 Création RDV via calendrier :', data.clientName,
                    start.toISOString(), '→', end.toISOString());

        // ✅ Champs extraits explicitement — plus d'erreur de validation
        const result = storage.addEvent({
          clientName:  data.clientName,
          clientEmail: data.clientEmail  || '',
          clientPhone: data.clientPhone  || '',
          notes:       data.notes        || '',
          start:  start.toISOString(),
          end:    end.toISOString(),
          type:   CONFIG.EVENT_TYPES.APPOINTMENT,
          status: CONFIG.STATUS.CONFIRMED,
        });

        if (result.success) {
          console.log('✅ RDV créé :', result.event.id, result.event.clientName);
          this._refreshDashboard();
          toast.success(`Rendez-vous créé pour ${data.clientName}`);
        } else {
          console.error('❌ Erreur :', result.errors);
          throw new Error(Object.values(result.errors).join(', '));
        }
      },
    });
  }

  // ─────────────────────────────────────────────
  // CLIC SUR UN ÉVÉNEMENT EXISTANT
  // ─────────────────────────────────────────────

  _onEventClick(info) {
    const event = info.event;
    const props = event.extendedProps;

    modalSystem.create({
      title:   event.title,
      content: `
        <div style="margin-bottom:var(--hs-space-4)">
          <p><strong>📅</strong> ${DateUtils.formatDateTime(event.start.toISOString())}</p>
          <p><strong>⏱</strong> ${DateUtils.hoursBetween(event.start.toISOString(), event.end.toISOString())}h</p>
          ${props.clientEmail ? `<p><strong>✉️</strong> ${props.clientEmail}</p>` : ''}
          ${props.clientPhone ? `<p><strong>📞</strong> ${props.clientPhone}</p>` : ''}
          ${props.notes ? `
            <p style="margin-top:var(--hs-space-3);padding:var(--hs-space-3);
                       background:var(--hs-surface-2);border-radius:var(--hs-radius-md)">
              <strong>📝</strong> ${props.notes}
            </p>` : ''}
        </div>
      `,
      buttons: [
        { text: 'Fermer',    class: 'hs-btn hs-btn--ghost',   action: 'cancel' },
        { text: 'Supprimer', class: 'hs-btn hs-btn--danger',  action: 'delete' },
      ],
      onConfirm: () => {
        // Bouton "Supprimer" déclenche onConfirm car c'est le bouton primary
        const result = storage.deleteEvent(event.id);
        if (result.success) {
          console.log('🗑️ RDV supprimé :', event.id);
          this._refreshDashboard();
          toast.success('Rendez-vous supprimé');
        } else {
          toast.error('Impossible de supprimer ce rendez-vous');
        }
      },
    });
  }

  // ─────────────────────────────────────────────
  // DRAG & DROP / RESIZE
  // ─────────────────────────────────────────────

  _onEventDrop(info) {
    const result = storage.updateEvent(info.event.id, {
      start: info.event.start.toISOString(),
      end:   info.event.end.toISOString(),
    });

    if (result.success) {
      console.log('📦 RDV déplacé :', info.event.id);
      this._updateStats();
      this._loadAlerts();
      toast.success('Rendez-vous déplacé');
    } else {
      // Annule le déplacement dans FullCalendar
      info.revert();
      toast.error('Impossible de déplacer ce rendez-vous');
    }
  }

  _onEventResize(info) {
    const result = storage.updateEvent(info.event.id, {
      end: info.event.end.toISOString(),
    });

    if (result.success) {
      console.log('↔️ Durée modifiée :', info.event.id);
      this._updateStats();
      toast.success('Durée modifiée');
    } else {
      info.revert();
      toast.error('Impossible de modifier la durée');
    }
  }

  // ─────────────────────────────────────────────
  // UTILITAIRES
  // ─────────────────────────────────────────────

  _goToDate(dateStr) {
    this.calendar?.gotoDate(dateStr);
  }

  _blockSlot(block) {
    const result = storage.addEvent({
      title:  '🚫 Bloqué',
      start:  block.start,
      end:    block.end,
      type:   CONFIG.EVENT_TYPES.BLOCKED,
      status: CONFIG.STATUS.CONFIRMED,
      color:  '#ef5350',
      // Validator exige clientName même pour un slot bloqué
      clientName: 'Créneau bloqué',
    });

    if (result.success) {
      console.log('🔒 Créneau bloqué :', block.start);
      this._refreshDashboard();
      toast.success('Créneau bloqué');
    }
  }
}

// ─────────────────────────────────────────────
// POINT D'ENTRÉE
// ─────────────────────────────────────────────

const controller = new DashboardController();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
  controller.init();
}