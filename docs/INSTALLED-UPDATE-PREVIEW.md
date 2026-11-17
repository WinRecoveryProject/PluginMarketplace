# Preview af allerede installerede opdateringer

En Marketplace-post er en installationsmulighed. Den siger ikke, at pakken allerede er installeret eller skal aktiveres. Et personligt plugin og et Marketplace-plugin med samme navn er forskellige installationsidentiteter.

Gem en frisk, komplet CLI-inventarliste uden at ændre installationerne:

```powershell
codex plugin list --json > "$env:TEMP/wrp-installed-plugins.json"
node scripts/plan-installed-updates.mjs "$env:TEMP/wrp-installed-plugins.json" plugin-skill-studio@winrecoveryproject-digital
```

Previewet læser listen og udskriver kun `updates` og `skipped`. Det starter ingen processer ud over sig selv, kalder intet netværk og skriver ingen filer. Det medtager kun præcise `name@marketplace`-identiteter, der allerede er installeret og aktiveret. Fraværende eller deaktiverede identiteter springes over; forkerte eller dublerede poster afvises. Versionen er den observerede lokale version; værktøjet undersøger ikke, om en nyere version findes.

Brug resultatet til at afgrænse en særskilt autoriseret opdatering. Bevar før-/efter-inventar, aktiveringsflag, App-bindinger, skill-deaktiveringer og konfigurationshashes. Kør ikke `plugin add` på alle katalogposter som en generel opdatering: det kan installere nye kopier.

Kør regressionstesten med:

```powershell
node --test scripts/plan-installed-updates.test.mjs
```

Testene omfatter personlige identiteter over for Marketplace-spejle, deaktiverede pakker, dublerede anmodninger og ugyldige registre. Previewet garanterer ikke, at inputlisten er frisk eller komplet; det skal den kaldende arbejdsgang sikre. Det er ikke en installer eller en test af pluginets funktioner.
