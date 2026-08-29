# Site web — Académie Mansa Musa

Site vitrine de l'**Académie Mansa Musa** (produit : **EduCam**), la plateforme d'enseignement quotidien pour le primaire au Cameroun.

- **Domaine principal :** academiemansamusa.com
- **Domaine secondaire (redirige vers le principal) :** mansamusacademy.com
- **Hébergement :** Vercel (déploiement automatique à chaque `git push`)
- **Courriel :** Microsoft 365 Business Basic (Exchange Online)

## Structure

```
index.html      → la page d'accueil (tout le site, autonome)
404.html        → page d'erreur personnalisée
favicon.svg     → icône de l'onglet (M or sur vert foncé)
vercel.json     → en-têtes de sécurité + URLs propres
```

C'est un site **statique** : pas d'étape de compilation. Vercel sert les fichiers tels quels.

## Modifier le site

Le site est un simple fichier HTML. Pour changer un texte, une couleur ou une section :
1. Ouvrez `index.html`.
2. Faites la modification (ou demandez à Claude de la faire).
3. `git commit` + `git push` → Vercel redéploie tout seul en ~30 secondes.

## Palette de marque (EduCam)

| Rôle | Couleur |
|------|---------|
| Vert principal | `#007A5E` |
| Vert foncé | `#0F4C35` |
| Or (accent) | `#FCD116` |
| Rouge (alerte) | `#C0392B` |
| Texte | `#0E1116` |
| Police | Inter (Google Fonts) |

---
© Académie Mansa Musa inc. — Québec, Canada.
