/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Harmony Score Widget
 * ============================================================
 * Widget de visualisation du score Harmony avec animations
 */

import { getScoreLevel, CONFIG } from '../core/Config.js';
import { MathUtils } from '../utils/MathUtils.js';

export class HarmonyScoreWidget {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`[HarmonyScoreWidget] Container not found: ${containerId}`);
      return;
    }
    
    this.options = {
      size: 120,
      strokeWidth: 10,
      showBreakdown: true,
      showTrend: true,
      animated: true,
      ...options,
    };
    
    this.currentScore = 0;
    this.targetScore = 0;
    this.animationId = null;
  }

  /**
   * Rend le widget avec un score
   */
  render(scoreData) {
    if (!this.container) return;
    
    const { score, level, breakdown, trends, recoveryRecommendation } = scoreData;
    this.targetScore = score;
    const levelInfo = getScoreLevel(score);
    
    const html = `
      <div class="harmony-widget harmony-widget--${level}">
        <div class="harmony-widget__main">
          <div class="harmony-widget__ring-container" style="--widget-size: ${this.options.size}px">
            <svg class="harmony-widget__ring" viewBox="0 0 100 100">
              <circle class="harmony-widget__track" cx="50" cy="50" r="42"/>
              <circle 
                class="harmony-widget__fill" 
                cx="50" cy="50" 
                r="42"
                stroke-dasharray="263.9"
                stroke-dashoffset="263.9"
                style="stroke: ${levelInfo.color}"
              />
            </svg>
            <div class="harmony-widget__value">
              <span class="harmony-widget__number" data-target="${score}">0</span>
              <span class="harmony-widget__unit">/100</span>
            </div>
            ${this._renderPulse(level)}
          </div>
          <div class="harmony-widget__info">
            <div class="harmony-widget__label" style="color: ${levelInfo.color}">
              ${levelInfo.label}
            </div>
            <div class="harmony-widget__emoji">${this._getEmoji(level)}</div>
          </div>
        </div>
        
        ${this.options.showTrend && trends ? this._renderTrend(trends) : ''}
        
        ${this.options.showBreakdown && breakdown ? this._renderBreakdown(breakdown) : ''}
        
        ${recoveryRecommendation ? this._renderRecovery(recoveryRecommendation) : ''}
      </div>
    `;
    
    this.container.innerHTML = html;
    
    if (this.options.animated) {
      this._animateScore();
    } else {
      this._setScoreImmediate(score);
    }
  }

  /**
   * Met à jour le score avec animation
   */
  updateScore(newScore) {
    this.targetScore = newScore;
    if (this.options.animated) {
      this._animateScore();
    } else {
      this._setScoreImmediate(newScore);
    }
  }

  /**
   * Rend un mini widget compact
   */
  renderCompact(scoreData) {
    if (!this.container) return;
    
    const { score, level } = scoreData;
    const levelInfo = getScoreLevel(score);
    
    this.container.innerHTML = `
      <div class="harmony-widget harmony-widget--compact harmony-widget--${level}">
        <div class="harmony-widget__mini-ring" style="--score-color: ${levelInfo.color}">
          <svg viewBox="0 0 36 36">
            <path class="harmony-widget__mini-track" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path 
              class="harmony-widget__mini-fill" 
              stroke-dasharray="${score}, 100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              style="stroke: ${levelInfo.color}"
            />
          </svg>
          <span class="harmony-widget__mini-value">${score}</span>
        </div>
        <div class="harmony-widget__mini-label">${levelInfo.label}</div>
      </div>
    `;
  }

  /**
   * MÉTHODES PRIVÉES
   */
  
  _renderPulse(level) {
    if (level === 'critical' || level === 'warning') {
      return '<div class="harmony-widget__pulse"></div>';
    }
    return '';
  }

  _renderTrend(trends) {
    const trend = trends.direction || 'stable';
    const change = trends.change || 0;
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    const trendClass = trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral';
    
    return `
      <div class="harmony-widget__trend harmony-widget__trend--${trendClass}">
        <span class="harmony-widget__trend-icon">${trendIcon}</span>
        <span class="harmony-widget__trend-value">${Math.abs(change)}%</span>
        <span class="harmony-widget__trend-label">vs semaine dernière</span>
      </div>
    `;
  }

  _renderBreakdown(breakdown) {
    const items = [
      { key: 'dailyLoad', label: 'Charge journalière', icon: '📅' },
      { key: 'breakCompliance', label: 'Pauses respectées', icon: '⏸️' },
      { key: 'eveningWork', label: 'Horaires sains', icon: '🌙' },
      { key: 'weeklyBalance', label: 'Équilibre semaine', icon: '⚖️' },
      { key: 'recoveryAdequacy', label: 'Récupération', icon: '🧘' },
      { key: 'predictiveStress', label: 'Stress anticipé', icon: '🔮' },
    ];
    
    return `
      <div class="harmony-widget__breakdown">
        ${items.map(item => {
          const value = breakdown[item.key];
          if (value === undefined) return '';
          const level = getScoreLevel(value).key.toLowerCase();
          return `
            <div class="harmony-widget__breakdown-item" title="${item.label}: ${value}/100">
              <span class="harmony-widget__breakdown-icon">${item.icon}</span>
              <div class="harmony-widget__breakdown-bar">
                <div 
                  class="harmony-widget__breakdown-fill harmony-widget__breakdown-fill--${level}"
                  style="width: ${value}%"
                ></div>
              </div>
              <span class="harmony-widget__breakdown-value">${value}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _renderRecovery(recovery) {
    const priorityClass = recovery.priority || 'low';
    const hours = recovery.recommendedHours || 0;
    
    return `
      <div class="harmony-widget__recovery harmony-widget__recovery--${priorityClass}">
        <div class="harmony-widget__recovery-header">
          <span class="harmony-widget__recovery-icon">🧘</span>
          <span class="harmony-widget__recovery-title">Récupération recommandée</span>
        </div>
        <div class="harmony-widget__recovery-content">
          <div class="harmony-widget__recovery-hours">
            <span class="harmony-widget__recovery-value">${hours}h</span>
            <span class="harmony-widget__recovery-label">de repos cette semaine</span>
          </div>
          ${recovery.recoveryDebt > 0 ? `
            <div class="harmony-widget__recovery-debt">
              Déficit: ${recovery.recoveryDebt}h
            </div>
          ` : ''}
        </div>
        ${recovery.suggestions ? `
          <ul class="harmony-widget__recovery-suggestions">
            ${recovery.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  _getEmoji(level) {
    const emojis = {
      excellent: '🌟',
      good: '🌿',
      moderate: '🟠',
      warning: '⚠️',
      critical: '🔴',
    };
    return emojis[level] || '🌿';
  }

  _animateScore() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const fillElement = this.container.querySelector('.harmony-widget__fill');
    const numberElement = this.container.querySelector('.harmony-widget__number');
    
    if (!fillElement || !numberElement) return;
    
    const startScore = this.currentScore;
    const targetScore = this.targetScore;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = MathUtils.easeOutCubic(progress);
      
      const currentValue = Math.round(startScore + (targetScore - startScore) * eased);
      
      // Met à jour le cercle
      const circumference = 263.9;
      const offset = circumference - (circumference * currentValue / 100);
      fillElement.style.strokeDashoffset = offset;
      
      // Met à jour le nombre
      numberElement.textContent = currentValue;
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.currentScore = targetScore;
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  _setScoreImmediate(score) {
    this.currentScore = score;
    
    const fillElement = this.container.querySelector('.harmony-widget__fill');
    const numberElement = this.container.querySelector('.harmony-widget__number');
    
    if (fillElement) {
      const circumference = 263.9;
      const offset = circumference - (circumference * score / 100);
      fillElement.style.strokeDashoffset = offset;
    }
    
    if (numberElement) {
      numberElement.textContent = score;
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
