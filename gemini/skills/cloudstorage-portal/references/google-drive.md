# Skill: google-drive

- Plugin: `cloudstorage-portal` (0.9.14)
- Source: `plugins/cloudstorage-portal/skills/google-drive/SKILL.md`

> Use connected Google Drive as the single entrypoint for Drive, Docs, Sheets, and Slides work. Use when the user wants to find, fetch, organize, share, export, copy, or delete Drive files, or summarize and edit Google Docs, Google Sheets, and Google Slides through one unified Google Drive plugin.

## Instructions

### Google Drive

Use this as the top-level router for Google file work inside the unified Google Drive plugin. Do not route the user toward separate Google Docs, Google Sheets, or Google Slides plugins.

Start with Google Drive for file discovery and file lifecycle tasks, then route to narrower sibling skills only when the task becomes specific to Docs, Sheets, or Slides.

#### Workflow

1. Ground the target file first.
- If the user did not provide an exact file URL or ID, use Google Drive search, recent files, folder listing, or metadata reads to identify the right file.
- If the request starts as "find X and then update it," do the Drive discovery step first instead of guessing the target.

2. Stay in the base Google Drive workflow for Drive-native tasks.
- Use the base workflow for search, fetch, recent files, folders, sharing, copying, deleting, exporting, revision history, file moves, and other file-lifecycle work that is not primarily about editing Docs, Sheets, or Slides content.
- For version-history requests, including "previous version," "revision history," "what changed since the last version," or "compare to the prior revision," ground the file, fetch the current content, use `list_file_revisions`, fetch the immediately previous revision or the user-named revision with `fetch_file_revision`, then compare the fetched revision against the current content. Do not say previous versions are unsupported until you have checked whether revision tools are available for the target file.
- For file move requests, ground the source file and target folder, read the file metadata including its current parents, then use `update_file` with `addParents` for the target folder and `removeParents` for only the verified source parent or parents that should no longer contain it. Preserve unrelated parents, and verify the move by reading metadata or listing the target folder before the final response.
- Before any export or raw-file fetch, read or reuse Drive metadata so the MIME type and Google Drive URL are known. Use `export_file` only to convert a native Google Doc, Sheet, or Slide into an explicitly requested format; it returns an authenticated file reference, not inline bytes or base64. Google limits `files.export` responses to **10 MB**; oversized exports fail rather than returning truncated content. For a larger native PDF, use `download_file(id=file_id, mime_type="application/pdf")` when the streaming action is available. It calls Google's `files.download` API and returns a top-level materializable `file_uri`. Once `download_file` is unavailable and canonical `fetch` uses that streamed download path, use `fetch(url=google_drive_url, download_raw_file=True, raw_export_mime_type="application/pdf")` instead. A native-file `fetch` that still uses `files.export` cannot bypass the 10 MB limit. For PDFs, images, ZIPs, Office files, recordings, and other stored, non-native files, use `fetch(url=google_drive_url, download_raw_file=True)`. Use only the authenticated top-level `file_uri` or materialized `workspace_path`; never request inline base64 unless an existing caller explicitly opts into bounded legacy compatibility. Use `fetch` without `download_raw_file` for bounded, best-effort readable text. Do not retry `export_file` after metadata shows a non-native MIME type.

3. Route to the narrowest sibling skill that matches the file type and job.
- Drive, Docs, Sheets, or Slides comment creation, comment replies, comment resolution, or review-by-comments: use [google-drive-comments](../google-drive-comments/SKILL.md).
- Google Docs net-new creation, content summary, revision planning, prose rewriting, or section edits: use [google-docs](../google-docs/SKILL.md).
- Google Sheets creation, local spreadsheet import, range inspection, table cleanup, data restructuring, formula design or repair, chart creation or repair, or batch updates: use [google-sheets](../google-sheets/SKILL.md).
- Google Slides deck summary, content edits, new deck creation, local presentation import, visual cleanup, structural repair, or template migration: use [google-slides](../google-slides/SKILL.md).

#### Routing Rules

- If the request is ambiguous between Drive and a file-type surface, use the artifact itself as the tie-breaker:
  - Doc -> Docs skill
  - Sheet -> Sheets skill
  - Deck -> Slides skill
