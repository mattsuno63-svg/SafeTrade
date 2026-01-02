# 🔀 Git Workflow - SafeTrade

## Regole Ferree per Git

### 1. Branch Naming
- ✅ **SEMPRE** usa nomi descrittivi
- ✅ **SEMPRE** prefisso con tipo: `feature/`, `fix/`, `refactor/`, `docs/`

**Formato CORRETTO**:
```
feature/user-dashboard
fix/login-session
refactor/api-routes
docs/flow-documentation
```

**Formato SBAGLIATO**:
```
fix
new-feature
test
```

---

### 2. Commit Messages
- ✅ **SEMPRE** messaggi chiari e descrittivi
- ✅ **SEMPRE** formato: `type: description`
- ✅ **SEMPRE** in inglese

**Tipi validi**:
- `feat:` - Nuova feature
- `fix:` - Bug fix
- `refactor:` - Refactoring codice
- `docs:` - Documentazione
- `style:` - Styling (formattazione, CSS)
- `test:` - Test
- `chore:` - Build, config, etc.

**Esempio CORRETTO**:
```
feat: add user profile dropdown in header
fix: resolve login cookie encoding issue
refactor: simplify SafeTrade transaction creation
docs: update onboarding flow documentation
```

**Esempio SBAGLIATO**:
```
fix
updated code
changes
```

---

### 3. Commit Frequency
- ✅ **SEMPRE** commit frequenti (ogni feature/fix completato)
- ✅ **SEMPRE** commit atomici (un commit = una modifica logica)
- ✅ **MAI** commit multipli modifiche non correlate insieme

**Esempio CORRETTO**:
```
Commit 1: feat: add user dropdown component
Commit 2: feat: add logout functionality
Commit 3: fix: resolve dropdown positioning issue
```

**Esempio SBAGLIATO**:
```
Commit 1: feat: add user dropdown and fix login and update docs
```

---

### 4. Pull Requests
- ✅ **SEMPRE** descrizione chiara della modifica
- ✅ **SEMPRE** lista file modificati
- ✅ **SEMPRE** screenshot se modifica UI
- ✅ **SEMPRE** test manuali completati

**Template PR**:
```markdown
## Descrizione
Breve descrizione della modifica

## Tipo di Modifica
- [ ] Feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentazione

## File Modificati
- `src/components/Header.tsx`
- `src/hooks/use-user.ts`

## Testing
- [ ] Testato su Chrome
- [ ] Testato su mobile
- [ ] Testato autenticazione
- [ ] Nessun errore console

## Screenshots
(se applicabile)
```

---

### 5. Main Branch Protection
- ✅ **MAI** push diretto su `main`
- ✅ **SEMPRE** usa branch feature/fix
- ✅ **SEMPRE** crea PR per merge in main
- ✅ **SEMPRE** review code prima di merge

---

### 6. Merge Strategy
- ✅ **SEMPRE** rebase o squash commits prima di merge
- ✅ **SEMPRE** risolvi conflitti prima di merge
- ✅ **SEMPRE** verifica che build passi dopo merge

---

## 🔄 Workflow Standard

### Per Nuova Feature
1. Crea branch: `git checkout -b feature/nome-feature`
2. Sviluppa feature
3. Commit frequenti: `git commit -m "feat: ..."`
4. Push branch: `git push origin feature/nome-feature`
5. Crea PR su GitHub
6. Review e merge

### Per Bug Fix
1. Crea branch: `git checkout -b fix/nome-bug`
2. Fix bug
3. Commit: `git commit -m "fix: ..."`
4. Push e crea PR
5. Merge dopo verifica

---

## 🚫 Cose da NON Fare

1. ❌ **MAI** commitare file `.env`
2. ❌ **MAI** commitare `node_modules/`
3. ❌ **MAI** commitare file temporanei
4. ❌ **MAI** force push su `main`
5. ❌ **MAI** commitare codice commentato o debug
6. ❌ **MAI** commitare senza testare

---

## ✅ Checklist Pre-Push

Prima di push, verifica:
- [ ] Tutti i file modificati sono committati
- [ ] `.env` non è committato
- [ ] `node_modules/` non è committato
- [ ] Build compila senza errori
- [ ] Linter passa
- [ ] Commit messages sono chiari

