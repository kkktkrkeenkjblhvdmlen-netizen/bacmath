/**
 * ============================================================================
 * BacMath — Moteur RIGOUREUX de Calcul de Limites & Tableau de Variation
 * ============================================================================
 */

const LimitEngine = (function () {

  /**
   * Convertit une valeur numérique ou symbolique en écriture mathématique exacte.
   * Évite d'avoir 0.2 -> Affiche 1/5.
   */
  function formatExactValue(val) {
    if (val === Infinity || val === "+Infinity") return "+∞";
    if (val === -Infinity || val === "-Infinity") return "-∞";
    if (val === "0+" || val === 0.0000000001) return "0⁺";
    if (val === "0-" || val === -0.0000000001) return "0⁻";

    if (typeof val === "number") {
      if (isNaN(val)) return "ND";
      if (!isFinite(val)) return val > 0 ? "+∞" : "-∞";
      if (Math.abs(val) < 1e-11) return "0";
      if (Number.isInteger(val)) return String(val);

      // Conversion en fraction exacte (ex: 0.2 -> 1/5, 0.75 -> 3/4)
      if (typeof math !== "undefined" && math.fraction) {
        try {
          const frac = math.fraction(val);
          if (frac.d <= 1000) {
            return frac.s < 0 ? `-${frac.n}/${frac.d}` : `${frac.n}/${frac.d}`;
          }
        } catch (e) {}
      }

      return String(Math.round(val * 100000) / 100000);
    }
    return String(val);
  }

  /**
   * Calcule la limite exacte d'une expression en respectant le domaine de définition.
   * @param {string} exprText - L'expression (ex: "x*ln(x)", "(x^2-1)/(x-1)")
   * @param {number|string} target - Cible (ex: 0, 1, "+inf", "-inf")
   * @param {string} [direction='both'] - 'right' (a^+), 'left' (a^-), ou 'both'
   * @returns {string} Résultat exact ("0", "1/5", "+∞", "ND", etc.)
   */
  function computeLimit(exprText, target, direction = "both") {
    if (!exprText || typeof exprText !== "string") return "ND";
    const cleanExpr = exprText.trim();

    try {
      // 1. Limites aux infinies (+inf / -inf)
      if (target === "+inf" || target === "+∞" || target === Infinity) {
        return solveAtInfinity(cleanExpr, "+inf");
      }
      if (target === "-inf" || target === "-∞" || target === -Infinity) {
        return solveAtInfinity(cleanExpr, "-inf");
      }

      // 2. Limite en un point réel 'a' (ex: a = 0)
      const a = Number(target);
      if (isNaN(a)) return "ND";

      return solveAtPoint(cleanExpr, a, direction);
    } catch (err) {
      console.warn("Erreur limite:", err);
      return "ND";
    }
  }

  /**
   * Calcul en un point x -> a
   */
  function solveAtPoint(expr, a, direction) {
    // A. Évaluation directe
    const directVal = safeEvaluate(expr, a);
    if (!isNaN(directVal) && isFinite(directVal)) {
      return formatExactValue(directVal);
    }

    // B. Détection formes indéterminées ou asymptotes
    const numVal = safeEvaluateNumerator(expr, a);
    const denVal = safeEvaluateDenominator(expr, a);

    // Forme 0 / 0 : Utilisation de L'Hôpital
    if (Math.abs(numVal) < 1e-9 && Math.abs(denVal) < 1e-9) {
      return resolveIndeterminateZeroOverZero(expr, a, direction);
    }

    // Forme k / 0 (k ≠ 0) : Asymptote verticale (+∞ ou -∞)
    if (Math.abs(denVal) < 1e-9 && Math.abs(numVal) > 1e-9) {
      return resolveAsymptoteVerticale(expr, a, numVal, direction);
    }

    // C. Prise en compte du domaine (ex: x -> 0+ pour ln(x) ou sqrt(x))
    return solveNumericApproach(expr, a, direction);
  }

  /**
   * Résolution de 0/0 par simplification ou Règle de L'Hôpital
   */
  function resolveIndeterminateZeroOverZero(expr, a, direction) {
    if (typeof math !== "undefined") {
      // Simplification formelle
      try {
        const simplified = math.simplify(expr).toString();
        const simVal = safeEvaluate(simplified, a);
        if (!isNaN(simVal) && isFinite(simVal)) {
          return formatExactValue(simVal);
        }
      } catch (e) {}

      // Appliquer L'Hôpital : (f/g)' = f'/g'
      try {
        const num = getNumeratorStr(expr);
        const den = getDenominatorStr(expr);
        if (num && den) {
          const dNum = math.derivative(num, "x").toString();
          const dDen = math.derivative(den, "x").toString();
          const hopitalExpr = `(${dNum}) / (${dDen})`;
          
          const hopitalVal = safeEvaluate(hopitalExpr, a);
          if (!isNaN(hopitalVal) && isFinite(hopitalVal)) {
            return formatExactValue(hopitalVal);
          }
        }
      } catch (e) {}
    }

    return solveNumericApproach(expr, a, direction);
  }

  /**
   * Traitement des asymptotes k/0 -> ±∞
   */
  function resolveAsymptoteVerticale(expr, a, numVal, direction) {
    const eps = 1e-7;
    const valRight = safeEvaluate(expr, a + eps);
    const valLeft = safeEvaluate(expr, a - eps);

    if (direction === "right") {
      if (valRight > 1e4) return "+∞";
      if (valRight < -1e4) return "-∞";
    }
    if (direction === "left") {
      if (valLeft > 1e4) return "+∞";
      if (valLeft < -1e4) return "-∞";
    }

    if (valRight > 1e4 && valLeft > 1e4) return "+∞";
    if (valRight < -1e4 && valLeft < -1e4) return "-∞";

    return "∞";
  }

  /**
   * Limites en +∞ et -∞ (croissances comparées)
   */
  function solveAtInfinity(expr, infType) {
    const sign = infType === "+inf" ? 1 : -1;
    const x1 = sign * 1e6;
    const x2 = sign * 1e8;

    const val1 = safeEvaluate(expr, x1);
    const val2 = safeEvaluate(expr, x2);

    if (isNaN(val2)) return "ND";
    if (val2 > 1e7) return "+∞";
    if (val2 < -1e7) return "-∞";
    if (Math.abs(val2) < 1e-6) return "0";

    if (Math.abs(val2 - val1) < 1e-4) {
      return formatExactValue(val2);
    }

    return formatExactValue(val2);
  }

  /**
   * Évaluation numérique propre tenant compte de la direction (0+ vs 0-)
   */
  function solveNumericApproach(expr, a, direction) {
    const eps = 1e-7;
    let val;

    if (direction === "right") {
      val = safeEvaluate(expr, a + eps);
    } else if (direction === "left") {
      val = safeEvaluate(expr, a - eps);
    } else {
      const valR = safeEvaluate(expr, a + eps);
      const valL = safeEvaluate(expr, a - eps);
      if (!isNaN(valR)) val = valR;
      else val = valL;
    }

    if (isNaN(val)) return "ND";
    if (val > 1e6) return "+∞";
    if (val < -1e6) return "-∞";
    if (Math.abs(val) < 1e-6) return "0";

    return formatExactValue(val);
  }

  // --- Outils d'évaluation ---
  function safeEvaluate(expr, xVal) {
    try {
      if (typeof math !== "undefined" && math.evaluate) {
        return Number(math.evaluate(expr, { x: xVal, e: Math.E, pi: Math.PI }));
      }
      const fn = new Function("x", "Math", `return ${expr};`);
      return Number(fn(xVal, Math));
    } catch (e) {
      return NaN;
    }
  }

  function getNumeratorStr(expr) {
    const parts = expr.split("/");
    if (parts.length >= 2) return parts[0].replace(/[()]/g, "").trim();
    return expr;
  }

  function getDenominatorStr(expr) {
    const parts = expr.split("/");
    if (parts.length === 2) return parts[1].replace(/[()]/g, "").trim();
    return "1";
  }

  function safeEvaluateNumerator(expr, a) {
    return safeEvaluate(getNumeratorStr(expr), a);
  }

  function safeEvaluateDenominator(expr, a) {
    return safeEvaluate(getDenominatorStr(expr), a);
  }

  return {
    computeLimit: computeLimit,
    formatExactValue: formatExactValue
  };
})();

// Exportation globale
if (typeof module !== "undefined" && module.exports) {
  module.exports = LimitEngine;
} else {
  window.LimitEngine = LimitEngine;
}