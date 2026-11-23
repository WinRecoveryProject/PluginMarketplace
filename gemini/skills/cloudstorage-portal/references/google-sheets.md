# Skill: google-sheets

- Plugin: `cloudstorage-portal` (0.9.15)
- Source: `plugins/cloudstorage-portal/skills/google-sheets/SKILL.md`

> Analyze and edit connected Google Sheets with range precision. Use when the user wants to create Google Sheets, find a spreadsheet, inspect tabs or ranges, search rows, plan formulas, create or repair charts, clean or restructure tables, write concise summaries, or make explicit cell-range updates.

## Instructions

### Google Sheets

Use this skill to keep spreadsheet work grounded in the exact spreadsheet, sheet, range, headers, and formulas that matter.

#### Purpose Of This File

This file covers:

1. routing to the right spreadsheet workflow
2. stateful operation and mandatory routing to reference files
3. live-read/search safety for direct connector calls
4. final-response citations and delivery

Detailed editing, formula, chart, upload, live-read/search, and batch-update rules live in `references/`.
Latency is not a constraint for this skill, so always read the relevant reference files before performing the task.
If the user has not provided explicit style direction, read `references/style-profiles.md` and apply the appropriate Google Sheets destination default before authoring workbook formatting.

#### Default Routing

1. New Google Sheet from a native Google Sheets reference or template URL: copy the entire source workbook with the Drive file-copy action, then trim or repair the copy. Treat a deep-linked `gid` as the initial view, not copy scope. Duplicate one source sheet only when the user explicitly requests a single-sheet extraction. Do not rebuild through `.xlsx` when chips, validation, formulas, rich links, or formatting matter.
2. Other new Google Sheets creation: Inspect the available skills and plugins for the registered `Spreadsheets` capability. It may be exposed as the `$Spreadsheets` skill, the `@Spreadsheets` plugin, or the plugin URI `plugin://spreadsheets@openai-primary-runtime`. If found, load and follow its instructions.
   - If a system spreadsheet plugin or skill is installed, YOU MUST use it to create a local `.xlsx`. Then import the `.xlsx` into Drive as a native Google Sheets spreadsheet. For table-like option/list/dropdown columns, seed a valid row and add native table `DROPDOWN` columns post-import.
   - If neither skill is installed, create the spreadsheet directly with Google Sheets MCP.
3. Existing Google Sheets edits: use Google Sheets MCP directly.

Deliver the verified native Google Sheet. Never include the local `.xlsx` unless explicitly asked for by the user.

#### File Safety

Treat a provided Google Sheet as read-only unless the user explicitly asks to edit that file. When a task uses the Sheet as a reference, template, similar structure, or data source, copy it or create a separate Sheet, then verify the output spreadsheet ID differs before writing.

#### Canonical Workflow Bias

Prefer one simple proven workflow over a large tree of recovery branches.
When a task matches a known successful pattern, follow that pattern directly instead of re-evaluating every possible fallback path.
Do not let accumulated edge-case guardrails turn a straightforward Sheets task into a long blocker-analysis exercise.

For sheet creation and editing tasks, prefer this sequence when viable:

1. Gather the required source material.
2. Pick the correct default routing.
3. Establish the sheet checklist or sheet plan.
4. Build or edit the sheet.
5. Verify the sheet is clean, complete, native, and scannable per `references/reference-visual-quality.md`.
6. Stop once the verified workflow has succeeded.

If a simple verified workflow is viable, use it. Do not drift into speculative alternate paths.

#### Required Read Order (No Skips)

For every route that creates, imports, or edits a Google Sheet, read `references/reference-visual-quality.md` before final verification.

If Default Routing uses native Google Sheets reference-follow creation:
1. Read `references/reference-edit-workflow.md`
2. Read `references/reference-live-read-search-safety.md`
3. Read `references/reference-native-cell-structure.md`
4. Read `references/reference-batch-update-recipes.md`

If Default Routing uses the system spreadsheet plugin or skill like `[@spreadsheets](plugin://spreadsheets@openai-primary-runtime)` or `$Spreadsheets`:
1. Read the plugin/skill, e.g. `[@spreadsheets](plugin://spreadsheets@openai-primary-runtime)`
2. Read `references/reference-import-spreadsheet-to-native-sheets.md`
3. If the new Sheet has explicit or reference-derived option/list/dropdown columns, read `references/reference-batch-update-recipes.md` before the post-import table batch update.

If Default Routing uses connector edit workflow:

1. Read `references/reference-edit-workflow.md`.
2. Before any direct live range read, cell read, or `search_spreadsheet_rows`, read `references/reference-live-read-search-safety.md`.
3. Read every task-specific file from the matrix below.
4. If the task spans multiple categories, read all matching files.
5. If uncertain, read every file in `references/`.

#### Final Answer Requirement

Unless Default Routing selected native Google Sheets reference-follow creation, if the registered `Spreadsheets` capability like the `[@spreadsheets](plugin://spreadsheets@openai-primary-runtime)` plugin is available, you MUST use one of them to create a local `.xlsx` and import it to Google Drive with `upload_mode: "native_google_sheets"`.

##### Final Response Citations

- **Create/edit:** for created or edited spreadsheets, cite each final deliverable exactly once with `purpose="output"`, in its own paragraph. Briefly describe the result without repeating its filename, path, or link. Never put output directives inside prose or list items.
- **Q&A and summaries:** Every file whose contents you summarize or use to support an answer MUST receive a `:codex-file-citation{...}` with `purpose="source"` in the final response. Use the source citation in place of the filename, wherever the filename would appear. Do not write the filename separately and append its citation at the end. Files merely inspected but not used in the answer need no citation. Do not emit output citations for unchanged files or read-only answers.

- Emit `:codex-file-citation{...}` directly, without backticks, code fences, or a Markdown-link wrapper. Use verified targets only. No need to cite or reference intermediate work.

Deliver a native Google Sheets file even when another authoring workflow was used to build it, unless the user explicitly requests preservation of the source file type or no conversion. Set `path` to its verified native URL returned by the connector and omit `mode`. Citation directives are exempt from “Return web URLs as Markdown links.”

Some illustrative examples, real responses use verified targets outside code fences.

```text
:codex-file-citation{path="https://docs.google.com/spreadsheets/d/<verified-file-id>" purpose="output"}
```

```text
The review of :codex-file-citation{path="https://docs.google.com/spreadsheets/d/<verified-file-id>" purpose="source"} is due Friday.
```

##### Spreadsheets location

Use/create `ChatGPT` at My Drive root. Place new spreadsheets created from scratch or from a template there.
Edit existing spreadsheets in place.

Respect user-specified locations.

#### Connector Load Checklist

1. Confirm the exact target Google Sheet URL or spreadsheet id before editing an existing spreadsheet.
2. If the user only gives a title or title keywords, use the connector/app search path to identify candidate spreadsheets before asking for a URL.
3. Resolve and record the spreadsheet id, target sheet names, and `sheetId` values.
4. Read spreadsheet metadata before deeper reads or writes.
5. For direct live range reads, cell reads, or `search_spreadsheet_rows`, use exact visible tab names from metadata, bounded ranges, and the recovery rules in `references/reference-live-read-search-safety.md`. Do not guess `Sheet1`, scan whole grids, or retry oversized row searches.
6. Before each edit pass, identify the exact sheet, range, headers, formulas, and validation constraints being edited through connector reads.
7. Re-read target cells before writing when live values, formulas, formatting, or validation could affect the write.

