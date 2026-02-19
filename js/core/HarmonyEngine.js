/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Harmony Engine Avancé
 * ============================================================
 * Moteur d'analyse prédictive avec ML simplifié et pondérations intelligentes.
 * 
 * Fonctionnalités:
 * - Score Harmony multi-dimensionnel avec 6 facteurs pondérés
 * - Algorithme prédictif d'anticipation de surcharge
 * - Détection automatique des journées critiques
 * - Suggestions intelligentes de blocage de créneaux
 * - Indicateur de récupération recommandée
 */

import { CONFIG, getScoreLevel, getLoadIntensity } from './Config.js';
import { DateUtils } from '../utils/DateUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class HarmonyEngine {
  constructor(settings = {}) {
    this.settings = { ...CONFIG.DEFAULT_PROFESSIONAL, ...settings };
    this.historicalData = [];
    this.predictiveModel = new PredictiveStressModel();
  }

  /**
   * ============================================================
   * SCORE HARMONY PRINCIPAL — Calcul multi-dimensionnel
   * ============================================================
   */
  
  computeWeeklyScore(events, options = {}) {
    try {
      const appointments = this._filterAppointments(events);
      const weekRange = options.weekRange || DateUtils.getCurrentWeekRange();
      
      // Calcul des 6 dimensions du score
      const breakdown = {
        dailyLoad: this._computeDailyLoadScore(appointments),
        breakCompliance: this._computeBreakComplianceScore(appointments),
        eveningWork: this._computeEveningWorkScore(appointments),
        weeklyBalance: this._computeWeeklyBalanceScore(appointments),
        recoveryAdequacy: this._computeRecoveryAdequacyScore(appointments, weekRange),
        predictiveStress: this._computePredictiveStressScore(appointments, weekRange),
      };

      // Pondération finale avec ajustements contextuels
      const weightedScore = this._applyIntelligentWeighting(breakdown, appointments);
      const clampedScore = MathUtils.clamp(Math.round(weightedScore), 0, 100);
      
      // Analyse des tendances
      const trends = this._analyzeTrends(appointments, weekRange);
      
      // Génération des insights
      const insights = this._generateAdvancedInsights(breakdown, appointments, trends);
      
      // Recommandations personnalisées
      const recommendations = this._generateSmartRecommendations(breakdown, trends);

      return {
        score: clampedScore,
        level: getScoreLevel(clampedScore).key.toLowerCase(),
        breakdown,
        trends,
        insights,
        recommendations,
        criticalDays: this._detectCriticalDays(appointments),
        recoveryRecommendation: this._generateRecoveryRecommendation(breakdown, appointments),
        computedAt: new Date().toISOString(),
        version: CONFIG.VERSION,
      };
    } catch (error) {
      console.error('[HarmonyEngine] computeWeeklyScore:', error);
      return this._getFallbackScore();
    }
  }

  computeDailyScore(dateISO, events, options = {}) {
    try {
      const dayEvents = this._filterDayAppointments(events, dateISO);
      const count = dayEvents.length;
      const totalMinutes = this._calculateTotalWorkMinutes(dayEvents);
      const hasEvening = dayEvents.some(ev => this._isEveningEvent(ev));
      const hasNight = dayEvents.some(ev => this._isNightEvent(ev));
      
      // Score de base
      let score = 100;
      
      // Pénalités progressives selon la charge
      const intensity = getLoadIntensity(count, 'daily');
      const penalties = {
        optimal: 0,
        good: -5,
        warning: -20,
        danger: -40,
        critical: -60,
      };
      score += penalties[intensity] || 0;
      
      // Pénalité durée excessive
      const hoursWorked = totalMinutes / 60;
      if (hoursWorked > 10) score -= 15;
      else if (hoursWorked > 8) score -= 8;
      
      // Pénalité soirée
      if (hasNight) score -= 20;
      else if (hasEvening) score -= 10;
      
      // Bonus pauses respectées
      const breakScore = this._computeBreakComplianceScore(dayEvents);
      if (breakScore > 80) score += 5;
      else if (breakScore < 50) score -= 10;
      
      // Analyse de la distribution horaire
      const distribution = this._analyzeTimeDistribution(dayEvents);
      if (distribution.isClustered) score -= 10;
      
      const clamped = MathUtils.clamp(score, 0, 100);
      
      return {
        score: clamped,
        level: getScoreLevel(clamped).key.toLowerCase(),
        appointmentCount: count,
        totalWorkMinutes: totalMinutes,
        totalWorkHours: Math.round(totalMinutes / 60 * 10) / 10,
        hasEveningWork: hasEvening,
        hasNightWork: hasNight,
        breakCompliance: breakScore,
        timeDistribution: distribution,
        intensity,
        date: dateISO,
      };
    } catch (error) {
      console.error('[HarmonyEngine] computeDailyScore:', error);
      return { score: 50, level: 'moderate', appointmentCount: 0 };
    }
  }

  /**
   * ============================================================
   * ALGORITHME PRÉDICTIF — Anticipation de la surcharge
   * ============================================================
   */
  
  predictOverloadRisk(upcomingEvents, horizonDays = 7) {
    try {
      const predictions = [];
      const today = new Date();
      
      for (let i = 0; i < horizonDays; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayEvents = this._filterDayAppointments(upcomingEvents, dateStr);
        const dailyScore = this.computeDailyScore(dateStr, upcomingEvents);
        
        // Calcul du risque cumulé
        const consecutiveIntensity = this._calculateConsecutiveIntensity(dateStr, upcomingEvents, i);
        const recoveryDebt = this._calculateRecoveryDebt(dateStr, upcomingEvents);
        
        const riskFactors = {
          highLoad: dailyScore.intensity === 'danger' || dailyScore.intensity === 'critical',
          poorRecovery: recoveryDebt > 20,
          consecutiveStress: consecutiveIntensity > 2,
          eveningHeavy: dailyScore.hasNightWork || (dailyScore.hasEveningWork && dailyScore.appointmentCount > 5),
        };
        
        const riskScore = Object.values(riskFactors).filter(Boolean).length;
        
        predictions.push({
          date: dateStr,
          riskLevel: riskScore >= 3 ? 'high' : riskScore >= 2 ? 'medium' : 'low',
          riskScore,
          riskFactors,
          dailyScore: dailyScore.score,
          recommendation: this._generatePreemptiveRecommendation(riskFactors, dailyScore),
        });
      }
      
      return {
        predictions,
        overallRisk: this._calculateOverallRisk(predictions),
        actionableInsights: this._generatePredictiveInsights(predictions),
      };
    } catch (error) {
      console.error('[HarmonyEngine] predictOverloadRisk:', error);
      return { predictions: [], overallRisk: 'unknown' };
    }
  }

  /**
   * ============================================================
   * DÉTECTION JOURNÉES CRITIQUES
   * ============================================================
   */
  
  detectCriticalDays(events, options = {}) {
    const appointments = this._filterAppointments(events);
    const byDay = DateUtils.groupByDay(appointments);
    const criticalDays = [];
    
    Object.entries(byDay).forEach(([date, dayEvents]) => {
      const analysis = this._analyzeDayCriticality(date, dayEvents);
      
      if (analysis.isCritical) {
        criticalDays.push({
          date,
          severity: analysis.severity,
          factors: analysis.factors,
          eventCount: dayEvents.length,
          totalHours: analysis.totalHours,
          suggestedActions: this._suggestCriticalDayActions(analysis),
        });
      }
    });
    
    return criticalDays.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * ============================================================
   * SUGGESTIONS DE BLOCAGE INTELLIGENT
   * ============================================================
   */
  
  suggestOptimalBlocks(events, options = {}) {
    const suggestions = [];
    const appointments = this._filterAppointments(events);
    const byDay = DateUtils.groupByDay(appointments);
    
    Object.entries(byDay).forEach(([date, dayEvents]) => {
      const dailyAnalysis = this._analyzeDayForBlocking(date, dayEvents);
      
      if (dailyAnalysis.shouldSuggestBlocks) {
        suggestions.push(...dailyAnalysis.blockSuggestions);
      }
    });
    
    // Suggestions de récupération inter-journées
    const recoveryBlocks = this._suggestRecoveryBlocks(appointments);
    
    return {
      immediate: suggestions.filter(s => s.urgency === 'high'),
      planned: suggestions.filter(s => s.urgency === 'medium'),
      preventive: suggestions.filter(s => s.urgency === 'low'),
      recovery: recoveryBlocks,
    };
  }

  /**
   * ============================================================
   * INDICATEUR DE RÉCUPÉRATION RECOMMANDÉE
   * ============================================================
   */
  
  calculateRecoveryRecommendation(events, options = {}) {
    const appointments = this._filterAppointments(events);
    const weekRange = options.weekRange || DateUtils.getCurrentWeekRange();
    
    // Métriques de charge
    const totalHours = this._calculateTotalWorkMinutes(appointments) / 60;
    const byDay = DateUtils.groupByDay(appointments);
    const dayCount = Object.keys(byDay).length;
    const avgDailyHours = dayCount > 0 ? totalHours / dayCount : 0;
    
    // Métriques de récupération actuelle
    const recoveryMetrics = this._calculateRecoveryMetrics(appointments, weekRange);
    
    // Calcul du besoin de récupération
    let recommendedRecoveryHours = 0;
    let recoveryType = 'none';
    
    if (totalHours > CONFIG.THRESHOLDS.WEEKLY.CRITICAL_HOURS) {
      recommendedRecoveryHours = Math.min(24, (totalHours - 40) * 0.8);
      recoveryType = 'extended';
    } else if (totalHours > CONFIG.THRESHOLDS.WEEKLY.DANGER_HOURS) {
      recommendedRecoveryHours = Math.min(16, (totalHours - 35) * 0.6);
      recoveryType = 'significant';
    } else if (totalHours > CONFIG.THRESHOLDS.WEEKLY.WARNING_HOURS) {
      recommendedRecoveryHours = Math.min(8, (totalHours - 32) * 0.5);
      recoveryType = 'moderate';
    } else if (avgDailyHours > 7) {
      recommendedRecoveryHours = 4;
      recoveryType = 'light';
    }
    
    // Ajustement selon la qualité des pauses
    if (recoveryMetrics.breakQuality < 0.5) {
      recommendedRecoveryHours *= 1.3;
    }
    
    // Déficit cumulé
    const recoveryDebt = Math.max(0, recommendedRecoveryHours - recoveryMetrics.actualRecoveryHours);
    
    return {
      recommendedHours: Math.round(recommendedRecoveryHours * 10) / 10,
      recoveryType,
      recoveryDebt: Math.round(recoveryDebt * 10) / 10,
      breakQuality: Math.round(recoveryMetrics.breakQuality * 100),
      actualRecoveryHours: Math.round(recoveryMetrics.actualRecoveryHours * 10) / 10,
      suggestions: this._generateRecoverySuggestions(recoveryType, recoveryDebt),
      priority: recoveryDebt > 8 ? 'high' : recoveryDebt > 4 ? 'medium' : 'low',
    };
  }

  /**
   * ============================================================
   * MÉTHODES PRIVÉES — Calculs des sous-scores
   * ============================================================
   */
  
  _computeDailyLoadScore(appointments) {
    if (!appointments.length) return 100;
    
    const byDay = DateUtils.groupByDay(appointments);
    const counts = Object.values(byDay).map(evs => evs.length);
    
    const avgCount = MathUtils.average(counts);
    const maxCount = Math.max(...counts);
    const stdDev = MathUtils.standardDeviation(counts);
    
    let score = 100;
    
    // Pénalité sur la moyenne
    if (avgCount > CONFIG.THRESHOLDS.DAILY.CRITICAL) score -= 45;
    else if (avgCount > CONFIG.THRESHOLDS.DAILY.DANGER) score -= 35;
    else if (avgCount > CONFIG.THRESHOLDS.DAILY.WARNING) score -= 20;
    else if (avgCount > CONFIG.THRESHOLDS.DAILY.GOOD) score -= 10;
    
    // Pénalité sur le pic
    if (maxCount > CONFIG.THRESHOLDS.DAILY.CRITICAL) score -= 25;
    else if (maxCount > CONFIG.THRESHOLDS.DAILY.DANGER) score -= 15;
    
    // Pénalité sur la variabilité (irrégularité = stress)
    if (stdDev > 3) score -= 10;
    
    return Math.max(0, score);
  }

  _computeBreakComplianceScore(appointments) {
    if (appointments.length < 2) return 100;
    
    const byDay = DateUtils.groupByDay(appointments);
    let totalGaps = 0;
    let compliantGaps = 0;
    let totalGapMinutes = 0;
    
    Object.values(byDay).forEach(dayEvents => {
      const sorted = DateUtils.sortByStartTime(dayEvents);
      
      for (let i = 1; i < sorted.length; i++) {
        const gapMin = DateUtils.minutesBetween(sorted[i - 1].end, sorted[i].start);
        totalGaps++;
        totalGapMinutes += gapMin;
        
        if (gapMin >= this.settings.breakDuration) {
          compliantGaps++;
        }
      }
    });
    
    // Score basé sur le pourcentage de pauses respectées
    const complianceRatio = totalGaps ? compliantGaps / totalGaps : 1;
    
    // Bonus si pauses généreuses
    const avgGap = totalGaps ? totalGapMinutes / totalGaps : this.settings.breakDuration;
    const generosityBonus = avgGap > this.settings.breakDuration * 1.5 ? 5 : 0;
    
    return Math.min(100, Math.round(complianceRatio * 100) + generosityBonus);
  }

  _computeEveningWorkScore(appointments) {
    if (!appointments.length) return 100;
    
    const eveningEvents = appointments.filter(ev => this._isEveningEvent(ev));
    const nightEvents = appointments.filter(ev => this._isNightEvent(ev));
    
    const eveningRatio = eveningEvents.length / appointments.length;
    const nightRatio = nightEvents.length / appointments.length;
    
    // Impact plus fort pour le travail de nuit
    const penalty = (eveningRatio * 40) + (nightRatio * 60);
    
    return Math.max(0, Math.round(100 - penalty));
  }

  _computeWeeklyBalanceScore(appointments) {
    const totalHours = this._calculateTotalWorkMinutes(appointments) / 60;
    
    if (totalHours === 0) return 100;
    if (totalHours <= CONFIG.THRESHOLDS.WEEKLY.OPTIMAL_HOURS) return 100;
    
    if (totalHours <= CONFIG.THRESHOLDS.WEEKLY.GOOD_HOURS) {
      const excess = totalHours - CONFIG.THRESHOLDS.WEEKLY.OPTIMAL_HOURS;
      return Math.max(80, 100 - Math.round(excess * 3));
    }
    
    if (totalHours <= CONFIG.THRESHOLDS.WEEKLY.WARNING_HOURS) {
      const excess = totalHours - CONFIG.THRESHOLDS.WEEKLY.GOOD_HOURS;
      return Math.max(60, 80 - Math.round(excess * 2.5));
    }
    
    if (totalHours <= CONFIG.THRESHOLDS.WEEKLY.DANGER_HOURS) {
      return Math.max(30, 60 - Math.round((totalHours - 40) * 3));
    }
    
    return Math.max(0, 30 - Math.round((totalHours - 50) * 2));
  }

  _computeRecoveryAdequacyScore(appointments, weekRange) {
    if (!appointments.length) return 100;
    
    const recoveryMetrics = this._calculateRecoveryMetrics(appointments, weekRange);
    const totalHours = this._calculateTotalWorkMinutes(appointments) / 60;
    
    // Ratio travail/récupération idéal: 3:1 (8h travail = 2.5h récupération)
    const idealRecovery = totalHours * CONFIG.THRESHOLDS.RECOVERY.IDEAL_BREAK_RATIO;
    const actualRecovery = recoveryMetrics.actualRecoveryHours;
    
    if (actualRecovery >= idealRecovery) return 100;
    
    const ratio = actualRecovery / idealRecovery;
    return Math.round(ratio * 100);
  }

  _computePredictiveStressScore(appointments, weekRange) {
    // Utilise le modèle prédictif
    return this.predictiveModel.predictStressLevel(appointments, weekRange);
  }

  _applyIntelligentWeighting(breakdown, appointments) {
    const weights = CONFIG.HARMONY_WEIGHTS;
    
    // Ajustement dynamique des pondérations selon le contexte
    let adjustedWeights = { ...weights };
    
    const totalHours = this._calculateTotalWorkMinutes(appointments) / 60;
    const byDay = DateUtils.groupByDay(appointments);
    const hasIntensiveDays = Object.values(byDay).some(evs => evs.length >= 8);
    
    // Si journées très chargées, augmenter l'importance des pauses
    if (hasIntensiveDays) {
      adjustedWeights.BREAK_COMPLIANCE += 5;
      adjustedWeights.DAILY_LOAD -= 5;
    }
    
    // Si semaine longue, augmenter l'importance de l'équilibre
    if (totalHours > 35) {
      adjustedWeights.WEEKLY_BALANCE += 5;
      adjustedWeights.EVENING_WORK -= 5;
    }
    
    // Normalisation pour garder la somme à 100
    const totalWeight = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
    const normalizationFactor = 100 / totalWeight;
    
    Object.keys(adjustedWeights).forEach(key => {
      adjustedWeights[key] *= normalizationFactor;
    });
    
    // Calcul pondéré
    let score = 0;
    score += (breakdown.dailyLoad / 100) * adjustedWeights.DAILY_LOAD;
    score += (breakdown.breakCompliance / 100) * adjustedWeights.BREAK_COMPLIANCE;
    score += (breakdown.eveningWork / 100) * adjustedWeights.EVENING_WORK;
    score += (breakdown.weeklyBalance / 100) * adjustedWeights.WEEKLY_BALANCE;
    score += (breakdown.recoveryAdequacy / 100) * adjustedWeights.RECOVERY_ADEQUACY;
    score += (breakdown.predictiveStress / 100) * adjustedWeights.PREDICTIVE_STRESS;
    
    return score;
  }

  /**
   * ============================================================
   * MÉTHODES UTILITAIRES PRIVÉES
   * ============================================================
   */
  
  _filterAppointments(events) {
    return events.filter(ev => 
      ev.type === CONFIG.EVENT_TYPES.APPOINTMENT && 
      ev.status !== CONFIG.STATUS.CANCELLED
    );
  }

  _filterDayAppointments(events, dateISO) {
    return this._filterAppointments(events).filter(ev => 
      ev.start.startsWith(dateISO)
    );
  }

  _calculateTotalWorkMinutes(events) {
    return events.reduce((sum, ev) => {
      const duration = DateUtils.minutesBetween(ev.start, ev.end);
      return sum + (isNaN(duration) ? 0 : duration);
    }, 0);
  }

  _isEveningEvent(event) {
    const hour = new Date(event.start).getHours();
    return hour >= CONFIG.THRESHOLDS.EVENING_HOUR;
  }

  _isNightEvent(event) {
    const hour = new Date(event.start).getHours();
    return hour >= CONFIG.THRESHOLDS.NIGHT_HOUR;
  }

  _getFallbackScore() {
    return {
      score: 50,
      level: 'moderate',
      breakdown: {},
      trends: {},
      insights: ['Données insuffisantes pour une analyse complète.'],
      recommendations: [],
      criticalDays: [],
      recoveryRecommendation: null,
    };
  }

  // ... (méthodes supplémentaires pour insights, recommandations, etc.)
}

