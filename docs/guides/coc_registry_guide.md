# Guide Développeur — Publication et Consommation via le Codernic Operative Center (COC)

Ce guide détaille la procédure pour **publier** les librairies du monorepo **ATOMOS Structura** et **consommer** leurs dépendances directement depuis notre registry souverain : le **Codernic Operative Center (COC)** (`http://localhost:4873`).

---

## 1. Vue d'ensemble de l'écosystème

Le monorepo ATOMOS Structura héberge plusieurs modules et librairies partagées :

* **Scope `@atomos-web` (Librairies Structura) :**
  * `@atomos-web/structura` (Moteur principal canvas visuel, runtime et API headless)
  * `@atomos-web/structura-core` (Modèles de domaine, reducers d'état, types)
  * `@atomos-web/structura-mcp` (Serveur Model Context Protocol)
  * `@atomos-web/renderer-svg` (Moteur de rendu vectoriel SVG autonome)
  * `@atomos-web/prime` & `@atomos-web/prime-style` (Composants réactifs et design tokens)
* **Scope `@binaryjack` (Dépendances externes souveraines) :**
  * `@binaryjack/formular.dev` (Moteur de formulaires dynamiques, version `^2.4.0` sur COC)
* **Scope `@codernic` (Composants et services transverses) :**
  * `@codernic/core`, `@codernic/design-system`, etc.

---

## 2. Configuration préalable des Scopes (`.npmrc`)

Pour que `pnpm` et `npm` acheminent automatiquement les paquets propriétaires vers le registry local COC tout en laissant passer les paquets publics vers npmjs.org, configurez votre fichier `.npmrc`.

### Option A : Configuration Globale Machine (Recommandée)
Éditez `~/.npmrc` :

```ini
# ~/.npmrc

# Routage des scopes propriétaires vers le registry local COC
@atomos-web:registry=http://localhost:4873/
@binaryjack:registry=http://localhost:4873/
@codernic:registry=http://localhost:4873/

# Authentification anonyme pour le registry local
//localhost:4873/:_authToken=anonymous

# Miroir officiel pour tous les paquets publics open-source
registry=https://registry.npmjs.org/
```

### Option B : Configuration au niveau du Monorepo
Vous pouvez également déposer un fichier `.npmrc` à la racine de `atomos/` avec les mêmes définitions de scopes.

### Vérification de la disponibilité du Registry COC
Avant toute opération, assurez-vous que le serveur COC est actif :
```bash
curl -s http://localhost:4873/health
```
Réponse attendue :
```json
{"packages_count":6,"service":"Codernic Operative Center (COC) Package Registry","status":"ok","version":"0.1.0"}
```

---

## 3. Publier une Librairie sur le Registry COC

### 3.1. Structure et métadonnées (`package.json`)

Chaque librairie à publier (ex. `packages/atomos-structura/package.json`) doit déclarer :
1. La directive `publishConfig` pointant vers le registry local.
2. Le dossier d'export `files` contenant les fichiers compilés (`dist`).
3. Les scripts de build.

Exemple :
```json
{
  "name": "@atomos-web/structura",
  "version": "5.0.0",
  "license": "AGPL-3.0-or-later",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "http://localhost:4873/"
  },
  "scripts": {
    "build": "node scripts/gen-version.mjs && vite build",
    "prepublishOnly": "pnpm run build"
  }
}
```

### 3.2. Ordre de publication dans le Monorepo

En raison des dépendances croisées internes, respectez cet ordre topologique lors de la publication initiale ou de montées de version majeures :

1. `@atomos-web/structura-core`
2. `@atomos-web/prime` et `@atomos-web/prime-style`
3. `@atomos-web/renderer-svg` et `@atomos-web/structura-mcp`
4. `@atomos-web/structura`

---

### 3.3. Méthodes de publication

#### Méthode A : Script automatisé COC (Recommandée)
Le script `coc-publish.mjs` disponible dans `Codernic-Operative-Center/scripts/` :
- Résout automatiquement les références `"workspace:*"` en vraies versions SemVer (`^5.0.0`) pour le tarball.
- Compile le package via `pnpm run build`.
- Empaquette le tarball via `pnpm pack`.
- Calcule les hash SHA-1 / BLAKE3 et effectue le `PUT` HTTP vers le registry.
- Restaure le `package.json` d'origine pour préserver la propreté du git working tree.

Exécution depuis le dossier du paquet à publier :
```bash
# Exemple pour publier @atomos-web/structura
cd packages/atomos-structura
node /home/tadeop/dev/Codernic-Workspace/Codernic-Operative-Center/scripts/coc-publish.mjs

# Pour forcer l'écrasement d'une version existante (si besoin)
node /home/tadeop/dev/Codernic-Workspace/Codernic-Operative-Center/scripts/coc-publish.mjs --force
```

#### Méthode B : Commande native `pnpm publish`
Si vous préférez la commande native :
```bash
cd packages/atomos-structura
pnpm run build
pnpm publish --registry http://localhost:4873 --no-git-checks
```

---

### 3.4. Vérification de la publication

* **En ligne de commande (API REST) :**
  ```bash
  curl -s http://localhost:4873/api/v1/packages | jq .
  ```
* **Sur le Dashboard interactif COC :**
  Ouvrez `http://localhost:4873/dashboard` (ou `http://localhost:4873/`) dans votre navigateur pour visualiser le badge de version, les métadonnées et le hash BLAKE3.

---

## 4. Récupérer les Dépendances directement depuis le Registry COC

### 4.1. Remplacer un submodule local par le paquet publié sur COC (Cas `@binaryjack/formular.dev`)

Auparavant, `@binaryjack/formular.dev` était embarqué en tant que sous-module git dans `packages/formular-dev` avec une référence locale `"workspace:*"`.

Puisque `@binaryjack/formular.dev@2.4.0` est maintenant hébergé et versionné sur le registry COC :

1. Dans `packages/atomos-structura/package.json`, modifiez la dépendance :
   ```json
   "dependencies": {
     "@binaryjack/formular.dev": "^2.4.0"
   }
   ```
2. *(Optionnel)* Découplez le dossier du workspace :
   Si vous souhaitez que `pnpm` ne pointe plus sur le dossier local, retirez le submodule ou commentez-le dans `pnpm-workspace.yaml`.
3. Lancez l'installation :
   ```bash
   pnpm install
   ```
   `pnpm` consultera `http://localhost:4873/@binaryjack%2Fformular.dev`, téléchargera l'archive tarball vérifiée et mettra à jour `pnpm-lock.yaml`.

---

### 4.2. Consommer `@atomos-web/structura` dans une application cliente (ex. `showcase`, `ai-agencee`)

Depuis n'importe quelle application cliente au sein de la machine :

1. Vérifiez que `~/.npmrc` route le scope `@atomos-web:registry=http://localhost:4873/`.
2. Installez la librairie :
   ```bash
   # Dernière version publiée
   pnpm add @atomos-web/structura

   # Ou version spécifique
   pnpm add @atomos-web/structura@^5.0.0
   ```
3. Mettre à jour les dépendances lorsqu'une nouvelle version est publiée :
   ```bash
   pnpm update @atomos-web/structura
   ```

---

## 5. Surveillance en Temps Réel & Intégration CI/CD

Le registry COC émet un flux d'événements haute fréquence via Server-Sent Events (SSE). Vos scripts de build, vos watchers ou les agents autonomes peuvent s'y brancher pour être avertis instantanément d'une publication :

### Écoute en CLI :
```bash
curl -N http://localhost:4873/api/v1/events/stream
```

### Écoute en Node.js :
```typescript
import EventSource from 'eventsource';

const sse = new EventSource('http://localhost:4873/api/v1/events/stream');

sse.addEventListener('package.published', (event) => {
  const pkg = JSON.parse(event.data);
  console.log(`[COC Alerte] Nouveau paquet disponible : ${pkg.name}@${pkg.version}`);
  console.log(`BLAKE3 Integrity: ${pkg.blake3}`);
});
```

---

## 6. Dépannage & Erreurs fréquentes

| Erreur / Comportement | Cause probable | Solution |
| :--- | :--- | :--- |
| `ERR_PNPM_FETCH_404` lors du `pnpm install` | Scope non configuré dans `.npmrc` ou package non encore publié. | Vérifier que `@atomos-web:registry=http://localhost:4873/` figure bien dans `~/.npmrc`. Vérifier via `curl http://localhost:4873/api/v1/packages`. |
| Demande d'authentification ou mot de passe lors de `pnpm publish` | Comportement par défaut du client npm/pnpm. | Ajouter `//localhost:4873/:_authToken=anonymous` dans `~/.npmrc` et utiliser le flag `--no-git-checks`. |
| Conflit de version existante lors de la republication | La version a déjà été publiée et est immutable. | Incrémenter la version (SemVer) ou utiliser `coc-publish.mjs --force` pour écraser en local. |
| Port `4873` inaccessible | Le serveur COC n'est pas démarré. | Vérifier l'état du service COC (`curl http://localhost:4873/health`). |