#### Task To Reference Map

| Task area | Required reference file |
| --- | --- |
| Existing spreadsheet edit workflow, grounding, validation-backed cells, output conventions, and write planning | `references/reference-edit-workflow.md` |
| Direct live range reads, cell reads, row searches, tab/range recovery, and oversized search avoidance | `references/reference-live-read-search-safety.md` |
| Adding or inserting rows or columns beside populated data while preserving validation, chips, formulas, and formatting | `references/reference-native-cell-structure.md` |
| Reference/template following from a provided Google Sheet | `references/reference-native-cell-structure.md` |
| Raw Sheets write shapes and example `batch_update` bodies | `references/reference-batch-update-recipes.md` |
| Importing a local spreadsheet and upgrading intended tables to native Sheets tables | `references/reference-import-spreadsheet-to-native-sheets.md` |
| Formula design, repair, rollout, or syntax refresh | `references/reference-formula-patterns.md` |
| Chart creation, repair, chart-spec recall, or repositioning | `references/reference-chart-recipes.md` |
| Unspecified styling for native Google Sheets destinations | `references/style-profiles.md` |

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Google Sheets"
  short_description: "Find sheets, inspect ranges, and plan batch updates"
  icon_small: "./assets/google-sheets-small.svg"
  icon_large: "./assets/google-sheets.png"
  brand_color: "#0F9D58"
  default_prompt: "Use $google-sheets to find the right spreadsheet, inspect a range, search rows, or plan an exact batch_update."
