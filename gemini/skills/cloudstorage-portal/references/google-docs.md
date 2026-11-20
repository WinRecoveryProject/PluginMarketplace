# Skill: google-docs

- Plugin: `cloudstorage-portal` (0.9.14)
- Source: `plugins/cloudstorage-portal/skills/google-docs/SKILL.md`

> Use when the user wants to create, read or edit a native Google Docs document through a connected Google Drive account.

## Instructions

### Google Docs

Create and edit native Google Docs through connector tools, which handle authentication. For content edits, `batch_update_document` calls Google’s `documents.batchUpdate` API. Verify connector capabilities before claiming a feature is unsupported.

#### Choose the route

- **New document:** create a native Google Doc with the Drive create action and `application/vnd.google-apps.document`.
- **Edit an existing document:** edit the specified document in place. Read the target and surrounding structure with the Google Docs tools before writing. For large responses or complex native controls, optionally use the [file-backed read helper](google-docs.md#file-referencesreference-trusted-read-wrappermd) to save a searchable outline and control inventory. Do not write through an opaque control range you cannot inspect.
- **Use a template:** when creating a new document from a template, copy it natively to preserve its formatting and embedded features. When adapting a past document, update task-relevant content across every retained tab; preserving structure does not mean carrying forward old people, dates, links, or approvals. Edit an existing document in place when that is what the user requests.
- **Convert Word to Google Docs:** only when the user supplies a Word file and asks to convert it. Call `mcp__codex_apps__google_drive_import_document` with `source_file` set to its absolute local path, the desired `title`, and `upload_mode: "native_google_docs"`. Preserve the source file. Verify the response identifies a native Google Doc (`application/vnd.google-apps.document`) and supplies its ID or URL, then read it back to check content, headings, lists, tables, and embedded elements against the source. When layout fidelity matters, compare an exported PDF with the source rendering. Repair conversion drift with scoped edits that preserve the source formatting, and report any remaining fidelity loss.

Place new documents and template copies in `ChatGPT` at My Drive root unless the user specifies another location. Edit existing documents in place.

#### Writing style

Write for the document’s intended audience and purpose. Default to using natural, concise, and clear writing. Do not describe your search or review process, report how many items you reviewed, or list evaluation criteria unless the user explicitly asks for those details or if they are necessary to avoid a misleading answer.

When revising, preserve the author’s voice. For formatting-only requests, keep the original wording exactly.

#### Edit without losing structure

`batch_update_document` applies direct edits, not tracked suggestions.

1. Resolve the destination document ID, target `tabId`, and current structure. A URL pointing at one tab does not describe the whole document. Inspect all tabs when copying or editing the whole document; a targeted edit needs only its relevant scope.
2. Resolve paragraph, table-cell, and native-element ranges from connector readback. Docs indexes are UTF-16 code units, not character counts. Requests in a batch execute sequentially, so earlier inserts and deletions change later indexes.
3. Batch compatible edits in one `batch_update_document` call, accounting for sequential index shifts. Combine text insertion and its formatting when ranges can be calculated from the inserted text. Make scoped edits. Do not rebuild a document for a small correction or replace a table/control with its visible text. Match nearby peer styles when adding content to an existing structure.
4. Use `write_control.requiredRevisionId` for edits that should fail on concurrent changes. Use a returned revision for the next guarded batch when available. Read again only when a later edit needs positions or native IDs you cannot reliably derive, a revision conflict occurs, or a write outcome is uncertain; reconcile that outcome before retrying. Do not read after every tool call.
5. After the planned edits, read back the changed area once to verify content, location, native element types, and preservation of nearby structure. Use PDF rendering when page fit or image placement matters; connector metadata alone cannot prove rendered layout. Export and inspect the relevant PDF pages for that check; HTML and thumbnails do not prove page fit.

#### Formatting

For new documents, start with Google Docs’ supplied named styles, fonts, and margins. Unless the user or style guide specifies otherwise, use these defaults.

- Choose heading levels by document structure. Reserve `SUBTITLE` for an optional line beneath the document title, and use `HEADING_2` for subsections within a `HEADING_1` section.
- Apply the named paragraph style first to preserve the document outline and navigation. Then set only the font size, using 22 pt for `TITLE`, 13 pt for `SUBTITLE`, 18 pt for `HEADING_1`, and 16 pt for `HEADING_2`.
- Separate body paragraphs with a single paragraph break and set `paragraphStyle.spaceBelow` to 6 pt. Preserve the spacing of headings, lists, tables, and code.

For an existing document or template, preserve its typography and match nearby headings.

Use named paragraph styles for headings. Set `namedStyleType` first, then change only the font size of the title, subtitle, or heading text, excluding its final newline. Preserve the heading’s text color and weight unless the user or style guide explicitly specifies otherwise. In `updateTextStyle`, send only `textStyle.fontSize` with `fields: "fontSize"`. Leave `foregroundColor`, `bold`, and `weightedFontFamily` unset so the named style or template continues to control them. Changing a paragraph to `NORMAL_TEXT` may leave explicit character formatting intact; reset unintended inherited styling on inserted body text to match its intended body style.

Use bold for a short label, key question, or decision readers need to find quickly. Use italics for light emphasis or a brief aside. Style just the words that need emphasis, leaving the surrounding explanation in regular text.

Consolidate genuinely comparable repeated records into a readable native table.

Format exact code literals and identifiers in monospace, preserving any existing link.

#### Bulleted and numbered lists

- **Use bullets when order doesn’t matter.** Good examples are open questions, risks to discuss, or materials to bring.
- **Use numbers when order or reference matters.** Number the steps in a procedure, criteria a reviewer will score, or findings that correspond to numbered questions in the source.

Use native Google Docs lists so numbering updates when items move. If each item introduces a section rather than a list entry, preserve the document’s heading hierarchy.

#### Smart chips and dropdowns

- **Smart chips identify a specific person, date, or Google resource.** Use one when requested, when matching a template, or when it makes a working field more useful: a person chip for an owner, a date chip for a deadline, or a file chip for a source document. Use a verified email, date, or supported URL. In ordinary prose, plain text or a descriptive link is usually clearer.
- **Dropdowns let an editor choose from a defined set of values.** Use one for a field people will maintain, such as review status with “Draft,” “In review,” and “Approved.” To update one entry, change its selection. Edit the shared option list only when the user wants the choices themselves changed.

Preserve existing chips, dropdowns, and links outside the edit. Use the [native requests and readback checks](google-docs.md#file-referencesreference-smart-chips-and-building-blocksmd) to verify the chip’s value or the dropdown’s selected option.

#### References: read as needed

| When to read | Reference |
| --- | --- |
| Composing requests for text, formatting, lists, tables, hyperlinks, or images | [Connector examples](google-docs.md#file-referencesreference-direct-request-compositionmd) |
| Working with smart chips, dropdowns, or existing building blocks | [Smart chips, dropdowns, and building blocks](google-docs.md#file-referencesreference-smart-chips-and-building-blocksmd) |
| Creating Calendar-backed meeting notes using a complete request example | [Meeting-notes example](google-docs.md#file-referencesreference-meeting-notes-directmd) |
| Using the optional helper to inspect a large or complex document response | [File-backed read helper](google-docs.md#file-referencesreference-trusted-read-wrappermd) |

#### Output delivery

These citation directives are only for the final chat response to the user. Never insert them into the Google Doc. For source references inside the document, use ordinary hyperlinks or the citation style requested by the user.

- **`purpose="output"`:** use for each final Google Doc created or edited for the user. Cite it exactly once, on its own line in its own paragraph, outside prose and list items. Briefly describe the result separately without repeating its filename, path, or link. Do not use output citations for unchanged files or read-only answers.
- **`purpose="source"`:** use for each document whose contents you summarize or use to support an answer. Place the citation inline where the document is referenced, in place of its filename. Do not write the filename separately and append its citation. Files merely inspected but not used in the answer need no citation.
- Include only `path` and `purpose` inside each directive. Do not add a description, title, label, `mode`, or other attributes. Any explanatory prose belongs outside the directive.
- Emit `:codex-file-citation{...}` directly, without backticks, code fences, or a Markdown-link wrapper. Use verified targets only. No need to cite or reference intermediate work.

Set `path` to the verified native Google Docs URL returned by the connector. Citation directives are exempt from “Return web URLs as Markdown links.”

Examples below use placeholders; actual responses use verified URLs and no code fences.

```text
:codex-file-citation{path="https://docs.google.com/document/d/<verified-file-id>" purpose="output"}
```

```text
The review of :codex-file-citation{path="https://docs.google.com/document/d/<verified-file-id>" purpose="source"} is due Friday.
```

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Google Docs"
  short_description: "Read, edit, and create Google Docs files."
  icon_small: "./assets/google-docs-small.svg"
  icon_large: "./assets/google-docs.png"
  brand_color: "#1A73E8"
  default_prompt: "Use $google-docs to create or edit a native Google Doc while preserving its styles and structure."
```

### File: `host/docs-dropdown-executor.mjs`

```javascript
/* Dependency-free host executor for the Google Docs dropdown workflow. */

const CAPABILITIES = {
  getDocument: [
    "mcp__codex_apps__google_drive_get_document",
    "google_drive_get_document",
    "get_document",
  ],
  getDocumentTables: [
    "mcp__codex_apps__google_drive_get_document_tables",
    "google_drive_get_document_tables",
    "get_document_tables",
  ],
  batchUpdateDocument: [
    "mcp__codex_apps__google_drive_batch_update_document",
    "google_drive_batch_update_document",
    "batch_update_document",
  ],
  getDocumentDropdowns: [
    "mcp__codex_apps__google_drive_get_document_dropdowns",
    "google_drive_get_document_dropdowns",
    "get_document_dropdowns",
  ],
  updateDocumentDropdown: [
    "mcp__codex_apps__google_drive_update_document_dropdown",
    "google_drive_update_document_dropdown",
    "update_document_dropdown",
  ],
};

function assert(condition, message) {
  if (!condition) throw new DropdownExecutorError(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function redact(value, key = "") {
  if (Array.isArray(value)) return value.map((item) => redact(item, key));
  if (!isRecord(value)) {
    if (/token|credential|signed|authorization|cookie|option|label|text/i.test(key)) return "[REDACTED]";
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]));
}

function findFirstRecord(value, predicate) {
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return null;
    seen.add(candidate);
    if (isRecord(candidate) && predicate(candidate)) return candidate;
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(value);
}

function collectRecords(value, predicate) {
  const output = [];
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return;
    seen.add(candidate);
    if (isRecord(candidate) && predicate(candidate)) output.push(candidate);
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) visit(child);
  };
  visit(value);
  return output;
}

function unwrapResult(value) {
  if (value?.isError === true) {
    const error = new DropdownExecutorError("Connector returned isError=true", { raw: value });
    error.outcomeClass = connectorOutcome(value);
    throw error;
  }
  if (isRecord(value?.structuredContent)) return value.structuredContent;
  if (isRecord(value?.result)) return value.result;
  return value;
}

const OUTCOME_CLASSES = new Set([
  "applied",
  "rejected_before_apply",
  "stale_revision",
  "ambiguous_anchor",
  "rate_limited_before_apply",
  "unknown_application_state",
  "applied_readback_failed",
  "verification_failed",
]);

function connectorOutcome(value) {
  const record = findFirstRecord(value, (candidate) => {
    const outcome = candidate.outcomeClass ?? candidate.outcome_class ?? candidate.outcome ?? candidate.status;
    return OUTCOME_CLASSES.has(outcome);
  });
  return record ? (record.outcomeClass ?? record.outcome_class ?? record.outcome ?? record.status) : null;
}

function documentIdentity(value) {
  const root = unwrapResult(value);
  const record = findFirstRecord(root, (candidate) =>
    typeof (candidate.documentId ?? candidate.document_id) === "string" &&
    (candidate.revisionId || candidate.revision_id || candidate.body || candidate.tabs),
  );
  assert(record, "Could not locate document identity in connector result");
  return {
    documentId: record.documentId ?? record.document_id,
    title: record.title ?? null,
    revisionId: record.revisionId ?? record.revision_id ?? null,
  };
}

function dropdownReadIdentity(value) {
  const root = unwrapResult(value);
  const record = findFirstRecord(root, (candidate) =>
    typeof (candidate.documentId ?? candidate.document_id) === "string" &&
    typeof (candidate.revisionId ?? candidate.revision_id) === "string" &&
    Array.isArray(candidate.dropdowns),
  );
  assert(record, "Dropdown readback is missing document identity or revision");
  return {
    documentId: record.documentId ?? record.document_id,
    revisionId: record.revisionId ?? record.revision_id,
    tabId: record.tabId ?? record.tab_id ?? null,
  };
}

function normalizeOptions(value) {
  return (value ?? []).map((option) => ({
    label: option.label ?? option.text ?? option.value,
    ...(option.color ?? option.colorStyle ?? option.color_style ? { color: option.color ?? option.colorStyle ?? option.color_style } : {}),
    ...(option.id ?? option.optionId ?? option.option_id ? { id: option.id ?? option.optionId ?? option.option_id } : {}),
  }));
}

function dropdownRecords(value) {
  const root = unwrapResult(value);
  const records = collectRecords(root, (candidate) => Array.isArray(candidate.dropdowns)).flatMap((candidate) => candidate.dropdowns);
  if (Array.isArray(root)) records.push(...root);
  return records.filter(isRecord).map((dropdown) => {
    const range = dropdown.range ?? dropdown.locator ?? {};
    return {
      dropdownId: dropdown.dropdownId ?? dropdown.dropdown_id ?? null,
      tabId: dropdown.tabId ?? dropdown.tab_id ?? range.tabId ?? range.tab_id ?? null,
      segmentId: dropdown.segmentId ?? dropdown.segment_id ?? range.segmentId ?? range.segment_id ?? null,
      startIndex: dropdown.startIndex ?? dropdown.start_index ?? range.startIndex ?? range.start_index ?? null,
      endIndex: dropdown.endIndex ?? dropdown.end_index ?? range.endIndex ?? range.end_index ?? null,
      options: normalizeOptions(dropdown.options ?? dropdown.optionItems ?? dropdown.option_items),
      selectedValue: dropdown.selectedValue ?? dropdown.selected_value ?? dropdown.value ?? null,
      signature: dropdown.signature ?? dropdown.semanticSignature ?? dropdown.semantic_signature ?? null,
      container: dropdown.container ?? dropdown.tableCell ?? dropdown.table_cell ?? null,
    };
  });
}

function isPrivateUse(codePoint) {
  return (codePoint >= 0xE000 && codePoint <= 0xF8FF) ||
    (codePoint >= 0xF0000 && codePoint <= 0xFFFFD) ||
    (codePoint >= 0x100000 && codePoint <= 0x10FFFD);
}

function opaqueMarkers(value) {
  const output = [];
  const seen = new Set();
  const visit = (candidate, context = { tabId: null, segmentId: null }) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return;
    seen.add(candidate);
    if (Array.isArray(candidate)) return candidate.forEach((child) => visit(child, context));
    const tabId = candidate.tabProperties?.tabId ?? candidate.tab_properties?.tab_id ?? candidate.tabId ?? candidate.tab_id ?? context.tabId;
    const segmentId = candidate.segmentId ?? candidate.segment_id ?? context.segmentId;
    const content = candidate.textRun?.content;
    const base = candidate.startIndex ?? candidate.start_index;
    if (typeof content === "string" && Number.isInteger(base)) {
      let marker = null;
      for (let offset = 0; offset < content.length;) {
        const codePoint = content.codePointAt(offset);
        const character = String.fromCodePoint(codePoint);
        if (isPrivateUse(codePoint)) {
          if (!marker) marker = { startIndex: base + offset, endIndex: base + offset, markerText: "", codePoints: [] };
          marker.endIndex = base + offset + character.length;
          marker.markerText += character;
          marker.codePoints.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
        } else if (marker) {
          output.push({ tabId: tabId ?? null, segmentId: segmentId ?? null, ...marker, textStyle: candidate.textRun.textStyle ?? {} });
          marker = null;
        }
        offset += character.length;
      }
      if (marker) output.push({ tabId: tabId ?? null, segmentId: segmentId ?? null, ...marker, textStyle: candidate.textRun.textStyle ?? {} });
    }
    for (const [key, child] of Object.entries(candidate)) if (key !== "textRun") visit(child, { tabId, segmentId });
  };
  visit(unwrapResult(value));
  return output;
}

function resolveTool(tools, capability, overrides = {}) {
  const override = overrides[capability];
  if (override) {
    assert(typeof tools[override] === "function", `Capability override ${override} is unavailable`);
    return { name: override, fn: tools[override] };
  }
  for (const name of CAPABILITIES[capability] ?? []) {
    if (typeof tools[name] === "function") return { name, fn: tools[name] };
  }
  throw new DropdownExecutorError(`Required connector capability ${capability} is unavailable`);
}

async function callTool({ tools, capability, args, overrides }) {
  const resolved = resolveTool(tools, capability, overrides);
  const result = await resolved.fn(args);
  unwrapResult(result);
  const outcomeClass = connectorOutcome(result);
  if (outcomeClass && outcomeClass !== "applied") {
    const error = new DropdownExecutorError(`Connector reported ${outcomeClass}`, { raw: result });
    error.outcomeClass = outcomeClass;
    throw error;
  }
  return { capability, resolvedTool: resolved.name, args: redact(args), result };
}

function optionsEqual(left, right) {
  return stableStringify(normalizeOptions(left)) === stableStringify(normalizeOptions(right));
}

function findDropdown(records, { dropdownId = null, location = null, expected = null, signature = null } = {}) {
  const matches = records.filter((record) => {
    if (dropdownId && record.dropdownId !== dropdownId) return false;
    if (location && (record.tabId !== (location.tabId ?? null) || record.startIndex !== location.index)) return false;
    if (signature && record.signature !== signature) return false;
    if (expected?.options && !optionsEqual(record.options, expected.options)) return false;
    if (Object.prototype.hasOwnProperty.call(expected ?? {}, "selectedValue") && record.selectedValue !== expected.selectedValue) return false;
    return true;
  });
  return matches.length === 1 ? matches[0] : null;
}

function assertFrozenSemantics(documentResult, dropdownResult, contract, { ignoredBindingIds = [] } = {}) {
  const liveDropdowns = dropdownRecords(dropdownResult);
  const liveOpaque = opaqueMarkers(documentResult);
  for (const binding of contract.semanticElements ?? []) {
    if (binding.type === "dropdownControl") {
      if (ignoredBindingIds.includes(binding.bindingId)) continue;
      const match = findDropdown(liveDropdowns, {
        dropdownId: binding.semanticProperties?.dropdownId,
        location: binding.semanticProperties?.dropdownId ? null : { tabId: binding.locator?.tabId ?? null, index: binding.locator?.startIndex },
        expected: { options: binding.semanticProperties?.options, selectedValue: binding.semanticProperties?.selectedValue },
        signature: binding.semanticProperties?.dropdownId ? null : binding.semanticProperties?.signature,
      });
      assert(match, `Frozen dropdown ${binding.bindingId} is missing`);
      assert(optionsEqual(match.options, binding.semanticProperties?.options), `Frozen dropdown ${binding.bindingId} options changed`);
      assert(match.selectedValue === binding.semanticProperties?.selectedValue, `Frozen dropdown ${binding.bindingId} selected value changed`);
      if (match.signature !== null && binding.semanticProperties?.signature !== null) assert(match.signature === binding.semanticProperties.signature, `Frozen dropdown ${binding.bindingId} signature changed`);
      if (match.container !== null && binding.container !== null) assert(stableStringify(match.container) === stableStringify(binding.container), `Frozen dropdown ${binding.bindingId} container changed`);
    } else if (binding.type === "opaqueTemplateControl") {
      let match = liveOpaque.find((candidate) =>
        candidate.tabId === (binding.locator?.tabId ?? null) && candidate.segmentId === (binding.locator?.segmentId ?? null) &&
        candidate.startIndex === binding.locator?.startIndex && candidate.endIndex === binding.locator?.endIndex &&
        candidate.markerText === binding.semanticProperties?.markerText,
      );
      if (!match) {
        const shiftedMatches = liveOpaque.filter((candidate) =>
          candidate.tabId === (binding.locator?.tabId ?? null) && candidate.segmentId === (binding.locator?.segmentId ?? null) &&
          candidate.markerText === binding.semanticProperties?.markerText &&
          stableStringify(candidate.textStyle ?? {}) === stableStringify(binding.semanticProperties?.textStyle ?? {}),
        );
        if (shiftedMatches.length === 1) match = shiftedMatches[0];
      }
      assert(match, `Frozen opaque control ${binding.bindingId} is missing or changed`);
    }
  }
}

function rangesOverlap(left, right) {
  if ((left.tabId ?? null) !== (right.tabId ?? null)) return false;
  if ((left.segmentId ?? null) !== (right.segmentId ?? null)) return false;
  const leftStart = left.startIndex ?? left.index;
  const leftEnd = left.endIndex ?? ((left.index ?? 0) + 1);
  const rightStart = right.startIndex ?? right.index;
  const rightEnd = right.endIndex ?? ((right.index ?? 0) + 1);
  return leftStart < rightEnd && rightStart < leftEnd;
}

function stageRequestRange(request) {
  const payload = request.deleteContentRange ?? request.updateTextStyle ?? request.updateParagraphStyle ?? request.createParagraphBullets ?? request.deleteParagraphBullets;
  if (payload?.range) return payload.range;
  const locationPayload = request.insertText ?? request.insertTable ?? request.insertPageBreak ?? request.insertInlineImage ?? request.insertDate ?? request.insertPerson ?? request.insertRichLink;
  const location = locationPayload?.location ?? locationPayload?.endOfSegmentLocation ?? null;
  if (location && Number.isInteger(location.index)) return { ...location, startIndex: location.index, endIndex: location.index + 1 };
  const tableLocation = request.insertTableRow?.tableCellLocation?.tableStartLocation ?? request.insertTableColumn?.tableCellLocation?.tableStartLocation ?? request.deleteTableRow?.tableCellLocation?.tableStartLocation ?? request.deleteTableColumn?.tableCellLocation?.tableStartLocation;
  if (tableLocation && Number.isInteger(tableLocation.index)) return { ...tableLocation, startIndex: tableLocation.index, endIndex: tableLocation.index + 1 };
  return null;
}

function assertRangeAllowed(range, contract) {
  assert(!(contract.protectedTabIds ?? []).includes(range.tabId ?? null), "Stage targets a protected tab");
  for (const protectedRange of contract.protectedRanges ?? []) assert(!rangesOverlap(range, protectedRange), "Stage overlaps a protected range");
}

function assertOptions(value, label) {
  assert(Array.isArray(value) && value.length > 0, `${label} must contain options`);
  const options = normalizeOptions(value);
  assert(options.every((option) => typeof option.label === "string" && option.label.length > 0), `${label} contains an invalid option`);
  assert(new Set(options.map((option) => option.label)).size === options.length, `${label} contains duplicate labels`);
  return options;
}

function bindingByDropdownId(contract, dropdownId) {
  const matches = (contract.semanticElements ?? []).filter((binding) =>
    binding.type === "dropdownControl" && binding.semanticProperties?.dropdownId === dropdownId,
  );
  assert(matches.length === 1, "Dropdown target is missing or ambiguous in the frozen contract");
  return matches[0];
}

function bindingForOperation(contract, operation) {
  if (operation.dropdown_id !== undefined && operation.dropdown_id !== null) return bindingByDropdownId(contract, operation.dropdown_id);
  const matches = (contract.semanticElements ?? []).filter((binding) => binding.type === "dropdownControl" && binding.bindingId === operation.binding_id);
  assert(matches.length === 1, "Dropdown binding target is missing or ambiguous in the frozen contract");
  assert(stableStringify(matches[0].locator) === stableStringify(operation.locator), "Dropdown binding locator mismatch");
  assert(matches[0].semanticProperties?.signature === operation.semantic_signature, "Dropdown binding signature mismatch");
  return matches[0];
}

function validateHostStage(plan, contract) {
  const stage = plan.stage;
  const assertions = stage.preservationAssertions;
  assert(isRecord(assertions) && assertions.preserveUntouchedSemanticBindings === true, "Stage preservation assertions are missing");
  const actualBindingIds = [...(assertions.semanticBindingIds ?? [])].sort();
  const expectedBindingIds = (contract.semanticElements ?? []).map((binding) => binding.bindingId).sort();
  assert(stableStringify(actualBindingIds) === stableStringify(expectedBindingIds), "Stage does not freeze every semantic binding");
  assert(stage.postWriteReadback?.documentStructure === true && stage.postWriteReadback?.dropdownMetadata === true, "Stage post-write readback requirements are incomplete");

  const call = stage.call;
  assert(isRecord(call) && call.document_id === plan.target.documentId, "Stage document target mismatch");
  if (stage.type === "docs_batch_update") {
    assert(call.write_control?.requiredRevisionId === plan.target.expectedRevisionId, "Docs stage revision mismatch");
    assert(stage.expectedBefore?.revisionId === plan.target.expectedRevisionId, "Docs expected-before revision mismatch");
    assert(stage.expectedBefore?.targetBindingsHash === contract.targetBindingsHash, "Docs expected-before binding mismatch");
    assert(stage.expectedAfter?.revisionChanged === true && stage.expectedAfter?.semanticBindingsPreserved === true, "Docs expected-after assertions are incomplete");
    assert(Array.isArray(call.requests) && call.requests.length > 0, "Docs stage requests are missing");
    for (const request of call.requests) {
      assert(isRecord(request) && Object.keys(request).length === 1, "Each Docs request must contain one operation");
      assert(!request.replaceAllText && !request.replaceNamedRangeContent, "Broad Docs replacements are not allowed");
      const range = stageRequestRange(request);
      if (!range) continue;
      assertRangeAllowed(range, contract);
      for (const binding of contract.semanticElements ?? []) assert(!rangesOverlap(range, binding.locator), `Docs stage intersects semantic binding ${binding.bindingId}`);
    }
    return;
  }

  assert(call.tab_id === (plan.target.tabId ?? null), "Dropdown stage tab mismatch");
  assert(call.required_revision_id === plan.target.expectedRevisionId, "Dropdown stage revision mismatch");
  assert(typeof call.idempotency_key === "string" && call.idempotency_key.length > 0, "Dropdown stage idempotency key is missing");
  const operation = call.operation;
  assert(isRecord(operation) && Object.prototype.hasOwnProperty.call(operation, "selected_value"), "Dropdown operation is incomplete");
  const expectedType = stage.type === "dropdown_set_selected" ? "set_selected_value" : stage.type.replace("dropdown_", "");
  assert(operation.type === expectedType, "Dropdown operation type mismatch");
  const expectedOptions = assertOptions(stage.expectedAfter?.options, "expectedAfter.options");
  assert(Object.prototype.hasOwnProperty.call(stage.expectedAfter ?? {}, "selectedValue"), "expectedAfter.selectedValue is required");
  assert(stage.expectedAfter.selectedValue === (operation.selected_value ?? null), "Expected selected value mismatch");

  if (stage.type === "dropdown_create") {
    assert(isRecord(operation.location) && Number.isInteger(operation.location.index), "Create location is missing");
    assert(operation.location.tabId === (plan.target.tabId ?? null), "Create location tab mismatch");
    assertRangeAllowed({ ...operation.location, startIndex: operation.location.index, endIndex: operation.location.index + 1 }, contract);
    assert(isRecord(operation.anchor), "Create anchor is missing");
    assert(operation.expected_before?.dropdownAbsent === true, "Create expected-before condition is missing");
    assert(optionsEqual(operation.options, expectedOptions), "Create options do not match expectedAfter");
  } else {
    const binding = bindingForOperation(contract, operation);
    assertRangeAllowed(binding.locator, contract);
    assert((operation.expected_before?.dropdownId ?? null) === (binding.semanticProperties?.dropdownId ?? null), "Dropdown expected-before ID mismatch");
    assert(operation.expected_before?.bindingId === binding.bindingId, "Dropdown expected-before binding mismatch");
    assert(optionsEqual(operation.expected_before?.options, binding.semanticProperties?.options), "Dropdown expected-before options mismatch");
    assert(operation.expected_before?.selectedValue === binding.semanticProperties?.selectedValue, "Dropdown expected-before selection mismatch");
    if (binding.semanticProperties?.signature !== null) assert(operation.expected_before?.signature === binding.semanticProperties.signature, "Dropdown expected-before signature mismatch");
    if (stage.type === "dropdown_replace_options") assert(optionsEqual(operation.options, expectedOptions), "Replacement options do not match expectedAfter");
    else assert(optionsEqual(binding.semanticProperties?.options, expectedOptions), "Selection stage must preserve options");
  }
  if (operation.selected_value !== null) assert(expectedOptions.some((option) => option.label === operation.selected_value), "Selected value is not in the expected option set");
}

function validateHostInputs(plan, contract, validation) {
  assert(plan?.version === 1 && plan?.kind === "google-docs-v2-dropdown-plan", "Unsupported plan");
  assert(contract?.contractVersion === 1, "Unsupported contract");
  assert(validation?.validationVersion === 1, "Unsupported validation sidecar");
  assert(plan.target?.documentId === contract.target?.documentId, "Plan target does not match contract");
  assert(plan.target?.title === contract.target?.title, "Plan title does not match contract");
  assert((plan.target?.tabId ?? null) === (contract.target?.selectedTabId ?? null), "Plan tab does not match contract");
  assert(plan.target?.expectedRevisionId === contract.target?.revisionId, "Plan revision does not match contract");
  assert(plan.baseSnapshot?.sha256 === contract.target?.inventorySha256, "Plan snapshot does not match contract inventory");
  assert(plan.contract?.targetBindingsHash === contract.targetBindingsHash, "Plan target binding does not match contract");
  assert(plan.contract?.decisionHash === contract.decisionHash, "Plan decision hash does not match contract");
  assert(!contract.sourceDocumentIds?.includes(plan.target.documentId), "Target document is source-denylisted");
  assert(["docs_batch_update", "dropdown_create", "dropdown_replace_options", "dropdown_set_selected"].includes(plan.stage?.type), "Unsupported stage type");
  assert(validation.summary?.documentId === plan.target.documentId, "Validation summary target mismatch");
  assert(validation.summary?.stageId === plan.stage.id && validation.summary?.stageType === plan.stage.type, "Validation summary stage mismatch");
  validateHostStage(plan, contract);
}

function classifyFailure(error, fallback = "rejected_before_apply") {
  if (OUTCOME_CLASSES.has(error?.outcomeClass)) return error.outcomeClass;
  const message = String(error?.message ?? error).toLowerCase();
  if (message.includes("stale") || message.includes("revision")) return "stale_revision";
  if (message.includes("rate") || message.includes("429")) return "rate_limited_before_apply";
  if (message.includes("ambiguous")) return "ambiguous_anchor";
  return fallback;
}

function mutationCapability(stage) {
  return stage.type === "docs_batch_update" ? "batchUpdateDocument" : "updateDocumentDropdown";
}

function mutationArgs(stage) {
  return stage.call;
}

function assertExpectedAfter(plan, preDropdowns, postDropdowns, mutationResult) {
  const stage = plan.stage;
  if (stage.type === "docs_batch_update") return;
  const operation = stage.call.operation;
  const expected = stage.expectedAfter;
  let dropdownId = operation.dropdown_id ?? null;
  if (!dropdownId) {
    const mutationRecords = dropdownRecords(mutationResult);
    dropdownId = mutationRecords[0]?.dropdownId ?? null;
  }
  const target = findDropdown(postDropdowns, {
    dropdownId,
    location: stage.type === "dropdown_create"
      ? operation.location
      : (!dropdownId && operation.locator ? { tabId: operation.locator.tabId ?? null, index: operation.locator.startIndex } : null),
    expected,
    signature: null,
  });
  assert(target, "Post-write dropdown readback does not satisfy expectedAfter");
  if (stage.type === "dropdown_create") {
    const existed = findDropdown(preDropdowns, { dropdownId: target.dropdownId });
    assert(!existed, "Create operation did not produce a new dropdown identity");
  }
}

export class DropdownExecutorError extends Error {
  constructor(message, { receipt = null, checkpoints = [], raw = null } = {}) {
    super(message);
    this.name = "DropdownExecutorError";
    this.receipt = receipt;
    this.checkpoints = checkpoints;
    this.raw = raw;
  }
}

export async function executeDocsDropdownPlan({
  plan,
  contract,
  validation,
  tools,
  capabilityOverrides = {},
} = {}) {
  validateHostInputs(plan, contract, validation);
  const checkpoints = [];
  const startedAt = new Date().toISOString();
  let revisionBefore = plan.target.expectedRevisionId;
  let revisionAfter = null;
  const receipt = (status, error = null) => ({
    receiptVersion: 1,
    kind: "google-docs-v2-dropdown-execution",
    status,
    stageId: plan.stage.id,
    stageType: plan.stage.type,
    target: {
      documentId: plan.target.documentId,
      tabId: plan.target.tabId ?? null,
      revisionBefore,
      revisionAfter,
    },
    hashes: {
      targetBindingsHash: contract.targetBindingsHash,
      decisionHash: contract.decisionHash,
      planFileSha256: validation.planFileSha256,
    },
    startedAt,
    completedAt: new Date().toISOString(),
    error: error ? {
      name: error.name ?? "Error",
      outcomeClass: error.outcomeClass ?? status,
      message: "Execution did not reach a verified applied state; inspect protected stage artifacts.",
    } : null,
  });

  let preDocument;
  let preDropdownsCall;
  let preTables = null;
  try {
    preDocument = await callTool({ tools, capability: "getDocument", args: { document_id: plan.target.documentId }, overrides: capabilityOverrides });
    preDropdownsCall = await callTool({
      tools,
      capability: "getDocumentDropdowns",
      args: { document_id: plan.target.documentId, ...(plan.target.tabId ? { tab_id: plan.target.tabId } : {}) },
      overrides: capabilityOverrides,
    });
    if (plan.stage.postWriteReadback?.tables === true) {
      preTables = await callTool({
        tools,
        capability: "getDocumentTables",
        args: { document_id: plan.target.documentId, ...(plan.target.tabId ? { tab_id: plan.target.tabId } : {}) },
        overrides: capabilityOverrides,
      });
    }
    checkpoints.push({ phase: "preflight-document", ...preDocument }, { phase: "preflight-dropdowns", ...preDropdownsCall });
    if (preTables) checkpoints.push({ phase: "preflight-tables", ...preTables });
    const identity = documentIdentity(preDocument.result);
    const dropdownIdentity = dropdownReadIdentity(preDropdownsCall.result);
    assert(identity.documentId === plan.target.documentId, "Preflight returned the wrong document");
    assert(identity.revisionId === plan.target.expectedRevisionId, "Preflight revision is stale");
    assert(identity.title === plan.target.title, "Preflight title changed");
    assert(dropdownIdentity.documentId === identity.documentId, "Preflight dropdown metadata belongs to the wrong document");
    assert(dropdownIdentity.revisionId === identity.revisionId, "Preflight document and dropdown revisions differ");
    if (plan.target.tabId !== null && plan.target.tabId !== undefined) assert(dropdownIdentity.tabId === null || dropdownIdentity.tabId === plan.target.tabId, "Preflight dropdown metadata belongs to the wrong tab");
    revisionBefore = identity.revisionId;
    assertFrozenSemantics(preDocument.result, preDropdownsCall.result, contract);
  } catch (error) {
    const status = classifyFailure(error);
    throw new DropdownExecutorError(error.message ?? String(error), { receipt: receipt(status, error), checkpoints, raw: error.raw ?? null });
  }

  let mutation;
  try {
    mutation = await callTool({
      tools,
      capability: mutationCapability(plan.stage),
      args: mutationArgs(plan.stage),
      overrides: capabilityOverrides,
    });
    checkpoints.push({ phase: "mutation", ...mutation });
  } catch (error) {
    const outcomeClass = classifyFailure(error, "unknown_application_state");
    if (["rejected_before_apply", "stale_revision", "ambiguous_anchor", "rate_limited_before_apply"].includes(outcomeClass)) {
      throw new DropdownExecutorError(error.message ?? String(error), {
        receipt: receipt(outcomeClass, error),
        checkpoints,
        raw: error.raw ?? null,
      });
    }
    throw new DropdownExecutorError(`Mutation outcome is ambiguous: ${error.message ?? String(error)}`, {
      receipt: receipt(outcomeClass === "applied_readback_failed" ? "applied_readback_failed" : "unknown_application_state", error),
      checkpoints,
      raw: error.raw ?? null,
    });
  }

  let postDocument;
  let postDropdownsCall;
  let postTables = null;
  try {
    postDocument = await callTool({ tools, capability: "getDocument", args: { document_id: plan.target.documentId }, overrides: capabilityOverrides });
    postDropdownsCall = await callTool({
      tools,
      capability: "getDocumentDropdowns",
      args: { document_id: plan.target.documentId, ...(plan.target.tabId ? { tab_id: plan.target.tabId } : {}) },
      overrides: capabilityOverrides,
    });
    if (plan.stage.postWriteReadback?.tables === true) {
      postTables = await callTool({
        tools,
        capability: "getDocumentTables",
        args: { document_id: plan.target.documentId, ...(plan.target.tabId ? { tab_id: plan.target.tabId } : {}) },
        overrides: capabilityOverrides,
      });
    }
    checkpoints.push({ phase: "post-document", ...postDocument }, { phase: "post-dropdowns", ...postDropdownsCall });
    if (postTables) checkpoints.push({ phase: "post-tables", ...postTables });
  } catch (error) {
    throw new DropdownExecutorError(error.message ?? String(error), { receipt: receipt("applied_readback_failed", error), checkpoints, raw: error.raw ?? null });
  }

  try {
    const identity = documentIdentity(postDocument.result);
    const dropdownIdentity = dropdownReadIdentity(postDropdownsCall.result);
    assert(identity.documentId === plan.target.documentId, "Post-write readback returned the wrong document");
    assert(identity.revisionId && identity.revisionId !== revisionBefore, "Post-write revision did not change");
    assert(dropdownIdentity.documentId === identity.documentId, "Post-write dropdown metadata belongs to the wrong document");
    assert(dropdownIdentity.revisionId === identity.revisionId, "Post-write document and dropdown revisions differ");
    if (plan.target.tabId !== null && plan.target.tabId !== undefined) assert(dropdownIdentity.tabId === null || dropdownIdentity.tabId === plan.target.tabId, "Post-write dropdown metadata belongs to the wrong tab");
    revisionAfter = identity.revisionId;
    const preRecords = dropdownRecords(preDropdownsCall.result);
    const postRecords = dropdownRecords(postDropdownsCall.result);
    assertExpectedAfter(plan, preRecords, postRecords, mutation.result);
    const ignoredBindingIds = ["dropdown_replace_options", "dropdown_set_selected"].includes(plan.stage.type)
      ? [bindingForOperation(contract, plan.stage.call.operation).bindingId]
      : [];
    assertFrozenSemantics(postDocument.result, postDropdownsCall.result, contract, { ignoredBindingIds });
    return { receipt: receipt("applied"), checkpoints };
  } catch (error) {
    throw new DropdownExecutorError(error.message ?? String(error), { receipt: receipt("verification_failed", error), checkpoints, raw: error.raw ?? null });
  }
}

export async function reconcileUnknownDropdownMutation({ plan, contract, validation, tools, capabilityOverrides = {} } = {}) {
  validateHostInputs(plan, contract, validation);
  assert(plan.stage.type !== "docs_batch_update", "Only dropdown mutations support semantic reconciliation");
  const read = await callTool({
    tools,
    capability: "getDocumentDropdowns",
    args: { document_id: plan.target.documentId, ...(plan.target.tabId ? { tab_id: plan.target.tabId } : {}) },
    overrides: capabilityOverrides,
  });
  const records = dropdownRecords(read.result);
  try {
    assertExpectedAfter(plan, [], records, null);
    return { status: "applied", resolvedTool: read.resolvedTool };
  } catch {
    return { status: "not_proven", resolvedTool: read.resolvedTool };
  }
}
```

### File: `host/docs-dropdown-file-bridge.mjs`

```javascript
/* Dependency-free file bridge for the Google Docs dropdown executor. */

const HASH_RE = /^[a-f0-9]{64}$/;
const TRUSTED_EXECUTOR_PATH = decodeURIComponent(new URL("./docs-dropdown-executor.mjs", import.meta.url).pathname);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function normalizePath(path) {
  assert(typeof path === "string" && path.startsWith("/"), "Bridge paths must be absolute");
  assert(!path.split("/").includes(".."), "Bridge paths must not contain ..");
  return path.replace(/\/+$/, "") || "/";
}

function assertWithin(root, path) {
  const normalizedRoot = normalizePath(root);
  const normalizedPath = normalizePath(path);
  assert(normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`), `${normalizedPath} is outside workspace root ${normalizedRoot}`);
  return normalizedPath;
}

function resolveTool(tools, names) {
  for (const name of names) if (typeof tools[name] === "function") return tools[name];
  throw new Error(`Required mounted tool is unavailable: ${names.join(", ")}`);
}

async function defaultIo(tools) {
  const exec = resolveTool(tools, ["exec_command", "mcp__exec_command"]);
  const patch = resolveTool(tools, ["apply_patch", "mcp__apply_patch"]);
  return {
    async exists(path) {
      const result = await exec({ cmd: `/usr/bin/test -e ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 1000 });
      return result.exit_code === 0;
    },
    async mkdir(path) {
      const result = await exec({ cmd: `/bin/mkdir -p ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 1000 });
      assert(result.exit_code === 0, `Could not create bridge directory: ${result.output ?? ""}`);
      const protectedResult = await exec({ cmd: `/bin/chmod 700 ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 1000 });
      assert(protectedResult.exit_code === 0, `Could not protect bridge directory: ${protectedResult.output ?? ""}`);
    },
    async readText(path) {
      const result = await exec({ cmd: `/bin/cat ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 100000 });
      assert(result.exit_code === 0, `Could not read ${path}: ${result.output ?? ""}`);
      return result.output;
    },
    async sha256(path) {
      const result = await exec({ cmd: `/usr/bin/shasum -a 256 ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 1000 });
      assert(result.exit_code === 0, `Could not hash ${path}: ${result.output ?? ""}`);
      const hash = String(result.output ?? "").trim().split(/\s+/)[0];
      assert(HASH_RE.test(hash), `Invalid SHA-256 output for ${path}`);
      return hash;
    },
    async writeNew(path, text) {
      assert(!(await this.exists(path)), `Refusing to overwrite ${path}`);
      const body = String(text).split("\n").map((line) => `+${line}`).join("\n");
      await patch(`*** Begin Patch\n*** Add File: ${path}\n${body}\n*** End Patch`);
      const result = await exec({ cmd: `/bin/chmod 600 ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 1000 });
      assert(result.exit_code === 0, `Could not protect ${path}: ${result.output ?? ""}`);
    },
    async seal(path) {
      const result = await exec({ cmd: `/bin/chmod -R a-w ${shellQuote(path)}`, workdir: "/", yield_time_ms: 1000, max_output_tokens: 1000 });
      assert(result.exit_code === 0, `Could not seal ${path}: ${result.output ?? ""}`);
    },
  };
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label}: ${error.message}`);
  }
}

function loadExecutor(source) {
  assert(typeof source === "string" && source.includes("executeDocsDropdownPlan"), "Executor source is incomplete");
  const normalized = source.replace(/^\s*export\s+/gm, "");
  return new Function(`${normalized}\nreturn { executeDocsDropdownPlan, reconcileUnknownDropdownMutation };`)();
}

function checkpointFileName(checkpoint, index) {
  const safe = String(checkpoint.phase ?? checkpoint.capability ?? `checkpoint-${index}`).replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `${String(index + 1).padStart(2, "0")}-${safe}.json`;
}

async function persistResult(io, outputDir, execution, error = null) {
  const checkpoints = execution?.checkpoints ?? error?.checkpoints ?? [];
  const files = [];
  for (const [index, checkpoint] of checkpoints.entries()) {
    const path = `${outputDir}/${checkpointFileName(checkpoint, index)}`;
    await io.writeNew(path, `${JSON.stringify(checkpoint.result ?? checkpoint, null, 2)}\n`);
    files.push({ kind: "checkpoint", phase: checkpoint.phase ?? null, path });
  }
  const receipt = execution?.receipt ?? error?.receipt ?? {
    receiptVersion: 1,
    kind: "google-docs-v2-dropdown-execution",
    status: "bridge_failed",
    error: {
      name: error?.name ?? "Error",
      message: "Bridge validation or execution failed; inspect protected stage artifacts.",
    },
  };
  const receiptPath = `${outputDir}/receipt.json`;
  await io.writeNew(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  files.push({ kind: "receipt", path: receiptPath });
  return { receipt, files };
}

export async function executeDocsDropdownPlanFromFiles({
  workspaceRoot,
  planPath,
  validationPath,
  contractPath,
  executionContextPath,
  executorPath,
  outputDir,
  tools,
  capabilityOverrides = {},
  io: ioOverride = null,
} = {}) {
  const root = normalizePath(workspaceRoot);
  const paths = {
    planPath: assertWithin(root, planPath),
    validationPath: assertWithin(root, validationPath),
    contractPath: assertWithin(root, contractPath),
    executionContextPath: assertWithin(root, executionContextPath),
    outputDir: assertWithin(root, outputDir),
  };
  const normalizedExecutorPath = normalizePath(executorPath);
  assert(normalizedExecutorPath === TRUSTED_EXECUTOR_PATH, "Only the checked-in Google Docs dropdown executor is trusted");
  const io = ioOverride ?? await defaultIo(tools);
  assert(!(await io.exists(paths.outputDir)), `Output directory already exists: ${paths.outputDir}`);
  await io.mkdir(paths.outputDir);

  let execution = null;
  let caught = null;
  try {
    const [planText, validationText, contractText, contextText, executorSource] = await Promise.all([
      io.readText(paths.planPath),
      io.readText(paths.validationPath),
      io.readText(paths.contractPath),
      io.readText(paths.executionContextPath),
      io.readText(normalizedExecutorPath),
    ]);
    const plan = parseJson(planText, paths.planPath);
    const validation = parseJson(validationText, paths.validationPath);
    const contract = parseJson(contractText, paths.contractPath);
    const context = parseJson(contextText, paths.executionContextPath);
    assert(context.version === 1 && context.kind === "google-docs-v2-dropdown-execution-context", "Invalid execution context");
    assert(context.workspaceRoot === root, "Execution context workspace root mismatch");
    assert(context.targetDocumentId === plan.target?.documentId, "Execution context target mismatch");
    assert(context.executorPath === normalizedExecutorPath, "Execution context executor path mismatch");
    const hashes = await Promise.all([
      io.sha256(paths.planPath),
      io.sha256(paths.validationPath),
      io.sha256(paths.contractPath),
      io.sha256(normalizedExecutorPath),
    ]);
    assert(validation.planFileSha256 === hashes[0], "Plan file hash mismatch");
    assert(validation.contractFileSha256 === hashes[2], "Contract file hash mismatch");
    assert(validation.executorFileSha256 === hashes[3], "Executor file hash mismatch");
    assert(HASH_RE.test(hashes[1]), "Validation file hash is invalid");
    const executor = loadExecutor(executorSource);
    execution = await executor.executeDocsDropdownPlan({ plan, contract, validation, tools, capabilityOverrides });
  } catch (error) {
    caught = error;
  }

  const persisted = await persistResult(io, paths.outputDir, execution, caught);
  const manifest = {
    manifestVersion: 1,
    kind: "google-docs-v2-dropdown-bridge-manifest",
    status: persisted.receipt.status,
    stageId: persisted.receipt.stageId ?? null,
    stageType: persisted.receipt.stageType ?? null,
    hashes: persisted.receipt.hashes ?? null,
    outputDir: paths.outputDir,
    receiptPath: `${paths.outputDir}/receipt.json`,
    files: persisted.files,
    checkpointCount: persisted.files.filter((file) => file.kind === "checkpoint").length,
    error: caught ? { name: caught.name ?? "Error", message: String(caught.message ?? caught) } : null,
    sanitized: true,
  };
  if (manifest.error) manifest.error.message = "Bridge execution failed; inspect the protected receipt and checkpoints.";
  const manifestPath = `${paths.outputDir}/manifest.json`;
  await io.writeNew(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  if (typeof io.seal === "function") await io.seal(paths.outputDir);
  if (caught) {
    const error = new Error("Google Docs dropdown bridge execution failed");
    error.manifest = manifest;
    throw error;
  }
  return { ...manifest, manifestPath };
}
```

### File: `host/docs-stdin-receiver.pl`

```perl
#!/usr/bin/perl

use strict;
use warnings;
use Fcntl qw(O_CREAT O_EXCL O_WRONLY);
use Digest::SHA;
use MIME::Base64 qw(decode_base64);

use constant READY_MARKER => "DOCS_BRIDGE_READY";
use constant COMMITTED_MARKER => "DOCS_BRIDGE_COMMITTED";
use constant ERROR_MARKER => "DOCS_BRIDGE_ERROR";
use constant MAX_RECORD_BYTES => 1024 * 1024;

sub fail {
  my ($code, $reason) = @_;
  print STDERR ERROR_MARKER . " $reason\n";
  exit $code;
}

@ARGV == 4 or fail(64, "invalid-arguments");
my ($output_path, $expected_bytes, $expected_sha256, $temporary_path) = @ARGV;
$expected_bytes =~ /^\d+$/ or fail(65, "invalid-expected-bytes");
$expected_sha256 =~ /^[a-f0-9]{64}$/ or fail(65, "invalid-expected-sha256");
for my $path ($output_path, $temporary_path) {
  $path !~ /[\0\r\n]/ or fail(65, "invalid-path");
}
my $owns_temporary = 0;
my $committed = 0;
(!-e $output_path and !-e $temporary_path) or fail(66, "destination-exists");

umask 0077;
sysopen(my $output, $temporary_path, O_WRONLY | O_CREAT | O_EXCL, 0600)
  or fail(67, "temporary-create-failed");
$owns_temporary = 1;
binmode($output);

END { unlink $temporary_path if $owns_temporary && !$committed; }
$SIG{HUP} = sub { exit 129 };
$SIG{TERM} = sub { exit 143 };

system("/bin/stty", "raw", "-echo") == 0 or fail(69, "tty-required");
$| = 1;
print READY_MARKER . "\n";

my $buffer = "";
my $next_sequence = 0;
my $bytes_written = 0;
my $sha256 = Digest::SHA->new(256);

while (1) {
  my $read = sysread(STDIN, my $chunk, 64 * 1024);
  defined($read) or fail(78, "stdin-read-failed");
  $read > 0 or fail(78, "unexpected-eof");
  $buffer .= $chunk;
  length($buffer) <= MAX_RECORD_BYTES or fail(70, "record-too-large");

  while ((my $separator = index($buffer, "\x03")) >= 0) {
    my $record = substr($buffer, 0, $separator, "");
    substr($buffer, 0, 1, "");
    if ($record =~ /^D\t(\d+)\t([A-Za-z0-9+\/]*={0,2})$/) {
      my ($sequence, $payload) = ($1, $2);
      $sequence == $next_sequence or fail(70, "invalid-sequence");
      length($payload) % 4 == 0 or fail(70, "invalid-base64-length");
      my $decoded = decode_base64($payload);
      my $offset = 0;
      while ($offset < length($decoded)) {
        my $written = syswrite($output, $decoded, length($decoded) - $offset, $offset);
        defined($written) && $written > 0 or fail(71, "write-failed");
        $offset += $written;
      }
      $bytes_written += length($decoded);
      $sha256->add($decoded);
      $next_sequence += 1;
      next;
    }
    if ($record eq "C") {
      close($output) or fail(71, "close-failed");
      $bytes_written == $expected_bytes or fail(72, "byte-count-mismatch");
      my $actual_sha256 = $sha256->hexdigest;
      $actual_sha256 eq $expected_sha256 or fail(74, "sha256-mismatch");
      link($temporary_path, $output_path) or fail(75, "publish-failed");
      unlink($temporary_path) or fail(75, "temporary-cleanup-failed");
      $committed = 1;
      print COMMITTED_MARKER . " $bytes_written $actual_sha256\n";
      exit 0;
    }
    $record eq "A" and fail(76, "aborted");
    fail(77, "invalid-record");
  }
}
```

### File: `host/docs-trusted-read-file-bridge.mjs`

```javascript
/*
 * Dependency-free file bridge for Google Docs trusted reads.
 *
 * The bridge invokes authenticated connector reads inside the code-mode isolate,
 * persists rich responses through a private no-echo receiver, and returns only
 * compact control awareness plus immutable file metadata.
 */

const BRIDGE_VERSION = "3.6";
const DEFAULT_MAX_READ_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_WRITE_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_WRITE_STDIN_CHARS = 512 * 1024;
const MAX_WRITE_STDIN_CHARS = 1024 * 1024;
const DEFAULT_RECEIVER_POLL_ATTEMPTS = 4;
const WRITE_STDIN_RECORD_SEPARATOR = "\u0003";
const RECEIVER_READY_MARKER = "DOCS_BRIDGE_READY";
const RECEIVER_COMMITTED_MARKER = "DOCS_BRIDGE_COMMITTED";
const TRUSTED_SOURCE_SHA256 = new Map([
  ["/host/docs-trusted-read-wrapper.mjs", "c7c1affe5fd3e37924f005c27aa0d6ffbc10e1d2d7ca8fb55d8f38f288ca2ead"],
  ["/runtime/docs-read-normalizer.mjs", "324de06dedc0476c91f7f3d2fe4b15c4cb992ace2afb9e57df498a994020878a"],
]);

export class DocsTrustedReadBridgeError extends Error {
  constructor(message, { path = null, operation = null, cause = null } = {}) {
    super(redactText(message));
    this.name = "DocsTrustedReadBridgeError";
    this.path = path;
    this.operation = operation;
    this.cause = cause;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assert(condition, message, details = {}) {
  if (!condition) throw new DocsTrustedReadBridgeError(message, details);
}

function redactText(value) {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => /(?:x-goog-|x-amz-|access_token=|signature=)/i.test(url) ? "[EPHEMERAL_URL_REDACTED]" : url)
    .replace(/\b(authorization\s*:\s*bearer|bearer)\s+[A-Za-z0-9._~+\/=:-]+/gi, "$1 [REDACTED]")
    .replace(/\b(x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^\s"',;}\]]*/gi, "$1=[REDACTED]");
}

function normalizeAbsolutePath(value, label) {
  assert(typeof value === "string" && value.startsWith("/"), `${label} must be an absolute path`, { path: value, operation: "validate-path" });
  assert(!/[\0\r\n]/.test(value), `${label} contains an invalid path character`, { path: value, operation: "validate-path" });
  const parts = [];
  for (const part of value.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

function assertWithinRoot(path, root, label) {
  const normalizedPath = normalizeAbsolutePath(path, label);
  const normalizedRoot = normalizeAbsolutePath(root, `${label} root`);
  assert(
    normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`),
    `${label} must stay within ${normalizedRoot}`,
    { path: normalizedPath, operation: "validate-path" },
  );
  return normalizedPath;
}

function dirname(path) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

function joinPath(root, child) {
  assert(typeof child === "string" && child.length > 0 && !child.includes("/"), "Output filename must be one path segment", { path: child, operation: "join-path" });
  return `${root.replace(/\/+$/, "")}/${child}`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function utf8Bytes(text) {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text);
  const bytes = [];
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }
    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint <= 0xffff) bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    else bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
  }
  return Uint8Array.from(bytes);
}

function base64Text(text) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = utf8Bytes(text);
  const chunks = [];
  let chunk = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;
    chunk += alphabet[first >> 2];
    chunk += alphabet[((first & 0x03) << 4) | (second >> 4)];
    chunk += hasSecond ? alphabet[((second & 0x0f) << 2) | (third >> 6)] : "=";
    chunk += hasThird ? alphabet[third & 0x3f] : "=";
    if (chunk.length >= 8192) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks.join("");
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256Text(text) {
  const bytes = utf8Bytes(text);
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const bitLength = BigInt(bytes.length) * 8n;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Number((bitLength >> 32n) & 0xffffffffn));
  view.setUint32(paddedLength - 4, Number(bitLength & 0xffffffffn));
  const state = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const words = new Uint32Array(64);
  const rotateRight = (input, shift) => (input >>> shift) | (input << (32 - shift));
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
  }
  return [...state].map((value) => value.toString(16).padStart(8, "0")).join("");
}

function fileArtifact(path, text) {
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  return {
    path,
    text: normalized,
    metadata: { path, bytes: utf8Bytes(normalized).length, sha256: sha256Text(normalized) },
  };
}

function jsonArtifact(path, value) {
  return fileArtifact(path, JSON.stringify(value, null, 2));
}

function compactError(error) {
  return {
    name: error?.name ?? "Error",
    message: redactText(error?.message ?? String(error)),
    operation: error?.operation ?? null,
  };
}

function moduleFactory(source, exports, label) {
  assert(typeof source === "string" && source.length > 0, `${label} source is empty`, { operation: "evaluate-module" });
  assert(!/^\s*import\s/m.test(source), `${label} must remain dependency-free`, { operation: "evaluate-module" });
  try {
    const executableSource = source
      .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, "")
      .replace(/^\s*export\s+/gm, "");
    return new Function(`${executableSource}\nreturn { ${exports.join(", ")} };`)();
  } catch (error) {
    throw new DocsTrustedReadBridgeError(`Could not evaluate ${label}: ${error?.message ?? String(error)}`, { operation: "evaluate-module", cause: error });
  }
}

async function loadTrustedModule(fileIO, path, exports, label) {
  const trusted = [...TRUSTED_SOURCE_SHA256].find(([suffix]) => path.endsWith(suffix));
  assert(trusted, `${label} path is not trusted`, { path, operation: "evaluate-module" });
  const source = await fileIO.readText(path);
  assert(sha256Text(source) === trusted[1], `${label} source hash does not match the Google Docs trust catalog`, { path, operation: "evaluate-module" });
  return moduleFactory(source, exports, label);
}

export function createToolBackedFileIO({
  tools,
  workspaceRoot,
  skillRoot,
  receiverPath,
  maxReadBytes = DEFAULT_MAX_READ_BYTES,
  maxWriteBytes = DEFAULT_MAX_WRITE_BYTES,
  maxWriteStdinChars = DEFAULT_MAX_WRITE_STDIN_CHARS,
} = {}) {
  assert(isRecord(tools), "tools is required", { operation: "create-file-io" });
  assert(typeof tools.exec_command === "function", "tools.exec_command is required", { operation: "create-file-io" });
  assert(typeof tools.write_stdin === "function", "tools.write_stdin is required", { operation: "create-file-io" });
  assert(Number.isInteger(maxWriteStdinChars) && maxWriteStdinChars >= 128 && maxWriteStdinChars <= MAX_WRITE_STDIN_CHARS, "maxWriteStdinChars is invalid", { operation: "create-file-io" });
  const workspace = normalizeAbsolutePath(workspaceRoot, "workspaceRoot");
  const skill = normalizeAbsolutePath(skillRoot, "skillRoot");
  const receiver = assertWithinRoot(receiverPath, skill, "receiverPath");
  const preparedParents = new Set();

  const validateReadable = (path) => {
    const normalized = normalizeAbsolutePath(path, "read path");
    assert(
      normalized === workspace || normalized.startsWith(`${workspace}/`) || normalized === skill || normalized.startsWith(`${skill}/`),
      "Read path is outside the allowed roots",
      { path: normalized, operation: "read-file" },
    );
    return normalized;
  };
  const validateWritable = (path) => assertWithinRoot(path, workspace, "write path");
  const run = (cmd, maxOutputTokens = 2000) => tools.exec_command({
    cmd,
    workdir: workspace,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: maxOutputTokens,
  });

  const waitForMarker = async ({ initial, sessionId, marker, operation }) => {
    let result = initial;
    let output = String(result?.output ?? "");
    for (let attempt = 0; attempt <= DEFAULT_RECEIVER_POLL_ATTEMPTS; attempt += 1) {
      if (output.includes(marker)) return { result, output };
      if (result?.exit_code !== null && result?.exit_code !== undefined) break;
      result = await tools.write_stdin({ session_id: sessionId, chars: "", yield_time_ms: 1000, max_output_tokens: 1000 });
      output += String(result?.output ?? "");
    }
    throw new DocsTrustedReadBridgeError(`Streaming receiver did not report ${marker}`, { operation });
  };

  const streamText = async (path, text) => {
    const absolute = validateWritable(path);
    const normalized = text.endsWith("\n") ? text : `${text}\n`;
    const bytes = utf8Bytes(normalized).length;
    assert(bytes <= maxWriteBytes, `${absolute} exceeds the bridge writer limit`, { path: absolute, operation: "write-file" });
    const encoded = base64Text(normalized);
    const expectedSha256 = sha256Text(normalized);
    const temporary = `${absolute}.docs-bridge-${expectedSha256.slice(0, 16)}.tmp`;
    const parent = dirname(absolute);
    if (!preparedParents.has(parent)) {
      const mkdir = await run(`/bin/mkdir -p ${shellQuote(parent)}`, 1000);
      assert(mkdir.exit_code === 0, `Could not create bridge output directory: ${mkdir.output ?? ""}`, { path: parent, operation: "write-file" });
      preparedParents.add(parent);
    }
    const start = await tools.exec_command({
      cmd: `/usr/bin/perl ${shellQuote(receiver)} ${shellQuote(absolute)} ${shellQuote(String(bytes))} ${shellQuote(expectedSha256)} ${shellQuote(temporary)}`,
      workdir: workspace,
      login: false,
      tty: true,
      yield_time_ms: 1000,
      max_output_tokens: 1000,
    });
    if (String(start?.output ?? "").includes("DOCS_BRIDGE_ERROR destination-exists")) {
      throw new DocsTrustedReadBridgeError("Refusing to overwrite a bridge artifact", { path: absolute, operation: "write-file" });
    }
    const sessionId = start?.session_id;
    assert(Number.isInteger(sessionId), "Could not start the no-echo receiver", { path: absolute, operation: "write-file" });
    try {
      await waitForMarker({ initial: start, sessionId, marker: RECEIVER_READY_MARKER, operation: "write-file" });
      const chunkChars = Math.floor((maxWriteStdinChars - 64) / 4) * 4;
      let sequence = 0;
      for (let offset = 0; offset < encoded.length; offset += chunkChars) {
        const frame = `D\t${sequence}\t${encoded.slice(offset, offset + chunkChars)}${WRITE_STDIN_RECORD_SEPARATOR}`;
        const result = await tools.write_stdin({ session_id: sessionId, chars: frame, yield_time_ms: 250, max_output_tokens: 1000 });
        assert(result?.exit_code === null || result?.exit_code === undefined, "Receiver exited before commit", { path: absolute, operation: "write-file" });
        sequence += 1;
      }
      const commit = await tools.write_stdin({ session_id: sessionId, chars: `C${WRITE_STDIN_RECORD_SEPARATOR}`, yield_time_ms: 30000, max_output_tokens: 1000 });
      const completed = await waitForMarker({ initial: commit, sessionId, marker: RECEIVER_COMMITTED_MARKER, operation: "write-file" });
      const receipt = new RegExp(`${RECEIVER_COMMITTED_MARKER}\\s+(\\d+)\\s+([a-f0-9]{64})`, "i").exec(completed.output);
      assert(receipt && Number(receipt[1]) === bytes && receipt[2].toLowerCase() === expectedSha256, "Receiver commit receipt did not match", { path: absolute, operation: "write-file" });
      assert(completed.result?.exit_code === 0, "Receiver did not exit cleanly", { path: absolute, operation: "write-file" });
      return { path: absolute, bytes, sha256: expectedSha256 };
    } catch (error) {
      try {
        await tools.write_stdin({ session_id: sessionId, chars: `A${WRITE_STDIN_RECORD_SEPARATOR}`, yield_time_ms: 1000, max_output_tokens: 1000 });
      } catch {}
      await run(`/bin/rm -f -- ${shellQuote(temporary)}`, 1000);
      throw error;
    }
  };

  return {
    async readText(path) {
      const absolute = validateReadable(path);
      const size = await run(`/usr/bin/wc -c < ${shellQuote(absolute)}`, 1000);
      assert(size.exit_code === 0, `Could not stat ${absolute}`, { path: absolute, operation: "read-file" });
      const expectedBytes = Number(String(size.output).trim());
      assert(Number.isInteger(expectedBytes) && expectedBytes >= 0 && expectedBytes <= maxReadBytes, `Invalid or oversized read for ${absolute}`, { path: absolute, operation: "read-file" });
      const result = await run(`/bin/cat -- ${shellQuote(absolute)}`, Math.max(4000, Math.ceil(expectedBytes / 2)));
      assert(result.exit_code === 0 && utf8Bytes(result.output).length === expectedBytes, `Read of ${absolute} failed or was truncated`, { path: absolute, operation: "read-file" });
      return result.output;
    },
    async writeBatch(entries) {
      assert(Array.isArray(entries) && entries.length > 0, "writeBatch entries are required", { operation: "write-file" });
      const paths = entries.map((entry) => validateWritable(entry.path));
      assert(new Set(paths).size === paths.length, "writeBatch paths must be unique", { operation: "write-file" });
      const metadata = [];
      for (const entry of entries) metadata.push(await streamText(entry.path, entry.text));
      return metadata;
    },
    async exists(path) {
      const absolute = validateReadable(path);
      const result = await run(`/bin/test -e ${shellQuote(absolute)}`, 1000);
      if (result.exit_code === 0) return true;
      if (result.exit_code === 1) return false;
      throw new DocsTrustedReadBridgeError(`Could not inspect ${absolute}`, { path: absolute, operation: "inspect-file" });
    },
  };
}

function validateFileIO(fileIO) {
  assert(isRecord(fileIO), "fileIO is required", { operation: "validate-file-io" });
  assert(typeof fileIO.readText === "function", "fileIO.readText is required", { operation: "validate-file-io" });
  assert(typeof fileIO.writeBatch === "function", "fileIO.writeBatch is required", { operation: "validate-file-io" });
  assert(typeof fileIO.exists === "function", "fileIO.exists is required", { operation: "validate-file-io" });
  return fileIO;
}

function compactControlAwareness(trustedRead, normalized) {
  const inventory = trustedRead.derivedControlInventory;
  return {
    hasProtectedControls: inventory.hasProtectedControls,
    authoritativeDropdownCount: inventory.authoritativeDropdownCount,
    opaqueControlCount: inventory.opaqueControlCount,
    affectedParagraphCount: normalized.controlSummary.affectedParagraphs,
    nativeElementCounts: inventory.nativeElementCounts,
    preservationRequired: trustedRead.editGuidance.requiresTargetedPreservation,
    recommendedBehavior: trustedRead.editGuidance.recommendedBehavior,
  };
}

export async function executeDocsTrustedReadToFiles({
  documentId = null,
  documentUrl = null,
  tabId = null,
  outputDir,
  workspaceRoot,
  skillRoot,
  tools,
  fileIO = null,
  capabilityOverrides = {},
  maxReadBytes = DEFAULT_MAX_READ_BYTES,
  maxWriteBytes = DEFAULT_MAX_WRITE_BYTES,
} = {}) {
  assert(Boolean(documentId) !== Boolean(documentUrl), "Provide exactly one of documentId or documentUrl", { operation: "validate-input" });
  const workspace = normalizeAbsolutePath(workspaceRoot, "workspaceRoot");
  const skill = normalizeAbsolutePath(skillRoot, "skillRoot");
  const output = assertWithinRoot(outputDir, workspace, "outputDir");
  const wrapperPath = assertWithinRoot(`${skill}/host/docs-trusted-read-wrapper.mjs`, skill, "wrapperPath");
  const normalizerPath = assertWithinRoot(`${skill}/runtime/docs-read-normalizer.mjs`, skill, "normalizerPath");
  const io = fileIO ? validateFileIO(fileIO) : createToolBackedFileIO({
    tools,
    workspaceRoot: workspace,
    skillRoot: skill,
    receiverPath: `${skill}/host/docs-stdin-receiver.pl`,
    maxReadBytes,
    maxWriteBytes,
  });
  assert(!(await io.exists(output)), "Trusted-read output directory already exists", { path: output, operation: "validate-output" });

  let trustedRead = null;
  let normalizedResult = null;
  let caught = null;
  try {
    const [wrapper, normalizer] = await Promise.all([
      loadTrustedModule(io, wrapperPath, ["readGoogleDocWithControlInventory"], "trusted read wrapper"),
      loadTrustedModule(io, normalizerPath, ["normalizeGoogleDocumentRead", "renderNormalizedDocumentText"], "document read normalizer"),
    ]);
    trustedRead = await wrapper.readGoogleDocWithControlInventory({ documentId, documentUrl, tabId, tools, capabilityOverrides });
    normalizedResult = normalizer.normalizeGoogleDocumentRead({
      documentResult: trustedRead.documentResult,
      trustedReadContext: trustedRead,
      selectedTabId: tabId,
    });
  } catch (error) {
    caught = error;
  }

  const status = caught ? "failed" : "complete";
  const dataArtifacts = [];
  if (trustedRead && normalizedResult) {
    dataArtifacts.push(jsonArtifact(joinPath(output, "document-result.json"), trustedRead.documentResult));
    if (trustedRead.dropdownResult !== null && trustedRead.dropdownResult !== undefined) {
      dataArtifacts.push(jsonArtifact(joinPath(output, "dropdown-result.json"), trustedRead.dropdownResult));
    }
    dataArtifacts.push(jsonArtifact(joinPath(output, "control-inventory.json"), {
      version: trustedRead.version,
      kind: trustedRead.kind,
      target: trustedRead.target,
      dropdownMetadata: trustedRead.dropdownMetadata,
      derivedControlInventory: trustedRead.derivedControlInventory,
      editGuidance: trustedRead.editGuidance,
    }));
    dataArtifacts.push(jsonArtifact(joinPath(output, "document-outline.json"), normalizedResult.normalized));
    dataArtifacts.push(fileArtifact(joinPath(output, "document-text.md"), normalizedResult.markdown));
  }

  const controlAwareness = trustedRead && normalizedResult
    ? compactControlAwareness(trustedRead, normalizedResult.normalized)
    : null;
  const receipt = {
    bridgeVersion: BRIDGE_VERSION,
    kind: "google-docs-trusted-read-receipt",
    status,
    target: trustedRead?.target ?? { documentId, documentUrl, selectedTabId: tabId },
    dropdownMetadata: trustedRead?.dropdownMetadata ?? null,
    controlAwareness,
    warnings: trustedRead?.editGuidance?.warnings ?? [],
    error: caught ? compactError(caught) : null,
  };
  const receiptArtifact = jsonArtifact(joinPath(output, "receipt.json"), receipt);
  const committedArtifacts = [...dataArtifacts, receiptArtifact];
  await io.writeBatch(committedArtifacts.map(({ path, text }) => ({ path, text })));

  const files = Object.fromEntries(committedArtifacts.map((artifact) => {
    const key = artifact.path.slice(output.length + 1).replace(/\.[^.]+$/, "").replace(/-/g, "_");
    return [key, artifact.metadata];
  }));
  const manifest = {
    bridgeVersion: BRIDGE_VERSION,
    kind: "google-docs-trusted-read",
    status,
    outputDir: output,
    target: receipt.target,
    dropdownMetadata: receipt.dropdownMetadata,
    controlAwareness,
    warnings: receipt.warnings,
    files,
    error: receipt.error,
  };
  const manifestArtifact = jsonArtifact(joinPath(output, "manifest.json"), manifest);
  await io.writeBatch([{ path: manifestArtifact.path, text: manifestArtifact.text }]);
  return { ...manifest, manifestFile: manifestArtifact.metadata };
}

export { BRIDGE_VERSION };
```

### File: `host/docs-trusted-read-wrapper.mjs`

```javascript
/* Read-only trusted wrapper for Google Docs document and control discovery. */

const CAPABILITIES = {
  getDocument: [
    "mcp__codex_apps__google_drive_get_document",
    "google_drive_get_document",
    "get_document",
  ],
  getDocumentDropdowns: [
    "mcp__codex_apps__google_drive_get_document_dropdowns",
    "google_drive_get_document_dropdowns",
    "get_document_dropdowns",
  ],
};

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assert(condition, message) {
  if (!condition) throw new TrustedReadError(message);
}

function unwrapResult(value) {
  if (value?.isError === true) throw new TrustedReadError("Connector returned isError=true");
  if (isRecord(value?.structuredContent)) return value.structuredContent;
  if (isRecord(value?.result)) return value.result;
  return value;
}

function findFirstRecord(value, predicate) {
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return null;
    seen.add(candidate);
    if (isRecord(candidate) && predicate(candidate)) return candidate;
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(value);
}

function collectRecords(value, predicate) {
  const output = [];
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return;
    seen.add(candidate);
    if (isRecord(candidate) && predicate(candidate)) output.push(candidate);
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) visit(child);
  };
  visit(value);
  return output;
}

function documentIdentity(value) {
  const root = unwrapResult(value);
  const record = findFirstRecord(root, (candidate) =>
    typeof (candidate.documentId ?? candidate.document_id) === "string" &&
    (candidate.revisionId || candidate.revision_id || candidate.body || candidate.tabs),
  );
  assert(record, "Could not locate Google Docs document identity");
  return {
    documentId: record.documentId ?? record.document_id,
    title: record.title ?? null,
    revisionId: record.revisionId ?? record.revision_id ?? null,
    documentUrl: record.documentUrl ?? record.document_url ?? record.url ?? null,
  };
}

function dropdownReadIdentity(value) {
  const root = unwrapResult(value);
  const record = findFirstRecord(root, (candidate) =>
    typeof (candidate.documentId ?? candidate.document_id) === "string" &&
    typeof (candidate.revisionId ?? candidate.revision_id) === "string" &&
    Array.isArray(candidate.dropdowns),
  );
  if (!record) return null;
  return {
    documentId: record.documentId ?? record.document_id,
    revisionId: record.revisionId ?? record.revision_id,
    tabId: record.tabId ?? record.tab_id ?? null,
  };
}

function normalizeOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.map((option) => ({
    label: option.label ?? option.text ?? option.value ?? null,
    ...(option.color ?? option.colorStyle ?? option.color_style
      ? { color: option.color ?? option.colorStyle ?? option.color_style }
      : {}),
    ...(option.id ?? option.optionId ?? option.option_id
      ? { id: option.id ?? option.optionId ?? option.option_id }
      : {}),
  }));
}

function dropdownRecords(value) {
  const root = unwrapResult(value);
  const records = collectRecords(root, (candidate) => Array.isArray(candidate.dropdowns))
    .flatMap((candidate) => candidate.dropdowns);
  if (Array.isArray(root)) records.push(...root);
  return records.filter(isRecord).map((dropdown) => {
    const range = dropdown.range ?? dropdown.locator ?? {};
    return {
      classification: "dropdownControl",
      fidelityClass: "exact-readable",
      dropdownId: dropdown.dropdownId ?? dropdown.dropdown_id ?? null,
      tabId: dropdown.tabId ?? dropdown.tab_id ?? range.tabId ?? range.tab_id ?? null,
      segmentId: dropdown.segmentId ?? dropdown.segment_id ?? range.segmentId ?? range.segment_id ?? null,
      startIndex: dropdown.startIndex ?? dropdown.start_index ?? range.startIndex ?? range.start_index ?? null,
      endIndex: dropdown.endIndex ?? dropdown.end_index ?? range.endIndex ?? range.end_index ?? null,
      options: normalizeOptions(dropdown.options ?? dropdown.optionItems ?? dropdown.option_items),
      selectedValue: dropdown.selectedValue ?? dropdown.selected_value ?? dropdown.value ?? null,
      signature: dropdown.signature ?? dropdown.semanticSignature ?? dropdown.semantic_signature ?? null,
      container: dropdown.container ?? dropdown.tableCell ?? dropdown.table_cell ?? null,
      displayText: dropdown.displayText ?? dropdown.display_text ?? null,
    };
  });
}

function isPrivateUse(codePoint) {
  return (codePoint >= 0xE000 && codePoint <= 0xF8FF) ||
    (codePoint >= 0xF0000 && codePoint <= 0xFFFFD) ||
    (codePoint >= 0x100000 && codePoint <= 0x10FFFD);
}

function privateUseMarkerSpans(value) {
  const text = String(value ?? "");
  const spans = [];
  let current = null;
  for (let offset = 0; offset < text.length;) {
    const codePoint = text.codePointAt(offset);
    const character = String.fromCodePoint(codePoint);
    if (isPrivateUse(codePoint)) {
      if (!current) current = { startOffset: offset, endOffset: offset, text: "", codePoints: [] };
      current.endOffset = offset + character.length;
      current.text += character;
      current.codePoints.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
    } else if (current) {
      spans.push(current);
      current = null;
    }
    offset += character.length;
  }
  if (current) spans.push(current);
  return spans;
}

function elementRange(element) {
  return {
    startIndex: element.startIndex ?? element.start_index ?? null,
    endIndex: element.endIndex ?? element.end_index ?? null,
  };
}

function paragraphContainer(structuralElement, paragraph, context, path) {
  const bullet = paragraph.bullet ?? null;
  return {
    kind: "paragraph",
    path,
    tabId: context.tabId,
    segmentId: context.segmentId,
    startIndex: structuralElement.startIndex ?? structuralElement.start_index ?? null,
    endIndex: structuralElement.endIndex ?? structuralElement.end_index ?? null,
    namedStyleType: paragraph.paragraphStyle?.namedStyleType ?? paragraph.paragraph_style?.named_style_type ?? null,
    listId: bullet?.listId ?? bullet?.list_id ?? null,
    nestingLevel: bullet?.nestingLevel ?? bullet?.nesting_level ?? null,
    table: context.table,
  };
}

function collectDocumentFeatures(value, { selectedTabId = null } = {}) {
  const root = unwrapResult(value);
  const opaqueControls = [];
  const nativeElements = [];
  const tabs = new Set();
  const seen = new Set();

  const addNative = (type, element, container, properties = null) => {
    nativeElements.push({ type, ...elementRange(element), tabId: container.tabId, segmentId: container.segmentId, container, properties });
  };

  const visitElement = (element, container, path) => {
    if (!isRecord(element)) return;
    const text = element.textRun?.content;
    const base = element.startIndex ?? element.start_index;
    if (typeof text === "string" && Number.isInteger(base)) {
      for (const marker of privateUseMarkerSpans(text)) {
        opaqueControls.push({
          classification: "opaqueTemplateControl",
          fidelityClass: "copy-only",
          tabId: container.tabId,
          segmentId: container.segmentId,
          startIndex: base + marker.startOffset,
          endIndex: base + marker.endOffset,
          markerText: marker.text,
          codePoints: marker.codePoints,
          textStyle: element.textRun?.textStyle ?? {},
          container,
          path,
        });
      }
    }
    if (element.dateElement) addNative("dateElement", element, container, element.dateElement.dateElementProperties ?? null);
    if (element.person) addNative("person", element, container, element.person.personProperties ?? null);
    if (element.richLink) addNative("richLink", element, container, element.richLink.richLinkProperties ?? null);
    if (element.inlineObjectElement) addNative("inlineObjectElement", element, container, element.inlineObjectElement);
    if (element.footnoteReference) addNative("footnoteReference", element, container, element.footnoteReference);
    if (element.horizontalRule) addNative("horizontalRule", element, container, null);
    if (element.equation) addNative("equation", element, container, element.equation);
  };

  const visit = (candidate, context = { tabId: null, segmentId: null, table: null }, path = "root") => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return;
    seen.add(candidate);
    if (Array.isArray(candidate)) {
      candidate.forEach((child, index) => visit(child, context, `${path}[${index}]`));
      return;
    }

    const directTabId = candidate.tabId ?? candidate.tab_id ?? null;
    const discoveredTabId = candidate.tabProperties?.tabId ?? candidate.tab_properties?.tab_id ?? directTabId ?? context.tabId;
    const isTabRecord = Boolean(
      candidate.tabProperties?.tabId ||
      candidate.tab_properties?.tab_id ||
      (directTabId && candidate.body),
    );
    if (isTabRecord) {
      tabs.add(discoveredTabId);
      if (selectedTabId !== null && discoveredTabId !== selectedTabId) return;
    }
    const nextContext = {
      ...context,
      tabId: discoveredTabId ?? null,
      segmentId: candidate.segmentId ?? candidate.segment_id ?? context.segmentId ?? null,
    };

    if (candidate.paragraph?.elements) {
      const container = paragraphContainer(candidate, candidate.paragraph, nextContext, path);
      candidate.paragraph.elements.forEach((element, index) => visitElement(element, container, `${path}.paragraph.elements[${index}]`));
      return;
    }

    if (candidate.table?.tableRows) {
      const tableStartIndex = candidate.startIndex ?? candidate.start_index ?? null;
      candidate.table.tableRows.forEach((row, rowIndex) => {
        (row.tableCells ?? []).forEach((cell, columnIndex) => {
          visit(cell.content ?? [], {
            ...nextContext,
            table: { tableStartIndex, rowIndex, columnIndex },
          }, `${path}.table.rows[${rowIndex}].cells[${columnIndex}].content`);
        });
      });
      return;
    }

    for (const [key, child] of Object.entries(candidate)) visit(child, nextContext, `${path}.${key}`);
  };

  visit(root);
  return { opaqueControls, nativeElements, tabs: [...tabs] };
}

function sameLocator(left, right) {
  return (left.tabId ?? null) === (right.tabId ?? null) &&
    (left.segmentId ?? null) === (right.segmentId ?? null) &&
    left.startIndex === right.startIndex && left.endIndex === right.endIndex;
}

function countByType(elements) {
  const output = {};
  for (const element of elements) output[element.type] = (output[element.type] ?? 0) + 1;
  return output;
}

function resolveTool(tools, names, override = null) {
  if (override) return typeof tools?.[override] === "function" ? { name: override, fn: tools[override] } : null;
  for (const name of names) if (typeof tools?.[name] === "function") return { name, fn: tools[name] };
  return null;
}

function connectorArgs({ documentId, documentUrl, tabId = null, includeTab = false }) {
  const args = documentId ? { document_id: documentId } : { document_url: documentUrl };
  if (includeTab && tabId !== null) args.tab_id = tabId;
  return args;
}

export class TrustedReadError extends Error {
  constructor(message) {
    super(message);
    this.name = "TrustedReadError";
  }
}

export async function readGoogleDocWithControlInventory({
  documentId = null,
  documentUrl = null,
  tabId = null,
  tools,
  capabilityOverrides = {},
} = {}) {
  assert(Boolean(documentId) !== Boolean(documentUrl), "Provide exactly one of documentId or documentUrl");
  assert(isRecord(tools), "Mounted connector tools are required");

  const getDocument = resolveTool(tools, CAPABILITIES.getDocument, capabilityOverrides.getDocument ?? null);
  assert(getDocument, "Required getDocument capability is unavailable");
  const documentResult = await getDocument.fn(connectorArgs({ documentId, documentUrl }));
  const identity = documentIdentity(documentResult);
  if (documentId !== null) assert(identity.documentId === documentId, "Document identity does not match the requested document");
  const discovered = collectDocumentFeatures(documentResult, { selectedTabId: tabId });

  let dropdownMetadata = { status: "unavailable", resolvedTool: null, authoritative: false, count: 0 };
  let dropdownResult = null;
  let authoritativeDropdowns = [];
  const getDropdowns = resolveTool(tools, CAPABILITIES.getDocumentDropdowns, capabilityOverrides.getDocumentDropdowns ?? null);
  if (getDropdowns) {
    try {
      dropdownResult = await getDropdowns.fn(connectorArgs({ documentId: identity.documentId, documentUrl: null, tabId, includeTab: true }));
      const dropdownIdentity = dropdownReadIdentity(dropdownResult);
      if (!dropdownIdentity || dropdownIdentity.documentId !== identity.documentId || dropdownIdentity.revisionId !== identity.revisionId ||
          (tabId !== null && dropdownIdentity.tabId !== null && dropdownIdentity.tabId !== tabId)) {
        dropdownMetadata = {
          status: "identity_or_revision_mismatch",
          resolvedTool: getDropdowns.name,
          authoritative: false,
          count: 0,
        };
      } else {
        authoritativeDropdowns = dropdownRecords(dropdownResult)
          .filter((dropdown) => tabId === null || dropdown.tabId === null || dropdown.tabId === tabId);
        dropdownMetadata = {
          status: "available",
          resolvedTool: getDropdowns.name,
          authoritative: true,
          count: authoritativeDropdowns.length,
        };
      }
    } catch {
      dropdownMetadata = {
        status: "read_failed",
        resolvedTool: getDropdowns.name,
        authoritative: false,
        count: 0,
      };
    }
  }

  const opaqueControls = discovered.opaqueControls.filter((opaque) =>
    !authoritativeDropdowns.some((dropdown) => sameLocator(dropdown, opaque)),
  );
  const controls = [...authoritativeDropdowns, ...opaqueControls].sort((left, right) =>
    String(left.tabId).localeCompare(String(right.tabId)) ||
    (left.startIndex ?? Number.MAX_SAFE_INTEGER) - (right.startIndex ?? Number.MAX_SAFE_INTEGER),
  );
  const warnings = [];
  if (controls.length > 0) {
    warnings.push("Existing native or opaque controls were detected. Preserve each control and its containing structure unless the user explicitly requests an exact supported mutation.");
  }
  if (opaqueControls.length > 0) {
    warnings.push("Private-use markers are classified as opaque copy-only controls. Do not replace them with visible text or infer dropdown semantics from the glyph alone.");
  }
  if (dropdownMetadata.status === "identity_or_revision_mismatch") {
    warnings.push("Dropdown metadata did not match the document revision and was ignored; unmatched controls remain opaque.");
  } else if (dropdownMetadata.status === "read_failed") {
    warnings.push("Authoritative dropdown metadata could not be read; unmatched controls remain opaque.");
  }

  return {
    version: 1,
    kind: "google-docs-trusted-read-context",
    documentResult,
    dropdownResult,
    target: { ...identity, selectedTabId: tabId },
    dropdownMetadata,
    derivedControlInventory: {
      hasProtectedControls: controls.length > 0,
      authoritativeDropdownCount: authoritativeDropdowns.length,
      opaqueControlCount: opaqueControls.length,
      nativeElementCounts: countByType(discovered.nativeElements),
      tabsScanned: tabId === null ? discovered.tabs : (discovered.tabs.includes(tabId) ? [tabId] : []),
      controls,
      nativeElements: discovered.nativeElements,
    },
    editGuidance: {
      advisoryOnly: true,
      requiresTargetedPreservation: controls.length > 0,
      recommendedBehavior: controls.length > 0
        ? "Edit supported text before or after protected controls; do not rewrite their containing structure."
        : "No protected controls were detected in the scanned scope.",
      warnings,
    },
  };
}

export { CAPABILITIES, privateUseMarkerSpans };
```

### File: `references/reference-direct-request-composition.md`

#### Connector Examples

These examples use the connected Google Drive tools. Read [SKILL.md](google-docs.md) for routing, preservation, and verification; see the separate [smart-chip](google-docs.md#file-referencesreference-smart-chips-and-building-blocksmd) and [meeting-notes](google-docs.md#file-referencesreference-meeting-notes-directmd) examples when needed.

##### Compose a batch

The connector’s `requests` array accepts Google Docs API objects such as `insertText` and `updateTableCellStyle`. Use the fields for that Docs request type; consult Google’s API documentation for details. These objects are connector payloads, not separate HTTP calls.

- Pass `requests` and `write_control` as structured values, not stringified JSON. Each request must contain exactly one request-type key.
- Resolve the destination `documentId`, `tabId`, and relevant ranges from connector results. Each snippet stands alone; combine compatible requests when using several examples together.
- Requests execute in order. Track UTF-16 index shifts and calculate formatting ranges from inserted text when reliable. JavaScript string `.length` counts UTF-16 code units.
- When using `write_control`, set either `requiredRevisionId` or `targetRevisionId`, not both. Use `requiredRevisionId` to reject concurrent changes and reuse returned revisions for subsequent batches. Read again when required positions or IDs cannot be reliably derived, or to resolve a conflict or uncertain outcome; verify the completed edits once.

In the examples, `insertionIndex` is the intended text insertion point, `tableStartIndex` identifies the table, and `itemStartIndex`/`itemEndIndex` bound the intended list paragraphs. Resolve these values for the actual document rather than copying offsets from another example.

##### Read a document

```js
const document = await tools.mcp__codex_apps__google_drive_get_document({
  document_id: documentId
});
```

##### Insert text

```js
await tools.mcp__codex_apps__google_drive_batch_update_document({
  document_id: documentId,
  write_control: { requiredRevisionId: revisionId },
  requests: [
    { insertText: { location: { index: insertionIndex, tabId: tabId }, text: "The pilot starts next week.\n" } }
  ]
});
```

##### Insert a section

Insert a section at the resolved paragraph position. For a new document, this example uses a semantic Heading 2 at 13 pt and adds 6 pt after body paragraphs. For an existing document, match its heading hierarchy and paragraph spacing.

```js
const headingText = "Launch risks\n";
const bodyText = "Risk one.\nRisk two.\n";
const headingStyle = "HEADING_2";
await tools.mcp__codex_apps__google_drive_batch_update_document({
  "document_id": documentId,
  "write_control": {
    "requiredRevisionId": revisionId
  },
  "requests": [
    {
      "insertText": {
        "location": {
          "index": insertionIndex,
          "tabId": tabId
        },
        "text": headingText + bodyText
      }
    },
    {
      "updateParagraphStyle": {
        "range": {
          "startIndex": insertionIndex,
          "endIndex": insertionIndex + headingText.length,
          "tabId": tabId
        },
        "paragraphStyle": {
          "namedStyleType": headingStyle
        },
        "fields": "namedStyleType"
      }
    },
    {
      "updateTextStyle": {
        "range": {
          "startIndex": insertionIndex,
          "endIndex": insertionIndex + headingText.length - 1,
          "tabId": tabId
        },
        "textStyle": { "fontSize": { "magnitude": 13, "unit": "PT" } },
        "fields": "fontSize"
      }
    },
    {
      "updateParagraphStyle": {
        "range": {
          "startIndex": insertionIndex + headingText.length,
          "endIndex": insertionIndex + headingText.length + bodyText.length - 1,
          "tabId": tabId
        },
        "paragraphStyle": { "spaceBelow": { "magnitude": 6, "unit": "PT" } },
        "fields": "spaceBelow"
      }
    }
  ]
});
```

After inserting text, calculate style ranges from the inserted text length, not from guessed rendered layout. If the surrounding heading has explicit local text styling, add `updateTextStyle` for the heading range after matching the paragraph style.

##### Insert bullets

Insert plain lines first, then create bullets over the range that contains only the intended bullet paragraphs:

```js
const bulletText = "First bullet\nSecond bullet\n";
await tools.mcp__codex_apps__google_drive_batch_update_document({
  "document_id": documentId,
  "write_control": {
    "requiredRevisionId": revisionId
  },
  "requests": [
    {
      "insertText": {
        "location": {
          "index": insertionIndex,
          "tabId": tabId
        },
        "text": bulletText
      }
    },
    {
      "createParagraphBullets": {
        "range": {
          "startIndex": insertionIndex,
          "endIndex": insertionIndex + bulletText.length,
          "tabId": tabId
        },
        "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE"
      }
    }
  ]
});
```

If the peer template uses a specific existing list style, read the peer bullet paragraphs and match their visible list behavior as closely as the connector supports.

##### Number an existing list

For existing item paragraphs, use `NUMBERED_DECIMAL_ALPHA_ROMAN` to produce decimal numbering at the first nesting level. Use the intended item-paragraph boundaries from readback.

```js
await tools.mcp__codex_apps__google_drive_batch_update_document({
  "document_id": documentId,
  "write_control": {
    "requiredRevisionId": revisionId
  },
  "requests": [
    {
      "createParagraphBullets": {
        "range": {
          "startIndex": itemStartIndex,
          "endIndex": itemEndIndex,
          "tabId": tabId
        },
        "bulletPreset": "NUMBERED_DECIMAL_ALPHA_ROMAN"
      }
    }
  ]
});
```

##### Tables

1. Resolve table, row, column, and cell ranges from `get_document` or an available table-read tool. Do not infer empty-cell positions from paragraph order.
2. After `insertTable`, read the table before filling it. Insert into each cell's returned paragraph location.
3. Fill independent cells in descending index order, or re-read between batches, so earlier inserts do not invalidate later positions.
4. After population or row/column changes, read again if final cell ranges cannot be reliably derived. Extend existing tables in place and match peer cells when adding rows or columns.

Formatting details:

- Style or link actual cell-text ranges; a guessed span across a row can include structural boundaries.
- For lists inside cells, exclude labels and the terminal empty paragraph from the bullet range.
- New cell text can inherit heading or bold formatting; match the intended peer cell style.

###### Column width example

Set a column's width with `tableColumnProperties.width`, not `columnWidth`. The first column and 80-point width are example choices; use the requested or peer layout. Column indexes are zero-based.

```js
await tools.mcp__codex_apps__google_drive_batch_update_document({
  "document_id": documentId,
  "write_control": {
    "requiredRevisionId": revisionId
  },
  "requests": [
    {
      "updateTableColumnProperties": {
        "tableStartLocation": {
          "index": tableStartIndex,
          "tabId": tabId
        },
        "columnIndices": [
          0
        ],
        "tableColumnProperties": {
          "widthType": "FIXED_WIDTH",
          "width": {
            "magnitude": 80,
            "unit": "PT"
          }
        },
        "fields": "widthType,width"
      }
    }
  ]
});
```

###### Cell background example

This example shades the first two cells of the first row light blue. The cell selection and color are example choices. Row and column indexes are zero-based; spans specify how many rows and columns to include.

```js
await tools.mcp__codex_apps__google_drive_batch_update_document({
  "document_id": documentId,
  "write_control": {
    "requiredRevisionId": revisionId
  },
  "requests": [
    {
      "updateTableCellStyle": {
        "tableRange": {
          "tableCellLocation": {
            "tableStartLocation": {
              "index": tableStartIndex,
              "tabId": tabId
            },
            "rowIndex": 0,
            "columnIndex": 0
          },
          "rowSpan": 1,
          "columnSpan": 2
        },
        "tableCellStyle": {
          "backgroundColor": {
            "color": {
              "rgbColor": {
                "red": 0.91,
                "green": 0.94,
                "blue": 0.97
              }
            }
          }
        },
        "fields": "backgroundColor"
      }
    }
  ]
});
```

##### Hyperlinks

Link the complete readable label, including when it is a heading or inside a table cell. Use Google's default link appearance (blue and underlined); preserve a different appearance only when explicitly requested. Keep the paragraph's heading role unchanged.

For an existing label, resolve `labelStartIndex` and the exact `labelText` from readback, and use a verified `sourceUrl`:

```js
await tools.mcp__codex_apps__google_drive_batch_update_document({
  document_id: documentId,
  write_control: { requiredRevisionId: revisionId },
  requests: [{
    updateTextStyle: {
      range: {
        tabId,
        startIndex: labelStartIndex,
        endIndex: labelStartIndex + labelText.length
      },
      textStyle: { link: { url: sourceUrl } },
      fields: "link"
    }
  }]
});
```

For newly inserted text, combine insertion and linking in one batch when the label range can be calculated reliably. In final readback, verify the full label has the intended URL and adjacent text is not linked.

##### Inline images

Resolve `imageInsertionIndex` in a paragraph reserved for the image. Set `imagePath` to an absolute local image path. The connector uploads the file passed through `image_uris` and resolves the matching `uri` placeholder:

```js
await tools.mcp__codex_apps__google_drive_batch_update_document({
  document_id: documentId,
  write_control: { requiredRevisionId: revisionId },
  image_uris: [imagePath],
  requests: [{
    insertInlineImage: {
      location: { index: imageInsertionIndex, tabId },
      uri: imagePath
    }
  }]
});
```

For a public image URL, pass it directly as `uri` and omit `image_uris`; do not pass base64 data URLs. Set `objectSize` when the requested or peer layout calls for a particular size, preserving the image's aspect ratio.

When a caption is useful, place it directly below the image. Match existing caption formatting; otherwise use italic text 2 pt smaller than body text, with a minimum of 9 pt. Keep the image and caption on the same page. Number figures when needed for cross-references.

Verify the inserted `inlineObjectElement` and its referenced entry in the tab's `inlineObjects`, along with the surrounding text and caption. Export and inspect the relevant PDF pages to check size, clipping, and placement; an insertion success or placeholder caption alone does not prove the image rendered correctly.

##### Multi-tab PDF exports

```js
const pdf = await tools.mcp__codex_apps__google_drive_export_file({
  id: documentId,
  mime_type: "application/pdf"
});
```

Multi-tab exports can add a title-only separator page before each tab. Compare the PDF with native document readback before treating these as document-layout errors. The current export tool has no option to suppress them.

If the requested PDF should omit these separators, remove only pages verified to be export-added tab titles from a separate PDF copy, then verify all content pages remain unchanged. Do not delete native tabs or headings to compensate for export behavior.

### File: `references/reference-meeting-notes-direct.md`

#### Meeting Notes Request Example

Pass the complete argument object below to the connector's `mcp__codex_apps__google_drive_batch_update_document` tool. The Google Docs API operations inside `requests` are payloads for that tool, not separate API calls. The later formatting snippets are individual objects to place in its `requests` array.

Read for a concrete calendar-backed meeting-notes request sequence. See [Native features](google-docs.md#file-referencesreference-smart-chips-and-building-blocksmd) for event lookup, chip handling, and preservation guidance.

Before adapting the example:

- Read the selected Calendar event for its title, timestamp/timezone, event URL, attendee emails, and response statuses.
- Read the target tab, revision, insertion range, and peer styles. Use the optional file-backed helper only when it helps inspect a large response.
- Calculate UTF-16 indexes for the actual text and chip sequence. Newlines and inserted date/person/resource chips each occupy one code unit.
- Style only the heading as a heading. Scope bullet and checkbox formatting to item paragraphs; keep labels and separators in the peer body style.

##### Skeleton Pattern

This example demonstrates index movement for one attendee, an empty `Notes` bullet, one blank line before `Action items`, an empty action-item checkbox, and one final blank paragraph. Replace every placeholder with connector readback or Calendar event values before calling the connector. Recalculate indexes exactly from the chosen insertion index and actual attendee/note/action counts.

```json
{
  "document_id": "DOC_ID",
  "write_control": {
    "requiredRevisionId": "REVISION_ID_FROM_FRESH_READ"
  },
  "requests": [
    {
      "insertDate": {
        "location": {
          "index": 100,
          "tabId": "t.0"
        },
        "dateElementProperties": {
          "timestamp": "EVENT_START_RFC3339",
          "locale": "en",
          "dateFormat": "DATE_FORMAT_MONTH_DAY_YEAR_ABBREVIATED",
          "timeFormat": "TIME_FORMAT_DISABLED"
        }
      }
    },
    {
      "insertText": {
        "location": {
          "index": 101,
          "tabId": "t.0"
        },
        "text": " | "
      }
    },
    {
      "insertRichLink": {
        "location": {
          "index": 104,
          "tabId": "t.0"
        },
        "richLinkProperties": {
          "uri": "EVENT_HTML_LINK"
        }
      }
    },
    {
      "insertText": {
        "location": {
          "index": 105,
          "tabId": "t.0"
        },
        "text": "\nAttendees: "
      }
    },
    {
      "insertPerson": {
        "location": {
          "index": 117,
          "tabId": "t.0"
        },
        "personProperties": {
          "email": "attendee@example.com"
        }
      }
    },
    {
      "insertText": {
        "location": {
          "index": 118,
          "tabId": "t.0"
        },
        "text": "\n\nNotes\n\n\nAction items\n\n\n"
      }
    },
    {
      "updateParagraphStyle": {
        "range": {
          "startIndex": 100,
          "endIndex": 106,
          "tabId": "t.0"
        },
        "paragraphStyle": {
          "namedStyleType": "HEADING_2"
        },
        "fields": "namedStyleType"
      }
    },
    {
      "updateParagraphStyle": {
        "range": {
          "startIndex": 106,
          "endIndex": 143,
          "tabId": "t.0"
        },
        "paragraphStyle": {
          "namedStyleType": "NORMAL_TEXT"
        },
        "fields": "namedStyleType"
      }
    },
    {
      "createParagraphBullets": {
        "range": {
          "startIndex": 126,
          "endIndex": 127,
          "tabId": "t.0"
        },
        "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE"
      }
    },
    {
      "createParagraphBullets": {
        "range": {
          "startIndex": 141,
          "endIndex": 142,
          "tabId": "t.0"
        },
        "bulletPreset": "BULLET_CHECKBOX"
      }
    }
  ]
}
```

If there are more than 10 attendees with email chips, split the attendees across sequential `mcp__codex_apps__google_drive_batch_update_document` connector calls because `insertPerson` is limited per batch. For revision-guarded writes, use the returned revision for the next batch; read again only if required indexes or IDs cannot be reliably derived, or to resolve a conflict or uncertain outcome.

For declined attendees, insert the person chip or name, then apply:

```json
{
  "updateTextStyle": {
    "range": {
      "startIndex": 117,
      "endIndex": 118,
      "tabId": "t.0"
    },
    "textStyle": {
      "strikethrough": true
    },
    "fields": "strikethrough"
  }
}
```

For separator/newline ranges that touch declined attendee chips, explicitly clear leaked strikethrough:

```json
{
  "updateTextStyle": {
    "range": {
      "startIndex": 118,
      "endIndex": 119,
      "tabId": "t.0"
    },
    "textStyle": {
      "strikethrough": false
    },
    "fields": "strikethrough"
  }
}
```

##### Verify

Read back native chip types/properties, paragraph styles, list metadata, and target tab. Check for duplicate inserts and unintended empty list items. If a write times out or its result is incomplete, reconcile through readback before retrying.

### File: `references/reference-smart-chips-and-building-blocks.md`

#### Smart Chips, Dropdowns, and Building Blocks

Read when inserting or editing native chips or dropdowns, adapting building blocks, or creating calendar-backed meeting notes.

All write examples below are Google Docs API request objects passed in the connector's `batch_update_document.requests` array. Names such as `insertDate` and `insertDropdown` are request types, not standalone connector tools. Read back results with the connector's `get_document` tool.

##### Smart chips

| Chip | Readback element | Insert request | Required source |
| --- | --- | --- | --- |
| Date | `dateElement` | `insertDate` | Timestamp and display format |
| Person | `person` | `insertPerson` | Verified email |
| Google resource | `richLink` | `insertRichLink` | Supported resource URL |

Use a chip to identify a known person, date, or Google resource when requested, when matching a template, or in a working field such as an owner, deadline, or source file. Find chips in paragraph `elements`; text-search helpers may not match their displayed labels. Use returned ranges and properties for edits and verification, not the label alone.

Example requests (replace indexes, tab IDs, and source values before use):

```json
[
  {"insertDate": {
    "location": {"index": 100, "tabId": "TAB_ID"},
    "dateElementProperties": {
      "timestamp": "SOURCE_TIMESTAMP", "locale": "en",
      "dateFormat": "DATE_FORMAT_MONTH_DAY_YEAR_ABBREVIATED",
      "timeFormat": "TIME_FORMAT_DISABLED"
    }
  }},
  {"insertPerson": {
    "location": {"index": 101, "tabId": "TAB_ID"},
    "personProperties": {"email": "SOURCE_EMAIL"}
  }},
  {"insertRichLink": {
    "location": {"index": 102, "tabId": "TAB_ID"},
    "richLinkProperties": {"uri": "SOURCE_RESOURCE_URL"}
  }}
]
```

- These inserted chips occupy one UTF-16 code unit each. To replace a chip's payload, delete its returned element range and insert the replacement; use `updateTextStyle` only for formatting. This rule does not apply to dropdowns.
- For dates, omit output-only `displayText`; supply `timeZoneId` only when the chosen time format requires it.
- At most 10 `insertPerson` requests fit in one batch. For more people, split batches and refresh indexes and revision guards.
- For new Google file chips, [canonicalize_google_workspace_url.mjs](google-docs.md#file-scriptscanonicalize_google_workspace_urlmjs) separates the file URL from a tab/range/slide deep link. Keep any useful deep link separately rather than losing that destination.
- Verify element types and the intended timestamp, email, or URI through `get_document`. HTML export does not prove native chip preservation.

##### Dropdowns

Use a dropdown when an editor will choose among defined values, such as review statuses. The instance stores the current selection, and its definition supplies the choices. Pass dropdown request objects to the connector's `batch_update_document` tool. Example `requests` for creating a definition and inserting it into an empty paragraph:

```json
[
  {"createDropdownDefinition": {
    "tabId": "TAB_ID",
    "dropdownDefinition": {
      "dropdownDefinitionId": "kix.statusdemo",
      "dropdownDefinitionProperties": {"title": "Status", "options": [
        {"optionId": "dropdownItem.draft", "displayValue": "Draft"},
        {"optionId": "dropdownItem.done", "displayValue": "Done"}
      ]}
    }
  }},
  {"insertDropdown": {
    "location": {"index": 1, "tabId": "TAB_ID"},
    "dropdownDefinitionId": "kix.statusdemo",
    "selectedOptionId": "dropdownItem.draft"
  }}
]
```

Replace the tab and insertion index from readback; use a definition ID unique within that tab. Retain the returned instance `dropdownId`. To change its selection, use a fresh revision guard and:

```json
{"updateDropdownProperties": {
  "tabId": "TAB_ID", "dropdownId": "DROPDOWN_ID_FROM_READBACK",
  "dropdownProperties": {"selectedOptionId": "dropdownItem.done"},
  "fields": "selectedOptionId"
}}
```

To change options, use `updateDropdownDefinitionProperties` with `dropdownDefinitionId`, `tabId`, the complete `dropdownDefinitionProperties.options` list, and `fields: "options"`. This replaces the list for every dropdown sharing the definition: preserve unrelated option IDs and colors. Removing a selected option requires `selectedOptionIdReplacements` mapping it to a retained option. See the [API schema](https://docs.googleapis.com/$discovery/rest?version=v1) for field details.

Verify `elements[].dropdown.dropdownProperties.selectedOptionId` and `displayValue` after writes. Read the tab’s `dropdownDefinitions` to verify its option IDs, labels, and colors. If the connected version omits this field, treat the option list as unavailable. Do not reconstruct an existing option list from its selected label or overwrite options you cannot inspect. A definition created in this task can use its retained creation reply and subsequent updates, with revision guards. The optional read helper cannot recover omitted fields.

##### Building blocks

A collection of labels and table cells does not prove a native building block was created. Copy an existing native exemplar when the result requires controls or containers that available tools cannot create. Edit supported ranges around those controls and state any unsupported requested change.

A private-use Unicode glyph may indicate an opaque control, but does not prove dropdown identity, options, or selection. Use native dropdown properties when present; preserve controls whose semantics cannot be inspected.

##### Calendar-backed meeting notes

For a complete request sequence, including empty items and declined-attendee styling, see [Meeting notes](google-docs.md#file-referencesreference-meeting-notes-directmd).

1. Resolve the requested event using connected Calendar tools and the user's timezone. Use its actual title, time, link, attendees, and response statuses; do not reconstruct those fields from memory.
2. Read the destination and any peer meeting-notes block. Compose supported date/person/resource chips, headings, text, and lists to match that structure. This does not prove parity with every UI-only building-block feature.
3. Style only the meeting heading as a heading; keep attendees, labels, and note/action paragraphs in the peer body style. Apply bullets or supported checkboxes only to item paragraphs, not labels or separators.
4. When matching an empty UI Meeting notes block, retain an empty note bullet, a blank separator, an empty action-item checkbox, and a trailing blank paragraph. Otherwise use the requested content rather than adding placeholders.
5. If matching declined-attendee strikethrough, scope it to the attendee chip/name and clear it from adjacent spaces and newlines so it does not leak.
6. Read back the chips, list metadata, styles, and tab placement. Refresh attendee insertion indexes before a second batch; check for duplicates and unintended empty list items.

### File: `references/reference-trusted-read-wrapper.md`

#### Optional File-Backed Read

Read only when a large connector response is inconvenient to inspect, or a searchable outline/control inventory would help. Ordinary reads and edits use the Docs tools directly.

The bridge calls those same authenticated connector tools and saves the raw response, normalized outline, annotated text, and control inventory. It does not call Google HTTP endpoints directly or use a separate credential setup. It cannot recover missing connector semantics or prove that every control was detected. Private-use glyph detection is a conservative heuristic, not proof of a dropdown.

##### Load and invoke

This recipe requires an execution environment with `tools`, `load`, and `store`, plus shell access to the skill files. Set `SKILL_DIR` to the installed skill directory and `WORKSPACE` to task scratch space. If unavailable, continue with direct connector reads.

Load the checked-in bridge once per session. Keep the byte check so truncated source is never evaluated.

```js
const bridgeKey = `google_docs_trusted_read_bridge:${SKILL_DIR}`;
let bridgeSource = load(bridgeKey);
if (!bridgeSource) {
  const bridgePath = `${SKILL_DIR}/host/docs-trusted-read-file-bridge.mjs`;
  const metadata = await tools.exec_command({
    cmd: `/usr/bin/wc -l -c < '${bridgePath}'`,
    workdir: SKILL_DIR,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 1000,
  });
  const [reportedLines, expectedBytes] = metadata.output.trim().split(/\s+/).map(Number);
  if (metadata.exit_code !== 0 || !Number.isInteger(reportedLines) ||
      !Number.isInteger(expectedBytes) || reportedLines < 0 || expectedBytes < 1) {
    throw new Error("Could not stat the Docs trusted-read bridge");
  }
  const lineCount = Math.max(1, reportedLines + 1);
  const ranges = Array.from(
    { length: Math.ceil(lineCount / 200) },
    (_, index) => [index * 200 + 1, Math.min(lineCount, (index + 1) * 200)],
  );
  const chunks = await Promise.all(ranges.map(([start, end]) =>
    tools.exec_command({
      cmd: `/usr/bin/sed -n '${start},${end}p' '${bridgePath}'`,
      workdir: SKILL_DIR,
      login: false,
      yield_time_ms: 30000,
      max_output_tokens: 14000,
    })
  ));
  if (chunks.some((chunk) => chunk.exit_code !== 0)) {
    throw new Error("Could not load every Docs trusted-read bridge chunk");
  }
  bridgeSource = chunks.map((chunk) => chunk.output).join("");
  const actualBytes = encodeURIComponent(bridgeSource)
    .replace(/%[0-9A-F]{2}/gi, "_")
    .length;
  if (actualBytes !== expectedBytes) throw new Error("Could not load the complete Docs trusted-read bridge");
  store(bridgeKey, bridgeSource);
}

const trustedReadBridge = new Function(
  `${bridgeSource.replace(/^\s*export\s+/gm, "")}\n` +
  "return { executeDocsTrustedReadToFiles };",
)();
```

Do not emit `bridgeSource` or rich connector results with `text()`.

Use a fresh output directory for each snapshot:

```js
const trustedRead = await trustedReadBridge.executeDocsTrustedReadToFiles({
  documentId: TARGET_DOCUMENT_ID,
  tabId: TARGET_TAB_ID,
  outputDir: `${WORKSPACE}/bridge/trusted-read-01`,
  workspaceRoot: WORKSPACE,
  skillRoot: SKILL_DIR,
  tools,
});
text(JSON.stringify(trustedRead));
```

Pass exactly one of `documentId` or `documentUrl`. `tabId` is optional. Do not use ordinary `import()` inside the standard execution isolate, evaluate the raw wrapper separately, recreate the detector, or stage connector responses through `store()` and `apply_patch`.

##### Inspect the result

The result contains target identity/revision, metadata availability, warnings, control counts, and artifact paths/hashes. Read only the relevant files:

| File | Use |
| --- | --- |
| `document-text.md` | Searchable text with paragraph indexes and control annotations |
| `document-outline.json` | Structured paragraph, style, list, and table records |
| `control-inventory.json` | Detected controls, native elements, and ranges |
| `document-result.json` | Full connector response when normalized files omit a needed field |
| `dropdown-result.json` | Provider dropdown metadata, if that capability is available |

Search large files and read bounded sections. Do not insert protected-control annotations into the document. For this file-backed route, let the bridge persist responses directly instead of copying large payloads through model context.

`dropdownControl` means provider metadata identified a dropdown. `opaqueTemplateControl` means a marker or unclassified control was detected; preserve its range without claiming known options or selection. Missing or mismatched-revision dropdown metadata cannot establish exact semantics.

The inventory is advisory, not a write gate. Continue with scoped connector edits supported by the available tools. Use fresh direct reads for follow-up targeting and verification; rerun the helper when its saved scope or revision is no longer sufficient.

### File: `runtime/docs-read-normalizer.mjs`

```javascript
/* Dependency-free normalization for file-backed Google Docs trusted reads. */

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrap(value) {
  if (isRecord(value?.structuredContent)) return value.structuredContent;
  if (isRecord(value?.result?.structuredContent)) return value.result.structuredContent;
  if (isRecord(value?.result)) return value.result;
  return value;
}

function findDocument(value) {
  const root = unwrap(value);
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return null;
    seen.add(candidate);
    if (isRecord(candidate) && typeof (candidate.documentId ?? candidate.document_id) === "string" &&
        (candidate.tabs || candidate.body || candidate.revisionId || candidate.revision_id)) return candidate;
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(root);
}

function isPrivateUse(codePoint) {
  return (codePoint >= 0xE000 && codePoint <= 0xF8FF) ||
    (codePoint >= 0xF0000 && codePoint <= 0xFFFFD) ||
    (codePoint >= 0x100000 && codePoint <= 0x10FFFD);
}

function visibleText(value) {
  let output = "";
  for (const character of String(value ?? "")) {
    const codePoint = character.codePointAt(0);
    output += isPrivateUse(codePoint)
      ? `⟦PROTECTED_CONTROL U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}⟧`
      : character;
  }
  return output;
}

function markdownLink(label, url) {
  const text = String(label ?? "").replace(/\n/g, " ").trim() || url;
  return `[${text.replace(/([\\\[\]])/g, "\\$1")}](${url})`;
}

function elementText(element) {
  if (element.textRun) {
    const content = visibleText(element.textRun.content);
    const url = element.textRun.textStyle?.link?.url;
    return url ? markdownLink(content, url) : content;
  }
  if (element.person) {
    const properties = element.person.personProperties ?? {};
    const label = properties.name ?? properties.email ?? "person";
    return properties.email ? `@${label} <${properties.email}>` : `@${label}`;
  }
  if (element.dateElement) {
    return element.dateElement.dateElementProperties?.displayText ?? "[DATE]";
  }
  if (element.richLink) {
    const properties = element.richLink.richLinkProperties ?? {};
    return properties.uri ? markdownLink(properties.title ?? properties.uri, properties.uri) : `[RICH_LINK ${properties.title ?? ""}]`;
  }
  if (element.inlineObjectElement) return `[INLINE_OBJECT ${element.inlineObjectElement.inlineObjectId ?? ""}]`;
  if (element.footnoteReference) return `[FOOTNOTE ${element.footnoteReference.footnoteId ?? ""}]`;
  if (element.horizontalRule) return "[HORIZONTAL_RULE]";
  if (element.equation) return "[EQUATION]";
  return "";
}

function tabRecords(document) {
  if (Array.isArray(document.tabs) && document.tabs.length > 0) {
    return document.tabs.map((tab, index) => ({
      tabId: tab.tabId ?? tab.tab_id ?? tab.tabProperties?.tabId ?? tab.tab_properties?.tab_id ?? null,
      title: tab.title ?? tab.tabProperties?.title ?? tab.tab_properties?.title ?? `Tab ${index + 1}`,
      body: tab.body ?? tab.documentTab?.body ?? tab.document_tab?.body ?? null,
    }));
  }
  return [{ tabId: null, title: "Document", body: document.body ?? null }];
}

function controlsForParagraph(controls, paragraph) {
  return controls.filter((control) =>
    (control.tabId ?? null) === (paragraph.tabId ?? null) &&
    (control.segmentId ?? null) === (paragraph.segmentId ?? null) &&
    Number.isInteger(control.startIndex) && Number.isInteger(control.endIndex) &&
    Number.isInteger(paragraph.startIndex) && Number.isInteger(paragraph.endIndex) &&
    control.startIndex >= paragraph.startIndex && control.endIndex <= paragraph.endIndex,
  ).map((control) => ({
    classification: control.classification,
    fidelityClass: control.fidelityClass,
    startIndex: control.startIndex,
    endIndex: control.endIndex,
    codePoints: control.codePoints ?? [],
    dropdownId: control.dropdownId ?? null,
    selectedValue: control.selectedValue ?? null,
  }));
}

function normalizeParagraph(structuralElement, context, path, controls, ordinal) {
  const paragraph = structuralElement.paragraph;
  const bullet = paragraph.bullet ?? null;
  const record = {
    paragraphId: `P${String(ordinal).padStart(5, "0")}`,
    path,
    tabId: context.tabId,
    tabTitle: context.tabTitle,
    segmentId: context.segmentId,
    startIndex: structuralElement.startIndex ?? structuralElement.start_index ?? null,
    endIndex: structuralElement.endIndex ?? structuralElement.end_index ?? null,
    namedStyleType: paragraph.paragraphStyle?.namedStyleType ?? paragraph.paragraph_style?.named_style_type ?? null,
    isListItem: Boolean(bullet),
    listId: bullet?.listId ?? bullet?.list_id ?? null,
    nestingLevel: bullet?.nestingLevel ?? bullet?.nesting_level ?? null,
    table: context.table,
    text: (paragraph.elements ?? []).map(elementText).join("").replace(/\n$/, ""),
  };
  return { ...record, protectedControls: controlsForParagraph(controls, record) };
}

function collectParagraphs(document, controls, selectedTabId) {
  const paragraphs = [];
  const visitContent = (content, context, path) => {
    for (let index = 0; index < (content ?? []).length; index += 1) {
      const structuralElement = content[index];
      const elementPath = `${path}[${index}]`;
      if (structuralElement.paragraph?.elements) {
        paragraphs.push(normalizeParagraph(structuralElement, context, elementPath, controls, paragraphs.length + 1));
      } else if (structuralElement.table?.tableRows) {
        const tableStartIndex = structuralElement.startIndex ?? structuralElement.start_index ?? null;
        structuralElement.table.tableRows.forEach((row, rowIndex) => {
          (row.tableCells ?? []).forEach((cell, columnIndex) => {
            visitContent(cell.content ?? [], {
              ...context,
              table: { tableStartIndex, rowIndex, columnIndex },
            }, `${elementPath}.table.rows[${rowIndex}].cells[${columnIndex}].content`);
          });
        });
      } else if (structuralElement.tableOfContents?.content) {
        visitContent(structuralElement.tableOfContents.content, context, `${elementPath}.tableOfContents.content`);
      }
    }
  };

  for (const tab of tabRecords(document)) {
    if (selectedTabId !== null && tab.tabId !== selectedTabId) continue;
    visitContent(tab.body?.content ?? [], {
      tabId: tab.tabId,
      tabTitle: tab.title,
      segmentId: null,
      table: null,
    }, `tabs.${tab.tabId ?? "body"}.body.content`);
  }

  for (const [collectionName, values] of [["headers", document.headers], ["footers", document.footers], ["footnotes", document.footnotes]]) {
    if (!isRecord(values)) continue;
    for (const [segmentId, segment] of Object.entries(values)) {
      visitContent(segment.content ?? [], {
        tabId: null,
        tabTitle: collectionName,
        segmentId,
        table: null,
      }, `${collectionName}.${segmentId}.content`);
    }
  }
  return paragraphs;
}

function controlLabel(control) {
  const codePoints = control.codePoints?.length ? ` ${control.codePoints.join(",")}` : "";
  const selected = control.selectedValue !== null && control.selectedValue !== undefined ? ` selected=${JSON.stringify(control.selectedValue)}` : "";
  return `${control.classification}/${control.fidelityClass}@${control.startIndex}:${control.endIndex}${codePoints}${selected}`;
}

export function renderNormalizedDocumentText(normalized) {
  const lines = [
    `# ${normalized.document.title ?? "Google Doc"}`,
    "",
    `- Document ID: ${normalized.document.documentId}`,
    `- Revision ID: ${normalized.document.revisionId ?? "unavailable"}`,
    `- Selected tab: ${normalized.selectedTabId ?? "all"}`,
    `- Protected controls: ${normalized.controlSummary.total}`,
    `- Opaque controls: ${normalized.controlSummary.opaque}`,
    `- Authoritative dropdowns: ${normalized.controlSummary.authoritativeDropdowns}`,
    "",
    "Protected-control annotations are preservation instructions. Do not insert their displayed placeholder text to recreate a native control.",
    "",
  ];
  let currentSection = Symbol("none");
  for (const paragraph of normalized.paragraphs) {
    const section = `${paragraph.tabTitle ?? "Document"}\u0000${paragraph.tabId ?? "body"}\u0000${paragraph.segmentId ?? ""}`;
    if (section !== currentSection) {
      currentSection = section;
      lines.push(`## ${paragraph.tabTitle ?? "Document"} (${paragraph.tabId ?? "body"})`, "");
    }
    const metadata = [
      paragraph.paragraphId,
      `${paragraph.startIndex ?? "?"}:${paragraph.endIndex ?? "?"}`,
      paragraph.namedStyleType ?? "NORMAL_TEXT",
      paragraph.isListItem ? `LIST id=${paragraph.listId ?? "?"} level=${paragraph.nestingLevel ?? 0}` : null,
      paragraph.table ? `TABLE row=${paragraph.table.rowIndex} col=${paragraph.table.columnIndex}` : null,
    ].filter(Boolean).join(" | ");
    lines.push(`[${metadata}]`);
    if (paragraph.protectedControls.length > 0) {
      lines.push(`⟦PROTECTED: ${paragraph.protectedControls.map(controlLabel).join("; ")} — preserve this control and its containing structure⟧`);
    }
    lines.push(paragraph.text || "⟦EMPTY PARAGRAPH⟧", "");
  }
  return `${lines.join("\n")}\n`;
}

export function normalizeGoogleDocumentRead({ documentResult, trustedReadContext, selectedTabId = null } = {}) {
  const document = findDocument(documentResult);
  if (!document) throw new Error("Could not locate the Google Docs document resource");
  const controls = trustedReadContext?.derivedControlInventory?.controls ?? [];
  const paragraphs = collectParagraphs(document, controls, selectedTabId);
  const normalized = {
    version: 1,
    kind: "google-docs-normalized-read",
    document: {
      documentId: document.documentId ?? document.document_id,
      title: document.title ?? null,
      revisionId: document.revisionId ?? document.revision_id ?? null,
      documentUrl: document.documentUrl ?? document.document_url ?? document.url ?? null,
    },
    selectedTabId,
    controlSummary: {
      total: controls.length,
      opaque: trustedReadContext?.derivedControlInventory?.opaqueControlCount ?? 0,
      authoritativeDropdowns: trustedReadContext?.derivedControlInventory?.authoritativeDropdownCount ?? 0,
      affectedParagraphs: paragraphs.filter((paragraph) => paragraph.protectedControls.length > 0).length,
    },
    paragraphs,
  };
  return { normalized, markdown: renderNormalizedDocumentText(normalized) };
}
```

### File: `runtime/dropdown-common.mjs`

```javascript
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

export function assert(condition, message, path = null) {
  if (!condition) throw new Error(path ? `${path}: ${message}` : message);
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function requireRecord(value, path) {
  assert(isRecord(value), "must be an object", path);
  return value;
}

export function requireArray(value, path) {
  assert(Array.isArray(value), "must be an array", path);
  return value;
}

export function requireString(value, path, { allowEmpty = false } = {}) {
  assert(typeof value === "string" && (allowEmpty || value.length > 0), "must be a non-empty string", path);
  return value;
}

export function requireInteger(value, path, { minimum = null } = {}) {
  assert(Number.isInteger(value), "must be an integer", path);
  if (minimum !== null) assert(value >= minimum, `must be >= ${minimum}`, path);
  return value;
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Text(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function sha256Json(value) {
  return sha256Text(stableStringify(value));
}

export async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export function rangesOverlap(left, right) {
  if ((left.tabId ?? null) !== (right.tabId ?? null) || (left.segmentId ?? null) !== (right.segmentId ?? null)) return false;
  return left.startIndex < right.endIndex && right.startIndex < left.endIndex;
}

export function rangeContains(outer, inner) {
  return (outer.tabId ?? null) === (inner.tabId ?? null) &&
    (outer.segmentId ?? null) === (inner.segmentId ?? null) &&
    outer.startIndex <= inner.startIndex && outer.endIndex >= inner.endIndex;
}

export function findFirstRecord(value, predicate) {
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return null;
    seen.add(candidate);
    if (isRecord(candidate) && predicate(candidate)) return candidate;
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(value);
}

export function collectRecords(value, predicate) {
  const output = [];
  const seen = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return;
    seen.add(candidate);
    if (isRecord(candidate) && predicate(candidate)) output.push(candidate);
    for (const child of Array.isArray(candidate) ? candidate : Object.values(candidate)) visit(child);
  };
  visit(value);
  return output;
}
```

### File: `runtime/dropdown-contract.mjs`

```javascript
import {
  assert,
  rangesOverlap,
  requireArray,
  requireInteger,
  requireRecord,
  requireString,
  sha256Json,
} from "./dropdown-common.mjs";
import { verifyDropdownInventory } from "./dropdown-inventory.mjs";

export const DROPDOWN_CONTRACT_VERSION = 1;

function normalizeRange(value, path) {
  const range = requireRecord(value, path);
  const startIndex = requireInteger(range.startIndex, `${path}.startIndex`, { minimum: 0 });
  const endIndex = requireInteger(range.endIndex, `${path}.endIndex`, { minimum: startIndex });
  return { tabId: range.tabId ?? null, segmentId: range.segmentId ?? null, startIndex, endIndex };
}

export function freezeDropdownContract({
  inventory,
  selectedTabId = null,
  sourceDocumentIds = [],
  protectedTabIds = [],
  protectedRanges = [],
} = {}) {
  verifyDropdownInventory(inventory);
  assert(!sourceDocumentIds.includes(inventory.document.id), "Target document cannot also be a source document");
  const base = {
    contractVersion: DROPDOWN_CONTRACT_VERSION,
    target: {
      documentId: inventory.document.id,
      title: inventory.document.title ?? null,
      revisionId: inventory.document.revisionId,
      selectedTabId,
      inventorySha256: inventory.sha256,
    },
    sourceDocumentIds: [...new Set(sourceDocumentIds)],
    protectedTabIds: [...new Set(protectedTabIds)],
    protectedRanges: protectedRanges.map((range, index) => normalizeRange(range, `protectedRanges[${index}]`)),
    semanticElements: inventory.semanticElements,
  };
  return {
    ...base,
    targetBindingsHash: sha256Json({ target: base.target, semanticElements: base.semanticElements }),
    decisionHash: sha256Json({
      sourceDocumentIds: base.sourceDocumentIds,
      protectedTabIds: base.protectedTabIds,
      protectedRanges: base.protectedRanges,
    }),
  };
}

export function validateDropdownContract(value, inventory) {
  const contract = requireRecord(value, "contract");
  verifyDropdownInventory(inventory);
  assert(contract.contractVersion === DROPDOWN_CONTRACT_VERSION, `must be ${DROPDOWN_CONTRACT_VERSION}`, "contract.contractVersion");
  requireString(contract.target?.documentId, "contract.target.documentId");
  assert(contract.target.documentId === inventory.document.id, "does not match inventory", "contract.target.documentId");
  assert(contract.target.revisionId === inventory.document.revisionId, "does not match inventory", "contract.target.revisionId");
  assert(contract.target.inventorySha256 === inventory.sha256, "does not match inventory", "contract.target.inventorySha256");
  const sourceDocumentIds = requireArray(contract.sourceDocumentIds ?? [], "contract.sourceDocumentIds");
  assert(!sourceDocumentIds.includes(contract.target.documentId), "source denylist contains target document", "contract.sourceDocumentIds");
  const protectedTabIds = requireArray(contract.protectedTabIds ?? [], "contract.protectedTabIds");
  const protectedRanges = requireArray(contract.protectedRanges ?? [], "contract.protectedRanges").map((range, index) => normalizeRange(range, `contract.protectedRanges[${index}]`));
  assert(sha256Json({ target: contract.target, semanticElements: contract.semanticElements }) === contract.targetBindingsHash, "targetBindingsHash mismatch", "contract.targetBindingsHash");
  assert(sha256Json({ sourceDocumentIds, protectedTabIds, protectedRanges }) === contract.decisionHash, "decisionHash mismatch", "contract.decisionHash");
  assert(sha256Json(contract.semanticElements) === sha256Json(inventory.semanticElements), "semantic inventory mismatch", "contract.semanticElements");
  return { contract, sourceDocumentIds, protectedTabIds, protectedRanges };
}

export function assertRangeAllowed(range, contractState, path = "range") {
  assert(!contractState.protectedTabIds.includes(range.tabId ?? null), "targets a protected tab", path);
  for (const protectedRange of contractState.protectedRanges) {
    assert(!rangesOverlap(range, protectedRange), "overlaps a protected range", path);
  }
}
```

### File: `runtime/dropdown-inventory.mjs`

```javascript
import {
  assert,
  collectRecords,
  findFirstRecord,
  isRecord,
  requireArray,
  requireInteger,
  requireRecord,
  requireString,
  sha256Json,
} from "./dropdown-common.mjs";

export const DROPDOWN_INVENTORY_VERSION = 1;

function unwrap(value) {
  if (isRecord(value?.structuredContent)) return value.structuredContent;
  if (isRecord(value?.result)) return value.result;
  return value;
}

function documentIdentity(raw) {
  const root = unwrap(raw);
  const document = findFirstRecord(root, (candidate) =>
    typeof (candidate.documentId ?? candidate.document_id) === "string" &&
    (candidate.revisionId || candidate.revision_id || candidate.body || candidate.tabs),
  );
  assert(document, "Could not locate a Google Docs document resource");
  return {
    id: document.documentId ?? document.document_id,
    title: document.title ?? null,
    revisionId: document.revisionId ?? document.revision_id ?? null,
    url: document.documentUrl ?? document.document_url ?? document.url ?? null,
  };
}

function isPrivateUse(codePoint) {
  return (codePoint >= 0xE000 && codePoint <= 0xF8FF) ||
    (codePoint >= 0xF0000 && codePoint <= 0xFFFFD) ||
    (codePoint >= 0x100000 && codePoint <= 0x10FFFD);
}

export function privateUseMarkerSpans(value) {
  const text = String(value ?? "");
  const spans = [];
  let current = null;
  for (let offset = 0; offset < text.length;) {
    const codePoint = text.codePointAt(offset);
    const character = String.fromCodePoint(codePoint);
    if (isPrivateUse(codePoint)) {
      if (!current) current = { startOffset: offset, endOffset: offset, text: "", codePoints: [] };
      current.endOffset = offset + character.length;
      current.text += character;
      current.codePoints.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
    } else if (current) {
      spans.push(current);
      current = null;
    }
    offset += character.length;
  }
  if (current) spans.push(current);
  return spans;
}

function semanticBinding({ type, fidelityClass, locator, container = null, semanticProperties, displayText = "", anchor = {} }) {
  const semanticPropertiesHash = sha256Json(semanticProperties);
  const anchorHash = sha256Json({
    prefixText: String(anchor.prefixText ?? "").slice(-96),
    suffixText: String(anchor.suffixText ?? "").slice(0, 96),
    container,
  });
  return {
    bindingId: sha256Json({ type, locator, semanticPropertiesHash, anchorHash }),
    type,
    fidelityClass,
    locator,
    container,
    displayText,
    semanticProperties,
    semanticPropertiesHash,
    anchorHash,
  };
}

function normalizeOptions(value, path) {
  return requireArray(value ?? [], path).map((option, index) => {
    const item = requireRecord(option, `${path}[${index}]`);
    return {
      label: requireString(item.label ?? item.text ?? item.value, `${path}[${index}].label`),
      ...(item.color ?? item.colorStyle ?? item.color_style ? { color: item.color ?? item.colorStyle ?? item.color_style } : {}),
      ...(item.id ?? item.optionId ?? item.option_id ? { id: item.id ?? item.optionId ?? item.option_id } : {}),
    };
  });
}

function dropdownRecords(raw) {
  const root = unwrap(raw);
  const containers = collectRecords(root, (candidate) => Array.isArray(candidate.dropdowns));
  const values = containers.flatMap((container) => container.dropdowns);
  if (Array.isArray(root)) values.push(...root);
  return values.filter((candidate) => isRecord(candidate) && (
    candidate.dropdownId || candidate.dropdown_id || candidate.options || candidate.optionItems || candidate.option_items
  ));
}

function dropdownResponseIdentity(raw) {
  const root = unwrap(raw);
  const record = findFirstRecord(root, (candidate) =>
    typeof (candidate.documentId ?? candidate.document_id) === "string" &&
    typeof (candidate.revisionId ?? candidate.revision_id) === "string" &&
    Array.isArray(candidate.dropdowns),
  );
  assert(record, "Dropdown metadata must include document identity, revision, and dropdown records");
  return {
    documentId: record.documentId ?? record.document_id,
    revisionId: record.revisionId ?? record.revision_id,
    tabId: record.tabId ?? record.tab_id ?? null,
  };
}

function normalizeDropdown(value, index, fallbackTabId = null) {
  const path = `dropdowns[${index}]`;
  const dropdown = requireRecord(value, path);
  const range = dropdown.range ?? dropdown.locator ?? {};
  const startIndex = requireInteger(range.startIndex ?? range.start_index ?? dropdown.startIndex ?? dropdown.start_index, `${path}.startIndex`, { minimum: 0 });
  const endIndex = requireInteger(range.endIndex ?? range.end_index ?? dropdown.endIndex ?? dropdown.end_index, `${path}.endIndex`, { minimum: startIndex + 1 });
  const tabId = range.tabId ?? range.tab_id ?? dropdown.tabId ?? dropdown.tab_id ?? fallbackTabId;
  const options = normalizeOptions(dropdown.options ?? dropdown.optionItems ?? dropdown.option_items, `${path}.options`);
  const selectedValue = dropdown.selectedValue ?? dropdown.selected_value ?? dropdown.value ?? null;
  assert(options.length > 0, "must not be empty", `${path}.options`);
  assert(new Set(options.map((option) => option.label)).size === options.length, "labels must be unique", `${path}.options`);
  if (selectedValue !== null) assert(options.some((option) => option.label === selectedValue), "must name an available option", `${path}.selectedValue`);
  const dropdownId = dropdown.dropdownId ?? dropdown.dropdown_id ?? null;
  if (dropdownId !== null) requireString(dropdownId, `${path}.dropdownId`);
  const providerSignature = dropdown.signature ?? dropdown.semanticSignature ?? dropdown.semantic_signature ?? null;
  assert(dropdownId !== null || (typeof providerSignature === "string" && providerSignature.length > 0), "requires a provider ID or stable semantic signature", path);
  const semanticProperties = {
    dropdownId,
    options,
    selectedValue,
    signature: providerSignature ?? sha256Json({ dropdownId, options, selectedValue }),
  };
  const container = dropdown.container ?? dropdown.tableCell ?? dropdown.table_cell ?? null;
  return semanticBinding({
    type: "dropdownControl",
    fidelityClass: "exact-writable",
    locator: { tabId: tabId ?? null, segmentId: range.segmentId ?? range.segment_id ?? null, startIndex, endIndex },
    container,
    semanticProperties,
    displayText: String(dropdown.displayText ?? dropdown.display_text ?? selectedValue ?? ""),
    anchor: dropdown.anchor ?? {},
  });
}

function collectOpaqueControls(rawDocument, exactDropdowns) {
  const root = unwrap(rawDocument);
  const output = [];
  const seen = new Set();
  const visit = (value, context = { tabId: null, segmentId: null, container: null, prefixText: "", suffixText: "" }) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, context));
      return;
    }
    const tabId = value.tabProperties?.tabId ?? value.tab_properties?.tab_id ?? value.tabId ?? value.tab_id ?? context.tabId;
    const segmentId = value.segmentId ?? value.segment_id ?? context.segmentId;
    if (typeof value.textRun?.content === "string" && Number.isInteger(value.startIndex ?? value.start_index)) {
      const base = value.startIndex ?? value.start_index;
      for (const marker of privateUseMarkerSpans(value.textRun.content)) {
        const locator = { tabId: tabId ?? null, segmentId: segmentId ?? null, startIndex: base + marker.startOffset, endIndex: base + marker.endOffset };
        const identified = exactDropdowns.some((binding) =>
          binding.locator.tabId === locator.tabId && binding.locator.segmentId === locator.segmentId &&
          binding.locator.startIndex === locator.startIndex && binding.locator.endIndex === locator.endIndex,
        );
        if (identified) continue;
        output.push(semanticBinding({
          type: "opaqueTemplateControl",
          fidelityClass: "copy-only",
          locator,
          container: context.container,
          semanticProperties: {
            controlClass: "private-use-glyph",
            markerText: marker.text,
            codePoints: marker.codePoints,
            textStyle: value.textRun.textStyle ?? {},
          },
          displayText: marker.text,
          anchor: context,
        }));
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "textRun") continue;
      visit(child, { ...context, tabId, segmentId });
    }
  };
  visit(root);
  return output;
}

export function buildDropdownInventory({ documentResult, dropdownResult, documentId = null, tabId = null } = {}) {
  const document = documentIdentity(documentResult);
  if (documentId) assert(document.id === documentId, "Document identity does not match requested document");
  const dropdownIdentity = dropdownResponseIdentity(dropdownResult);
  assert(dropdownIdentity.documentId === document.id, "Dropdown metadata belongs to a different document");
  assert(dropdownIdentity.revisionId === document.revisionId, "Document and dropdown metadata revisions do not match");
  if (tabId !== null) assert(dropdownIdentity.tabId === null || dropdownIdentity.tabId === tabId, "Dropdown metadata belongs to a different tab");
  const dropdowns = dropdownRecords(dropdownResult).map((value, index) => normalizeDropdown(value, index, tabId));
  const opaqueControls = collectOpaqueControls(documentResult, dropdowns);
  const semanticElements = [...dropdowns, ...opaqueControls].sort((left, right) =>
    String(left.locator.tabId).localeCompare(String(right.locator.tabId)) || left.locator.startIndex - right.locator.startIndex,
  );
  const base = {
    inventoryVersion: DROPDOWN_INVENTORY_VERSION,
    document,
    selectedTabId: tabId ?? null,
    dropdowns,
    opaqueControls,
    semanticElements,
  };
  return { ...base, sha256: sha256Json(base) };
}

export function verifyDropdownInventory(value) {
  const inventory = requireRecord(value, "inventory");
  assert(inventory.inventoryVersion === DROPDOWN_INVENTORY_VERSION, `must use version ${DROPDOWN_INVENTORY_VERSION}`, "inventory.inventoryVersion");
  requireString(inventory.document?.id, "inventory.document.id");
  requireString(inventory.document?.revisionId, "inventory.document.revisionId");
  requireArray(inventory.semanticElements, "inventory.semanticElements");
  const { sha256, ...base } = inventory;
  assert(sha256 === sha256Json(base), "sha256 does not match inventory content", "inventory.sha256");
  return inventory;
}
```

### File: `runtime/dropdown-plan.mjs`

```javascript
import {
  assert,
  rangesOverlap,
  requireArray,
  requireInteger,
  requireRecord,
  requireString,
  sha256Json,
} from "./dropdown-common.mjs";
import { assertRangeAllowed, validateDropdownContract } from "./dropdown-contract.mjs";
import { verifyDropdownInventory } from "./dropdown-inventory.mjs";

export const DROPDOWN_PLAN_VERSION = 1;
export const STAGE_TYPES = new Set([
  "docs_batch_update",
  "dropdown_create",
  "dropdown_replace_options",
  "dropdown_set_selected",
]);

function normalizeOptions(value, path) {
  const options = requireArray(value, path).map((option, index) => {
    const item = requireRecord(option, `${path}[${index}]`);
    return {
      label: requireString(item.label, `${path}[${index}].label`),
      ...(item.color !== undefined ? { color: item.color } : {}),
      ...(item.id !== undefined ? { id: item.id } : {}),
    };
  });
  assert(options.length > 0, "must not be empty", path);
  assert(new Set(options.map((option) => option.label)).size === options.length, "labels must be unique", path);
  return options;
}

function normalizeLocation(value, path) {
  const location = requireRecord(value, path);
  return {
    tabId: location.tabId ?? null,
    segmentId: location.segmentId ?? null,
    index: requireInteger(location.index, `${path}.index`, { minimum: 0 }),
  };
}

function requestRange(request) {
  const payload = request.deleteContentRange ?? request.updateTextStyle ?? request.updateParagraphStyle ?? request.createParagraphBullets ?? request.deleteParagraphBullets;
  if (payload?.range) return payload.range;
  const locationPayload = request.insertText ?? request.insertTable ?? request.insertPageBreak ?? request.insertInlineImage ?? request.insertDate ?? request.insertPerson ?? request.insertRichLink;
  const location = locationPayload?.location ?? locationPayload?.endOfSegmentLocation ?? null;
  if (location && Number.isInteger(location.index)) return { ...location, startIndex: location.index, endIndex: location.index + 1 };
  const tableLocation = request.insertTableRow?.tableCellLocation?.tableStartLocation ?? request.insertTableColumn?.tableCellLocation?.tableStartLocation ?? request.deleteTableRow?.tableCellLocation?.tableStartLocation ?? request.deleteTableColumn?.tableCellLocation?.tableStartLocation;
  if (tableLocation && Number.isInteger(tableLocation.index)) return { ...tableLocation, startIndex: tableLocation.index, endIndex: tableLocation.index + 1 };
  return null;
}

function normalizeDocsStage(stage, contractState) {
  const call = requireRecord(stage.call, "plan.stage.call");
  assert(call.document_id === contractState.contract.target.documentId, "document_id does not match target", "plan.stage.call.document_id");
  const writeControl = requireRecord(call.write_control, "plan.stage.call.write_control");
  assert(writeControl.requiredRevisionId === contractState.contract.target.revisionId, "requiredRevisionId does not match target revision", "plan.stage.call.write_control.requiredRevisionId");
  const requests = requireArray(call.requests, "plan.stage.call.requests");
  assert(requests.length > 0, "must not be empty", "plan.stage.call.requests");
  const expectedBefore = requireRecord(stage.expectedBefore, "plan.stage.expectedBefore");
  assert(expectedBefore.revisionId === contractState.contract.target.revisionId, "does not match target revision", "plan.stage.expectedBefore.revisionId");
  assert(expectedBefore.targetBindingsHash === contractState.contract.targetBindingsHash, "does not match frozen bindings", "plan.stage.expectedBefore.targetBindingsHash");
  const expectedAfter = requireRecord(stage.expectedAfter, "plan.stage.expectedAfter");
  assert(expectedAfter.revisionChanged === true, "must be true", "plan.stage.expectedAfter.revisionChanged");
  assert(expectedAfter.semanticBindingsPreserved === true, "must be true", "plan.stage.expectedAfter.semanticBindingsPreserved");
  requests.forEach((request, index) => {
    const item = requireRecord(request, `plan.stage.call.requests[${index}]`);
    assert(Object.keys(item).length === 1, "must contain exactly one request type", `plan.stage.call.requests[${index}]`);
    assert(!item.replaceAllText && !item.replaceNamedRangeContent, "broad replacement requests are not allowed in dropdown code mode", `plan.stage.call.requests[${index}]`);
    const range = requestRange(item);
    if (!range) return;
    assertRangeAllowed(range, contractState, `plan.stage.call.requests[${index}]`);
    for (const binding of contractState.contract.semanticElements) {
      assert(!rangesOverlap(range, binding.locator), `intersects preserved semantic element ${binding.bindingId}`, `plan.stage.call.requests[${index}]`);
    }
  });
  return { ...stage, call: { ...call, requests }, expectedBefore, expectedAfter };
}

function validateStageGuards(stage, contractState) {
  const assertions = requireRecord(stage.preservationAssertions, "plan.stage.preservationAssertions");
  assert(assertions.preserveUntouchedSemanticBindings === true, "must be true", "plan.stage.preservationAssertions.preserveUntouchedSemanticBindings");
  const bindingIds = requireArray(assertions.semanticBindingIds, "plan.stage.preservationAssertions.semanticBindingIds");
  const expectedIds = contractState.contract.semanticElements.map((binding) => binding.bindingId).sort();
  assert(sha256Json([...bindingIds].sort()) === sha256Json(expectedIds), "must enumerate every frozen semantic binding", "plan.stage.preservationAssertions.semanticBindingIds");
  const readback = requireRecord(stage.postWriteReadback, "plan.stage.postWriteReadback");
  assert(readback.documentStructure === true, "must be true", "plan.stage.postWriteReadback.documentStructure");
  assert(readback.dropdownMetadata === true, "must be true", "plan.stage.postWriteReadback.dropdownMetadata");
}

function exactDropdownById(inventory, dropdownId, path) {
  const matches = inventory.dropdowns.filter((binding) => binding.semanticProperties.dropdownId === dropdownId);
  assert(matches.length === 1, matches.length ? "is ambiguous" : "does not identify a live dropdown", path);
  return matches[0];
}

function exactDropdownTarget(inventory, operation) {
  if (operation.dropdown_id !== undefined && operation.dropdown_id !== null) {
    return exactDropdownById(inventory, requireString(operation.dropdown_id, "plan.stage.call.operation.dropdown_id"), "plan.stage.call.operation.dropdown_id");
  }
  const bindingId = requireString(operation.binding_id, "plan.stage.call.operation.binding_id");
  const matches = inventory.dropdowns.filter((binding) => binding.bindingId === bindingId);
  assert(matches.length === 1, matches.length ? "is ambiguous" : "does not identify a live dropdown", "plan.stage.call.operation.binding_id");
  const locator = requireRecord(operation.locator, "plan.stage.call.operation.locator");
  assert(sha256Json(locator) === sha256Json(matches[0].locator), "does not match the binding locator", "plan.stage.call.operation.locator");
  assert(operation.semantic_signature === matches[0].semanticProperties.signature, "does not match the binding signature", "plan.stage.call.operation.semantic_signature");
  return matches[0];
}

function normalizeDropdownStage(stage, inventory, contractState) {
  const call = requireRecord(stage.call, "plan.stage.call");
  assert(call.document_id === inventory.document.id, "document_id does not match target", "plan.stage.call.document_id");
  assert(call.tab_id === inventory.selectedTabId, "tab_id does not match selected tab", "plan.stage.call.tab_id");
  assert(call.required_revision_id === inventory.document.revisionId, "required_revision_id does not match target revision", "plan.stage.call.required_revision_id");
  requireString(call.idempotency_key, "plan.stage.call.idempotency_key");
  const operation = requireRecord(call.operation, "plan.stage.call.operation");
  const expectedType = stage.type === "dropdown_set_selected" ? "set_selected_value" : stage.type.replace("dropdown_", "");
  assert(operation.type === expectedType, `must be ${expectedType}`, "plan.stage.call.operation.type");
  assert(Object.prototype.hasOwnProperty.call(operation, "selected_value"), "is required", "plan.stage.call.operation.selected_value");
  if (stage.type === "dropdown_create") {
    const location = normalizeLocation(operation.location, "plan.stage.call.operation.location");
    assert(location.tabId === inventory.selectedTabId, "location tab does not match selected tab", "plan.stage.call.operation.location.tabId");
    assertRangeAllowed({ ...location, startIndex: location.index, endIndex: location.index + 1 }, contractState, "plan.stage.call.operation.location");
    operation.options = normalizeOptions(operation.options, "plan.stage.call.operation.options");
    if (operation.selected_value !== null) {
      assert(operation.options.some((option) => option.label === operation.selected_value), "must name one of the options", "plan.stage.call.operation.selected_value");
    }
    requireRecord(operation.anchor, "plan.stage.call.operation.anchor");
    const expectedBefore = requireRecord(operation.expected_before, "plan.stage.call.operation.expected_before");
    assert(expectedBefore.dropdownAbsent === true, "must be true", "plan.stage.call.operation.expected_before.dropdownAbsent");
  } else {
    const binding = exactDropdownTarget(inventory, operation);
    const dropdownId = binding.semanticProperties.dropdownId;
    assert(binding.locator.tabId === inventory.selectedTabId, "dropdown is not in the selected tab", "plan.stage.call.operation.dropdown_id");
    assertRangeAllowed(binding.locator, contractState, "plan.stage.call.operation.dropdown_id");
    if (stage.type === "dropdown_replace_options") {
      operation.options = normalizeOptions(operation.options, "plan.stage.call.operation.options");
      if (operation.selected_value !== null) {
        assert(operation.options.some((option) => option.label === operation.selected_value), "must name one of the options", "plan.stage.call.operation.selected_value");
      }
    } else {
      const selectedValue = requireString(operation.selected_value, "plan.stage.call.operation.selected_value");
      assert(binding.semanticProperties.options.some((option) => option.label === selectedValue), "must name an existing option", "plan.stage.call.operation.selected_value");
    }
    const expectedBefore = requireRecord(operation.expected_before, "plan.stage.call.operation.expected_before");
    assert((expectedBefore.dropdownId ?? null) === dropdownId, "does not match dropdown_id", "plan.stage.call.operation.expected_before.dropdownId");
    assert(expectedBefore.bindingId === binding.bindingId, "does not match binding", "plan.stage.call.operation.expected_before.bindingId");
    assert(sha256Json(normalizeOptions(expectedBefore.options, "plan.stage.call.operation.expected_before.options")) === sha256Json(binding.semanticProperties.options), "does not match live options", "plan.stage.call.operation.expected_before.options");
    assert(expectedBefore.selectedValue === binding.semanticProperties.selectedValue, "does not match live selected value", "plan.stage.call.operation.expected_before.selectedValue");
    if (binding.semanticProperties.signature !== null) {
      assert(expectedBefore.signature === binding.semanticProperties.signature, "does not match live signature", "plan.stage.call.operation.expected_before.signature");
    }
  }
  const expectedAfter = requireRecord(stage.expectedAfter, "plan.stage.expectedAfter");
  const expectedOptions = normalizeOptions(expectedAfter.options, "plan.stage.expectedAfter.options");
  if (["dropdown_create", "dropdown_replace_options"].includes(stage.type)) {
    assert(sha256Json(expectedOptions) === sha256Json(operation.options), "does not match requested options", "plan.stage.expectedAfter.options");
  } else {
    const binding = exactDropdownTarget(inventory, operation);
    assert(sha256Json(expectedOptions) === sha256Json(binding.semanticProperties.options), "must preserve the live option set", "plan.stage.expectedAfter.options");
  }
  assert(Object.prototype.hasOwnProperty.call(expectedAfter, "selectedValue"), "is required", "plan.stage.expectedAfter.selectedValue");
  assert(expectedAfter.selectedValue === (operation.selected_value ?? null), "does not match requested selected value", "plan.stage.expectedAfter.selectedValue");
  return { ...stage, call: { ...call, operation }, expectedAfter };
}

export function validateDropdownPlan(value, { inventory, contract } = {}) {
  const plan = requireRecord(value, "plan");
  verifyDropdownInventory(inventory);
  const contractState = validateDropdownContract(contract, inventory);
  assert(plan.version === DROPDOWN_PLAN_VERSION, `must be ${DROPDOWN_PLAN_VERSION}`, "plan.version");
  assert(plan.kind === "google-docs-v2-dropdown-plan", "unsupported kind", "plan.kind");
  assert(plan.target?.documentId === inventory.document.id, "does not match inventory", "plan.target.documentId");
  assert(plan.target?.title === inventory.document.title, "does not match inventory", "plan.target.title");
  assert(plan.target?.expectedRevisionId === inventory.document.revisionId, "does not match inventory", "plan.target.expectedRevisionId");
  assert((plan.target?.tabId ?? null) === (inventory.selectedTabId ?? null), "does not match inventory", "plan.target.tabId");
  assert(plan.baseSnapshot?.sha256 === inventory.sha256, "does not match inventory", "plan.baseSnapshot.sha256");
  assert(plan.contract?.targetBindingsHash === contract.targetBindingsHash, "does not match contract", "plan.contract.targetBindingsHash");
  assert(plan.contract?.decisionHash === contract.decisionHash, "does not match contract", "plan.contract.decisionHash");
  assert(!contractState.sourceDocumentIds.includes(plan.target.documentId), "target is source-denylisted", "plan.target.documentId");
  const stage = requireRecord(plan.stage, "plan.stage");
  assert(STAGE_TYPES.has(stage.type), "unsupported stage type", "plan.stage.type");
  requireString(stage.id, "plan.stage.id");
  validateStageGuards(stage, contractState);
  const normalizedStage = stage.type === "docs_batch_update"
    ? normalizeDocsStage(stage, contractState)
    : normalizeDropdownStage(stage, inventory, contractState);
  const normalized = { ...plan, stage: normalizedStage };
  return {
    plan: normalized,
    summary: {
      documentId: inventory.document.id,
      tabId: inventory.selectedTabId,
      stageId: stage.id,
      stageType: stage.type,
      dropdownCount: inventory.dropdowns.length,
      opaqueControlCount: inventory.opaqueControls.length,
      planSha256: sha256Json(normalized),
    },
  };
}
```

### File: `runtime/dropdown-routing.mjs`

```javascript
const MUTATING_INTENTS = new Set([
  "create",
  "replace_options",
  "set_selected_value",
]);

const REQUIRED_DROPDOWN_CAPABILITIES = new Set([
  "getDocumentDropdowns",
  "updateDocumentDropdown",
]);

export const DROPDOWN_CODE_MODE_FEATURE_FLAG = "google_docs_v2_dropdown_code_mode";

function normalizeCapabilities(capabilities) {
  if (!Array.isArray(capabilities)) return new Set();
  return new Set(capabilities.filter((value) => typeof value === "string"));
}

export function selectDocsExecutionRoute({
  dropdownIntent = "none",
  featureEnabled = false,
  capabilities = [],
  plainTextApproximationApproved = false,
} = {}) {
  if (!["none", "preserve", ...MUTATING_INTENTS].includes(dropdownIntent)) {
    throw new Error(`Unsupported dropdown intent: ${dropdownIntent}`);
  }

  if (dropdownIntent === "none" || dropdownIntent === "preserve") {
    return {
      route: "direct",
      reason: dropdownIntent === "preserve"
        ? "preservation_only"
        : "no_dropdown_mutation",
      ownsEntireTrajectory: false,
    };
  }

  if (plainTextApproximationApproved) {
    return {
      route: "direct",
      reason: "user_approved_plain_text_approximation",
      ownsEntireTrajectory: false,
      nativeDropdownResult: false,
    };
  }

  if (!featureEnabled) {
    return {
      route: "blocked",
      reason: "dropdown_code_mode_feature_disabled",
      ownsEntireTrajectory: false,
    };
  }

  const available = normalizeCapabilities(capabilities);
  const missingCapabilities = [...REQUIRED_DROPDOWN_CAPABILITIES]
    .filter((name) => !available.has(name));
  if (missingCapabilities.length > 0) {
    return {
      route: "blocked",
      reason: "dropdown_connector_capability_unavailable",
      missingCapabilities,
      ownsEntireTrajectory: false,
    };
  }

  return {
    route: "dropdown-code-mode",
    reason: `native_dropdown_${dropdownIntent}`,
    ownsEntireTrajectory: true,
    nativeDropdownResult: true,
  };
}

export {
  MUTATING_INTENTS,
  REQUIRED_DROPDOWN_CAPABILITIES,
};
```

### File: `scripts/build_docs_dropdown_inventory.mjs`

```javascript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readJson, writeJson } from "../runtime/dropdown-common.mjs";
import { buildDropdownInventory } from "../runtime/dropdown-inventory.mjs";

const { values } = parseArgs({ options: {
  document: { type: "string" },
  dropdowns: { type: "string" },
  "document-id": { type: "string" },
  "tab-id": { type: "string" },
  output: { type: "string" },
} });
for (const key of ["document", "dropdowns", "output"]) if (!values[key]) throw new Error(`--${key} is required`);
const inventory = buildDropdownInventory({
  documentResult: await readJson(values.document),
  dropdownResult: await readJson(values.dropdowns),
  documentId: values["document-id"] ?? null,
  tabId: values["tab-id"] ?? null,
});
await writeJson(values.output, inventory);
```

### File: `scripts/canonicalize_google_workspace_url.mjs`

```javascript
#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const RESOURCE_TYPES = new Map([
  ["document", "document"],
  ["spreadsheets", "spreadsheet"],
  ["presentation", "presentation"],
]);

const LOCATION_KEYS = new Set([
  "bookmark",
  "gid",
  "heading",
  "range",
  "slide",
  "tab",
]);

function parseUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("A non-empty Google Workspace URL is required.");
  }
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new TypeError("The supplied value is not a valid absolute URL.");
  }
  if (/(^|\.)google\.com$/i.test(parsed.hostname) && parsed.pathname === "/url") {
    const target = parsed.searchParams.get("q") ?? parsed.searchParams.get("url");
    if (!target) throw new TypeError("Google redirect URL does not contain a target.");
    try {
      parsed = new URL(target);
    } catch {
      throw new TypeError("Google redirect target is not a valid absolute URL.");
    }
  }
  return parsed;
}

function hasLocationIntent(url) {
  for (const key of url.searchParams.keys()) {
    if (LOCATION_KEYS.has(key.toLowerCase())) return true;
  }
  let hash = url.hash.slice(1);
  try {
    hash = decodeURIComponent(hash);
  } catch {
    // Retain the original hash when it contains malformed escaping.
  }
  return /(?:^|[?&#])(bookmark|gid|heading|range|slide|tab)=/i.test(hash);
}

export function canonicalizeGoogleWorkspaceUrl(value) {
  const parsed = parseUrl(value);
  if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "docs.google.com") {
    throw new TypeError("URL is not a supported Google Docs, Sheets, or Slides URL.");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const resourceSegment = segments[0];
  const resourceType = RESOURCE_TYPES.get(resourceSegment);
  const dIndex = segments.indexOf("d");
  const fileId = dIndex >= 0 ? segments[dIndex + 1] : null;
  if (!resourceType || !fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
    throw new TypeError("URL does not contain a supported Google Workspace file ID.");
  }

  const canonicalUri = `https://docs.google.com/${resourceSegment}/d/${fileId}/edit`;
  const unwrappedUri = parsed.toString();
  const locationSpecific = hasLocationIntent(parsed);

  return {
    kind: "google-workspace-rich-link-target",
    resourceType,
    fileId,
    canonicalUri,
    deepLinkUri: locationSpecific ? unwrappedUri : null,
    originalUri: value.trim(),
    unwrappedUri,
  };
}

function main(args) {
  if (args.length === 0) {
    throw new TypeError("Usage: canonicalize_google_workspace_url.mjs <url> [url ...]");
  }
  const results = args.map(canonicalizeGoogleWorkspaceUrl);
  process.stdout.write(`${JSON.stringify(results.length === 1 ? results[0] : results, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
```

### File: `scripts/create_docs_dropdown_execution_context.mjs`

```javascript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { writeJson } from "../runtime/dropdown-common.mjs";

const { values } = parseArgs({ options: {
  "workspace-root": { type: "string" },
  "target-document-id": { type: "string" },
  executor: { type: "string" },
  output: { type: "string" },
} });
for (const key of ["workspace-root", "target-document-id", "executor", "output"]) if (!values[key]) throw new Error(`--${key} is required`);
await writeJson(values.output, {
  version: 1,
  kind: "google-docs-v2-dropdown-execution-context",
  workspaceRoot: resolve(values["workspace-root"]),
  targetDocumentId: values["target-document-id"],
  executorPath: resolve(values.executor),
});
```

### File: `scripts/freeze_docs_dropdown_contract.mjs`

```javascript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readJson, writeJson } from "../runtime/dropdown-common.mjs";
import { freezeDropdownContract } from "../runtime/dropdown-contract.mjs";

const { values } = parseArgs({ options: {
  inventory: { type: "string" },
  decisions: { type: "string" },
  output: { type: "string" },
} });
for (const key of ["inventory", "decisions", "output"]) if (!values[key]) throw new Error(`--${key} is required`);
const inventory = await readJson(values.inventory);
const decisions = await readJson(values.decisions);
await writeJson(values.output, freezeDropdownContract({ inventory, ...decisions }));
```

### File: `scripts/validate_docs_dropdown_plan.mjs`

```javascript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readJson, sha256File, writeJson } from "../runtime/dropdown-common.mjs";
import { validateDropdownPlan } from "../runtime/dropdown-plan.mjs";

const { values } = parseArgs({
  options: {
    plan: { type: "string" },
    inventory: { type: "string" },
    contract: { type: "string" },
    executor: { type: "string" },
    output: { type: "string" },
  },
});

for (const key of ["plan", "inventory", "contract", "executor", "output"]) {
  if (!values[key]) throw new Error(`--${key} is required`);
}

const [plan, inventory, contract] = await Promise.all([
  readJson(values.plan),
  readJson(values.inventory),
  readJson(values.contract),
]);
const validation = validateDropdownPlan(plan, { inventory, contract });
await writeJson(values.output, {
  validationVersion: 1,
  kind: "google-docs-v2-dropdown-plan-validation",
  planFileSha256: await sha256File(values.plan),
  inventoryFileSha256: await sha256File(values.inventory),
  contractFileSha256: await sha256File(values.contract),
  executorFileSha256: await sha256File(values.executor),
  summary: validation.summary,
});
```

### Not embedded

- `assets/google-docs-small.svg` (binary asset, not embedded)
- `assets/google-docs.png` (binary asset, not embedded)
