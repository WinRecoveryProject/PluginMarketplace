# Gemini-færdigheder for PluginMarketplace

Denne mappe gør hele Marketplace læsbar for Gemini. Gemini kan ikke installere Codex-/Claude-plugins og kan ikke køre `.ps1`, `.mjs` eller `.json`. Derfor bliver hvert plugin omsat til en **Gemini-færdighed**. Det er en mappe med `SKILL.md` i roden og referencefiler i `.md`/`.csv`, så den kan uploades via **Tilpas › Færdigheder › Upload færdighed**.

Alt indhold kommer direkte fra `plugins/`. Scripts, JSON, YAML, skabeloner og tests er indlejret som kodeblokke i Markdown, så Gemini kan læse, forklare og foreslå ændringer til dem. Billeder og andre binære filer bliver kun nævnt ved navn.

## Indhold

| Mappe | Hvad den er |
| --- | --- |
| `skills/plugin-marketplace/` | **Start her.** Indgang til hele Marketplace: alle plugins, versioner og skills (`references/catalog.md` og `catalog.csv`). |
| `skills/<plugin>/` | Én færdighed pr. plugin. `SKILL.md` fungerer som router til plugin'ets skills. `references/<skill>.md` indeholder den originale vejledning og alle filer, der hører til den skill. `references/_plugin*.md` indeholder manifester, hooks, scripts og tests. |
| `Export-GeminiSkill.ps1` | Kopierer de valgte færdigheder til en upload-mappe (og laver zip, hvis du vil). |

`skills/` genereres automatisk. Ret ikke filerne i hånden.

## Kom i gang på Windows

```powershell
Set-Location 'C:\Users\zilve\_GitRootArchive_\Plugin_Codex_Claude_Development\PluginMarketplace'
git pull
.\gemini\Export-GeminiSkill.ps1 -List
```

```powershell
.\gemini\Export-GeminiSkill.ps1 -Name plugin-marketplace, codex-dev-workflows, codex-engineering-guardrails, powershell-workbench
```

Scriptet lægger mapperne i `Skrivebord\gemini-skills\`. Upload derefter én mappe ad gangen i Gemini. Brug `-All` for at tage alle med, `-Zip` for at få zip-filer, og `-SkipBuild` hvis Node.js ikke er installeret. I så fald bruges de mapper, der allerede er committet.

**Anbefalet rækkefølge:** Start med `plugin-marketplace`, så Gemini kender hele kataloget. Tilføj derefter de plugins, du bruger mest. Store pakker som `powershell-workbench`, `vercel`, `plugin-skill-studio` og `codex-security` fylder 1–3 MB. Upload dem kun, hvis du har brug for dem.

## Når et plugin ændres

```powershell
node scripts\build-gemini-skills.mjs
node scripts\build-gemini-skills.mjs --check
node --test scripts\build-gemini-skills.test.mjs
node validate-marketplace.mjs
```

Commit de regenererede `gemini/skills/` sammen med ændringen, og upload den berørte mappe til Gemini igen. `--check` fejler, hvis `gemini/skills/` ikke længere passer til `plugins/`.

## Begrænsninger

- Gemini *læser* plugins. Den kører dem ikke. Kommandoer og scripts skal stadig køres lokalt (eller i Codex/Claude), og Gemini kan bede om outputtet.
- Filer over 64 KB og binære filer bliver ikke indlejret. Referencen nævner dem med sti, så de kan findes i repoet.
- Plugin-filer, der fylder meget, bliver delt op i `_plugin-<mappe>-partNN.md` på højst cirka 256 KB.