```

### File: `assets/google-sheets-small.svg`

_Binary asset, not embedded._

### File: `assets/google-sheets.png`

_Binary asset, not embedded._

### File: `references/reference-batch-update-recipes.md`

#### Batch Update Recipes

Use these patterns as copy-and-fill templates. The goal is request-shape recall, not a second copy of the Sheets docs.

##### Rules

- Each request object must set exactly one request type key.
- Use exact Google field names and structured objects instead of stringified JSON.
- Prefer higher-level spreadsheet authoring or adapter-generated connector arguments when available. Hand-author raw `batch_update_spreadsheet` requests only after reading this reference and grounding metadata.
- Use exact Sheets request keys and fields from the Sheets API. Do not borrow Docs, Slides, or values API fields for `spreadsheets.batchUpdate`.
- Prefer `sheetId` from `get_spreadsheet_metadata` when building `GridRange`, `GridCoordinate`, or `DimensionRange`.
- For `GridRange`, row and column indexes are zero-based, start-inclusive, and end-exclusive.
- For update-style requests, set a precise `fields` mask. Do not include the root object name in the mask.
- For destructive or index-sensitive requests, re-read target metadata and ranges immediately before building the request. Do not reuse stale row, column, sheet, or table indexes after prior edits.
- Before sending a hand-authored batch, preflight that every request object has one key, no request is an empty object or JSON string, no request uses A1 notation inside `GridRange`, and no `rows` entry writes beyond the declared range.
- Ensure each `updateCells.range` height equals `rows.length` and its width equals every `values.length`.
- Keep batches logically clustered. Group edits that should succeed or fail together, but do not mix unrelated table rewrites, formatting passes, and structure changes into one mega-batch.

##### Coordinate Templates

Use these shapes repeatedly:

```json
{
  "sheetId": 123456789,
  "startRowIndex": 0,
  "endRowIndex": 10,
  "startColumnIndex": 0,
  "endColumnIndex": 4
}
```

`GridRange` for rectangular regions.

```json
{
  "sheetId": 123456789,
  "rowIndex": 0,
  "columnIndex": 0
}
```

`GridCoordinate` for a single starting cell.

```json
{
  "sheetId": 123456789,
  "dimension": "ROWS",
  "startIndex": 1,
  "endIndex": 4
}
```

`DimensionRange` for whole rows or columns.

##### High-Signal Request Families

Reach for these first:

- Content and formulas: `updateCells`, `appendCells`, `repeatCell`, `copyPaste`, `autoFill`
- Row and column layout: `insertDimension`, `deleteDimension`, `moveDimension`, `updateDimensionProperties`, `autoResizeDimensions`
- Range operations: `sortRange`, `setBasicFilter`, `clearBasicFilter`, `deleteDuplicates`, `trimWhitespace`
- Native tables: `addTable`, `updateTable`, `deleteTable`
- Validation and protection: `setDataValidation`, `addProtectedRange`, `updateProtectedRange`, `deleteProtectedRange`
- Sheet structure: `addSheet`, `deleteSheet`, `duplicateSheet`, `updateSheetProperties`

For the full request catalog, use the official reference linked below.

##### Native Dropdown Chips In New Sheets

For table-like ranges with explicit or reference-derived finite option/list/dropdown columns, use a native table. Table `DROPDOWN` columns render selected values as chips; `setDataValidation` alone does not.

Reference-following: add or rebuild tables only when needed. Preserve copied native tables with colored dropdown chips; repair their range with `updateTable` instead of recreating them. The table rule exposes no option-color field, so `addTable` cannot reconstruct source colors.

Rules:
- Use `DATE` for dates, `DROPDOWN` plus `ONE_OF_LIST` for finite choices, and `TEXT` otherwise. Do not send unsupported `NUMBER`.
- Seed valid selected dropdown values unless the user asks for a blank template.
- Before final answer, verify `tables[].range` covers every used row/column, column names/types/options, selected values, source option colors when present, and chip visuals. Grid `rowCount`/`columnCount` is not table coverage; end indexes are exclusive (`A:O` needs `endColumnIndex: 15`). If metadata omits `tables[]`, use the probe below.

Range-only table repair shape:

```json
{
  "updateTable": {
    "table": {
      "tableId": "abc123",
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 0,
        "endRowIndex": 26,
        "startColumnIndex": 0,
        "endColumnIndex": 15
      }
    },
    "fields": "range"
  }
}
```

Minimal `addTable` dropdown shape. For table-column `dataValidationRule`, send `condition` only; omit `strict`, `showCustomUi`, `displayStyle`, and `dropdownStyle`.

`"columnType"` options are: `DOUBLE`, `CURRENCY`, `PERCENT`, `DATE`, `TIME`, `DATE_TIME`, `TEXT`, `BOOLEAN`, `DROPDOWN`, `FILES_CHIP`, `PEOPLE_CHIP`, `FINANCE_CHIP`, `PLACE_CHIP`, and `RATINGS_CHIP`.

```json
{
  "addTable": {
    "table": {
      "name": "EntriesTable",
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 0,
        "endRowIndex": 2,
        "startColumnIndex": 0,
        "endColumnIndex": 2
      },
      "columnProperties": [
        {
          "columnIndex": 0,
          "columnName": "Name",
          "columnType": "TEXT"
        },
        {
          "columnIndex": 1,
          "columnName": "Rating",
          "columnType": "DROPDOWN",
          "dataValidationRule": {
            "condition": {
              "type": "ONE_OF_LIST",
              "values": [
                { "userEnteredValue": "good" },
                { "userEnteredValue": "bad" }
              ]
            }
          }
        }
      ]
    }
  }
}
```

Do not convert existing non-table sheets solely to change dropdown display style unless the user asked for a table.

Expose table metadata without changing cells:

```json
{
  "requests": [
    {
      "findReplace": {
        "find": "__no_match_table_probe__",
        "replacement": "__no_match_table_probe__",
        "allSheets": true
      }
    }
  ],
  "include_spreadsheet_in_response": true,
  "response_include_grid_data": false,
  "response_ranges": ["Tracker!A1:O37"]
}
```

Use the final used rectangle for `response_ranges`. A copied table only passes when `tables[].range` covers every used row and column; otherwise repair the table before finishing.

##### Write A Fixed Block Of Values Or Formulas

Use `updateCells` for a known rectangle. This is the most common raw write recipe.

```json
[
  {
    "updateCells": {
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 0,
        "endRowIndex": 2,
        "startColumnIndex": 0,
        "endColumnIndex": 2
      },
      "rows": [
        {
          "values": [
            { "userEnteredValue": { "stringValue": "Owner" } },
            { "userEnteredValue": { "stringValue": "Status" } }
          ]
        },
        {
          "values": [
            { "userEnteredValue": { "stringValue": "Alex" } },
            { "userEnteredValue": { "formulaValue": "=IF(B1=\"\",\"Missing\",\"Ready\")" } }
          ]
        }
      ],
      "fields": "userEnteredValue"
    }
  }
]
```

##### Format A Header Row And Freeze It

Use `repeatCell` for shared formatting across a range, then `updateSheetProperties` for sheet-level behavior.

```json
[
  {
    "repeatCell": {
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 0,
        "endRowIndex": 1
      },
      "cell": {
        "userEnteredFormat": {
          "backgroundColorStyle": {
            "rgbColor": {
              "red": 0.12,
              "green": 0.47,
              "blue": 0.71
            }
          },
          "textFormat": {
            "bold": true,
            "foregroundColorStyle": {
              "rgbColor": {
                "red": 1,
                "green": 1,
                "blue": 1
              }
            }
          }
        }
      },
      "fields": "userEnteredFormat(backgroundColorStyle,textFormat)"
    }
  },
  {
    "updateSheetProperties": {
      "properties": {
        "sheetId": 123456789,
        "gridProperties": {
          "frozenRowCount": 1
        }
      },
      "fields": "gridProperties.frozenRowCount"
    }
  }
]
```

##### Create A Native Sheets Table

When the user asks to create or add a table, or upgrade a range into a table, use a native Sheets table unless they explicitly request a plain range. After spreadsheet import, first use `./reference-import-spreadsheet-to-native-sheets.md` to confirm table intent and the exact populated range. `addTable` adds table metadata to existing cells; it does not write their values. Omit `tableId` so Sheets assigns it.

```json
[
  {
    "addTable": {
      "table": {
        "name": "ProjectTracker",
        "range": {
          "sheetId": 123456789,
          "startRowIndex": 0,
          "endRowIndex": 20,
          "startColumnIndex": 0,
          "endColumnIndex": 5
        }
      }
    }
  }
]
```

Before adding an imported table, if metadata omits banding, expose `updatedSpreadsheet.sheets[].bandedRanges` with `include_spreadsheet_in_response: true` and `{"updateSpreadsheetProperties":{"properties":{"title":"Existing title"},"fields":"title"}}`. Never guess the banding ID. Replace only an exact-range match, atomically:

```json
[
  { "deleteBanding": { "bandedRangeId": 123456789 } },
  {
    "addTable": {
      "table": {
        "name": "ProjectTracker",
        "range": {
          "sheetId": 123456789,
          "startRowIndex": 0,
          "endRowIndex": 20,
          "startColumnIndex": 0,
          "endColumnIndex": 5
        }
      }
    }
  }
]
```

##### Append New Rows

Use `appendCells` only when there is no existing row structure to preserve. Otherwise, use the native-row recipe.

```json
[
  {
    "appendCells": {
      "sheetId": 123456789,
      "rows": [
        {
          "values": [
            { "userEnteredValue": { "stringValue": "2026-03-13" } },
            { "userEnteredValue": { "numberValue": 42 } },
            { "userEnteredValue": { "stringValue": "complete" } }
          ]
        }
      ],
      "fields": "userEnteredValue"
    }
  }
]
```

##### Native-Row Recipe: Add Rows To A Populated Table

Read `./reference-native-cell-structure.md` first. This one-row fixture copies a complete exemplar, preserves D:F (shared Drive chip, relative formula, shared read-only link), and overwrites row-specific A:C in the same call. Repeat it with equal-height ranges and `rows` arrays for each verified chunk.

```json
[
  {
    "copyPaste": {
      "source": {
        "sheetId": 123456789,
        "startRowIndex": 1,
        "endRowIndex": 2,
        "startColumnIndex": 0,
        "endColumnIndex": 6
      },
      "destination": {
        "sheetId": 123456789,
        "startRowIndex": 20,
        "endRowIndex": 21,
        "startColumnIndex": 0,
        "endColumnIndex": 6
      },
      "pasteType": "PASTE_NORMAL",
      "pasteOrientation": "NORMAL"
    }
  },
  {
    "updateCells": {
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 20,
        "endRowIndex": 21,
        "startColumnIndex": 0,
        "endColumnIndex": 3
      },
      "rows": [
        {
          "values": [
            {
              "userEnteredValue": { "stringValue": "@" },
              "chipRuns": [
                {
                  "startIndex": 0,
                  "chip": {
                    "personProperties": {
                      "email": "alex@example.com",
                      "displayFormat": "DEFAULT"
                    }
                  }
                }
              ]
            },
            { "userEnteredValue": { "stringValue": "First task" } },
            { "userEnteredValue": { "stringValue": "todo" } }
          ]
        }
      ],
      "fields": "userEnteredValue,chipRuns"
    }
  }
]
```

When full copy is unsafe, use separate `PASTE_FORMAT`, `PASTE_DATA_VALIDATION`, and `PASTE_FORMULA` requests plus explicit writes.

##### Smart-Chip Shapes

A chip occupies an `@` placeholder. Write `userEnteredValue` and `chipRuns` together with `fields: "userEnteredValue,chipRuns"`; writing `userEnteredValue` alone erases `chipRuns`. `startIndex` is the placeholder's zero-based UTF-16 index.

The native-row fixture contains the person shape. Resolve its email through the native-cell reference. For a writable Drive-file chip, use this `CellData`; omit output-only `mimeType`:

```json
{
  "userEnteredValue": { "stringValue": "@" },
  "chipRuns": [
    {
      "startIndex": 0,
      "chip": {
        "richLinkProperties": {
          "uri": "https://drive.google.com/file/d/FILE_ID/view"
        }
      }
    }
  ]
}
```

For non-Drive rich links, follow the shared-resource rules in the native-cell reference.

##### Resize a Column

After inserting a populated column or editing a value such that it's clipped/overflowed:

1. Record populated-column widths and any fixed-width requirement.
2. In the native render, check the header, longest formatted values, and controls. If clipped/overflow and column size not intentionally fixed (e.g. to match template or existing workbook pattern), resize only that column with `autoResizeDimensions` or a justified `pixelSize`.
3. Recheck widths, affected cells, and the render. Only the target width may change; preserve formulas, validation, chips, formats, frozen rows, and neighboring structure. Without native evidence, report fit unverified.

Indexes are zero-based and the end is exclusive. For inserted column B, send exactly this one-column resize:

```json
[
  {
    "autoResizeDimensions": {
      "dimensions": {
        "sheetId": 123456789,
        "dimension": "COLUMNS",
        "startIndex": 1,
        "endIndex": 2
      }
    }
  }
]
```

##### Resize Or Delete Rows Or Columns

Use `updateDimensionProperties` for size changes and `deleteDimension` for destructive row or column removal.

```json
[
  {
    "updateDimensionProperties": {
      "range": {
        "sheetId": 123456789,
        "dimension": "COLUMNS",
        "startIndex": 0,
        "endIndex": 3
      },
      "properties": {
        "pixelSize": 180
      },
      "fields": "pixelSize"
    }
  },
  {
    "deleteDimension": {
      "range": {
        "sheetId": 123456789,
        "dimension": "ROWS",
        "startIndex": 10,
        "endIndex": 12
      }
    }
  }
]
```

##### Sort A Table And Turn On A Basic Filter

Use this for spreadsheet workflows that should behave like a table view instead of manual row shuffling.

```json
[
  {
    "sortRange": {
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 1,
        "startColumnIndex": 0,
        "endColumnIndex": 5
      },
      "sortSpecs": [
        {
          "dimensionIndex": 2,
          "sortOrder": "ASCENDING"
        }
      ]
    }
  },
  {
    "setBasicFilter": {
      "filter": {
        "range": {
          "sheetId": 123456789,
          "startRowIndex": 0,
          "startColumnIndex": 0,
          "endColumnIndex": 5
        }
      }
    }
  }
]
```

##### Add Dropdown Validation

Use `setDataValidation` for restricted inputs, such as status dropdowns, when chip display is not required. If chip display is required, use Native Dropdown Chips In New Sheets. For people/file rich-link chips, use Smart-Chip Shapes.
For requested checkboxes, on/off controls, or user-editable two-state boolean fields, use native checkboxes with `rule.condition.type` set to `BOOLEAN`.

```json
[
  {
    "setDataValidation": {
      "range": {
        "sheetId": 123456789,
        "startRowIndex": 1,
        "endRowIndex": 200,
        "startColumnIndex": 3,
        "endColumnIndex": 4
      },
      "rule": {
        "condition": {
          "type": "ONE_OF_LIST",
          "values": [
            { "userEnteredValue": "todo" },
            { "userEnteredValue": "in_progress" },
            { "userEnteredValue": "done" }
          ]
        },
        "strict": true,
        "showCustomUi": true
      }
    }
  }
]
```

##### Common Failure Modes

- Confusing `spreadsheets.batchUpdate` with `spreadsheets.values.batchUpdate`
- Stringifying the `requests` array instead of sending structured objects
- Using A1 notation where the request expects `GridRange` or `DimensionRange`
- Forgetting that indexes are zero-based and end-exclusive
- Omitting `fields` on update-style requests
- Filling validated cells from plain range reads and missing the dropdown's actual allowed values
- Mixing too many unrelated operations into one batch
- Reusing stale indexes after an insert, delete, sort, or prior batch changed the sheet
- Sending Docs or Slides request names, values API payloads, or invented field names to `spreadsheets.batchUpdate`
- Declaring a small `GridRange` but sending more `rows` or `values` than the range can hold
- Using `setDataValidation` for requested chip dropdowns in new Sheets; use table `DROPDOWN` columns instead

##### Official References

- Request catalog: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request
- Sheets API samples index: https://developers.google.com/workspace/sheets/api/samples
- Basic writing samples: https://developers.google.com/workspace/sheets/api/samples/writing
- Basic formatting samples: https://developers.google.com/workspace/sheets/api/samples/formatting
- Row and column samples: https://developers.google.com/workspace/sheets/api/samples/rowcolumn
- Sheet operations samples: https://developers.google.com/workspace/sheets/api/samples/sheet
- Native tables guide: https://developers.google.com/workspace/sheets/api/guides/tables

### File: `references/reference-chart-recipes.md`

#### Chart Recipes

When to read: when the chart itself is the task.

Use this reference before the first chart write.
The point is to refresh chart request shapes and a few non-obvious API constraints before building or editing.

##### Workflow

1. Ground the chart in the live sheet first: exact source tab, domain column, series columns, headers, and whether the data is contiguous.
2. Choose the simplest chart type that matches the table shape and user intent.
3. Draft one chart spec first, using a clean anchor position that will not collide with existing content.
4. If the chart needs revision, update the chart spec deliberately rather than trying to patch a tiny nested fragment from memory.
5. Treat chart content changes and chart position changes as separate operations.

##### Output Conventions

- Name the source sheet and the exact domain and series ranges.
- State the chosen chart type and why it fits the data.
- For edits, state whether you are changing the chart spec, the chart position, or both.

##### High-Value API Reminders

- Official chart samples: https://developers.google.com/workspace/sheets/api/samples/charts
- Official chart spec reference: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/charts
- Official request reference: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request

- Create charts with `addChart`.
- Edit chart content with `updateChartSpec`.
- Move or resize charts with `updateEmbeddedObjectPosition`.
- Delete charts with `deleteEmbeddedObject`.
- Google documents that `updateChartSpec` replaces the chart `spec`; it is not a tiny partial edit surface.
- Google also notes that the API does not expose full control over every chart setting, and some unsupported settings can reset to defaults when edited through the API.

##### Chart Choice Heuristics

- Use a column or bar chart for discrete category comparisons.
- Use a line chart for trends over an ordered domain, especially time.
- Use a pie chart only for a small number of parts-of-whole values.
- Start with a basic chart unless the user explicitly wants a more specialized chart family.

##### Styling Defaults

- Always set a meaningful title, and add a subtitle only when it clarifies units, timeframe, or source.
- Prefer one accent color plus muted supporting series instead of the default rainbow palette.
- Use `legendPosition` intentionally. If the series names are obvious or there is only one series, prefer a cleaner layout over a large legend.
- Use data labels only when the chart is sparse enough that labels improve readability instead of adding clutter.
- Avoid 3D styling by default, even when the chart type supports it.
- Give the chart enough size and whitespace to breathe. Clean placement and reasonable dimensions do a lot of the styling work.
- For line charts, use smoothing and point styling only when they improve readability rather than decoration.
- Keep axis titles concise and use them when the metric or unit is not obvious from context.

##### Styling Syntax Reminders

These are the main styling knobs worth remembering:

- Chart-level text and defaults live on `ChartSpec`, including `title`, `subtitle`, `titleTextFormat`, `subtitleTextFormat`, `fontName`, `backgroundColorStyle`, and `maximized`.
- Basic chart styling lives mostly on `BasicChartSpec`, including `legendPosition`, `axis[].title`, `lineSmoothing`, and `threeDimensional`.
- Series-level styling lives on `BasicChartSeries`, including `dataLabel`, `colorStyle`, and `pointStyle`.
- Prefer `colorStyle` over deprecated `color` fields when both exist.
- Pie charts have their own styling surface, especially `legendPosition`, `threeDimensional`, and `pieHole`.

Example chart-level styling:

```json
{
  "title": "Weekly Active Users",
  "subtitle": "Last 12 weeks",
  "fontName": "Google Sans",
  "titleTextFormat": {
    "fontSize": 18,
    "bold": true
  },
  "subtitleTextFormat": {
    "fontSize": 11,
    "foregroundColorStyle": {
      "rgbColor": {
        "red": 0.4,
        "green": 0.4,
        "blue": 0.4
      }
    }
  },
  "backgroundColorStyle": {
    "rgbColor": {
      "red": 1,
      "green": 1,
      "blue": 1
    }
  }
}
```

Example basic-chart styling:

```json
{
  "basicChart": {
    "legendPosition": "BOTTOM_LEGEND",
    "lineSmoothing": true,
    "axis": [
      {
        "position": "BOTTOM_AXIS",
        "title": "Week"
      },
      {
        "position": "LEFT_AXIS",
        "title": "WAU"
      }
    ],
    "series": [
      {
        "colorStyle": {
          "rgbColor": {
            "red": 0.1,
            "green": 0.45,
            "blue": 0.9
          }
        },
        "dataLabel": {
          "type": "DATA"
        },
        "pointStyle": {
          "shape": "CIRCLE",
          "size": 5
        }
      }
    ]
  }
}
```

##### Source Range Reminders

- Google documents that chart data comes from a `ChartSourceRange`, whose `sources` are `GridRange` objects.
- For a chart domain or series, exactly one dimension must have length 1.
- If using multiple non-adjacent ranges, Google requires them to stay aligned across domain and series.
- Google documents that if `headerCount` is not set, Sheets may guess the number of header rows.
- Existing chart IDs can be retrieved via `spreadsheets.get` with `fields=sheets(charts)`.

##### Minimal Column Chart Shape

Use this when you have one category column and one or more numeric series.

```json
[
  {
    "addChart": {
      "chart": {
        "spec": {
          "title": "Monthly Sales",
          "basicChart": {
            "chartType": "COLUMN",
            "legendPosition": "BOTTOM_LEGEND",
            "axis": [
              {
                "position": "BOTTOM_AXIS",
                "title": "Model"
              },
              {
                "position": "LEFT_AXIS",
                "title": "Sales"
              }
            ],
            "domains": [
              {
                "domain": {
                  "sourceRange": {
                    "sources": [
                      {
                        "sheetId": 123456789,
                        "startRowIndex": 0,
                        "endRowIndex": 7,
                        "startColumnIndex": 0,
                        "endColumnIndex": 1
                      }
                    ]
                  }
                }
              }
            ],
            "series": [
              {
                "series": {
                  "sourceRange": {
                    "sources": [
                      {
                        "sheetId": 123456789,
                        "startRowIndex": 0,
                        "endRowIndex": 7,
                        "startColumnIndex": 1,
                        "endColumnIndex": 2
                      }
                    ]
                  }
                },
                "targetAxis": "LEFT_AXIS"
              }
            ],
            "headerCount": 1
          }
        },
        "position": {
          "overlayPosition": {
            "anchorCell": {
              "sheetId": 123456789,
              "rowIndex": 0,
              "columnIndex": 6
            },
            "offsetXPixels": 0,
            "offsetYPixels": 0,
            "widthPixels": 720,
            "heightPixels": 440
          }
        }
      }
    }
  }
]
```

##### Minimal Line Chart Shape

Use this for trends over dates or other ordered domains.

```json
[
  {
    "addChart": {
      "chart": {
        "spec": {
          "title": "Weekly Active Users",
          "basicChart": {
            "chartType": "LINE",
            "legendPosition": "BOTTOM_LEGEND",
            "domains": [
              {
                "domain": {
                  "sourceRange": {
                    "sources": [
                      {
                        "sheetId": 123456789,
                        "startRowIndex": 0,
                        "endRowIndex": 13,
                        "startColumnIndex": 0,
                        "endColumnIndex": 1
                      }
                    ]
                  }
                }
              }
            ],
            "series": [
              {
                "series": {
                  "sourceRange": {
                    "sources": [
                      {
                        "sheetId": 123456789,
                        "startRowIndex": 0,
                        "endRowIndex": 13,
                        "startColumnIndex": 1,
                        "endColumnIndex": 2
                      }
                    ]
                  }
                },
                "targetAxis": "LEFT_AXIS"
              }
            ],
            "headerCount": 1
          }
        },
        "position": {
          "overlayPosition": {
            "anchorCell": {
              "sheetId": 123456789,
              "rowIndex": 0,
              "columnIndex": 5
            }
          }
        }
      }
    }
  }
]
```

##### Minimal Pie Chart Shape

Use this only for a small categorical breakdown.

```json
[
  {
    "addChart": {
      "chart": {
        "spec": {
          "title": "Channel Mix",
          "pieChart": {
            "legendPosition": "RIGHT_LEGEND",
            "domain": {
              "sourceRange": {
                "sources": [
                  {
                    "sheetId": 123456789,
                    "startRowIndex": 0,
                    "endRowIndex": 6,
                    "startColumnIndex": 0,
                    "endColumnIndex": 1
                  }
                ]
              }
            },
            "series": {
              "sourceRange": {
                "sources": [
                  {
                    "sheetId": 123456789,
                    "startRowIndex": 0,
                    "endRowIndex": 6,
                    "startColumnIndex": 1,
                    "endColumnIndex": 2
                  }
                ]
              }
            },
            "threeDimensional": false
          }
        },
        "position": {
          "overlayPosition": {
            "anchorCell": {
              "sheetId": 123456789,
              "rowIndex": 0,
              "columnIndex": 4
            }
          }
        }
      }
    }
  }
]
```

##### Update Chart Content

Use `updateChartSpec` when the chart type, data ranges, title, legend, or axis config should change.

```json
[
  {
    "updateChartSpec": {
      "chartId": 9001,
      "spec": {
        "title": "Weekly Active Users",
        "basicChart": {
          "chartType": "LINE",
          "legendPosition": "BOTTOM_LEGEND",
          "domains": [
            {
              "domain": {
                "sourceRange": {
                  "sources": [
                    {
                      "sheetId": 123456789,
                      "startRowIndex": 0,
                      "endRowIndex": 13,
                      "startColumnIndex": 0,
                      "endColumnIndex": 1
                    }
                  ]
                }
              }
            }
          ],
          "series": [
            {
              "series": {
                "sourceRange": {
                  "sources": [
                    {
                      "sheetId": 123456789,
                      "startRowIndex": 0,
                      "endRowIndex": 13,
                      "startColumnIndex": 1,
                      "endColumnIndex": 2
                    }
                  ]
                }
              },
              "targetAxis": "LEFT_AXIS"
            }
          ],
          "headerCount": 1
        }
      }
    }
  }
]
```

##### Move Or Resize A Chart

Use `updateEmbeddedObjectPosition` separately from chart-spec edits.

```json
[
  {
    "updateEmbeddedObjectPosition": {
      "objectId": 9001,
            "newPosition": {
        "overlayPosition": {
          "anchorCell": {
            "rowIndex": 4,
            "columnIndex": 6
          },
          "offsetXPixels": 40,
          "widthPixels": 840,
          "heightPixels": 520
        }
      },
      "fields": "anchorCell(rowIndex,columnIndex),offsetXPixels,widthPixels,heightPixels"
    }
  }
]
```

##### Common Failure Modes

- Picking a chart type before inspecting the table shape
- Wiring the wrong domain column or mismatching domain and series lengths
- Forgetting `headerCount` and then getting surprising inferred labels
- Treating `updateChartSpec` like a tiny patch instead of a full spec replacement
- Mixing chart-spec rewrites and layout moves into one confusing edit step

##### Official References

- Chart samples: https://developers.google.com/workspace/sheets/api/samples/charts
- Charts reference: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/charts
- Requests reference: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request
- Batch update guide: https://developers.google.com/workspace/sheets/api/guides/batchupdate

### File: `references/reference-edit-workflow.md`

#### Edit Workflow

When to read: before existing Google Sheets inspection that may lead to an edit, and before any existing spreadsheet content write or edit operation.

##### Workflow

Read `./reference-live-read-search-safety.md` before connector reads or row search, and `./reference-native-cell-structure.md` before extending populated rows or columns.

1. If the spreadsheet or tab is not already grounded, identify it first and read metadata before deeper reads or writes.
2. Prefer narrow reads and row search over dumping large tabs into context.
3. Ground the task in exact sheet, range, header, and formula context before proposing changes.
4. When a read could influence a write, default to `get_cells`. Treat `get_range` as the exception and use it only when plain displayed values are truly sufficient.
5. If the task involves filling in, editing, or normalizing existing cells, do not rely on `get_range` alone. Inspect the target cells with `get_cells` first so value choices come from the live cell metadata.
6. When validation-backed cells may matter, prefer a `get_cells` read that includes the live constraint data you need, for example `dataValidation,formattedValue,effectiveValue,userEnteredValue`.
7. When preparing to write into existing cells, check whether the target range is constrained by dropdowns or other data validation before choosing values.
8. Do not infer allowed values from plain neighboring text alone when validation may exist.
9. If validation is present, restate the allowed values or rule before drafting or applying the write.
10. Before the first write-heavy `batch_update`, read `./reference-batch-update-recipes.md` for request-shape recall.
11. Cluster logically related edits into one `batch_update` so the batch is coherent and atomic.
12. Avoid both mega-batches and one-request micro-batches.
13. If the user asks to clean, normalize, or restructure data, summarize the intended table shape before writing.
14. For exact-row, fixed-count, or report-style tasks, keep the findings narrowly scoped to the requested conclusions only.
15. Do not add extra metrics, adjacent commentary, or bonus rows unless the user asked for them.
16. After writing, run `./reference-visual-quality.md` before the final answer.

Preserve existing values, formulas, validation, chips, and formatting outside the requested change. For content-only edits, retain the target cell's formatting unless the user asks to change it.

##### Output Conventions

- Always reference the spreadsheet, sheet name, and range when describing findings or planned edits.
- For `batch_update` work, use a compact table or list with the request type, target range or sheet, proposed change, and reason.

### File: `references/reference-formula-patterns.md`

#### Formula Patterns

When to read: when the formula itself is the task.

Use this reference before drafting the first formula.
The point is to refresh exact syntax, formula-shape choices, and rollout discipline before writing.

##### Workflow

1. Ground the formula in the live sheet first: exact input columns, target output cell or column, and a few representative rows.
2. Choose the formula shape deliberately:
   - row formula when the logic is local to one row and should copy down
   - spill formula when one formula should populate a whole output range
   - lookup formula when the task is key-to-value retrieval
   - filter/query formula when the task is to derive a subset or summary table
   - named function only when the same logic is conceptually reusable
3. Draft the formula in one helper cell or a scratch location first.
4. Test on a small representative slice, including likely edge cases.
5. Iterate until the sample output is correct, then roll the formula out to the intended target range.

##### Output Conventions

- Name the exact target cell or output column.
- Return the final formula exactly as it should be entered.
- If rollout matters, say whether the formula should be filled down, spilled from one anchor cell, or turned into a named function.

##### Formula Shape Heuristics

- Use a row formula when the logic is evaluated row-by-row and should be copied down.
- Use a spill formula when one anchor cell should populate the whole output region.
- Prefer `XLOOKUP` for straightforward exact lookups when available.
- If using `VLOOKUP`, explicitly pass `FALSE` for exact match behavior.
- Use `FILTER` when the output should be the original rows or columns that satisfy conditions.
- Use a named function when the same formula pattern should be reused semantically, not just copied.
- Use `MAP` with `LAMBDA` when you need per-item transformation logic that would be awkward as a plain spill formula.

##### High-Value Syntax Reminders

###### ARRAYFORMULA

- Official doc: https://support.google.com/docs/answer/3093275?hl=en
- Google notes that many array formulas automatically expand into neighboring cells, so explicit `ARRAYFORMULA` is not always required.
- Good when one anchor formula should fill an output column.

Example:

```gs
=ARRAYFORMULA(IF(A2:A="", "", IF(E2:E>=90, "On track", "At risk")))
```

###### FILTER

- Official doc: https://support.google.com/docs/answer/3093197?hl=en
- Conditions must match the length of the filtered range.
- Google notes that you cannot mix row conditions and column conditions in the same `FILTER`.
- If no values satisfy the conditions, Google returns `#N/A`.