/**
 * ============================================================
 * MODÈLE PRÉDICTIF SIMPLIFIÉ — Stress Prediction
 * ============================================================
 */
class PredictiveStressModel {
  constructor() {
    this.patternHistory = [];
    this.stressIndicators = {
      rapidSuccession: 0,
      insufficientBreaks: 0,
      eveningOverload: 0,
      consecutiveIntensive: 0,
    };
  }

  predictStressLevel(appointments, weekRange) {
    if (!appointments.length) return 100;
    
    let stressIndicators = 0;
    const byDay = DateUtils.groupByDay(appointments);
    
    // Détection des enchaînements rapides
    Object.values(byDay).forEach(dayEvents => {
      const sorted = DateUtils.sortByStartTime(dayEvents);
      for (let i = 1; i < sorted.length; i++) {
        const gap = DateUtils.minutesBetween(sorted[i - 1].end, sorted[i].start);
        if (gap < 10) stressIndicators += 2;
        else if (gap < 20) stressIndicators += 1;
      }
    });
    
    // Détection des journées consécutives intenses
    const dates = Object.keys(byDay).sort();
    let consecutiveIntensive = 0;
    let maxConsecutive = 0;
    
    dates.forEach((date, i) => {
      if (byDay[date].length >= 6) {
        consecutiveIntensive++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveIntensive);
      } else {
        consecutiveIntensive = 0;
      }
    });
    
    stressIndicators += maxConsecutive * 3;
    
    // Score inverse (moins d'indicateurs = meilleur score)
    const maxIndicators = appointments.length * 0.5;
    const ratio = Math.min(stressIndicators / maxIndicators, 1);
    
    return Math.round((1 - ratio) * 100);
  }
}
