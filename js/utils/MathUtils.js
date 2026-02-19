/**
 * ============================================================
 * HARMONY SCHEDULER v2.0 — Math Utilities
 * ============================================================
 * Fonctions mathématiques utilitaires
 */

export class MathUtils {
  /**
   * Limite une valeur entre min et max
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Calcule la moyenne d'un tableau de nombres
   */
  static average(numbers) {
    if (!numbers.length) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Calcule la médiane d'un tableau de nombres
   */
  static median(numbers) {
    if (!numbers.length) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calcule l'écart-type d'un tableau de nombres
   */
  static standardDeviation(numbers) {
    if (numbers.length < 2) return 0;
    const avg = this.average(numbers);
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  /**
   * Calcule la variance d'un tableau de nombres
   */
  static variance(numbers) {
    if (numbers.length < 2) return 0;
    const avg = this.average(numbers);
    return numbers.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / numbers.length;
  }

  /**
   * Trouve le maximum d'un tableau
   */
  static max(numbers) {
    return numbers.length ? Math.max(...numbers) : 0;
  }

  /**
   * Trouve le minimum d'un tableau
   */
  static min(numbers) {
    return numbers.length ? Math.min(...numbers) : 0;
  }

  /**
   * Calcule la somme d'un tableau
   */
  static sum(numbers) {
    return numbers.reduce((a, b) => a + b, 0);
  }

  /**
   * Interpolation linéaire entre deux valeurs
   */
  static lerp(start, end, t) {
    return start + (end - start) * this.clamp(t, 0, 1);
  }

  /**
   * Fonction d'easing ease-out-cubic
   */
  static easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Fonction d'easing ease-in-out-cubic
   */
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Arrondit à un nombre de décimales donné
   */
  static round(value, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Calcule le pourcentage d'une valeur par rapport à un total
   */
  static percentage(value, total) {
    return total > 0 ? (value / total) * 100 : 0;
  }

  /**
   * Normalise une valeur entre 0 et 1
   */
  static normalize(value, min, max) {
    if (max === min) return 0;
    return this.clamp((value - min) / (max - min), 0, 1);
  }

  /**
   * Détecte les valeurs aberrantes (outliers) avec la méthode IQR
   */
  static detectOutliers(numbers) {
    if (numbers.length < 4) return [];
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return numbers.filter(n => n < lowerBound || n > upperBound);
  }

  /**
   * Calcule la moyenne mobile sur une fenêtre donnée
   */
  static movingAverage(numbers, windowSize) {
    if (windowSize > numbers.length) return [];
    
    const result = [];
    for (let i = windowSize - 1; i < numbers.length; i++) {
      const window = numbers.slice(i - windowSize + 1, i + 1);
      result.push(this.average(window));
    }
    return result;
  }

  /**
   * Calcule la tendance linéaire (pente) d'une série
   */
  static linearTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = this.sum(values);
    const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    return slope;
  }

  /**
   * Génère un nombre aléatoire dans une plage
   */
  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Génère un entier aléatoire dans une plage
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