Example:

```gs
=FILTER(A2:D, D2:D="Open", A2:A<>"")
```

###### XLOOKUP

- Official doc: https://support.google.com/docs/answer/12405947?hl=en
- `lookup_range` must be a single row or column.
- `result_range` should have the same row or column size as the lookup range.
- Use `missing_value` when you want a cleaner fallback than raw `#N/A`.

Example:

```gs
=XLOOKUP(A2, Lookup!A:A, Lookup!D:D, "")
```

###### VLOOKUP

- Official doc: https://support.google.com/docs/answer/3093318?hl=en
- Google strongly recommends using `FALSE` for `is_sorted` for more predictable exact-match behavior.
- The search key must be in the first column of the lookup range.
- If you need a friendlier fallback, wrap with `IFNA` or `IFERROR`.

Example:

```gs
=IFNA(VLOOKUP(A2, Lookup!A:D, 4, FALSE), "")
```

###### MAP

- Official doc: https://support.google.com/docs/answer/12568985?hl=en
- The `LAMBDA` must accept exactly as many names as the number of input arrays.
- Each mapped value must resolve to a single value, not another array.
- Useful for per-item transformations that are more expressive than a plain copied formula.

Example:

```gs
=MAP(A2:A, LAMBDA(item, JOIN("-", SPLIT(item, ","))))
```

