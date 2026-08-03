# BacMath - Plan d'implémentation complet

## Architecture

### Objectifs
- Implémenter TOUS les 50 outils de la barre latérale
- Faire fonctionner le tracé de cercles, droites, segments, etc.
- Interactions clavier/souris fluides

### Structure de données
```
geoObjects[] = {
  { id, type, data, style, visible, label }
}
```
Types supportés : point, line, segment, ray, vector, circle, circle3, arc, ellipse, hyperbola, parabola, polygon, regpolygon, tangent

### Modes d'interaction
Chaque outil a un mode avec des étapes de clic :
- 1 clic = placer un point libre
- 2 clics = créer un objet (droite, segment, etc.)
- 3 clics = cercle par 3 points, angle, etc.

---

## Étapes d'implémentation

### Étape 1: Système de points & géométrie de base
- [x] Ajouter le store `geoObjects`
- [x] Fonction `addPoint(x, y, label)` 
- [x] Fonction `drawAllObjects()` qui parcourt geoObjects
- [x] Point libre (`mode='point'`) - clic pour placer
- [x] Point sur objet (`mode='point-on'`) - clic sur courbe
- [x] Intersection (`mode='intersect'`) - entre 2 objets
- [x] Milieu (`mode='midpoint'`) - entre 2 points

### Étape 2: Droites & lignes
- [x] Droite par 2 points (`mode='line'`)
- [x] Segment (`mode='segment'`)
- [x] Demi-droite (`mode='ray'`)
- [x] Vecteur (`mode='vector'`)

### Étape 3: Coniques
- [x] Cercle (centre + rayon) (`mode='circle'`) - clic centre, drag pour rayon
- [x] Cercle (3 points) (`mode='circle3'`)
- [x] Arc de cercle (`mode='arc'`)
- [x] Ellipse (`mode='ellipse'`)
- [x] Hyperbole (`mode='hyperbola'`)
- [x] Parabole (`mode='parabola'`)

### Étape 4: Polygones
- [x] Polygone (`mode='polygon'`)
- [x] Polygone régulier (`mode='regpolygon'`)

### Étape 5: Constructions géométriques
- [x] Parallèle (`mode='parallel'`)
- [x] Perpendiculaire (`mode='perp'`)
- [x] Médiatrice (`mode='mediatrix'`)
- [x] Bissectrice (`mode='bisector'`)

### Étape 6: Analyse (calculus)
- [x] Tangente interactive (`mode='tangent'`)
- [x] Dérivée f' (`mode='derivative'`)
- [x] Dérivée seconde f'' (`mode='derivative2'`)
- [x] Primitive/Intégrale (`mode='integral'`)
- [x] Asymptotes (`mode='asymptote-tool'`)
- [x] Branche parabolique (`mode='parabolic-tool'`)
- [x] Tableau de variation (`mode='tv-tool'`)
- [x] Tableau de signes (`mode='sign-tool'`)
- [x] Extremums (`mode='extrema'`)
- [x] Racines/Zéros (`mode='roots'`)
- [x] Point d'inflexion (`mode='inflection'`)

### Étape 7: Transformations
- [x] Symétrie axiale (`mode='reflect'`)
- [x] Symétrie centrale (`mode='pointsym'`)
- [x] Rotation (`mode='rotate'`)
- [x] Translation (`mode='translate'`)
- [x] Homothétie (`mode='dilate'`)
- [x] Trace/Lieu (`mode='locus'`)

### Étape 8: Mesures
- [x] Distance (`mode='distance'`)
- [x] Aire (`mode='area'`)
- [x] Angle (`mode='angle'`)
- [x] Angle donné (`mode='anglefix'`)
- [x] Pente (`mode='slope'`)

### Étape 9: Stats & données
- [x] Régression (`mode='regression'`)
- [x] Histogramme (`mode='histogram'`)
- [x] Boîte à moustaches (`mode='boxplot'`)
- [x] Probabilité (`mode='proba'`)
- [x] Nombre complexe (`mode='complex'`)

### Étape 10: Outils généraux
- [x] Zoom avant/arrière
- [x] Curseur/Slider
- [x] Texte/Étiquette
- [x] Résoudre équation
- [x] Export image
- [x] Grille on/off
- [ ] Clavier mathématique (déjà fait)

---

## Fichiers à modifier
- **index.html** - Contient tout le code inline (HTML, CSS, JS)
- Le style.css et script.js sont des versions séparées/anciennes

## Tests
- [x] Vérifier que les cercles se tracent correctement
- [x] Vérifier que tous les outils de dessin fonctionnent
- [x] Vérifier les interactions souris (clic, drag)

