# 🔧 Script per Pulire Cache Auth (Manuale)

Se hai problemi con il logout o sessioni che persistono, usa questi comandi nella console del browser (F12):

## Metodo 1: Console Browser (Raccomandato)

Apri DevTools (F12) → Console, poi esegui:

```javascript
// 1. Chiama API logout
fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  .then(() => {
    // 2. Pulisci localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key)
      }
    })
    
    // 3. Pulisci sessionStorage
    sessionStorage.clear()
    
    // 4. Ricarica pagina
    window.location.replace('/')
  })
```

## Metodo 2: Clear Manuale Cookie

1. Apri DevTools (F12)
2. Vai a **Application** (o **Storage** in Firefox)
3. **Cookies** → `http://localhost:3000`
4. Elimina tutti i cookie che contengono:
   - `sb-`
   - `supabase`
   - `auth-token`
5. **Local Storage** → `http://localhost:3000`
6. Elimina tutte le chiavi che iniziano con `sb-` o contengono `supabase`
7. Ricarica la pagina (Ctrl+Shift+R per hard refresh)

## Metodo 3: Hard Refresh Browser

1. **Chrome/Edge**: `Ctrl+Shift+Delete` → Seleziona "Cookie e altri dati dei siti" → Elimina
2. **Firefox**: `Ctrl+Shift+Delete` → Seleziona "Cookie" → Elimina
3. Chiudi tutte le schede del sito
4. Riapri il sito

## Metodo 4: Modalità Incognito

1. Apri nuova finestra incognito (`Ctrl+Shift+N`)
2. Vai a `http://localhost:3000`
3. Fai login con l'account desiderato
4. Usa questa finestra per i test (non condivide cookie con altre finestre)

## Verifica Logout Riuscito

Dopo il logout, verifica nella console:

```javascript
// Dovrebbe restituire null o errore 401
fetch('/api/auth/me')
  .then(r => r.json())
  .then(console.log)
```