###### Named Functions

- Official doc: https://support.google.com/docs/answer/12504534?hl=en
- Named functions are appropriate when the formula pattern should be reused conceptually across a sheet or across files.
- Google requires placeholder names rather than A1-style references for function arguments.

##### Practical Rollout Pattern

1. Draft in one helper cell or scratch column.
2. Test on representative rows, including blanks, missing lookups, and unusual values.
3. Decide whether the final rollout should be copy-down, spill-from-anchor, or named-function-based.
4. Only then replace the target formula region.

##### Official References

- Google Sheets function list: https://support.google.com/docs/table/25273?hl=en
- ARRAYFORMULA: https://support.google.com/docs/answer/3093275?hl=en
- FILTER: https://support.google.com/docs/answer/3093197?hl=en
- XLOOKUP: https://support.google.com/docs/answer/12405947?hl=en
- VLOOKUP: https://support.google.com/docs/answer/3093318?hl=en
- MAP: https://support.google.com/docs/answer/12568985?hl=en
- Named functions: https://support.google.com/docs/answer/12504534?hl=en

### File: `references/reference-import-spreadsheet-to-native-sheets.md`

#### Import Spreadsheet To Native Google Sheets

When to read: after creating or locating a local spreadsheet file that should become a Google Sheets spreadsheet.

