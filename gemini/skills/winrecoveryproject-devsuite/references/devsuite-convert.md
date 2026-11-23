# Skill: devsuite-convert

- Plugin: `winrecoveryproject-devsuite` (0.7.0)
- Source: `plugins/winrecoveryproject-devsuite/skills/devsuite-convert/SKILL.md`

> Use for authorized file conversion through free/included CloudConvert or installed local tools, with verified output and no added charges.

## Instructions

### Convert files with a verified route

Read [the policy](_plugin-references.md#file-referencespolicymd) and [conversion operations](_plugin-references.md#file-referencesconversionmd). Identify sources, target formats, quality/layout/page/codec constraints, destination, overwrite rules and sensitivity. Inspect metadata and preserve originals. Discover real CloudConvert tools/schemas rather than inventing endpoints. Verified App binding: `asdk_app_6a5767a72d2881919c2f45a7d6206298`. Metadata proves neither authentication nor free quota.

Choose a suitable installed local converter or connected CloudConvert when transfer is authorized and included at 0 kr. Verify quota/cost before submission; unknown or positive cost blocks it. Never add API keys, OAuth apps, trials, billing or upgrades. If unavailable, name missing route and continue safe metadata/planning work.

`python scripts/devsuite.py conversion-plan request.json` creates a no-upload plan; it does not convert. Submit with actual provider schema, retain job/task IDs, inspect terminal state and handle failure/cancellation before retrying. After uncertain responses check the original job to prevent duplicates. Download/export through the authorized route to a new destination and inspect actual format, pages/dimensions/duration/content. Tool success alone does not prove correct conversion. Report settings, output path, real job state, checks and gaps; preserve per-item batch states.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "DevSuite · Konvertering"
  short_description: "Planlæg filkonvertering med kontrol af adgang og pris."
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  brand_color: "#00BDA5"
  default_prompt: "Brug $devsuite-convert til denne opgave, og bevar de eksisterende forbindelser og budgettet på 0 kr."
```

### File: `assets/icon.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