- If the user wants to find a file and then edit it, do both in one flow: Drive for discovery, then the file-type skill for the edit.
- If the user wants a Google Workspace outcome but has not named a file type yet, start with Drive discovery instead of asking them to choose among separate Google plugins.
- If the user asks to create a new Google Doc, route to the Docs skill; it owns the mandatory local `.docx` -> native Google Docs import workflow and the explicit-user-override boundary. Do not create a blank Google Doc directly from this router.
- If the user asks to import a local `.docx` into Google Docs, route to the Docs skill and use its native conversion workflow. Preserve the source file type only when the user explicitly asks for that.
- If the user asks to create a new Google Sheet, route to the Sheets skill. The Sheets skill should prefer the `[@spreadsheets](plugin://spreadsheets@openai-primary-runtime)` plugin or `$Excel` skill to create a local `.xlsx`, then import it as native Google Sheets.
- If the user asks to import a local `.xlsx`, `.xls`, `.ods`, `.csv`, or `.tsv` into Google Sheets, route to the Sheets skill and use native Google Sheets conversion by default. Preserve the source file type only when the user explicitly asks for that.
- If the user asks to create a new Google Slides deck, route to the Slides skill; it owns the mandatory local `.pptx` -> native Google Slides import workflow and the explicit-user-override boundary. Do not create a blank Google Slides deck directly from this router.
- If the user asks to import a local `.ppt`, `.pptx`, or `.odp` into Google Slides, route to the Slides skill and use its native conversion workflow. Preserve the source file type only when the user explicitly asks for that.
- If the user asks to export or download an existing Drive file, choose the action from metadata: native Google Docs, Sheets, and Slides files use `export_file` for explicit conversions within Google's **10 MB** limit. For a larger native PDF, prefer the currently available streaming `download_file(id=file_id, mime_type="application/pdf")`; after canonical `fetch` adopts the same streamed download path and `download_file` is removed, use `fetch(url=google_drive_url, download_raw_file=True, raw_export_mime_type="application/pdf")`. Stored, non-native PDFs, images, ZIPs, CSVs, Office files, audio, and video use `fetch(url=google_drive_url, download_raw_file=True)`. Use the returned top-level `file_uri` or its authenticated, materialized `workspace_path`; do not expose inline binary, base64, or a bearer URL. Base64 is available only when an existing compatibility caller explicitly requests the bounded legacy behavior.

#### Write Safety

- Preserve the user's existing file organization, sharing state, and target artifact unless the request clearly asks to change them.
- When a task can be satisfied by a file-level Drive operation alone, do not load heavier Docs, Sheets, or Slides skills.
- For write-heavy Sheets or Slides work, read the specialized skill before the first large update so request shapes stay grounded.
- For any file import or explicit direct create that returns a user-facing Google Workspace link, wait for the write action to complete and verify the created file with connector readback or Drive metadata readback before returning the URL. Use only a URL or id observed from the completed connector result or readback; never synthesize or predict the URL.

#### Related Skills

- Comments: [google-drive-comments](../google-drive-comments/SKILL.md)
- Docs: [google-docs](../google-docs/SKILL.md)
- Sheets: [google-sheets](../google-sheets/SKILL.md)
- Slides: [google-slides](../google-slides/SKILL.md)

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Google Drive"
  short_description: "One entrypoint for Drive, Docs, Sheets, and Slides"
  icon_small: "./assets/google-drive-small.svg"
  icon_large: "./assets/google-drive.png"
  brand_color: "#0F9D58"
  default_prompt: "Use $google-drive to find the right Drive file, then summarize a Doc, update a Sheet, or edit a Slides deck through the unified Google Drive workflow, including refreshing linked charts or replacing static chart content from an existing connected source such as Google Sheets."