For new Google Sheets creation, prefer creating the local workbook with the `[@spreadsheets](plugin://spreadsheets@openai-primary-runtime)` plugin or `$Excel` skill before following this import path.

##### Default Rule

Use native Google Sheets conversion by default.

For `.xlsx`, `.xls`, `.ods`, `.csv`, and `.tsv` inputs, the blessed path is the connector's spreadsheet import tool with `upload_mode: "native_google_sheets"`. Do not preserve the source file type unless the user explicitly asks to keep an Excel/OpenDocument/text spreadsheet file in Drive without converting it.

##### Workflow

1. Confirm the local source path is an absolute path to a supported spreadsheet file: `.xlsx`, `.xls`, `.ods`, `.csv`, or `.tsv`.
2. Record each native Excel table and each range the user explicitly asked to create, add, or upgrade as a table: source sheet, header row, bounds, unique table name, and finite list-validation columns/options. Visual table-like structure alone is insufficient.
3. Import the file with the Google Drive connector spreadsheet import tool:
   ```json
   {
     "source_file": "/absolute/path/to/workbook.xlsx",
     "title": "Workbook name",
     "upload_mode": "native_google_sheets"
   }
   ```
4. Use the connector function exposed in the current runtime, for example `mcp__codex_apps__google_drive._import_spreadsheet(...)` or the equivalent Google Drive spreadsheet import tool.
5. Verify the import response reports native conversion, typically with `converted: true`, `mimeType: "application/vnd.google-apps.spreadsheet"`, and a `spreadsheetId` or spreadsheet URL.
6. Read spreadsheet metadata and confirm the title, URL, and sheet tabs.
7. Upgrade recorded table ranges using the workflow below.
8. Run `./reference-visual-quality.md` on the native destination after import and upgrades; local verification does not prove conversion preserved layout.
9. Deliver the verified native Google Sheet using the final-response citation contract in `SKILL.md`. Keep the local source file out of delivery unless explicitly asked for by the user.

