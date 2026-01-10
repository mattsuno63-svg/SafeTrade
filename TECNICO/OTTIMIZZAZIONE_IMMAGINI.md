# Ottimizzazione Immagini - SafeTrade

## 📸 Panoramica

Il sistema di ottimizzazione immagini riduce automaticamente le dimensioni dei file caricati dai venditori e seller, riducendo drasticamente i costi di archiviazione su Supabase Storage.

## 🎯 Obiettivi

- **Ridurre i costi di storage** del 70-90%
- **Migliorare le performance** del sito (caricamento più veloce)
- **Ridurre il consumo di bandwidth**
- **Mantenere qualità visiva accettabile**

## ⚙️ Funzionalità Implementate

### 1. Ottimizzazione Automatica
- ✅ **Ridimensionamento automatico**: Max 1200x1200px (mantiene proporzioni)
- ✅ **Conversione WebP**: Automatica quando possibile (90% più piccolo di JPEG)
- ✅ **Compressione intelligente**: Qualità ottimale 80% (bilanciamento qualità/dimensione)
- ✅ **PNG con trasparenza**: Mantiene formato PNG per immagini con alpha channel
- ✅ **Compressione progressiva**: Se file ancora troppo grande, riduce qualità incrementale

### 2. Validazioni
- ✅ **Tipo file**: Solo immagini accettate
- ✅ **Dimensione originale**: Max 20MB file originale
- ✅ **Dimensione ottimizzata**: Max 5MB dopo ottimizzazione
- ✅ **Tentativi multipli**: Fino a 3 tentativi di compressione se necessario

### 3. Configurazione
```typescript
// Configurazioni default in src/lib/image-optimization.ts
MAX_WIDTH = 1200px
MAX_HEIGHT = 1200px
MAX_FILE_SIZE = 5MB (dopo ottimizzazione)
WEBP_QUALITY = 80%
JPEG_QUALITY = 85%
```

## 📊 Risultati Attesi

### Esempio di Riduzione Dimensioni

| Tipo Originale | Dimensione Originale | Dimensione Ottimizzata | Riduzione |
|---------------|---------------------|------------------------|-----------|
| JPEG 4000x3000px | 5.2 MB | 280 KB | **95%** |
| PNG 2000x2000px | 3.8 MB | 450 KB | **88%** |
| JPEG 2000x1500px | 2.1 MB | 180 KB | **91%** |

### Stima Risparmio Costi

**Supabase Storage Pricing (esempio):**
- $0.021/GB/mese per storage
- Con 1000 immagini originali (media 3MB) = 3GB = $0.063/mese
- Con ottimizzazione (media 300KB) = 0.3GB = $0.0063/mese
- **Risparmio: ~90% = $0.057/mese = $0.68/anno**

Per 10,000 immagini:
- Originale: $0.63/mese
- Ottimizzato: $0.063/mese
- **Risparmio: $6.84/anno**

## 🔧 Implementazione Tecnica

### Stack Tecnologico
- **Sharp**: Libreria Node.js per processing immagini (molto performante)
- **Supabase Storage**: Storage finale per immagini ottimizzate
- **Next.js API Route**: `/api/upload` gestisce tutto il processo

### Flusso di Upload

```
1. User carica immagine (File)
   ↓
2. API /api/upload riceve File
   ↓
3. Sharp ottimizza:
   - Legge metadata
   - Ridimensiona se > 1200px
   - Converte a WebP (o mantiene PNG se trasparenza)
   - Comprime con qualità 80%
   ↓
4. Se > 5MB: riduce qualità incrementale (max 3 tentativi)
   ↓
5. Converte Buffer → Blob
   ↓
6. Upload su Supabase Storage
   ↓
7. Ritorna URL pubblico + statistiche ottimizzazione
```

### File Principali

- `src/lib/image-optimization.ts`: Utility per ottimizzazione
- `src/app/api/upload/route.ts`: API endpoint che usa le utility

## 📝 Utilizzo

### Per Developer

Le immagini vengono **automaticamente ottimizzate** quando caricate tramite `/api/upload`. Non serve nessuna modifica al codice esistente.

### Statistiche Ottimizzazione

L'API ritorna statistiche utili:

```json
{
  "url": "https://...",
  "path": "listings/...",
  "originalSize": 5242880,
  "optimizedSize": 286720,
  "sizeReduction": 95,
  "format": "webp"
}
```

Questo permette di monitorare l'efficacia dell'ottimizzazione.

## 🚀 Miglioramenti Futuri

### 1. Ottimizzazione Batch Immagini Esistenti
Script per ottimizzare immagini già caricate:
```bash
npm run optimize-existing-images
```

### 2. Varianti Multiple
Generare automaticamente thumbnails (150px, 300px, 600px) per utilizzi diversi:
- Thumbnail 150px: griglie listing
- Medium 600px: dettagli prodotto
- Large 1200px: visualizzazione full screen

### 3. Lazy Loading
Usare `next/image` con lazy loading per ridurre bandwidth iniziale.

### 4. CDN Caching
Aggiungere Cloudflare CDN davanti a Supabase Storage per:
- Cache globale
- Ridurre costi bandwidth Supabase
- Velocità migliorata

### 5. Compressione Avanzata
- **AVIF format**: 50% più piccolo di WebP (supporto browser limitato)
- **Progressive JPEG**: Migliore UX durante caricamento

## ⚠️ Limitazioni Attuali

1. **Processo Sincrono**: L'ottimizzazione avviene durante l'upload (può essere lento per file molto grandi)
   - **Soluzione futura**: Job queue asincrona (Bull/BullMQ)

2. **Una sola variante**: Viene generata solo una versione ottimizzata
   - **Soluzione futura**: Generare multiple varianti (thumbnail, medium, large)

3. **Nessun caching lato client**: Ogni volta si scarica l'immagine completa
   - **Soluzione futura**: Service Worker per cache locale

## 📈 Monitoraggio

### Metriche da Monitorare

1. **Media riduzione dimensioni**: Dovrebbe essere 70-90%
2. **Tempo medio ottimizzazione**: Dovrebbe essere < 2 secondi per immagine
3. **Tasso errore ottimizzazione**: Dovrebbe essere < 1%
4. **Storage utilizzato**: Monitorare crescita storage Supabase

### Log Console

L'API logga automaticamente:
```
📸 Image optimized: 5.20MB → 0.28MB (95% reduction)
```

Questo permette di vedere in tempo reale l'efficacia dell'ottimizzazione.

## 🔒 Sicurezza

- ✅ Validazione tipo file (solo immagini)
- ✅ Limitazione dimensione file originale (20MB max)
- ✅ Autenticazione richiesta per upload
- ✅ Sanitizzazione filename

## 💡 Best Practices

1. **Caricare sempre tramite `/api/upload`**: Non caricare direttamente su Supabase Storage
2. **Usare `next/image`**: Per display ottimizzato lato client
3. **Lazy loading**: Per immagini sotto la fold
4. **Limitare numero immagini**: Max 5 immagini per listing (già implementato)

## 📚 Risorse

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [WebP Format Guide](https://developers.google.com/speed/webp)
- [Supabase Storage Pricing](https://supabase.com/pricing)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)

---

**Ultimo Aggiornamento**: 2025-01-30  
**Versione**: 1.0

