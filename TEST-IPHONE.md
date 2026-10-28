# Essai de Tathbīt sur un vrai iPhone (≈ 25 minutes)

Aucun test automatique ne remplace un iPhone : Safari a ses propres règles (installation, rappels, stockage, micro). Fais les étapes dans l'ordre et note seulement ce qui ne se passe **pas** comme dans la colonne « Attendu ».

**Avant de commencer** : iOS 16.4 ou plus récent (Réglages → Général → Informations) ; un accès Wi-Fi ; l'adresse https://msake2026.github.io/tathbit/ ouverte **dans Safari** (pas dans une application qui ouvre un navigateur intégré, comme Messages ou Instagram). Note la version d'iOS.

## 1. Installation
| # | Fais | Attendu |
|---|------|---------|
| 1 | Safari → bouton Partager (carré avec flèche) → « Sur l'écran d'accueil » → Ajouter | Une icône verte avec un livre, une coche dorée et un pupitre, nommée « Tathbīt » |
| 2 | Ouvre l'application **depuis cette icône** (pas depuis Safari) | Écran de lancement vert avec le logo et « Coran et moutoun », puis l'application en plein écran, sans barre d'adresse |
| 3 | Premier lancement | Guide de bienvenue en 3 étapes ; tu peux le passer |

## 2. Compte et e-mails
| # | Fais | Attendu |
|---|------|---------|
| 4 | Crée un compte avec une adresse que tu peux lire | Message « confirme ton e-mail » |
| 5 | Ouvre l'e-mail de confirmation | Il arrive en moins de 2 minutes (regarde les indésirables) ; le logo est affiché en haut ; le lien te ramène dans le site |
| 6 | Reviens dans l'application installée, connecte-toi | Tu arrives sur l'accueil. Si l'application installée te redemande de te connecter alors que Safari était connecté : **c'est normal sur iPhone** (stockage séparé), note-le |
| 7 | « Mot de passe oublié » → e-mail de réinitialisation | Reçu, logo affiché, le nouveau mot de passe fonctionne |

## 3. Réviser
| # | Fais | Attendu |
|---|------|---------|
| 8 | Réviser → choisis une courte série → Commencer | Les questions s'enchaînent ; si tu réponds en écrivant, le champ reste visible au-dessus du clavier |
| 9 | Termine la série | Un bilan s'affiche ; l'accueil montre « Aujourd'hui » à jour ; Progrès → « Cette semaine » affiche tes réponses et tes jours actifs |
| 10 | Réciter à voix haute (accueil) → autorise le micro | iOS demande l'autorisation du micro **une seule fois** ; le texte entendu apparaît en direct. Si rien n'apparaît : note ce que dit l'écran |
| 11 | Réglages → Affichage → taille du texte arabe | Le texte du lecteur change de taille tout de suite |

## 4. Hors ligne
| # | Fais | Attendu |
|---|------|---------|
| 12 | Réglages → Audio et notifications → télécharge une courte sourate (ex. 112) pour l'écoute hors ligne | Une progression, puis la sourate est indiquée comme téléchargée |
| 13 | Active le **mode avion**, puis ferme complètement l'application (glisse-la hors du sélecteur) et rouvre-la | Elle s'ouvre, bandeau « hors ligne », tu peux réviser. **Si l'écran de connexion apparaît à la place de l'accueil : c'est un défaut important, note-le** |
| 14 | Toujours hors ligne : lecteur → écoute la sourate téléchargée | Le son se lit sans réseau |
| 15 | Désactive le mode avion | Le bandeau disparaît et la progression se synchronise |

## 5. Rappels (iPhone installé uniquement)
| # | Fais | Attendu |
|---|------|---------|
| 16 | Réglages → Audio et notifications → carte Notifications → active le rappel | iOS demande d'autoriser les notifications |
| 17 | Règle l'heure du rappel à +5 minutes, ferme l'application, verrouille l'iPhone | Une notification « Tathbīt » arrive à l'heure (compte jusqu'à 10 minutes : la tâche de rappel tourne toutes les 5 minutes) ; la toucher ouvre l'application |

Si rien n'arrive : vérifie Réglages iPhone → Notifications → Tathbīt (autorisées, bannières) et que Supabase est prêt (`teacher.sql`, fonction `send-reminders`, secrets SMTP, tâche `tathbit-rappels`). Note ce que tu as constaté, je chercherai la cause.

## 6. Accessibilité (5 minutes, facultatif)
Active VoiceOver (Réglages → Accessibilité → VoiceOver), parcours l'accueil, le menu du bas et une question. Note ce qui est lu de façon incompréhensible ou ce que VoiceOver ne peut pas toucher.

## Ce que je veux en retour
Pour chaque défaut : le numéro de l'étape, ce que tu as vu, la version d'iOS, et si possible une capture d'écran. Un défaut vaut mieux qu'un « ça marche à peu près » : dis-le même s'il te semble petit.

*Limites connues d'iOS, pas des défauts de l'application : pas de téléchargement automatique de l'audio en Wi-Fi (Safari ne dit pas si tu es en Wi-Fi), les rappels n'existent qu'une fois l'application installée sur l'écran d'accueil, et le stockage de l'application installée est séparé de celui de Safari.*