##### Upgrade Intended Tables

Spreadsheet conversion can preserve cells without creating native Sheets table metadata. For each recorded table:

1. Resolve the imported `sheetId` and map each recorded source range to the imported sheet. Require one nonblank header row and at least one data row.
2. Read `./reference-batch-update-recipes.md`. If metadata omits imported banding, use its title-preserving metadata request. Atomically replace only banding that exactly matches the intended table range; otherwise send `addTable` alone. Carry recorded finite list-validation columns as table `DROPDOWN` columns with the same options. Never rebuild or rewrite the sheet to remove banding. Use Sheets' default table styling. Set `table.rowsProperties` only when the user explicitly asks to carry imported header or band colors. Omit `tableId`; Sheets assigns it.
3. Set `include_spreadsheet_in_response: true` on the connector call.
4. Verify `replies[].addTable.table.tableId` and a matching name and range in `updatedSpreadsheet.sheets[].tables`. Formatting or a basic filter alone does not prove a native table exists.

Do not create native tables for matrices, calculation grids, financial models, report layouts, dashboards, or chart-source ranges unless the source used a native Excel table or the user asked for table semantics. A simple multiplication grid remains a normal range.

##### Escape Hatch

Only use a non-native upload mode when the user explicitly asks to preserve the source file type, keep the file as Excel/OpenDocument/text, or avoid conversion.

For that explicit preservation request, use the connector's spreadsheet import tool with:
```json
{
  "source_file": "/absolute/path/to/workbook.xlsx",
  "title": "Workbook name",
  "upload_mode": "keep_source_file_type"
}
```

Use generic Drive `_upload_file(...)` only for generic file upload requests that are not asking for a Google Sheets spreadsheet outcome.

##### Rules

- `native_google_sheets` is the default for spreadsheet imports.
- `keep_source_file_type` is opt-in and requires explicit user intent.
- Do not use generic `_upload_file(...)` for "import into Google Sheets"; it preserves the uploaded file instead of creating a native Sheet.
- Keep the local source file out of delivery after a successful native import unless explicitly asked for by the user.

### File: `references/reference-live-read-search-safety.md`

#### Live Read And Search Safety

When to read: before direct connector range reads, cell reads, or `search_spreadsheet_rows` calls against an existing Google Sheet.

##### Rules

- Read spreadsheet metadata before direct live reads or searches. Record visible sheet titles, `sheetId` values, grid row/column counts, frozen/header rows if exposed, and any relevant named ranges.
- Use exact visible sheet titles from metadata. Do not assume `Sheet1`, `Sheet2`, localized default names, or title-derived tab names.
- If a spreadsheet has exactly one visible sheet, you may infer that sheet for read-only inspection after metadata confirms it. For writes, still name the resolved sheet explicitly.
- Keep `sheet_name` and cell-only `range` separate when the connector has separate arguments. Use a full A1 string with quoted sheet names only for tools that require a single A1 range argument.
- Quote sheet names in full A1 notation when they contain spaces, punctuation, apostrophes, or non-ASCII characters.
- Bound `search_spreadsheet_rows` calls to the smallest plausible rectangle. Avoid whole-grid or whole-column searches unless the computed scan is safely below the tool cap.
- Keep row-search scans under 50,000 cells. Compute `(end_row - start_row + 1) * scanned_column_count` before the call, and chunk by rows or columns when the first useful range would exceed the cap.
- Do not call row search with an empty query, a query that only repeats a sheet title, or `return_columns` outside the searched rectangle.
- If a range or tab read fails, do not retry the same guessed range. Re-read metadata, list exact tab names in your working notes, then retry with a metadata-derived sheet and a smaller range.
- Prefer targeted sentinel reads such as header rows, known id columns, or bounded data rectangles before escalating to broader scans.

##### Recovery Patterns

