/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Analytics Page Controller
 * ============================================================
 */

import { storage } from '../core/StorageManager.js';
import { HarmonyEngine } from '../core/HarmonyEngine.js';
import { HarmonyScoreWidget } from '../components/HarmonyScoreWidget.js';
import { DateUtils } from '../utils/DateUtils.js';
import { CONFIG } from '../core/Config.js';

class AnalyticsController {
  constructor() {
    this.harmonyEngine = new HarmonyEngine(storage.getProfessional());
    this.charts = {};
    this.currentPeriod = 30;
  }

  async init() {
    this._initScoreWidget();
    this._initCharts();
    this._loadInsights();
    this._loadScoreHistory();
    this._checkPredictions();
    this._bindEvents();
  }

  _initScoreWidget() {
    const widgetEl = document.getElementById('harmonyScoreWidgetDetailed');
    if (!widgetEl) return;

    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const weekRange = DateUtils.getCurrentWeekRange();

    const scoreData = this.harmonyEngine.computeWeeklyScore(events, { weekRange });

    const widget = new HarmonyScoreWidget('harmonyScoreWidgetDetailed', {
      size: 180,
      showBreakdown: true,
      showTrend: true,
    });

    widget.render(scoreData);
  }

  _initCharts() {
    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const chartColors = this._getChartColors();

    // Graphique RDV par jour
    this._initAppointmentsChart(events, chartColors);

    // Graphique Score Harmony
    this._initScoreChart(events, chartColors);

    // Graphique Heures travaillées
    this._initHoursChart(events, chartColors);

    // Graphique Distribution horaire
    this._initTimeDistributionChart(events, chartColors);
  }

  _getChartColors() {
    const isDark = document.documentElement.classList.contains('harmony-dark');
    return {
      primary: isDark ? '#7A9A8A' : '#5A7A6A',
      secondary: isDark ? '#4E5670' : '#E2DDD6',
      text: isDark ? '#F0EDE6' : '#1A1A1A',
      grid: isDark ? '#3E4559' : '#E2DDD6',
      success: '#22c55e',
      warning: '#f97316',
      danger: '#ef4444',
    };
  }

