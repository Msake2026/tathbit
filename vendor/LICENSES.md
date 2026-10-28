# Bibliothèques hébergées (lecture de photos, PDF et Word)

Toutes sous licence **Apache-2.0** (sauf `supabase.min.js`, licence MIT, ci-dessous). Elles sont chargées uniquement quand tu utilises « Ajouter mon propre matn » avec une photo ou un fichier ; la lecture se fait **dans le navigateur**, rien n'est envoyé à un serveur.

- **Tesseract.js 5.1.1** (`tesseract/tesseract.min.js`, `tesseract/worker.min.js`) — https://github.com/naptha/tesseract.js — licence : `tesseract/LICENSE-tesseract.js.txt`
- **Tesseract.js-core 5.1.1** (`tesseract/tesseract-core-lstm.wasm.js`) — moteur OCR Tesseract compilé en WebAssembly — https://github.com/naptha/tesseract.js-core
- **Données de langue arabe** (`tesseract/ara.traineddata.gz`, jeu « 4.0.0_best_int » du paquet `@tesseract.js-data/ara`) — dérivé de https://github.com/tesseract-ocr/tessdata_best
- **PDF.js 3.11.174** (`pdfjs/pdf.min.js`, `pdfjs/pdf.worker.min.js`) — https://github.com/mozilla/pdf.js — licence : `pdfjs/LICENSE-pdfjs.txt`

Fichiers obtenus sans modification depuis le registre npm via jsDelivr.

## Comptes

- **supabase-js 2.116.0** (`supabase.min.js`, licence MIT) — https://github.com/supabase/supabase-js — chargée au démarrage quand les comptes sont configurés ; octets identiques à `dist/umd/supabase.min.js` du paquet npm (SHA-384 `JBR+x8blGwjDRO63aHCGiZMD4VNiTR4ZUGA+N6ZKLf3zNt1fK8IBpcgPaMrxqWBp`, vérifiée à la copie). Hébergée ici : aucun service tiers n'est contacté au lancement.