- Tab not found: re-read metadata, compare against exact visible titles, then use the single visible sheet only if metadata proves there is one.
- Range parse error: separate `sheet_name` from cell-only `range` when possible, or quote the sheet name in full A1 notation.
- Range too large: shrink to header plus likely data columns, then page through bounded chunks. Do not repeat the oversized call.
- No rows found: confirm the query value exists in a small displayed-value read before broadening the search.

### File: `references/reference-native-cell-structure.md`

#### Native Cell And Table Consistency

Read before extending populated rows or columns.

##### Reference-Follow Creation

Use the source path that preserves native structure.

- Native Google Sheets reference: make a copy of the workbook or specified sheet(s) in a new spreadsheet first.
- Spreadsheet file reference (`.xlsx`, `.xls`, `.ods`, `.csv`): follow the local spreadsheet/template-follow workflow, import as native Google Sheets, then inspect the imported destination and repair native structures the file format or import did not carry over.

For a native Google Sheets copy only:

1. Run Inspect And Classify below on the source before edits.
2. Verify the destination spreadsheet is new and distinct from the source.
3. Trim the copied sheet to the requested rows and columns with `deleteDimension`, preserving source order and the header row.
4. If further edits are required, use `batch_update`; do not use values-only rewrites for structured cells.
5. After trimming, pasting, or row/column edits, run the table metadata probe in `./reference-batch-update-recipes.md`. A copied table passes only when `tables[].range` covers the final used rectangle; remember end indexes are exclusive (`A:O` needs `endColumnIndex: 15`). If it misses any used row or column, update its range before final answer. Recreate it only when no copied table exists or the copied table cannot be updated.
   Preserve reference data validation and its visual presentation, including chip and checkbox styles.
6. Verify the written range with the same metadata fields and `./reference-visual-quality.md`.

The copy-trim/table-range steps above do not apply to imported spreadsheet-file references. For those, run Inspect And Classify on the imported destination, then repair missing native structures with the import and batch-update references.

##### Inspect And Classify

From grounded reads, compare the nearest complete exemplar with a peer and the populated edge. Read `userEnteredValue,effectiveValue,formattedValue,dataValidation,chipRuns,userEnteredFormat`. Classify each field as literal, formula, validation-backed, writable chip, read-only rich link, or formatting-only. Expand conflicting samples; ask or stop if the schema remains ambiguous.

Classify chips by meaning, not type or row subject. Treat a resource as shared when the user says so, its header and label identify a shared resource, or peers use the same URI. With only one exemplar, do not copy it if its label, URI, or surrounding cells tie it to that row. Preserve and verify shared URIs; overwrite writable row-specific chips. Never copy row-specific or unclassified read-only chips: copy safe structure, then leave blank, ask, or block. A valid URI does not prove correct semantics.

##### Write

Use the native-row recipe in `./reference-batch-update-recipes.md`. Preserve copied values intentionally or overwrite them in the same complete-row call. Insert dimensions first, apply the policy to columns, and never use a values-only `appendCells`.

##### Connector People-Chip Limit

The Google Drive connector accepts at most 10 people-chip rows per `batch_update_spreadsheet` call; this is not a Sheets API limit. For destination rows `[start, end)`:

1. Generate ordered, disjoint chunks `[i, min(i + 10, end))`; send one complete-row call per chunk.
2. Read back that range with `userEnteredValue,formattedValue,dataValidation,chipRuns,userEnteredFormat`; advance only on a full match.
3. Never replay verified ranges or advance after a mismatch. If its fix is deterministic and scoped, repair the unverified chunk once and re-read it; otherwise stop and report its range and state.

##### Deterministic People Resolution

People chips require an email. Use authoritative sources provided or implied by the request. Accept an email only for one unique exact identity. When order is unspecified, preserve source order or sort by normalized display name and stable ID.

Never synthesize an address. If an email is missing or ambiguous, write the source name as plain text and report the affected cells.

##### Verify Native Metadata

Read every written range with `get_spreadsheet_cells` and apply `./reference-visual-quality.md`. Verify:

- validation matches and values satisfy it
- people chips contain `chipRuns[].chip.personProperties.email`
- writable and shared chips contain planned `chipRuns[].chip.richLinkProperties.uri`
- no unclassified read-only URI was copied
- formulas remain in `userEnteredValue.formulaValue` with adjusted references
- formatting matches and no stale row-specific input remains
- source dropdown option colors remain visible when the reference uses colored dropdown chips

Repair when safe or report the blocker. Display text alone does not prove native consistency.

### File: `references/reference-visual-quality.md`

#### Spreadsheet Visual Quality

When to read: before finalizing any Google Sheet created, imported, or edited.

##### Scope

- Edit: changed cells/objects plus visible neighbors or dependents.
- New, imported, or reference/template-based Sheet: every populated visible sheet and important output/chart; compare equivalent reference views.

For a new Sheet, size/style the authored area as a whole, never the unused grid.

##### Final Check

1. Verify values/formulas and native structure, then inspect the Google-rendered Sheet at normal zoom.
2. Fix clipping, awkward wrapping, overlap, unreadable controls, or damaged layout with the smallest change. For an inserted or substantially changed populated column, use Resize a Column in `./reference-batch-update-recipes.md`.
3. Validate formatting is applied properly and consistently (e.g. when styling a table, prefer rules based conditional formatting over manual per-row formatting).
4. Re-read and re-render. Confirm the fix and no unrelated data, structure, dimension, or layout changes.

Never sheet-wide autofit or restyle an edit, import, reference, or template without authorization. Preserve intentional fixed dimensions and report unavoidable clipping.

##### Google Sheets Evidence - Visual Verification

If CUA is authenticated and enabled, use it for visual verification of each sheet. If CUA is unavilable, export the Google Sheet to `.xlsx` and import, render and inspect via artifact_tool_v2. Note that Gsheet specific structures may not fully port to local .xlsx and there are known compatability differences between Gsheet and Excel. Do not verify via exported PDF as it may look very different. If none of these available, do a best effort visual validation pass by reading the formatting and style details directly from GoogleSheet API.

### File: `references/style-profiles.md`

#### Google Sheets Style Profiles

When to read: before creating or editing a Google Sheet when the user has not provided explicit style direction.

##### Precedence

1. User style instructions, attached templates, or explicit examples win.
2. Existing spreadsheet style wins when editing an existing Sheet unless the user asks to restyle it.
3. Task-specific needs can upgrade the style, for example dashboards, executive reports, or financial models.
4. If none of the above applies, use the destination default profile below.

##### native_google_sheets_default

Use this profile when styling is unspecified and the final artifact is a native Google Sheet.

Defaults:
- keep the sheet close to native Google Sheets defaults
- white grid with black text
- light gray header rows
- subtle borders only where they aid scanning
- filters and freeze panes for scrolling tabular data; skip for small static ranges, matrices, and calculation grids unless requested otherwise
- plain source URL columns
- apply the same default style profile consistently across every sheet after native conversion or live writeback, including imported object-level styling such as table/banding styles or conditional formats

Avoid unless requested:
- dark title bands
- colored banded tables
- per-sheet or imported styles that make one tab visually inconsistent with the rest of the workbook
- heavy theme accents
- dashboard cards or report-style panels