  _initAppointmentsChart(events, colors) {
    const ctx = document.getElementById('appointmentsChart')?.getContext('2d');
    if (!ctx) return;

    const byDay = DateUtils.groupByDay(events);
    const labels = Object.keys(byDay).slice(-this.currentPeriod);
    const data = labels.map(date => byDay[date]?.length || 0);

    this.charts.appointments = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })),
        datasets: [{
          label: 'Rendez-vous',
          data,
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}20`,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text, maxTicksLimit: 10 },
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text },
            beginAtZero: true,
          },
        },
      },
    });
  }

  _initScoreChart(events, colors) {
    const ctx = document.getElementById('scoreChart')?.getContext('2d');
    if (!ctx) return;

    // Génère des données de score simulées pour la démo
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      labels.push(`Semaine -${i}`);
      data.push(Math.floor(Math.random() * 30) + 60); // Score entre 60 et 90
    }

    this.charts.score = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Score Harmony',
          data,
          backgroundColor: data.map(v => 
            v >= 80 ? colors.success : v >= 60 ? colors.warning : colors.danger
          ),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text },
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text },
            min: 0,
            max: 100,
          },
        },
      },
    });
  }

  _initHoursChart(events, colors) {
    const ctx = document.getElementById('hoursChart')?.getContext('2d');
    if (!ctx) return;

    const byDay = DateUtils.groupByDay(events);
    const labels = Object.keys(byDay).slice(-14);
    const data = labels.map(date => {
      const dayEvents = byDay[date] || [];
      return dayEvents.reduce((sum, ev) => 
        sum + DateUtils.hoursBetween(ev.start, ev.end), 0
      );
    });

    const maxHours = storage.getProfessional().maxWeeklyHours / 5 || 8;

    this.charts.hours = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })),
        datasets: [{
          label: 'Heures',
          data,
          borderColor: colors.primary,
          backgroundColor: 'transparent',
          tension: 0.4,
          pointRadius: 4,
        }, {
          label: 'Objectif',
          data: Array(labels.length).fill(maxHours),
          borderColor: colors.warning,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: colors.text } },
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text },
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text },
            beginAtZero: true,
          },
        },
      },
    });
  }

  _initTimeDistributionChart(events, colors) {
    const ctx = document.getElementById('timeDistributionChart')?.getContext('2d');
    if (!ctx) return;

    // Distribution par tranche horaire
    const distribution = {};
    for (let i = 8; i <= 20; i++) {
      distribution[i] = 0;
    }

    events.forEach(ev => {
      const hour = new Date(ev.start).getHours();
      if (distribution[hour] !== undefined) {
        distribution[hour]++;
      }
    });

    this.charts.timeDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(distribution).map(h => `${h}h`),
        datasets: [{
          label: 'RDV',
          data: Object.values(distribution),
          backgroundColor: colors.primary,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text },
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text },
            beginAtZero: true,
          },
        },
      },
    });
  }

  _loadInsights() {
    const container = document.getElementById('insightsList');
    if (!container) return;

    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const insights = [];

    // Analyse et génère des insights
    const byDay = DateUtils.groupByDay(events);
    const avgDaily = Object.values(byDay).reduce((sum, evs) => sum + evs.length, 0) / Object.keys(byDay).length || 0;

    if (avgDaily > 6) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Charge journalière élevée',
        text: `Vous avez en moyenne ${avgDaily.toFixed(1)} rendez-vous par jour. Envisagez de réduire votre charge pour préserver votre énergie.`,
      });
    } else if (avgDaily < 3) {
      insights.push({
        type: 'info',
        icon: '💡',
        title: 'Potentiel de croissance',
        text: 'Votre agenda est peu chargé. C\'est le moment idéal pour prospecter de nouveaux clients.',
      });
    } else {
      insights.push({
        type: 'success',
        icon: '🌿',
        title: 'Équilibre optimal',
        text: `Avec ${avgDaily.toFixed(1)} rendez-vous par jour en moyenne, vous maintenez un bon équilibre.`,
      });
    }

    // Vérifie les pauses
    let breakCompliance = 0;
    let totalGaps = 0;
    Object.values(byDay).forEach(dayEvents => {
      const sorted = DateUtils.sortByStartTime(dayEvents);
      for (let i = 1; i < sorted.length; i++) {
        const gap = DateUtils.minutesBetween(sorted[i-1].end, sorted[i].start);
        totalGaps++;
        if (gap >= 20) breakCompliance++;
      }
    });

    const breakRatio = totalGaps > 0 ? breakCompliance / totalGaps : 1;
    if (breakRatio < 0.5) {
      insights.push({
        type: 'warning',
        icon: '⏸️',
        title: 'Pauses insuffisantes',
        text: 'Moins de 50% de vos transitions respectent une pause de 20 minutes. Cela peut impacter votre bien-être.',
      });
    }

    container.innerHTML = insights.map(insight => `
      <div class="insight-card">
        <div class="insight-card__icon insight-card__icon--${insight.type}">${insight.icon}</div>
        <div class="insight-card__content">
          <div class="insight-card__title">${insight.title}</div>
          <p class="insight-card__text">${insight.text}</p>
        </div>
      </div>
    `).join('');
  }

  _loadScoreHistory() {
    const container = document.getElementById('scoreHistoryList');
    if (!container) return;

    // Génère un historique simulé pour la démo
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      const score = Math.floor(Math.random() * 30) + 60;
      history.push({
        date: date.toISOString().split('T')[0],
        score,
        label: `Semaine du ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
      });
    }

    container.innerHTML = history.map(item => `
      <div class="score-history-item">
        <span class="score-history-item__date">${item.label}</span>
        <div class="score-history-item__bar">
          <div class="score-history-item__fill" 
               style="width: ${item.score}%; background: ${item.score >= 80 ? '#22c55e' : item.score >= 60 ? '#f97316' : '#ef4444'}"></div>
        </div>
        <span class="score-history-item__value">${item.score}</span>
      </div>
    `).join('');
  }

  _checkPredictions() {
    const events = storage.getAllEvents({ type: CONFIG.EVENT_TYPES.APPOINTMENT });
    const predictions = this.harmonyEngine.predictOverloadRisk(events, 7);

    if (predictions.overallRisk === 'high' || predictions.overallRisk === 'medium') {
      const section = document.getElementById('predictionsSection');
      const text = document.getElementById('predictionText');

      if (section && text) {
        text.textContent = predictions.actionableInsights?.[0] || 
          'Nous anticipons une charge élevée dans les jours à venir.';
        section.classList.remove('hs-hidden');
      }
    }
  }

  _bindEvents() {
    // Changement de période
    document.getElementById('chartPeriod')?.addEventListener('change', (e) => {
      this.currentPeriod = parseInt(e.target.value, 10);
      this._updateCharts();
    });

    // Boutons de prédiction
    document.getElementById('btnViewBlockSuggestions')?.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });

    document.getElementById('btnDismissPrediction')?.addEventListener('click', () => {
      document.getElementById('predictionsSection')?.classList.add('hs-hidden');
    });

    // Mise à jour des graphiques au changement de thème
    window.addEventListener('themechange', () => {
      this._updateChartColors();
    });
  }

  _updateCharts() {
    // Recharge les données avec la nouvelle période
    this._initCharts();
  }

  _updateChartColors() {
    const colors = this._getChartColors();
    Object.values(this.charts).forEach(chart => {
      if (chart.options.scales.x) {
        chart.options.scales.x.ticks.color = colors.text;
        chart.options.scales.x.grid.color = colors.grid;
      }
      if (chart.options.scales.y) {
        chart.options.scales.y.ticks.color = colors.text;
        chart.options.scales.y.grid.color = colors.grid;
      }
      if (chart.options.plugins.legend?.labels) {
        chart.options.plugins.legend.labels.color = colors.text;
      }
      chart.update();
    });
  }
}

// Initialise le contrôleur
const controller = new AnalyticsController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
  controller.init();
}
