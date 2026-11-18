# Originale plugins uden for Business

En afstemning mod den gemte Business-installationsliste viste 13 manglende
eksakte namespace-identiteter i Personlig. Det var ikke bevis for, at de alle
krævede Business. Direkte native-opslag bekræftede 12 curated-originaler som
AVAILABLE i Personlig, selv om en bred katalogsøgning ikke viste GPTs to Plugin.

Disse otte originaler er nu installeret fra `openai-curated-remote`:

| Original | Observeret version |
| --- | --- |
| GPTs to Plugin | 0.1.2+codex.20260921090000 |
| Plugin Autopilot | 0.7.0 |
| Matt Skills Curated | 1.1.0 |
| Universal Plugin Installer | 0.1.0 |
| Plugins Radar | 1.0.3 |
| Skills Evidence Matrix | 1.0.4 |
| CloudConvert | 1.0.0 |
| Codex Tasks | 0.1.1 |

For eksempel kan originalen hentes direkte via den understøttede værtskommando:

```powershell
codex plugin add gpts-to-plugin@openai-curated-remote
```

Originalernes forfattere, identiteter og assets bevares. Der er ikke oprettet
private aliasprodukter eller nye App-/MCP-registreringer. Brugerens GPTs-ZIP
matchede samtlige 22 installerede filer, inklusive 13 skills og seks assets.
Ukendt licens er ikke omskrevet til MIT, og originalernes payloads genudgives
ikke i dette repository. Denne side er en katalogoversigt, ikke en ny pakke.

## Aktivering og forbindelser er forskellige forhold

CLI-antallet steg fra 74 til 82 eksakte installationer. De nye installationer
bruger eksisterende providerregistreringer; det flytter ikke konto-grants fra
Business. Den første læseprøve krævede genforbindelse for tre services.
Efter brugerens genforbindelse bestod alle tre samme minimale gratis læsekald:
CloudConvert-kontostatus, Radar-søgning og en tom Evidence Matrix-worksheet med
fire valgte sprognavne. Codex Tasks kunne læse miljølisten uden at starte jobs.
Der er ikke udført konverteringer, cloud compute eller andre creditforbrugende
operationer. Budget: **0 kr.**

## Bevidst bevaret særskilt

- Den installerede Zilvereyes Context Handoff bevares. Originalen har
  overlappende lifecycle-hooks og bredere stående autorisation. Den tælles ikke
  som installeret blot fordi en sikker tilpasset udgave findes. Originalen er
  tilgængelig i Personlig og gemt som original kilde; den er ikke Business-låst.
- De tre originale namespaces Skill Risk Check, Codex Coordinator og Codex Dev
  Workflows er tilgængelige, men de allerede installerede Marketplace-udgaver
  bevares uden endnu et sæt parallelle installationer. Præcis namespace-identitet
  er fortsat forskellig fra samme produktnavn.
- Workspace-OneDrive har en anden eksisterende App-identitet end den personlige
  registrering. Den særskilt aftalte workspace-rettelse afventer Business-scope
  efter 04:05 CET; hverken credentials eller forbindelser kopieres mellem dem.

Studios integrerede workflows og de originale plugininstallationer tælles
separat. Den gamle beslutning om en samlet Studio-løsning er ikke bevis for, at
en originalpakke er installeret. Denne oversigt supplerer de historiske
kataloglister uden at omskrive deres daværende opgørelser.
