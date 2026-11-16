---
name: devsuite-convert
description: "Use for authorized file conversion through free/included CloudConvert or installed local tools, with verified output and no added charges."
---

# Convert files with a verified route

Read [the policy](../../references/policy.md) and [conversion operations](../../references/conversion.md). Identify sources, target formats, quality/layout/page/codec constraints, destination, overwrite rules and sensitivity. Inspect metadata and preserve originals. Discover real CloudConvert tools/schemas rather than inventing endpoints. Verified App binding: `asdk_app_6a5767a72d2881919c2f45a7d6206298`. Metadata proves neither authentication nor free quota.

Choose a suitable installed local converter or connected CloudConvert when transfer is authorized and included at 0 kr. Verify quota/cost before submission; unknown or positive cost blocks it. Never add API keys, OAuth apps, trials, billing or upgrades. If unavailable, name missing route and continue safe metadata/planning work.

`python scripts/devsuite.py conversion-plan request.json` creates a no-upload plan; it does not convert. Submit with actual provider schema, retain job/task IDs, inspect terminal state and handle failure/cancellation before retrying. After uncertain responses check the original job to prevent duplicates. Download/export through the authorized route to a new destination and inspect actual format, pages/dimensions/duration/content. Tool success alone does not prove correct conversion. Report settings, output path, real job state, checks and gaps; preserve per-item batch states.