```

### File: `references/slides/chart-refresh-workflows.md`

#### Chart Refresh And Replacement Workflows

Use this guidance when the user asks to refresh, update, replace, or repair a chart in Google Slides.

##### 1. Read chart slides structurally, not text-only

- Do not rely on `get_presentation_text` alone for chart workflows. Text-only deck reads can drop chart-only page elements and hide the object you need to act on.
- Start with `get_presentation` for deck-wide context and `get_slide` for the target slide before any write.
- Use `get_slide_thumbnail` when the request depends on whether the visual chart itself changed.

##### 2. Distinguish linked charts from static content

- Look for a linked chart element first. The target slide may expose a chart-bearing page element with linked chart metadata such as a source workbook reference, chart ID, or source spreadsheet ID.
- If the slide has a linked chart, treat it as refreshable in place.
- If the slide only has an image, generic shape, or other static content and no linked chart metadata, do not pretend it can be refreshed in place. That is a chart replacement workflow, not a linked-chart refresh.

##### 3. Reuse existing source charts before creating new ones

- If the user provided or implied a connected source, such as a Google Sheet, inspect that source for existing charts before creating any temporary charts.
- When the source already contains named or obviously matching charts, reuse those existing charts as the source graphics.
- Only create a new source chart when no suitable source chart exists or when the user explicitly asked for a new chart design.
- Do not turn a Slides static-content replacement task into a source-chart authoring task unless the missing source chart forces that extra step.

##### 4. For linked charts, stay in Slides and use raw batch updates

- When the slide already contains a linked chart, use raw `batch_update` with the chart refresh request on the live chart object ID.
- Refresh the chart object first, then make any nearby title or annotation edits as separate text changes if needed.
- After the write, verify that the chart-bearing slide changed, not just the text around it.
- If the refresh also changes surrounding visible layout or styling, follow [visual-change-loop](./visual-change-loop.md) instead of stopping at a single verification.

##### 5. For shape placeholders, replace the placeholder with a chart graphic

- If the slide contains an obvious chart placeholder shape, replace that placeholder with the chart graphic rather than leaving the placeholder underneath or beside the new chart.
- Preserve the intended chart-area footprint so the surrounding layout stays intact.
- If the user does not require persistent linking, prefer a non-linked chart insertion path when it keeps the visible result simpler.
- If the slide also contains helper text that only exists to label the placeholder area, remove or rewrite that text as part of the replacement so the slide no longer looks like a fixture.

##### 6. For static chart content, replace the image in place

- If the chart area is static chart content, preserve the approximate position and size of the existing image.
- Replace the old chart image rather than stacking a second chart on top of it.
- If the image is clearly stale or explicitly marked as replaceable static content, do not report success until the old graphic is gone and the new one occupies the intended area.
- If the replacement leaves visible residue, spacing drift, or chart-area cleanup work, switch to [visual-change-loop](./visual-change-loop.md) and do not stop before the third verified review.

##### 7. If no source chart exists, be explicit about the extra step

- If the slide lacks a linked chart and the connected source lacks a suitable source chart, say that the source chart must be created or identified before the Slides replacement can be completed.
- If you create a new source chart because none existed, say so explicitly instead of describing the result as if the existing chart was merely refreshed.

##### 8. Verification standard

- A chart refresh or replacement is only complete when the chart slide was re-read after the write and the visual result was checked with a thumbnail when the image itself matters.
- Do not claim success just because the write call succeeded or because adjacent chart labels changed.
- When thumbnail responses include an `image_asset_pointer`, image content part, or other rendered image artifact, inspect that returned image directly.
- If the thumbnail response only exposes a thumbnail URL or `contentUrl`, curl the rendered image to a local PNG, for example `curl -L "$contentUrl" -o /tmp/slides-thumb-<slide-id>.png`, and inspect that local image before claiming the chart visual was verified.
- After chart or layout edits, fetch a fresh thumbnail and re-curl any URL-backed thumbnail to a new local PNG before final success.
- When the refresh or replacement changed visible layout, placeholder cleanup, or nearby styling, follow [visual-change-loop](./visual-change-loop.md) and keep the review loop going through the third fresh visual pass.
- Verify both of these things before declaring success:
  - the chart graphic itself now matches the intended source chart
  - obsolete placeholder or instructional text is no longer visible unless the user asked to keep it

### File: `references/slides/deck-scope-verification.md`

#### Deck Scope Verification

Use this guidance whenever the task reads, edits, migrates, translates, or structurally updates more than one slide.

##### 1. Build the authoritative slide checklist first

- Use `get_presentation` or `get_presentation_text` to capture every slide in scope in order before the first write.
- Record the ordered slide numbers, slide object IDs, and a short title or role for each slide.
- Do not infer coverage from object ID numbering. Google Slides IDs can skip values, and a missing numeric pattern does not mean the slide is absent.
- If a deck read is truncated or incomplete, re-read narrower spans until the full in-scope checklist is explicit.

##### 2. Edit in bounded spans

- Work in one explicit slide or one small contiguous span at a time.
- State the first and last slide in the current span before writing.
- Do not start the next span until the current span has been verified.

##### 3. Verify every span before advancing

- Re-read the edited slide or edited span immediately after the write.
- Confirm the intended change landed on the last slide in the span, not just the first one. This catches skipped middle or trailing slides.
- If a slide in scope is still unchanged, untranslated, unmigrated, or structurally stale, fix it before moving on.
- When the task depends on visual structure, pair the post-write read with thumbnails.

##### 4. Reconcile the deck before calling it done

- Compare the final deck state against the checklist from step 1.
- Confirm that no slide in scope was skipped, duplicated, or left in a mixed old/new state.
- For transformed-copy workflows, confirm the source deck stayed unchanged and the copied deck contains the full requested coverage.

### File: `references/slides/sheets-chart-replacement.md`

#### Sheets Chart Replacement

Use this reference when a Google Slides workflow needs to replace a screenshot, placeholder image, or stale chart graphic with a chart sourced from an existing Google Sheets workbook.

##### Use When

- The user names both a spreadsheet and a presentation.
- The source chart already exists in Google Sheets and should be reused.
- The slide currently contains a screenshot, placeholder image, or other static chart content in the chart area.
- The user may also want a few narrow data edits before generating the refreshed chart graphic.

##### Workflow

1. Ground both artifacts first.
- Search for the spreadsheet and presentation when the user gives titles instead of URLs.
- Read spreadsheet metadata to confirm the target chart titles and `chartId` values before writing.
- Read the presentation and target slides to capture slide numbers, titles, object IDs, and current chart-area elements.

2. Keep spreadsheet edits narrow when they are part of the request.
- Prefer exact cell updates on existing rows instead of table rewrites.
- Avoid KPI, headline summary, or rollup cells unless the user explicitly asks to change them.
- Do not add rows, remove rows, or create temporary charts unless the named chart is missing.
- Read back the changed ranges before touching Slides.

3. Capture the placeholder footprint from the live slide.
- Use `get_slide` to find the current screenshot, image, or placeholder object in the chart area.
- Reuse that element's size and transform as the starting footprint for the replacement chart.
- Use `get_slide_thumbnail` to check whether any separate instructional or placeholder text near the chart area also needs removal.

4. Replace the placeholder with the existing Sheets chart.
- Prefer `createSheetsChart` with the existing `spreadsheetId` and `chartId` from the workbook.
- Use `linkingMode: NOT_LINKED_IMAGE` when the user only needs a refreshed graphic and does not need the slide to stay linked to Sheets.
- Use `linkingMode: LINKED` only when the user explicitly wants ongoing chart linkage.
- Delete the obsolete screenshot or placeholder image once the replacement target is grounded.
- Preserve slide order, titles, nearby copy, and unrelated page elements.

5. Clean up chart-area residue.
- Remove separate placeholder or instructional text objects associated with the chart area when they are clearly obsolete.
- Do not delete slide titles, KPI summary content, or other non-chart text unless the user asked for that change.

6. Verify slide by slide.
- After each replacement, fetch a fresh thumbnail and refreshed slide structure.
- Expect Google Slides to normalize inserted chart size or aspect slightly; judge success by approximate footprint and visual cleanliness, not exact raw transform equality.
- Confirm the new chart object exists and the old placeholder image is gone before moving on.
- If the replacement changed visible chart-area layout, cleanup, or styling, continue with [visual-change-loop](./visual-change-loop.md) and do not stop before the third fresh visual review of that slide.

7. Report exact outcomes.
- Exact spreadsheet ranges changed.
- Old and new values for each edited data cell.
- Slide numbers updated.
- Replacement success per chart.
- Whether any placeholder text remained.

##### Failure Policy

- If the named chart is missing, then and only then consider creating a replacement chart.
- If the replacement introduces a layout problem, switch to [visual-change-loop](./visual-change-loop.md) and adjust only the affected slide.

### File: `references/slides/visual-change-loop.md`

#### Visual Change Loop

Use this recipe whenever a Slides write can change anything the user will see, even if the request started as a content update instead of a formatting cleanup.

##### Use When

- A `batch_update` can change text flow, geometry, spacing, alignment, fills, borders, connector strokes, arrow direction, accent bars, chart placement, or other rendered styling.
- The task updates both text and nearby non-text elements such as arrows, bars, borders, or icons.
- A write is supposed to preserve the current layout, but the visible result could still drift because text reflow, shape replacement, or geometry changes are involved.

##### Loop

1. Ground the slide before the first write.
- Read the current slide structure with live object IDs.
- Identify the full local edit cluster, not just the most obvious text box.
- For metric cards or scorecards, treat the main value, target value, delta text, arrow, accent bar, and nearby border or connector as one cluster.
- If two adjacent text boxes are colliding, wrapping into each other, or visually fighting for the same lane, treat them as one cluster and fix their geometry together.
- For overflow or collision-sensitive work, use both signals from the start: the slide thumbnail for rendered appearance and the live slide structure for text-box geometry and neighboring object placement.

2. Start with a thumbnail.
- Fetch a `LARGE` thumbnail when spacing, clipping, or shape alignment matters.
- Inspect the image returned by `get_slide_thumbnail` directly. That may appear as an `image_asset_pointer`, an image content part, or another rendered image artifact in the tool response; do not require base64 bytes before starting visual review.
- If the thumbnail response only provides a thumbnail URL or `contentUrl`, save the rendered image locally with `curl -L "$contentUrl" -o /tmp/slides-thumb-<slide-id>.png` before visual review.
- Use the returned image artifact or the saved local PNG as the visual source of truth for overlap, clipping, padding, footer collisions, text rendering, and shape alignment.
- Use that thumbnail as the primary visual signal, but not as the only signal for overflow or collision checks.
- Write down the 2-4 concrete visible issues you are fixing in the next pass.

3. Choose the correct raw edit family.
- Use text requests for text content.
- Use `updateShapeProperties` for fills and borders on existing shapes.
- Use `updateLineProperties` for connector or line strokes.
- If the element is the wrong shape type, or too broken to patch safely, delete and recreate it in the same footprint.
- Do not call an element blocked until you have classified it as a shape, line or connector, or image.
- When moving or creating a text box, remember Slides transforms are upper-left-based. Do not aim a new text box at another object's center without converting that desired center into the new box's top-left corner.

4. Make one coherent write pass.
- Batch the related fixes for that local issue cluster together.
- Include `write_control` when a fresh revision token is available.
- Prefer geometry and styling fixes that materially improve the slide over tiny nudges that leave obvious problems behind.
- When two neighboring text boxes collide, prefer resizing, repositioning, or redistributing both boxes before shrinking the text. Do not "fix" one box while leaving the adjacent one still cramped.
- Do not stop at "technically updated." The target is a slide that looks intentionally arranged and presentation-ready, not merely one with fewer defects than before.

5. Verify immediately.
- Fetch another thumbnail right after the write.
- If the fresh thumbnail is URL-backed, curl it to a new local PNG and inspect that new file before declaring the pass verified.
- Confirm both text and non-text visual targets actually changed.
- Re-read the live slide structure after the write when text boxes, wrapping, or neighboring layout relationships were in scope.
- If the write fixed the main text but left stale bars, arrows, borders, wrapping, or collisions, the slide is not done.
- If text from one box still overlaps, crowds, or visually crashes into text from an adjacent box, the slide is not done.
- If a new small label looks one line low, visually offset, or miscentered relative to its neighbors, the slide is not done. Re-read the slide and tighten the text box geometry before moving on.
- If the thumbnail looks cleaner but the refreshed slide structure still suggests narrow, colliding, or suspiciously adjacent text boxes, err on the side of caution and keep working the slide.

6. Run a second and third fresh review loop.
- Start each additional loop from a fresh thumbnail review, not from memory.
- Re-read the live slide structure before any additional pass.
- Run at least 3 full write-and-verify loops whenever this recipe is triggered, even if pass 1 or pass 2 already looks acceptable.
- Do not call the slide done after pass 2, even if it looks close.
- Treat pass 2 as an alignment-and-spacing pass, not a victory lap.
- Treat pass 3 as a polish pass: look for anything that still feels slightly off, uneven, cramped, weakly grouped, or visually unbalanced, even if the slide is already functional.
- Only stop after the third fresh review finds nothing materially worth changing.

##### Mini Example

- Pass 1: fix the obvious issue cluster, such as clipped text, stale styling, or objects that collide.
- Pass 2: normalize the structure, such as aligning sibling cards, equalizing spacing, or separating rows that still crowd each other.
- Pass 3: polish the slide so it feels deliberate, such as strengthening hierarchy, softening secondary text, or balancing whitespace after the functional fixes are already done.

##### Stop Or Escalate

- Stop when the third fresh review finds no meaningful remaining issue.
- Continue to a fourth loop only if the slide still has visible defects after the third review.
- Use the Google Slides structural repair guidance when repeated passes still cannot cleanly fix the structure or when the same defect repeats across multiple slides.

### Not embedded

- `assets/app-icon.png` (binary asset, not embedded)
- `assets/google-drive-small.svg` (binary asset, not embedded)
- `assets/google-drive.png` (binary asset, not embedded)
- `assets/google-drive.svg` (binary asset, not embedded)
