/**
 * ============================================================================
 * BacMath — Moteur d'Intelligence Artificielle Mathématique (mathAI.js)
 * ============================================================================
 * S'exécute en local. Corrige la syntaxe, calcule les domaines de définition,
 * lève les formes indéterminées et génère des valeurs exactes (fractions, ∞).
 */

const MathAI = (function () {

  /**
   * 1. PARSER & AUTO-CORRECTEUR SYNTAXIQUE
   * Corrige automatiquement les erreurs de saisie courantes des élèves.
   */
  function sanitizeExpression(input) {
    if (!input || typeof input !== "string") return "";
    let expr = input.trim();

    // Remplacements usuels de fonctions
    expr = expr.replace(/\bln\b/g, "log"); // ln -> log pour mathjs
    expr = expr.replace(/÷/g, "/").replace(/×/g, "*");

    // Ajout automatique de la multiplication implicite (ex: 2x -> 2*x, x(x+1) -> x*(x+1))
    expr = expr.replace(/(\d)([a-zA-Z\(])/g, "$1*$2");
    expr = expr.replace(/(\))(\d|[a-zA-Z\(])/g, "$1*$2");
    expr = expr.replace(/(x)(log|sin|cos|tan|sqrt)/g, "$1*$2");

    // Fermeture automatique des parenthèses manquantes
    const openParens = (expr.match(/\(/g) || []).length;
    const closeParens = (expr.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      expr += ")".repeat(openParens - closeParens);
    }

    return expr;
  }

  /**
   * 2. FORMATTEUR DE VALEURS MATHEMATIQUES EXACTES
   * Transforme 0.2 -> 1/5, 0.333333 -> 1/3, Infinity -> +∞
   */
  function formatExact(val) {
    if (val === Infinity || val === "+Infinity") return "+∞";
    if (val === -Infinity || val === "-Infinity") return "-∞";
    if (val === "0+" || val === 0.0000000001) return "0⁺";
    if (val === "0-" || val === -0.0000000001) return "0⁻";

    if (typeof val === "number") {
      if (isNaN(val)) return "ND";
      if (!isFinite(val)) return val > 0 ? "+∞" : "-∞";
      if (Math.abs(val) < 1e-11) return "0";
      if (Number.isInteger(val)) return String(val);

      // Conversion en fraction exacte
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
   * 3. MOTEUR DE CALCUL DE LIMITES RIGOUREUX (0/0, inf/inf, a+, a-)
   */
  function computeLimit(exprText, target, direction = "both") {
    const expr = sanitizeExpression(exprText);
    if (!expr) return "ND";

    try {
      // Cas limite à l'infini (+∞ / -∞)
      if (target === "+inf" || target === "+∞" || target === Infinity) {
        return solveAtInfinity(expr, 1);
      }
      if (target === "-inf" || target === "-∞" || target === -Infinity) {
        return solveAtInfinity(expr, -1);
      }

      // Cas limite en un point 'a'
      const a = Number(target);
      if (isNaN(a)) return "ND";

      // A. Évaluation directe
      const directVal = safeEval(expr, a);
      if (!isNaN(directVal) && isFinite(directVal)) {
        return formatExact(directVal);
      }

      // B. Analyse Numérateur / Dénominateur pour formes 0/0 et k/0
      const numVal = safeEvalNumerator(expr, a);
      const denVal = safeEvalDenominator(expr, a);

      // Forme 0 / 0 : Règle de L'Hôpital symbolique via Math.js
      if (Math.abs(numVal) < 1e-9 && Math.abs(denVal) < 1e-9) {
        if (typeof math !== "undefined") {
          try {
            const numStr = getNumeratorStr(expr);
            const denStr = getDenominatorStr(expr);
            const dNum = math.derivative(numStr, "x").toString();
            const dDen = math.derivative(denStr, "x").toString();
            const hopitalVal = safeEval(`(${dNum}) / (${dDen})`, a);
            if (!isNaN(hopitalVal) && isFinite(hopitalVal)) {
              return formatExact(hopitalVal);
            }
          } catch (e) {}
        }
      }

      // Forme k / 0 -> Asymptote verticale (+∞ ou -∞)
      if (Math.abs(denVal) < 1e-9 && Math.abs(numVal) > 1e-9) {
        const eps = 1e-7;
        const valRight = safeEval(expr, a + eps);
        const valLeft = safeEval(expr, a - eps);

        if (direction === "right") return valRight > 0 ? "+∞" : "-∞";
        if (direction === "left") return valLeft > 0 ? "+∞" : "-∞";
        if (valRight > 1e4 && valLeft > 1e4) return "+∞";
        if (valRight < -1e4 && valLeft < -1e4) return "-∞";
        return "∞";
      }

      // Voisinage par approche numérique de sécurité
      const eps = 1e-6;
      let approxVal;
      if (direction === "right") approxVal = safeEval(expr, a + eps);
      else if (direction === "left") approxVal = safeEval(expr, a - eps);
      else approxVal = safeEval(expr, a + eps);

      if (isNaN(approxVal)) return "ND";
      if (approxVal > 1e6) return "+∞";
      if (approxVal < -1e6) return "-∞";
      if (Math.abs(approxVal) < 1e-6) return "0";

      return formatExact(approxVal);

    } catch (err) {
      return "ND";
    }
  }

  function solveAtInfinity(expr, sign) {
    const largeX1 = sign * 1e6;
    const largeX2 = sign * 1e8;
    const v1 = safeEval(expr, largeX1);
    const v2 = safeEval(expr, largeX2);

    if (isNaN(v2)) return "ND";
    if (v2 > 1e7) return "+∞";
    if (v2 < -1e7) return "-∞";
    if (Math.abs(v2) < 1e-6) return "0";
    if (Math.abs(v2 - v1) < 1e-4) return formatExact(v2);

    return formatExact(v2);
  }

  /**
   * 4. ANALYSE DU DOMAINE DE DÉFINITION ET DES POINTS CRITIQUES
   */
  function analyzeDomain(exprText) {
    const expr = sanitizeExpression(exprText);
    const forbiddenPoints = [];
    let minDomain = -Infinity;

    // Détection des logarithmes (ex: x > 0)
    if (expr.includes("log") || expr.includes("ln")) {
      minDomain = 0; // Domaine ]0, +∞[
    }

    // Détection des dénominateurs nuls
    const den = getDenominatorStr(expr);
    if (den && den !== "1") {
      for (let x = -20; x <= 20; x += 0.5) {
        if (Math.abs(safeEval(den, x)) < 1e-7) {
          forbiddenPoints.push(x);
        }
      }
    }

    return {
      minDomain: minDomain,
      forbiddenPoints: forbiddenPoints
    };
  }

  // --- Outils d'évaluation sécurisés ---
  function safeEval(expr, xVal) {
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
    return parts.length >= 2 ? parts[0].replace(/[()]/g, "").trim() : expr;
  }

  function getDenominatorStr(expr) {
    const parts = expr.split("/");
    return parts.length === 2 ? parts[1].replace(/[()]/g, "").trim() : "1";
  }

  function safeEvalNumerator(expr, a) { return safeEval(getNumeratorStr(expr), a); }
  function safeEvalDenominator(expr, a) { return safeEval(getDenominatorStr(expr), a); }

  // API Publique de l'IA Mathématique
  return {
    sanitize: sanitizeExpression,
    formatExact: formatExact,
    computeLimit: computeLimit,
    analyzeDomain: analyzeDomain
  };
})();

// Exportation globale
if (typeof module !== "undefined" && module.exports) {
  module.exports = MathAI;
} else {
  window.MathAI = MathAI;
}