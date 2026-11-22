# Skill: modern-web

- Plugin: `plugin-skill-studio` (0.8.0)
- Source: `plugins/plugin-skill-studio/skills/modern-web/SKILL.md`

> Use when building or reviewing Studio HTML reports, responsive tables, accessibility, CSS or client-side browser behavior.

## Instructions

### Modern Web Guidance

Read [Studio policy](_plugin-references.md#file-referencesstudio-policymd) and [the local web checklist](_plugin-references.md#file-referencesmodern-web-checklistmd). This is an independently authored local workflow informed by the user's modern-web-guidance source. It does not require npx or an external skill.

1. Identify the specific browser behavior and supported surfaces before changing UI. For server-side scripts or packaging, use the engineering workflow instead.
2. Use semantic HTML, labelled controls, ordered headings, adequate contrast and keyboard-operable scrolling. Retain table headers and captions on narrow screens.
3. Render untrusted skill names, findings, URLs and excerpts as escaped text. Do not execute fetched markup, inline handlers or source scripts. Report HTML is script-free by default.
4. Verify new browser features with current primary documentation when needed. Use supported behavior or a small progressive fallback; do not add libraries or experimental APIs without a demonstrated requirement.
5. Test hostile content, long text, a narrow viewport and keyboard access. Record which checks were performed and which browser behavior remains unverified.

The original local guide corpus was inspected for research and provenance; its implementation/text is not a runtime dependency or copied into this package because a redistribution license was not established.

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  icon_small: "./assets/wrp-icon-128.png"
  icon_large: "./assets/wrp-icon-256.png"
  display_name: "Modern Web"
  short_description: "Review accessible, responsive and safe web reports"
```

### File: `assets/wrp-icon-128.png`

_Binary asset, not embedded._

### File: `assets/wrp-icon-256.png`

_Binary asset, not embedded._
