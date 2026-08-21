// Fonction pour évaluer et tracer une fonction dynamique
function tracerFonction(expressionTextuelle, ctx, width, height, scale, originX, originY) {
  try {
    // 1. Compiler l'expression saisie par l'utilisateur (ex: "x^2 - 3*x + 2")
    const expr = math.compile(expressionTextuelle);

    ctx.beginPath();
    ctx.strokeStyle = "#00d2d3"; // Couleur de la courbe
    ctx.lineWidth = 2;

    let firstPoint = true;

    // 2. Parcourir chaque pixel horizontal de l'écran (de xMin à xMax)
    for (let pixelX = 0; pixelX <= width; pixelX++) {
      // Convertir le pixel X en coordonnées mathématiques 'x'
      let x = (pixelX - originX) / scale;

      try {
        // Évaluer f(x)
        let y = expr.evaluate({ x: x });

        // Convertir le 'y' mathématique en pixel Y sur le canvas
        let pixelY = originY - (y * scale);

        // Tracer la ligne
        if (firstPoint) {
          ctx.moveTo(pixelX, pixelY);
          firstPoint = false;
        } else {
          ctx.lineTo(pixelX, pixelY);
        }
      } catch (e) {
        // Ignorer les erreurs d'évaluation sur certains points (ex: division par zéro)
        firstPoint = true;
      }
    }

    ctx.stroke();
  } catch (err) {
    console.error("Expression mathématique invalide :", err);
  }
}