# Skill: google-slides

- Plugin: `cloudstorage-portal` (0.9.14)
- Source: `plugins/cloudstorage-portal/skills/google-slides/SKILL.md`

> Route Google Slides authoring requests and derive a design system from a native template or reference deck. Use this skill when the user provides an existing native Google Slides deck as a template, reference, or prior-period source, or asks to edit, update, repair, restyle, or clean up an existing native Google Slides deck. Use the Presentations skill instead for net-new presentation creation when no existing native Google Slides deck must be followed.

## Instructions

### Google Slides

#### Route the Request

- Use `[@presentations](plugin://presentations@openai-primary-runtime)` to create a net-new presentation when no existing native Google Slides deck is the template or reference.
- Use this skill to create a presentation by following an existing native Google Slides template, reference deck, or prior-period deck.
- Use this skill to edit, update, repair, restyle, or clean up an existing native Google Slides deck.
- If a request combines new content with an existing native Google Slides deck that must be followed, use this skill.
- Do not use this skill to author a blank or from-scratch presentation.

#### Parse a Template Deck

On Windows, use [the local Node host workflow](google-slides.md#file-referenceswindows-hostmd) for both template reading and rendering. It uses the same existing Google Drive connector with native filesystem operations and an existing `pdftoppm.exe`; no WSL, Perl, second connection or new service is needed. The `/bin` and `/usr/bin` examples below apply to POSIX hosts only.

If code mode is unavailable in the current Codex environment, reproduce the same read-to-file, parse, and render workflow with the available connector and local tools. Preserve the same artifacts and validation steps; do not skip the workflow merely because code mode cannot be used.

For template or reference following, first use code mode to read the complete template/reference presentation directly into a file. Set `SKILL_DIR` to this skill's absolute directory and `WORKSPACE` to an absolute task workspace, then run this in one `functions.exec` call:

```js
const SKILL_DIR = "<absolute-skill-directory>";
const WORKSPACE = "<absolute-task-workspace>";
const loaded = await tools.exec_command({
  cmd: `/bin/cat -- '${SKILL_DIR}/host/read-template-to-file.mjs'`,
  workdir: SKILL_DIR,
  login: false,
  yield_time_ms: 30000,
  max_output_tokens: 20000,
});
if (loaded.exit_code !== 0) throw new Error("Could not load the template reader");
const { readTemplateToFile } = new Function(
  `${loaded.output.replace(/^\s*export\s+/gm, "")}\nreturn { readTemplateToFile };`,
)();
const result = await readTemplateToFile({
  presentationId: "<presentation-id>",
  outputPath: `${WORKSPACE}/raw-template.json`,
  workspaceRoot: WORKSPACE,
  skillRoot: SKILL_DIR,
  tools,
});
text(JSON.stringify(result));
```

The reader omits the `fields` argument so the connector returns the full presentation resource, then writes the unmodified connector response to `raw-template.json` without placing it in model context.

Next, set `NODE` to the bundled Node.js executable returned by the workspace dependency loader and run:

```bash
"$NODE" "$SKILL_DIR/scripts/parse_template_design_system.mjs" \
  --input "$WORKSPACE/raw-template.json" \
  --output "$WORKSPACE/design-system.json" \
  --catalog "$WORKSPACE/design-catalog.md"
```

`--catalog` is optional. Use the JSON for master families, layout and placeholder IDs, inherited styles, theme colors, protected regions, and exemplar geometry. Use the catalog as a compact planning view. Confirm semantic and visual interpretations against rendered source slides; the parser derives structure but does not render the deck.

#### Render a Deck

Export a deck once as PDF and render every slide locally instead of fetching one thumbnail per slide. Set `PDFTOPPM` to `pdftoppm` inside the native-binaries directory returned by the workspace dependency loader, then run this in one `functions.exec` call:

```js
const SKILL_DIR = "<absolute-skill-directory>";
const WORKSPACE = "<absolute-task-workspace>";
const PDFTOPPM = "<absolute-native-binaries-directory>/pdftoppm";
const loaded = await tools.exec_command({
  cmd: `/bin/cat -- '${SKILL_DIR}/host/export-and-render-slides.mjs'`,
  workdir: SKILL_DIR,
  login: false,
  yield_time_ms: 30000,
  max_output_tokens: 30000,
});
if (loaded.exit_code !== 0) throw new Error("Could not load the slide renderer");
const { exportAndRenderSlides } = new Function(
  `${loaded.output.replace(/^\s*export\s+/gm, "")}\nreturn { exportAndRenderSlides };`,
)();
const result = await exportAndRenderSlides({
  presentationId: "<presentation-id>",
  outputDir: `${WORKSPACE}/renders/<deck-name>`,
  workspaceRoot: WORKSPACE,
  skillRoot: SKILL_DIR,
  designSystemPath: `${WORKSPACE}/design-system.json`,
  pdftoppmPath: PDFTOPPM,
  dpi: 120,
  tools,
});
text(JSON.stringify(result));
```

Use the helper as shown instead of calling Drive `fetch` or `export_file` directly. It automatically handles current reference-backed and legacy inline responses, writes `presentation.pdf`, and returns ordered PNGs mapped to native slide IDs. It fails if the PDF page count differs from the design system. Use a fresh output directory, then inspect every PNG with `view_image`; create a local contact sheet when useful.

##### Presentations location

Use/create `ChatGPT` at My Drive root. Place new presentations created from scratch or from a template there.
Edit existing presentations in place.

Respect user-specified locations.

#### Build From the Template

For template or reference following, copy the template once and edit only the copy.

Before making mutations, use the design catalog and rendered template slides to choose and record for every planned output slide:

- its narrative role;
- the native template exemplar slide ID or layout ID;
- whether it will be built by duplicating the exemplar or creating from the layout.

Match exemplars by narrative role, content density, evidence type, orientation, hierarchy, and meaning-bearing slots—not merely by object count or visual similarity. If the user links a particular template slide, inspect it explicitly and use it when it fits the requested role.

Do not use an exemplar containing device mockups, photography, screenshots, charts, or other meaning-bearing slide-local media unless every such element is explicitly mapped to destination content as keep, replace, or delete. If every element cannot be mapped, choose another exemplar.

Treat template placeholder media as meaning-bearing slide-local media. Explicitly map every image and video slot in a selected exemplar—especially speaker portraits—to keep, replace, or delete; never leave an unmapped placeholder in the output.

Prefer these construction methods in order:

1. Duplicate a rendered template exemplar when its design depends on slide-local shapes, image or chart frames, tables, groups, video, custom text styles, footer treatment, or other native objects.
2. Create from an inspected template layout only when its inherited placeholders are sufficient.
3. Populate, replace, or remove existing exemplar objects and inherited placeholders before creating new primary text, image, table, chart, or shape objects.
4. Create a new composition only when no inspected exemplar or layout can support the content; keep it consistent with the nearest template family.

Treat slide-local structure as part of the template. When a duplicated exemplar already contains a table, title frame, card structure, divider, footer, image frame, or other reusable structural object, edit it in place. Do not delete and recreate it merely to simplify implementation. Remove an object only after explicitly mapping it to `delete` because the destination slide does not need it.

Preserve the intrinsic aspect ratio of every image and video. Never stretch media by independently setting its width and height or by applying unequal horizontal and vertical scaling without deriving both from its intrinsic dimensions. Do not blindly reuse an exemplar media transform when the replacement has a different aspect ratio.

Use crop-to-fill only for decorative photography or full-bleed imagery where edge cropping is safe. Fit screenshots, charts, diagrams, UI, and videos fully within the intended frame so all meaning-bearing content remains visible; center the result, and prefer empty margins to distortion or loss of important content. Treat stretched media or improperly cropped meaning-bearing content as a concrete visual defect.

Preserve each exemplar's font family, weighted font family, font size, bold and italic state, color, paragraph styling, geometry, and object type by default. Change one of these only to resolve a concrete content-fit defect.

Preserve the template's font sizes whenever possible. If text overflows, first consider a small, local font-size reduction; do not shrink an entire mixed-style text box to solve one overflowing passage. Never reduce narrative body or list text below 12 pt. If the template already defines smaller narrative text for the same role, preserve that template size but do not reduce it further. Template-native captions, footers, source notes, and micro-labels may remain smaller, but do not reuse those smaller styles for narrative content.

If content still does not fit readably, choose a denser suitable exemplar or shorten flexible wording while preserving the original meaning, tone, facts, and required details. Treat reaching the 12 pt narrative floor, visible overcrowding, conspicuously undersized text, or leaving a major intended region unused as evidence that the archetype is wrong—not as a cue for further local typography repairs. Restore the template size and switch to a more appropriate exemplar or shorten the copy; do not apply a uniform minimum-size style to an entire text box or keep adjusting paragraphs to force an unsuitable exemplar. If adapting an image-led exemplar requires deleting its principal media slot and leaving that region empty, choose a text-first exemplar instead.

Treat multiple text and paragraph styles within one text box as structural. If a text box combines a title, kicker, label, body, or other differently styled runs, replace the corresponding text while preserving the existing run and paragraph styles. Do not apply one uniform style to the entire text box.

Before replacing text in a mixed-style text box, record its existing text and paragraph runs and update the corresponding ranges. Do not use `deleteText` over `ALL` followed by `insertText` and `updateTextStyle` over `ALL`; if replacement changes run lengths, reconstruct the original styled ranges explicitly.

Use native paragraph bullets for lists. Never type leading hyphens or visible bullet glyphs such as `•`, `◦`, `▪`, or `‣` into inserted text to imitate a bulleted list. When an exemplar uses a custom bullet character or style, preserve its existing list formatting and edit the paragraph text without replacing or normalizing the marker.

Every bulleted paragraph must contain visible text. Never leave an empty or whitespace-only bulleted paragraph. When an exemplar contains more list items than needed, delete the unused paragraph or remove its bullet formatting; use paragraph spacing instead of a blank bullet to create vertical separation.

Do not create from a blank layout when an inspected rich exemplar can support the narrative role and evidence type.

Use one consistent exemplar or layout family for truly recurring slide roles. This does not mean collapsing visually distinct section-title, speaker, agenda, or content archetypes into one generic construction. If content does not fit, shorten flexible wording or choose a better-fitting template archetype; do not flatten the template's typography or redesign a sparse composition into a dense canvas.

Preserve native links, notes, tables, charts, and media types when supported, and remove stale exemplar content. Keep unused template-library slides until the delivered slides and final order are verified, then delete them last.

Do not rasterize editable source narrative text merely to preserve its appearance. Recreate it as native Google Slides text using the template's typography and hierarchy. Text may remain rasterized only when it is intrinsically part of a required screenshot or other source media asset.

#### Work Efficiently

Read, parse, and render each unchanged template or content source only once. Reuse the local design system, catalog, PDF, and rendered images.

Complete all planned slide construction and content population before output visual QA. Confirm the delivered slide IDs through one live structural readback, then remove unused template-library slides and establish the final order before the first output PDF render.

Read and parse the output once after its final slide set and order are established. Reuse that output design system after text, style, image, or media repairs. Parse it again only when a structural mutation changes slide IDs, slide count, or slide order.

Before the first output PDF render, run the local issue checker on the raw presentation JSON already saved by that structural readback:

```bash
"$NODE" "$SKILL_DIR/scripts/check_output_issues.mjs" \
  --input "$WORKSPACE/raw-output.json" \
  --output "$WORKSPACE/output-issues.json"
```

The checker makes no API or render calls. It reports only compact, object-level findings for empty native bullet paragraphs, duplicate or typed bullet markers, explicitly undersized narrative text, unresolved generic placeholder text, empty text placeholders, and structurally blank slides. Repair every `error` before rendering. Treat `warning` findings as review prompts and preserve intentional template-native exceptions. Combine applicable repairs with the existing consolidated repair pass; do not add a read, parse, render, or diagnostic-rerun cycle solely to clear warnings.

Inspect every delivered slide from one output render and collect all concrete defects before repairing. Prefer one consolidated repair pass, but perform a second consolidated pass when defects remain. A structural rebuild invalidates prior visual QA: render the complete delivered deck again and use the second repair pass if needed. Do not perform more than two repair passes. Do not create additional read, parse, or render cycles without a concrete defect or structural change that invalidates an existing artifact.

Complete duplication and slide creation before reordering. Reorder in a separate mutation after structural readback, using each delivered slide ID exactly once.

#### Output Format

##### Final Response Citations

- **Create/edit:** for created or edited presentations, cite each final deliverable exactly once with `purpose="output"`, in its own paragraph. Briefly describe the result without repeating its filename, path, or link. Never put output directives inside prose or list items.
- **Q&A and summaries:** Every file whose contents you summarize or use to support an answer MUST receive a `:codex-file-citation{...}` with `purpose="source"` in the final response. Use the source citation in place of the filename, wherever the filename would appear. Do not write the filename separately and append its citation at the end. Files merely inspected but not used in the answer need no citation. Do not emit output citations for unchanged files or read-only answers.

- Emit `:codex-file-citation{...}` directly, without backticks, code fences, or a Markdown-link wrapper. Use verified targets only. No need to cite or reference intermediate work.

Deliver a native Google Slides file even when another authoring workflow was used to build it, unless the user explicitly requests preservation of the source file type or no conversion. Set `path` to its verified native URL returned by the connector and omit `mode`. Citation directives are exempt from “Return web URLs as Markdown links.”

Some illustrative examples, real responses use verified targets outside code fences.

```text
:codex-file-citation{path="https://docs.google.com/presentation/d/<verified-file-id>" purpose="output"}
```

```text
The review of :codex-file-citation{path="https://docs.google.com/presentation/d/<verified-file-id>" purpose="source"} is due Friday.
```

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Google Slides"
  short_description: "Create, adapt, inspect, and edit Slides decks"
  icon_small: "./assets/google-slides-small.svg"
  icon_large: "./assets/google-slides.png"
  brand_color: "#F9AB00"
  default_prompt: "Use $google-slides to create, adapt, inspect, summarize, or edit a Google Slides deck, including following a native Slides template/reference deck or importing a PPTX."
```

### File: `host/export-and-render-slides.mjs`

```javascript
const READY_MARKER = "SLIDES_BRIDGE_READY";
const COMMITTED_MARKER = "SLIDES_BRIDGE_COMMITTED";
const RECORD_SEPARATOR = "\u0003";
const MAX_PDF_BYTES = 32 * 1024 * 1024;
const FRAME_CHARS = 480000;
const CONNECTOR_TOOL_RESULTS_ROOT = "/workspace/.openai/connector_tool_results";
const PREPARE_LEGACY_OUTPUT = String.raw`
use strict;
use warnings;
use File::Basename qw(dirname);

@ARGV == 2 or die "invalid legacy PDF output arguments\n";
my ($output_path, $workspace_root) = @ARGV;
for my $path ($output_path, $workspace_root) {
  $path !~ /[\0\r\n]/ or die "invalid legacy PDF output path\n";
}

sub parts_below_root {
  my ($path, $root) = @_;
  ($path eq $root || index($path, "$root/") == 0)
    or die "legacy PDF output path must stay within the workspace\n";
  my $relative = substr($path, length($root));
  return grep { length($_) > 0 } split("/", $relative);
}

sub require_real_directory {
  my ($path) = @_;
  lstat($path) or die "could not inspect legacy PDF output path\n";
  -l _ and die "legacy PDF output path must not include symlinks\n";
  -d _ or die "legacy PDF output path component must be a directory\n";
}

require_real_directory($workspace_root);
my $cursor = $workspace_root;
for my $part (parts_below_root(dirname($output_path), $workspace_root)) {
  $cursor .= "/$part";
  if (lstat($cursor)) {
    -l _ and die "legacy PDF output path must not include symlinks\n";
    -d _ or die "legacy PDF output path component must be a directory\n";
  } else {
    mkdir($cursor, 0700) or die "could not create legacy PDF output directory\n";
  }
}
lstat($output_path) and die "refusing to overwrite an existing PDF\n";
`;
const COPY_MATERIALIZED_PDF = String.raw`
use strict;
use warnings;
use Fcntl qw(O_CREAT O_EXCL O_NOFOLLOW O_RDONLY O_WRONLY);
use Digest::SHA;
use File::Basename qw(dirname);

@ARGV == 7 or die "invalid materialized PDF arguments\n";
my (
  $source_path,
  $output_path,
  $maximum_bytes,
  $declared_bytes,
  $temporary_path,
  $source_root,
  $output_root,
) = @ARGV;
$maximum_bytes =~ /\A[0-9]+\z/ or die "invalid materialized PDF size limit\n";
($declared_bytes eq "-" || $declared_bytes =~ /\A[0-9]+\z/)
  or die "invalid declared materialized PDF size\n";
for my $path ($source_path, $output_path, $temporary_path, $source_root, $output_root) {
  $path !~ /[\0\r\n]/ or die "invalid materialized PDF path\n";
}

sub parts_below_root {
  my ($path, $root, $label) = @_;
  ($path eq $root || index($path, "$root/") == 0)
    or die "$label must stay within its trusted root\n";
  my $relative = substr($path, length($root));
  return grep { length($_) > 0 } split("/", $relative);
}

sub require_real_directory {
  my ($path, $label) = @_;
  lstat($path) or die "could not inspect $label\n";
  -l _ and die "$label must not include symlinks\n";
  -d _ or die "$label must be a directory\n";
}

sub reject_symlink_components {
  my ($root, $path, $label) = @_;
  require_real_directory($root, "$label root");
  my $cursor = $root;
  for my $part (parts_below_root($path, $root, $label)) {
    $cursor .= "/$part";
    lstat($cursor) or die "could not inspect $label\n";
    -l _ and die "$label must not include symlinks\n";
  }
}

sub ensure_directory_tree {
  my ($root, $directory, $label) = @_;
  require_real_directory($root, "$label root");
  my $cursor = $root;
  for my $part (parts_below_root($directory, $root, $label)) {
    $cursor .= "/$part";
    if (lstat($cursor)) {
      -l _ and die "$label must not include symlinks\n";
      -d _ or die "$label component must be a directory\n";
    } else {
      mkdir($cursor, 0700) or die "could not create $label\n";
    }
  }
}

ensure_directory_tree($output_root, dirname($output_path), "output path");
reject_symlink_components($source_root, $source_path, "materialized PDF path");
sysopen(my $source, $source_path, O_RDONLY | O_NOFOLLOW)
  or die "could not open the materialized PDF\n";
binmode($source);
-f $source or die "materialized PDF must be a regular file\n";
my @source_stat = stat($source);
@source_stat or die "could not stat the materialized PDF\n";
my $expected_bytes = $source_stat[7];
$expected_bytes >= 5 or die "materialized PDF does not contain a PDF header\n";
$expected_bytes <= $maximum_bytes or die "materialized PDF exceeds the byte limit\n";
($declared_bytes eq "-" || $expected_bytes == $declared_bytes)
  or die "materialized PDF does not match its declared byte length\n";
(!-e $output_path && !-e $temporary_path)
  or die "refusing to overwrite an existing PDF\n";

umask 0077;
sysopen(my $output, $temporary_path, O_WRONLY | O_CREAT | O_EXCL, 0600)
  or die "could not create a temporary materialized PDF\n";
binmode($output);
my $bytes_written = 0;
my $sha256 = Digest::SHA->new(256);
my $success = eval {
  while (1) {
    my $read = sysread($source, my $chunk, 64 * 1024);
    defined($read) or die "could not read the materialized PDF\n";
    last if $read == 0;
    if ($bytes_written == 0) {
      substr($chunk, 0, 5) eq "%PDF-"
        or die "materialized file does not contain a PDF header\n";
    }
    $bytes_written += $read;
    $bytes_written <= $maximum_bytes
      or die "materialized PDF exceeds the byte limit\n";
    my $offset = 0;
    while ($offset < $read) {
      my $written = syswrite($output, $chunk, $read - $offset, $offset);
      defined($written) && $written > 0
        or die "could not write the materialized PDF\n";
      $offset += $written;
    }
    $sha256->add($chunk);
  }
  $bytes_written == $expected_bytes
    or die "materialized PDF changed while it was being copied\n";
  close($source) or die "could not close the materialized PDF\n";
  close($output) or die "could not close the copied PDF\n";
  link($temporary_path, $output_path)
    or die "could not publish the materialized PDF without overwriting\n";
  unlink($temporary_path) or die "could not clean up the temporary PDF\n";
  print "SLIDES_BRIDGE_COMMITTED $bytes_written ", $sha256->hexdigest, "\n";
  1;
};
if (!$success) {
  my $reason = $@ || "could not materialize the PDF\n";
  close($output);
  unlink($temporary_path);
  die $reason;
}
`;

class SlidesRenderError extends Error {
  constructor(message) {
    super(String(message).replace(/https?:\/\/[^\s\"'<>]+/gi, "[URL_REDACTED]"));
    this.name = "SlidesRenderError";
  }
}

function assert(condition, message) {
  if (!condition) throw new SlidesRenderError(message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeAbsolutePath(value, label) {
  assert(typeof value === "string" && value.startsWith("/"), `${label} must be an absolute path`);
  assert(!/[\0\r\n]/.test(value), `${label} contains an invalid character`);
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
  );
  return normalizedPath;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function dirname(path) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

function normalizeToolName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveFetch(tools) {
  const preferred = "mcp__codex_apps__google_drive_fetch";
  if (typeof tools?.[preferred] === "function") return preferred;
  const matches = Object.keys(tools ?? {}).filter((name) =>
    typeof tools[name] === "function" && normalizeToolName(name).endsWith("googledrivefetch"));
  assert(matches.length === 1, "Could not resolve the Google Drive fetch tool");
  return matches[0];
}

function canonicalPresentationUrl(presentationId) {
  assert(
    /^[A-Za-z0-9_-]+$/.test(presentationId),
    "presentationId is invalid for a canonical raw fetch",
  );
  return `https://docs.google.com/presentation/d/${presentationId}`;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unwrapToolResult(raw) {
  assert(raw?.isError !== true, "Google Drive PDF export failed");
  if (raw?.structuredContent?.result !== undefined) return raw.structuredContent.result;
  if (raw?.structuredContent !== undefined) return raw.structuredContent;
  const text = Array.isArray(raw?.content)
    ? raw.content.find((item) => item?.type === "text" && typeof item.text === "string")?.text
    : null;
  return text ? parseJson(text) ?? raw : raw;
}

function isUnsupportedIncludeBase64Error(value) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    text = String(value);
  }
  return /InvalidActionArgumentsError|invalid_action_arguments|unknown\s+(?:argument|parameter)|unexpected\s+(?:argument|field)|extra\s+(?:argument|field)/i.test(
    String(text ?? ""),
  );
}

async function fetchPdf({ connectorTool, presentationId, tools }) {
  const args = {
    url: canonicalPresentationUrl(presentationId),
    download_raw_file: true,
    raw_export_mime_type: "application/pdf",
  };
  try {
    const raw = await tools[connectorTool]({ ...args, include_base64: false });
    if (raw?.isError !== true || !isUnsupportedIncludeBase64Error(raw)) return raw;
  } catch (error) {
    if (!isUnsupportedIncludeBase64Error(error)) throw error;
  }
  return tools[connectorTool](args);
}

function findPdfPayload(root) {
  const queue = [root];
  const seen = new Set();
  let inlineContentPayload = null;
  while (queue.length > 0 && seen.size < 10000) {
    const value = queue.shift();
    if ((!isRecord(value) && !Array.isArray(value)) || seen.has(value)) continue;
    seen.add(value);
    if (isRecord(value) && typeof value.b64_string === "string") {
      return {
        ...value,
        content: value.b64_string,
        mimeType: value.mimeType ?? value.mime_type ?? "application/pdf",
      };
    }
    if (isRecord(value) && typeof value.content === "string" && value.content.length > 0) {
      const mimeType = value.mimeType ?? value.mime_type ?? null;
      if (
        inlineContentPayload === null
        && (value.base64Encoded === true || mimeType === "application/pdf")
      ) {
        inlineContentPayload = value;
      }
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      if (isRecord(child) || Array.isArray(child)) queue.push(child);
    }
  }
  if (inlineContentPayload !== null) return inlineContentPayload;
  throw new SlidesRenderError("PDF export did not contain base64 PDF content");
}

function decodedBase64Bytes(value) {
  if (value.length === 0 || value.length % 4 !== 0) return null;
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function validatePdfPayload(value) {
  const payload = findPdfPayload(value);
  const base64 = payload.content;
  const mimeType = payload.mimeType ?? payload.mime_type ?? "application/pdf";
  assert(mimeType === "application/pdf", `Export returned ${mimeType} instead of application/pdf`);
  assert(/^[A-Za-z0-9+/]*={0,2}$/.test(base64), "PDF export contains invalid base64");
  assert(base64.startsWith("JVBERi0"), "PDF export does not start with a PDF header");
  const bytes = decodedBase64Bytes(base64);
  assert(Number.isInteger(bytes) && bytes > 0, "PDF export has an invalid decoded byte length");
  assert(bytes <= MAX_PDF_BYTES, `PDF export is ${bytes} bytes; limit is ${MAX_PDF_BYTES}`);
  return { base64, bytes };
}

function findMaterializedPdf(raw, result, workspaceRoot, host = null) {
  const candidates = [
    result,
    raw,
    raw?.result,
    raw?.structuredContent,
    raw?.structuredContent?.result,
  ].filter(isRecord);
  const referenceOwner = candidates.find((candidate) =>
    isRecord(candidate.file_uri));
  if (!referenceOwner) return null;

  const reference = referenceOwner.file_uri;
  const pathOwner = candidates.find((candidate) =>
    typeof candidate.workspace_path === "string");
  if (!pathOwner) return { missingWorkspacePath: true };

  const normalize = host?.normalizeAbsolutePath ?? normalizeAbsolutePath;
  const source = normalize(pathOwner.workspace_path, "workspace_path");
  const workspace = normalize(workspaceRoot, "workspaceRoot");
  const insideWorkspace = host ? host.contains(source, workspace) : source === workspace || source.startsWith(`${workspace}/`);
  const insideConnectorResults = host
    ? host.connectorResultsRoot !== null && host.contains(source, host.connectorResultsRoot)
    : source.startsWith(`${CONNECTOR_TOOL_RESULTS_ROOT}/`);
  assert(
    insideWorkspace || insideConnectorResults,
    "Materialized PDF workspace_path must stay within the task workspace or connector tool results",
  );

  const mimeType = reference.mime_type
    ?? referenceOwner.mime_type
    ?? referenceOwner.mimeType
    ?? result?.mime_type
    ?? result?.mimeType;
  assert(mimeType === "application/pdf", `Export returned ${mimeType} instead of application/pdf`);

  const declaredBytes = referenceOwner.size
    ?? referenceOwner.file_size_bytes
    ?? reference.size
    ?? result?.size
    ?? result?.file_size_bytes;
  if (declaredBytes !== null && declaredBytes !== undefined) {
    assert(
      Number.isSafeInteger(declaredBytes) && declaredBytes > 0,
      "Materialized PDF has an invalid declared byte length",
    );
    assert(
      declaredBytes <= MAX_PDF_BYTES,
      `PDF export is ${declaredBytes} bytes; limit is ${MAX_PDF_BYTES}`,
    );
  }

  return { source, declaredBytes, missingWorkspacePath: false };
}

async function copyMaterializedPdf({ source, declaredBytes, outputPath, workspaceRoot, tools }) {
  const workspace = normalizeAbsolutePath(workspaceRoot, "workspaceRoot");
  const output = assertWithinRoot(outputPath, workspace, "outputPath");
  const temporary = `${output}.stream-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
  const sourceRoot = source.startsWith(`${CONNECTOR_TOOL_RESULTS_ROOT}/`)
    ? CONNECTOR_TOOL_RESULTS_ROOT
    : workspace;

  const result = await tools.exec_command({
    cmd: `/usr/bin/perl -e ${shellQuote(COPY_MATERIALIZED_PDF)} -- ${shellQuote(source)} ${shellQuote(output)} ${shellQuote(String(MAX_PDF_BYTES))} ${shellQuote(declaredBytes === null || declaredBytes === undefined ? "-" : String(declaredBytes))} ${shellQuote(temporary)} ${shellQuote(sourceRoot)} ${shellQuote(workspace)}`,
    workdir: workspace,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 1000,
  });
  assert(result.exit_code === 0, `Could not copy the materialized PDF: ${result.output}`);
  const receipt = /SLIDES_BRIDGE_COMMITTED\s+(\d+)\s+([a-f0-9]{64})/i.exec(
    String(result.output ?? ""),
  );
  assert(receipt, "Materialized PDF returned an invalid copy receipt");
  const bytes = Number(receipt[1]);
  assert(Number.isSafeInteger(bytes) && bytes > 0, "Materialized PDF has an invalid byte length");
  assert(bytes <= MAX_PDF_BYTES, `PDF export is ${bytes} bytes; limit is ${MAX_PDF_BYTES}`);
  if (declaredBytes !== null && declaredBytes !== undefined) {
    assert(bytes === declaredBytes, "Materialized PDF does not match its declared byte length");
  }
  return { path: output, bytes, sha256: receipt[2].toLowerCase() };
}

async function waitForMarker(tools, initial, sessionId, marker) {
  let result = initial;
  let output = String(result?.output ?? "");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (output.includes(marker)) return { result, output };
    if (result?.exit_code !== null && result?.exit_code !== undefined) break;
    result = await tools.write_stdin({
      session_id: sessionId,
      chars: "",
      yield_time_ms: 1000,
      max_output_tokens: 1000,
    });
    output += String(result?.output ?? "");
  }
  throw new SlidesRenderError(`File receiver did not report ${marker}`);
}

async function writeBase64({ base64, bytes, outputPath, workspaceRoot, skillRoot, tools }) {
  assert(typeof tools.write_stdin === "function", "Legacy PDF exports require a code-mode file receiver");
  const workspace = normalizeAbsolutePath(workspaceRoot, "workspaceRoot");
  const output = assertWithinRoot(outputPath, workspace, "outputPath");
  const receiver = assertWithinRoot(
    `${normalizeAbsolutePath(skillRoot, "skillRoot")}/host/slides-stdin-receiver.pl`,
    skillRoot,
    "receiverPath",
  );
  const temporary = `${output}.stream-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;

  let result = await tools.exec_command({
    cmd: `/usr/bin/perl -e ${shellQuote(PREPARE_LEGACY_OUTPUT)} -- ${shellQuote(output)} ${shellQuote(workspace)}`,
    workdir: workspace,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 1000,
  });
  assert(result.exit_code === 0, `Could not prepare legacy PDF output: ${result.output}`);

  const started = await tools.exec_command({
    cmd: `/usr/bin/perl ${shellQuote(receiver)} ${shellQuote(output)} ${shellQuote(String(bytes))} - ${shellQuote(temporary)}`,
    workdir: workspace,
    login: false,
    tty: true,
    yield_time_ms: 1000,
    max_output_tokens: 1000,
  });
  const sessionId = started?.session_id;
  assert(Number.isInteger(sessionId), `Could not start file receiver: ${started?.output ?? "missing session"}`);

  try {
    await waitForMarker(tools, started, sessionId, READY_MARKER);
    let sequence = 0;
    for (let offset = 0; offset < base64.length; offset += FRAME_CHARS) {
      const write = await tools.write_stdin({
        session_id: sessionId,
        chars: `D\t${sequence}\t${base64.slice(offset, offset + FRAME_CHARS)}${RECORD_SEPARATOR}`,
        yield_time_ms: 250,
        max_output_tokens: 1000,
      });
      assert(write?.exit_code === null || write?.exit_code === undefined, "File receiver exited before commit");
      sequence += 1;
    }
    const committed = await tools.write_stdin({
      session_id: sessionId,
      chars: `C${RECORD_SEPARATOR}`,
      yield_time_ms: 30000,
      max_output_tokens: 1000,
    });
    const completed = await waitForMarker(tools, committed, sessionId, COMMITTED_MARKER);
    const receipt = /SLIDES_BRIDGE_COMMITTED\s+(\d+)\s+([a-f0-9]{64})/i.exec(completed.output);
    assert(receipt, "File receiver returned an invalid receipt");
    assert(Number(receipt[1]) === bytes, "File receiver wrote the wrong byte count");
    assert(completed.result?.exit_code === 0, "File receiver did not exit cleanly");
    return { path: output, bytes, sha256: receipt[2].toLowerCase() };
  } catch (error) {
    try {
      await tools.write_stdin({ session_id: sessionId, chars: `A${RECORD_SEPARATOR}`, yield_time_ms: 1000, max_output_tokens: 1000 });
    } catch {
      // Receiver may already have exited.
    }
    throw error;
  }
}

function pageNumber(path) {
  const match = /-(\d+)\.png$/.exec(path);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function loadSlideOrder({ designSystemPath, presentationId, workspaceRoot, tools, host = null }) {
  if (designSystemPath === null || designSystemPath === undefined) return null;
  const path = (host?.assertWithinRoot ?? assertWithinRoot)(designSystemPath, workspaceRoot, "designSystemPath");
  const result = host ? null : await tools.exec_command({
    cmd: `jq -c '{presentationId:.source.presentation.id,slides:([.slides[]|{slideIndex:.index,slideObjectId:.slideId,titlePreview:(.titlePreview//null),layoutId:(.layoutId//null),isSkipped:(.isSkipped==true)}]|sort_by(.slideIndex))}' ${shellQuote(path)}`,
    workdir: dirname(path),
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 20000,
  });
  if (!host) assert(result.exit_code === 0, `Could not read slide order from the design system: ${result.output}`);
  const parsed = host ? await host.readDesignSystem({designSystemPath:path,workspaceRoot}) : parseJson(String(result.output ?? "").trim());
  assert(isRecord(parsed) && Array.isArray(parsed.slides), "Design system did not contain an ordered slides array");
  assert(parsed.presentationId === presentationId, "Design system presentation ID does not match presentationId");
  const seen = new Set();
  parsed.slides.forEach((slide, index) => {
    assert(isRecord(slide), `Design system slide ${index + 1} is invalid`);
    assert(slide.slideIndex === index, `Design system slide indices are not contiguous at page ${index + 1}`);
    assert(typeof slide.slideObjectId === "string" && slide.slideObjectId.length > 0, `Design system slide ${index + 1} omitted slideId`);
    assert(!seen.has(slide.slideObjectId), `Design system contains duplicate slide ID ${slide.slideObjectId}`);
    seen.add(slide.slideObjectId);
  });
  return { path, slides: parsed.slides };
}

export async function exportAndRenderSlides({
  presentationId,
  outputDir,
  workspaceRoot,
  skillRoot,
  designSystemPath = null,
  pdftoppmPath,
  dpi = 120,
  tools,
  host = null,
} = {}) {
  assert(typeof presentationId === "string" && presentationId.length > 0, "presentationId is required");
  assert(tools && (host || typeof tools.exec_command === "function"), "Code-mode tools are required");
  assert(Number.isInteger(dpi) && dpi >= 36 && dpi <= 300, "dpi must be an integer from 36 to 300");
  const normalize = host?.normalizeAbsolutePath ?? normalizeAbsolutePath;
  const workspace = normalize(workspaceRoot, "workspaceRoot");
  const output = (host?.assertWithinRoot ?? assertWithinRoot)(outputDir, workspace, "outputDir");
  const renderer = normalize(pdftoppmPath, "pdftoppmPath");
  const pdfPath = `${output}/presentation.pdf`;
  const slideOrder = await loadSlideOrder({ designSystemPath, presentationId, workspaceRoot: workspace, tools, host });

  const connectorTool = resolveFetch(tools);
  const raw = await fetchPdf({ connectorTool, presentationId, tools });
  const result = unwrapToolResult(raw);
  const materialized = findMaterializedPdf(raw, result, workspace, host);
  let pdf;
  if (materialized?.source) {
    pdf = await (host?.copyMaterializedPdf ?? copyMaterializedPdf)({
      source: materialized.source,
      declaredBytes: materialized.declaredBytes,
      outputPath: pdfPath,
      workspaceRoot: workspace,
      tools,
    });
  } else {
    let payload;
    try {
      payload = validatePdfPayload([result, raw]);
    } catch (error) {
      if (materialized?.missingWorkspacePath) {
        throw new SlidesRenderError(
          "Google Drive PDF file reference was not materialized to workspace_path and no valid inline fallback was available",
        );
      }
      throw error;
    }
    pdf = await (host?.writeBase64 ?? writeBase64)({
      base64: payload.base64,
      bytes: payload.bytes,
      outputPath: pdfPath,
      workspaceRoot: workspace,
      skillRoot,
      tools,
    });
  }

  let images;
  if (host) {
    images = await host.render({renderer,pdfPath:pdf.path,output,dpi,workspaceRoot:workspace});
  } else {
  const rendered = await tools.exec_command({
    cmd: `${shellQuote(renderer)} -png -r ${dpi} ${shellQuote(pdfPath)} ${shellQuote(`${output}/slide`)}`,
    workdir: output,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 5000,
  });
  assert(rendered.exit_code === 0, `pdftoppm failed: ${rendered.output}`);
  const listed = await tools.exec_command({
    cmd: `/usr/bin/find ${shellQuote(output)} -maxdepth 1 -type f -name 'slide-*.png' -print`,
    workdir: output,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 20000,
  });
  assert(listed.exit_code === 0, `Could not list rendered slides: ${listed.output}`);
  images = String(listed.output ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => pageNumber(left) - pageNumber(right));
  }
  images.sort((left, right) => pageNumber(left) - pageNumber(right));
  assert(images.length > 0, "pdftoppm produced no slide images");
  if (slideOrder) {
    assert(
      slideOrder.slides.length === images.length,
      `PDF page count ${images.length} does not match design system slide count ${slideOrder.slides.length}`,
    );
  }
  const mappedImages = images.map((path, index) => ({
    page: index + 1,
    path,
    ...(slideOrder ? slideOrder.slides[index] : {}),
  }));

  return {
    status: "complete",
    presentationId,
    connectorTool,
    pdf,
    dpi,
    pageCount: images.length,
    designSystemPath: slideOrder?.path ?? null,
    images: mappedImages,
  };
}
```

### File: `host/export-and-render-slides.test.mjs`

```javascript
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

import { exportAndRenderSlides } from "./export-and-render-slides.mjs";
import { createNodeSlidesHost } from "./node-slides-host.mjs";

const execFileAsync = promisify(execFile);
const pdfBytes = Buffer.from("%PDF-1.7\nGoogle Slides regression\n%%EOF\n");
const pdfSha256 = createHash("sha256").update(pdfBytes).digest("hex");

function createOversizedPdf() {
  const bytes = Buffer.alloc(10 * 1024 * 1024 + 1, 0x20);
  bytes.set(Buffer.from("%PDF-1.7\n"));
  bytes.set(Buffer.from("\n%%EOF\n"), bytes.length - 7);
  return bytes;
}

async function runLocalCommand(cmd, workdir) {
  try {
    const { stdout, stderr } = await execFileAsync("/bin/sh", ["-c", cmd], {
      cwd: workdir,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return { exit_code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return {
      exit_code: Number.isInteger(error.code) ? error.code : 1,
      output: `${error.stdout ?? ""}${error.stderr ?? error.message}`,
    };
  }
}

async function createFixture(t, {
  raw,
  includeLegacyReceiver = false,
  pdf = pdfBytes,
} = {}) {
  const workspace = await mkdtemp(join(tmpdir(), "google-slides-materialization-"));
  t.after(async () => {
    await rm(workspace, { recursive: true, force: true });
  });
  const source = join(workspace, "connector-results", "presentation.pdf");
  const outputDir = join(workspace, "renders");
  const calls = [];
  const frames = [];

  await mkdir(join(workspace, "connector-results"));
  await writeFile(source, pdf);
  const reference = {
    file_id: "sediment://test-presentation",
    download_url: "sediment://test-presentation",
    file_name: "presentation.pdf",
    mime_type: "application/pdf",
  };
  const defaultResponse = {
    structuredContent: { file_uri: reference, size: pdf.length, workspace_path: source },
  };

  const tools = {
    async mcp__codex_apps__google_drive_fetch(args) {
      calls.push({ kind: "fetch", args });
      return typeof raw === "function"
        ? raw({ source, reference, workspace, outputDir, pdfBytes: pdf, args })
        : raw ?? defaultResponse;
    },
    async exec_command({ cmd, workdir }) {
      calls.push({ kind: "command", cmd, workdir });
      if (cmd.startsWith("/bin/mkdir -p ") || cmd.startsWith("/bin/test ! -e ")) {
        return runLocalCommand(cmd, workdir);
      }
      if (cmd.startsWith("/usr/bin/perl -e ")) {
        return runLocalCommand(cmd, workdir);
      }
      if (cmd.startsWith("/usr/bin/perl ") && cmd.includes("slides-stdin-receiver.pl")) {
        return { session_id: 41, output: "SLIDES_BRIDGE_READY\n" };
      }
      if (cmd.includes(" -png -r ")) return { exit_code: 0, output: "" };
      if (cmd.startsWith("/usr/bin/find ")) {
        return { exit_code: 0, output: `${outputDir}/slide-1.png\n` };
      }
      assert.fail(`Unexpected command: ${cmd}`);
    },
  };

  if (includeLegacyReceiver) {
    tools.write_stdin = async ({ chars }) => {
      if (chars.startsWith("D\t")) {
        const [, , encoded] = chars.slice(0, -1).split("\t");
        frames.push(Buffer.from(encoded, "base64"));
        return { exit_code: null, output: "" };
      }
      if (chars === "C\u0003") {
        const bytes = Buffer.concat(frames);
        await writeFile(join(outputDir, "presentation.pdf"), bytes, { flag: "wx" });
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        return {
          exit_code: 0,
          output: `SLIDES_BRIDGE_COMMITTED ${bytes.length} ${sha256}\n`,
        };
      }
      assert.fail(`Unexpected legacy receiver frame: ${chars}`);
    };
  }

  const nodeHost = process.platform === 'win32' ? createNodeSlidesHost({execute:async (_exe,args)=>{
    calls.push({kind:'native-render',args});
    await writeFile(join(outputDir,'slide-1.png'),Buffer.from([137,80,78,71,13,10,26,10]));
    return {stdout:'',stderr:''};
  }}) : null;
  if(nodeHost){
    const write=nodeHost.writeBase64;
    nodeHost.writeBase64=async args=>{calls.push({kind:'native-inline'});return write(args);};
  }
  const render = (overrides = {}) => exportAndRenderSlides({
    presentationId: "native-presentation",
    outputDir,
    workspaceRoot: workspace,
    skillRoot: "/trusted/google-slides",
    pdftoppmPath: process.platform === 'win32' ? process.execPath : "/usr/bin/pdftoppm",
    host:nodeHost,
    tools,
    ...overrides,
  });

  return { workspace, source, outputDir, reference, tools, calls, render };
}

test("renders a materialized reference-only PDF without inline content", async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.render();

  assert.equal(result.status, "complete");
  assert.deepEqual(result.pdf, {
    path: join(fixture.outputDir, "presentation.pdf"),
    bytes: pdfBytes.length,
    sha256: pdfSha256,
  });
  assert.deepEqual(await readFile(result.pdf.path), pdfBytes);
  assert.deepEqual(result.images, [{
    page: 1,
    path: join(fixture.outputDir, "slide-1.png"),
  }]);
  assert.equal(result.connectorTool, "mcp__codex_apps__google_drive_fetch");
  assert.deepEqual(fixture.calls.filter((call) => call.kind === "fetch"), [{
    kind: "fetch",
    args: {
      url: "https://docs.google.com/presentation/d/native-presentation",
      download_raw_file: true,
      raw_export_mime_type: "application/pdf",
      include_base64: false,
    },
  }]);
  assert.equal(typeof fixture.tools.write_stdin, "undefined");
});

test("preserves a Fiber workspace_path from the outer result envelope", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ source, reference }) => ({
      workspace_path: source,
      structuredContent: { result: { file_uri: reference, size: pdfBytes.length } },
    }),
  });

  const result = await fixture.render();
  assert.deepEqual(await readFile(result.pdf.path), pdfBytes);
  assert.equal(result.pdf.sha256, pdfSha256);
});

test("renders an oversized native PDF through canonical raw fetch", async (t) => {
  const largePdf = createOversizedPdf();
  const fixture = await createFixture(t, { pdf: largePdf });

  const result = await fixture.render();

  assert.deepEqual(await readFile(result.pdf.path), largePdf);
  assert.equal(result.pdf.bytes, largePdf.length);
  assert.equal(result.pdf.sha256, createHash("sha256").update(largePdf).digest("hex"));
  assert.equal(result.connectorTool, "mcp__codex_apps__google_drive_fetch");
  assert.deepEqual(fixture.calls.filter((call) => call.kind === "fetch"), [{
    kind: "fetch",
    args: {
      url: "https://docs.google.com/presentation/d/native-presentation",
      download_raw_file: true,
      raw_export_mime_type: "application/pdf",
      include_base64: false,
    },
  }]);
  assert.equal(typeof fixture.tools.write_stdin, "undefined");
});

test("prefers a materialized raw file over duplicate inline base64", async (t) => {
  const inlinePdf = Buffer.from("%PDF-1.7\ninline fallback must not win\n%%EOF\n");
  const fixture = await createFixture(t, {
    raw: ({ source, reference }) => ({
      structuredContent: {
        file_uri: reference,
        workspace_path: source,
        size: pdfBytes.length,
        content: inlinePdf.toString("base64"),
        mimeType: "application/pdf",
        base64Encoded: true,
      },
    }),
  });

  const result = await fixture.render();

  assert.deepEqual(await readFile(result.pdf.path), pdfBytes);
  assert.equal(result.pdf.sha256, pdfSha256);
  assert.equal(result.connectorTool, "mcp__codex_apps__google_drive_fetch");
  assert.deepEqual(fixture.calls.filter((call) => call.kind === "fetch"), [{
    kind: "fetch",
    args: {
      url: "https://docs.google.com/presentation/d/native-presentation",
      download_raw_file: true,
      raw_export_mime_type: "application/pdf",
      include_base64: false,
    },
  }]);
  assert.equal(typeof fixture.tools.write_stdin, "undefined");
});

test("rejects an invalid presentation ID before raw fetch", async (t) => {
  const fixture = await createFixture(t);

  await assert.rejects(
    fixture.render({
      presentationId: "native-presentation?credential=secret",
    }),
    /presentationId is invalid for a canonical raw fetch/,
  );
  assert.equal(fixture.calls.length, 0);
});

test("rejects an unmaterialized raw-fetch response", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ reference }) => ({
      structuredContent: {
        file_uri: reference,
      },
    }),
  });

  await assert.rejects(
    fixture.render(),
    /not materialized to workspace_path/,
  );
});

test("verifies raw-fetch file_size_bytes against the materialized PDF", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ source, reference }) => ({
      structuredContent: {
        file_uri: reference,
        workspace_path: source,
        file_size_bytes: pdfBytes.length + 1,
      },
    }),
  });

  await assert.rejects(
    fixture.render(),
    /does not match its declared byte length/,
  );
});

test("retries older fetch workers and consumes legacy b64_string during rollout", async (t) => {
  const fixture = await createFixture(t, {
    includeLegacyReceiver: true,
    raw: ({ args }) => args.include_base64 === false
      ? {
          isError: true,
          content: [{ type: "text", text: "InvalidActionArgumentsError: Invalid action arguments" }],
          structuredContent: { error_code: "INVALID_ARGUMENT" },
        }
      : {
          b64_string: pdfBytes.toString("base64"),
          structuredContent: {
            content: "Extracted PDF text that is not base64.",
            mime_type: "application/pdf",
          },
        },
  });

  const result = await fixture.render();
  assert.deepEqual(await readFile(result.pdf.path), pdfBytes);
  assert.equal(result.pdf.sha256, pdfSha256);
  assert.deepEqual(fixture.calls.filter((call) => call.kind === "fetch"), [
    {
      kind: "fetch",
      args: {
        url: "https://docs.google.com/presentation/d/native-presentation",
        download_raw_file: true,
        raw_export_mime_type: "application/pdf",
        include_base64: false,
      },
    },
    {
      kind: "fetch",
      args: {
        url: "https://docs.google.com/presentation/d/native-presentation",
        download_raw_file: true,
        raw_export_mime_type: "application/pdf",
      },
    },
  ]);
  assert.ok(fixture.calls.some((call) => process.platform === "win32" ? call.kind === "native-inline" : call.cmd?.includes("slides-stdin-receiver.pl")));
});

test("ignores null file reference placeholders in legacy exports", async (t) => {
  const fixture = await createFixture(t, {
    includeLegacyReceiver: true,
    raw: {
      structuredContent: {
        content: pdfBytes.toString("base64"),
        mimeType: "application/pdf",
        base64Encoded: true,
        file_uri: null,
      },
    },
  });

  const result = await fixture.render();
  assert.deepEqual(await readFile(result.pdf.path), pdfBytes);
  assert.equal(result.pdf.sha256, pdfSha256);
  assert.ok(fixture.calls.some((call) => process.platform === "win32" ? call.kind === "native-inline" : call.cmd?.includes("slides-stdin-receiver.pl")));
});

test("falls back to inline base64 when Fiber did not materialize a reference", async (t) => {
  const fixture = await createFixture(t, {
    includeLegacyReceiver: true,
    raw: ({ reference }) => ({
      b64_string: pdfBytes.toString("base64"),
      structuredContent: {
        result: {
          file_uri: reference,
          mime_type: "application/pdf",
        },
      },
    }),
  });

  const result = await fixture.render();
  assert.deepEqual(await readFile(result.pdf.path), pdfBytes);
  assert.equal(result.pdf.sha256, pdfSha256);
  assert.ok(fixture.calls.some((call) => process.platform === "win32" ? call.kind === "native-inline" : call.cmd?.includes("slides-stdin-receiver.pl")));
});

test("rejects a materialized path outside the trusted workspace", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ reference, workspace }) => ({
      structuredContent: {
        file_uri: reference,
        workspace_path: join(workspace, "..", "unrelated", "presentation.pdf"),
      },
    }),
  });

  await assert.rejects(fixture.render(), /must stay within the task workspace/);
});

test("rejects a materialized export with a non-PDF MIME type", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ source, reference }) => ({
      structuredContent: {
        file_uri: { ...reference, mime_type: "text/plain" },
        workspace_path: source,
      },
    }),
  });

  await assert.rejects(fixture.render(), /text\/plain instead of application\/pdf/);
});

test("rejects PDFs exceeding the 32 MiB renderer limit", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ source, reference }) => ({
      structuredContent: {
        file_uri: reference,
        workspace_path: source,
        size: 32 * 1024 * 1024 + 1,
      },
    }),
  });

  await assert.rejects(fixture.render(), /limit is 33554432/);
});

test("verifies the materialized file starts with a real PDF header", async (t) => {
  const fixture = await createFixture(t);
  await writeFile(fixture.source, Buffer.alloc(pdfBytes.length, "x"));

  await assert.rejects(fixture.render(), /does not contain a PDF header/);
});

test("does not overwrite an existing presentation PDF", async (t) => {
  const fixture = await createFixture(t);
  await mkdir(fixture.outputDir);
  const existing = Buffer.from("preserve-existing-pdf");
  await writeFile(join(fixture.outputDir, "presentation.pdf"), existing);

  await assert.rejects(fixture.render(), /refusing to overwrite an existing PDF/);
  assert.deepEqual(await readFile(join(fixture.outputDir, "presentation.pdf")), existing);
});

test("rejects a symlink instead of following a materialized source", async (t) => {
  const fixture = await createFixture(t);
  const original = join(fixture.workspace, "original.pdf");
  await writeFile(original, pdfBytes);
  await rm(fixture.source);
  await symlink(original, fixture.source);

  await assert.rejects(fixture.render(), /materialized PDF path must not include symlinks/);
});

test("rejects a symlinked intermediate materialized source directory", async (t) => {
  const fixture = await createFixture(t);
  const actualResults = join(fixture.workspace, "actual-results");
  await rm(join(fixture.workspace, "connector-results"), { recursive: true, force: true });
  await mkdir(actualResults);
  await writeFile(join(actualResults, "presentation.pdf"), pdfBytes);
  await symlink(actualResults, join(fixture.workspace, "connector-results"));

  await assert.rejects(fixture.render(), /materialized PDF path must not include symlinks/);
});

test("rejects a symlinked output directory component", async (t) => {
  const fixture = await createFixture(t);
  const actualRenders = join(fixture.workspace, "actual-renders");
  await mkdir(actualRenders);
  await symlink(actualRenders, fixture.outputDir);

  await assert.rejects(fixture.render(), /output path must not include symlinks/);
});

test("rejects a symlinked legacy inline output directory component", async (t) => {
  const fixture = await createFixture(t, {
    includeLegacyReceiver: true,
    raw: {
      structuredContent: {
        content: pdfBytes.toString("base64"),
        mimeType: "application/pdf",
        base64Encoded: true,
      },
    },
  });
  const actualRenders = join(fixture.workspace, "actual-renders");
  await mkdir(actualRenders);
  await symlink(actualRenders, fixture.outputDir);

  await assert.rejects(
    fixture.render(),
    /legacy PDF output path must not include symlinks/,
  );
});

test("rejects a materialized file that disagrees with its declared size", async (t) => {
  const fixture = await createFixture(t, {
    raw: ({ source, reference }) => ({
      structuredContent: {
        file_uri: reference,
        workspace_path: source,
        size: pdfBytes.length + 1,
      },
    }),
  });

  await assert.rejects(fixture.render(), /does not match its declared byte length/);
});
```

### File: `host/node-slides-host.mjs`

```javascript
// Local host adapter. Provider credentials remain in the supplied connector tools.
import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const executeFile = promisify(execFile);
const MAX_PDF_BYTES = 32 * 1024 * 1024;
const PNG_HEADER = Buffer.from([137,80,78,71,13,10,26,10]);

function requireValue(ok, message) { if (!ok) throw new Error(message); }
function absolute(value, label='path') {
  requireValue(typeof value === 'string' && path.isAbsolute(value) && !/[\0\r\n]/.test(value), `${label} must be an absolute path`);
  if (process.platform === 'win32') {
    requireValue(/^[a-z]:[\\/]/i.test(value), `${label} must use a local absolute drive path`);
    requireValue(!value.slice(2).includes(':'),`${label} must not use alternate data streams`);
  }
  return path.normalize(value);
}
function contains(value, root) {
  const relative=path.relative(absolute(root), absolute(value));
  return relative==='' || (!path.isAbsolute(relative) && relative!=='..' && !relative.startsWith('..'+path.sep));
}
function within(value, root, label='path') {
  const result=absolute(value,label);
  requireValue(contains(result,root), `${label} must stay within its trusted root`);
  return result;
}
async function exists(value) {
  try { await fs.lstat(value); return true; } catch(error) { if(error.code==='ENOENT') return false; throw error; }
}
async function realDirectory(directory,label) {
  const stat=await fs.lstat(directory);
  requireValue(!stat.isSymbolicLink(),`${label} must not include symlinks`);
  requireValue(stat.isDirectory(),`${label} component must be a directory`);
}
async function inspectTree(root, target, label, createDirectories=false) {
  root=absolute(root);target=within(target,root,label);
  await realDirectory(root,label+' root');
  let cursor=root;
  for(const part of path.relative(root,target).split(path.sep).filter(Boolean)) {
    cursor=path.join(cursor,part);
    if(createDirectories) {
      try { await fs.mkdir(cursor,{mode:0o700}); } catch(error) { if(error.code!=='EEXIST') throw error; }
    }
    const stat=await fs.lstat(cursor);
    requireValue(!stat.isSymbolicLink(),`${label} must not include symlinks`);
    if(cursor!==target || createDirectories) requireValue(stat.isDirectory(),`${label} component must be a directory`);
  }
  const canonicalRoot=await fs.realpath(root),canonicalTarget=await fs.realpath(target);
  requireValue(contains(canonicalTarget,canonicalRoot),`${label} must stay within its trusted root`);
}
async function boundedRead(file, root, limit, label) {
  file=within(file,root,label);
  await inspectTree(root,file,label);
  const before=await fs.lstat(file,{bigint:true});
  requireValue(before.isFile(),`${label} must be a regular file`);
  requireValue(before.size<=BigInt(limit),`${label} exceeds the byte limit`);
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
  try {
    const opened=await handle.stat({bigint:true});
    requireValue(opened.isFile() && opened.ino===before.ino && opened.dev===before.dev,`${label} changed before reading`);
    const chunks=[];let bytes=0;
    while(true) {
      const chunk=Buffer.alloc(Math.min(65536,limit+1-bytes));
      const {bytesRead}=await handle.read(chunk,0,chunk.length,null);
      if(!bytesRead) break;
      bytes+=bytesRead;requireValue(bytes<=limit,`${label} exceeds the byte limit`);
      chunks.push(chunk.subarray(0,bytesRead));
    }
    const after=await handle.stat({bigint:true});
    requireValue(BigInt(bytes)===before.size && after.size===before.size && after.mtimeNs===before.mtimeNs && after.ctimeNs===before.ctimeNs,`${label} changed while it was being read`);
    await inspectTree(root,file,label);
    return Buffer.concat(chunks,bytes);
  } finally { await handle.close(); }
}
async function publishBytes(bytes, outputPath, workspaceRoot, label) {
  const output=within(outputPath,workspaceRoot,'output path');
  await inspectTree(workspaceRoot,path.dirname(output),label,true);
  requireValue(!await exists(output),'refusing to overwrite an existing PDF');
  const temporary=output+'.stream-'+randomUUID()+'.tmp';
  let owned=false;
  try {
    const handle=await fs.open(temporary,'wx',0o600);owned=true;
    try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
    await inspectTree(workspaceRoot,path.dirname(output),label);
    await fs.link(temporary,output); // atomic publication with no replacement
  } catch(error) {
    if(error.code==='EEXIST') throw new Error('refusing to overwrite an existing PDF');
    throw error;
  } finally { if(owned) await fs.unlink(temporary); }
  return {path:output,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
function validatePdf(bytes, declaredBytes) {
  requireValue(bytes.length>=5 && bytes.subarray(0,5).toString()==='%PDF-','materialized file does not contain a PDF header');
  requireValue(bytes.length<=MAX_PDF_BYTES,'materialized PDF exceeds the byte limit');
  if(declaredBytes!==undefined && declaredBytes!==null) requireValue(bytes.length===declaredBytes,'materialized PDF does not match its declared byte length');
}

export function createNodeSlidesHost({execute=executeFile,connectorResultsRoot=null}={}) {
  if(connectorResultsRoot!==null) connectorResultsRoot=absolute(connectorResultsRoot,'connectorResultsRoot');
  return {
    normalizeAbsolutePath:absolute, assertWithinRoot:within, contains, connectorResultsRoot,
    async copyMaterializedPdf({source,declaredBytes,outputPath,workspaceRoot}) {
      const root=contains(source,workspaceRoot)?workspaceRoot:connectorResultsRoot;
      requireValue(root!==null && contains(source,root),'Materialized PDF workspace_path must stay within the task workspace or connector tool results');
      const bytes=await boundedRead(source,root,MAX_PDF_BYTES,'materialized PDF path');
      validatePdf(bytes,declaredBytes);
      return publishBytes(bytes,outputPath,workspaceRoot,'output path');
    },
    async writeBase64({base64,bytes,outputPath,workspaceRoot}) {
      requireValue(typeof base64==='string' && base64.length%4===0 && /^[A-Za-z0-9+/]*={0,2}$/.test(base64),'PDF export contains invalid base64');
      requireValue(base64.length<=Math.ceil(MAX_PDF_BYTES/3)*4,'PDF export exceeds the byte limit');
      const content=Buffer.from(base64,'base64');validatePdf(content,bytes);
      return publishBytes(content,outputPath,workspaceRoot,'legacy PDF output path');
    },
    async readDesignSystem({designSystemPath,workspaceRoot}) {
      const design=JSON.parse((await boundedRead(designSystemPath,workspaceRoot,8*1024*1024,'design system path')).toString('utf8'));
      requireValue(Array.isArray(design.slides),'Design system did not contain an ordered slides array');
      return {presentationId:design.source?.presentation?.id,slides:design.slides.map(slide=>({
        slideIndex:slide.index,slideObjectId:slide.slideId,titlePreview:slide.titlePreview??null,
        layoutId:slide.layoutId??null,isSkipped:slide.isSkipped===true,
      })).sort((left,right)=>left.slideIndex-right.slideIndex)};
    },
    async render({renderer,pdfPath,output,dpi,workspaceRoot}) {
      await inspectTree(workspaceRoot,output,'output path');
      await execute(absolute(renderer,'pdftoppmPath'),['-png','-r',String(dpi),within(pdfPath,workspaceRoot),path.join(output,'slide')],{
        cwd:output,shell:false,windowsHide:true,timeout:60000,maxBuffer:1024*1024,
      });
      const images=[];
      for(const entry of await fs.readdir(output,{withFileTypes:true})) {
        if(!/^slide-\d+\.png$/.test(entry.name)) continue;
        requireValue(entry.isFile() && !entry.isSymbolicLink(),'Rendered slide must be a regular PNG file');
        const file=path.join(output,entry.name);
        await inspectTree(workspaceRoot,file,'rendered slide path');
        const handle=await fs.open(file,'r');
        try {
          const header=Buffer.alloc(8);const {bytesRead}=await handle.read(header,0,8,0);
          requireValue(bytesRead===8 && header.equals(PNG_HEADER),'Rendered slide does not contain a PNG header');
        } finally { await handle.close(); }
        images.push(file);
      }
      return images;
    },
    async saveTemplate({raw,outputPath,workspaceRoot}) {
      const bytes=Buffer.from(JSON.stringify(raw),'utf8');
      requireValue(bytes.length<=64*1024*1024,'Template response exceeds the 64 MiB limit');
      return publishBytes(bytes,outputPath,workspaceRoot,'template output path');
    },
  };
}
```

### File: `host/node-slides-host.test.mjs`

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createNodeSlidesHost} from './node-slides-host.mjs';
import {exportAndRenderSlides} from './export-and-render-slides.mjs';
import {readTemplateToFile} from './read-template-to-file.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"slides host's æøå "));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const pdf=Buffer.from('%PDF-1.7\nfixture\n%%EOF\n');
 const source=path.join(root,'source.pdf');await fs.writeFile(source,pdf);
 return {root,pdf,source};
}
test('Node route uses argument arrays, ordered verified PNGs and native slide IDs',async t=>{
 const {root,pdf,source}=await fixture(t),output=path.join(root,'render output');
 const calls=[];
 const host=createNodeSlidesHost({execute:async(exe,args,options)=>{
  calls.push({exe,args,options});
  await fs.writeFile(path.join(output,'slide-10.png'),Buffer.from([137,80,78,71,13,10,26,10]));
  await fs.writeFile(path.join(output,'slide-2.png'),Buffer.from([137,80,78,71,13,10,26,10]));
 }});
 const design=path.join(root,'design.json');
 const designInput={source:{presentation:{id:'deck'}},slides:[{index:1,slideId:'native-2'},{index:0,slideId:'native-1'}]};
 await fs.writeFile(design,JSON.stringify(designInput));
 const result=await exportAndRenderSlides({presentationId:'deck',workspaceRoot:root,outputDir:output,designSystemPath:design,pdftoppmPath:process.execPath,host,
  tools:{mcp__codex_apps__google_drive_fetch:async()=>({structuredContent:{file_uri:{mime_type:'application/pdf'},workspace_path:source,size:pdf.length}})}});
 assert.equal(result.pageCount,2);assert.deepEqual(result.images.map(i=>i.slideObjectId),['native-1','native-2']);
 assert.deepEqual(result.images.map(i=>path.basename(i.path)),['slide-2.png','slide-10.png']);
 assert.equal(calls[0].options.shell,false);assert.equal(calls[0].options.windowsHide,true);
 assert.deepEqual(calls[0].args,['-png','-r','120',path.join(output,'presentation.pdf'),path.join(output,'slide')]);
});
test('native template reader preserves complete connector response and omits fields',async t=>{
 const {root}=await fixture(t),output=path.join(root,'raw-template.json'),calls=[];
 const raw={structuredContent:{presentationId:'deck',slides:[{objectId:'a'}],layouts:[{objectId:'b'}]},content:[]};
 const result=await readTemplateToFile({presentationId:'deck',outputPath:output,workspaceRoot:root,host:createNodeSlidesHost(),tools:{mcp__codex_apps__google_drive_get_presentation:async args=>{calls.push(args);return raw;}}});
 assert.deepEqual(calls,[{presentation_id:'deck'}]);assert.deepEqual(JSON.parse(await fs.readFile(output,'utf8')),raw);
 assert.equal(result.status,'complete');
});
test('Node route rejects sibling-prefix escapes and relative paths',async t=>{
 const {root}=await fixture(t),host=createNodeSlidesHost();
 assert.throws(()=>host.assertWithinRoot(root+'-sibling/file.pdf',root),/trusted root/);
 assert.throws(()=>host.normalizeAbsolutePath('relative.pdf'),/absolute path/);
 if(process.platform==='win32'){
  assert.throws(()=>host.normalizeAbsolutePath('C:relative.pdf'),/absolute path/);
  assert.throws(()=>host.normalizeAbsolutePath('\\\\server\\share\\file.pdf'),/local absolute drive/);
  assert.throws(()=>host.normalizeAbsolutePath(path.join(root,'file.pdf:stream')),/alternate data streams/);
 }
});
test('Node route checks real file limit and leaves no output for an oversized source',async t=>{
 const {root,source}=await fixture(t),output=path.join(root,'renders/presentation.pdf');
 await fs.truncate(source,32*1024*1024+1);
 await assert.rejects(createNodeSlidesHost().copyMaterializedPdf({source,outputPath:output,workspaceRoot:root}),/exceeds the byte limit/);
 await assert.rejects(fs.stat(output),e=>e.code==='ENOENT');
});
test('Node route checks design-system symlinks and PNG headers',async t=>{
 const {root,source}=await fixture(t),host=createNodeSlidesHost(),linked=path.join(root,'linked.json');
 await fs.symlink(source,linked);
 await assert.rejects(host.readDesignSystem({designSystemPath:linked,workspaceRoot:root}),/must not include symlinks/);
 const output=path.join(root,'renders');await fs.mkdir(output);
 const bad=createNodeSlidesHost({execute:async()=>fs.writeFile(path.join(output,'slide-1.png'),'not a PNG')});
 await assert.rejects(bad.render({renderer:process.execPath,pdfPath:source,output,dpi:72,workspaceRoot:root}),/PNG header/);
});
```

### File: `host/read-template-to-file.mjs`

```javascript
const READY_MARKER = "SLIDES_BRIDGE_READY";
const COMMITTED_MARKER = "SLIDES_BRIDGE_COMMITTED";
const RECORD_SEPARATOR = "\u0003";
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;
const FRAME_CHARS = 480000;

class TemplateReadError extends Error {
  constructor(message) {
    super(String(message).replace(/https?:\/\/[^\s\"'<>]+/gi, "[URL_REDACTED]"));
    this.name = "TemplateReadError";
  }
}

function assert(condition, message) {
  if (!condition) throw new TemplateReadError(message);
}

function normalizeAbsolutePath(value, label) {
  assert(typeof value === "string" && value.startsWith("/"), `${label} must be an absolute path`);
  assert(!/[\0\r\n]/.test(value), `${label} contains an invalid character`);
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
  );
  return normalizedPath;
}

function dirname(path) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function utf8Bytes(text) {
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
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;
    output += alphabet[first >> 2];
    output += alphabet[((first & 0x03) << 4) | (second >> 4)];
    output += hasSecond ? alphabet[((second & 0x0f) << 2) | (third >> 6)] : "=";
    output += hasThird ? alphabet[third & 0x3f] : "=";
  }
  return output;
}

function normalizeToolName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveGetPresentation(tools) {
  const preferred = "mcp__codex_apps__google_drive_get_presentation";
  if (typeof tools?.[preferred] === "function") return preferred;
  const matches = Object.keys(tools ?? {}).filter((name) =>
    typeof tools[name] === "function" && normalizeToolName(name).endsWith("googledrivegetpresentation"));
  assert(matches.length === 1, "Could not resolve the Google Drive get_presentation tool");
  return matches[0];
}

async function waitForMarker(tools, initial, sessionId, marker) {
  let result = initial;
  let output = String(result?.output ?? "");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (output.includes(marker)) return { result, output };
    if (result?.exit_code !== null && result?.exit_code !== undefined) break;
    result = await tools.write_stdin({
      session_id: sessionId,
      chars: "",
      yield_time_ms: 1000,
      max_output_tokens: 1000,
    });
    output += String(result?.output ?? "");
  }
  throw new TemplateReadError(`File receiver did not report ${marker}`);
}

async function writeText({ text, outputPath, workspaceRoot, skillRoot, tools }) {
  const workspace = normalizeAbsolutePath(workspaceRoot, "workspaceRoot");
  const output = assertWithinRoot(outputPath, workspace, "outputPath");
  const receiver = assertWithinRoot(
    `${normalizeAbsolutePath(skillRoot, "skillRoot")}/host/slides-stdin-receiver.pl`,
    skillRoot,
    "receiverPath",
  );
  const bytes = utf8Bytes(text).length;
  assert(bytes <= MAX_OUTPUT_BYTES, `Presentation response is ${bytes} bytes; limit is ${MAX_OUTPUT_BYTES}`);

  const parent = dirname(output);
  const temporary = `${output}.stream-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
  let result = await tools.exec_command({
    cmd: `/bin/mkdir -p ${shellQuote(parent)}`,
    workdir: dirname(workspace),
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 1000,
  });
  assert(result.exit_code === 0, `Could not create output directory: ${result.output}`);
  result = await tools.exec_command({
    cmd: `/bin/test ! -e ${shellQuote(output)}`,
    workdir: workspace,
    login: false,
    yield_time_ms: 30000,
    max_output_tokens: 1000,
  });
  assert(result.exit_code === 0, `Refusing to overwrite ${output}`);

  const started = await tools.exec_command({
    cmd: `/usr/bin/perl ${shellQuote(receiver)} ${shellQuote(output)} ${shellQuote(String(bytes))} - ${shellQuote(temporary)}`,
    workdir: workspace,
    login: false,
    tty: true,
    yield_time_ms: 1000,
    max_output_tokens: 1000,
  });
  const sessionId = started?.session_id;
  assert(Number.isInteger(sessionId), `Could not start file receiver: ${started?.output ?? "missing session"}`);

  const encoded = base64Text(text);
  try {
    await waitForMarker(tools, started, sessionId, READY_MARKER);
    let sequence = 0;
    for (let offset = 0; offset < encoded.length; offset += FRAME_CHARS) {
      const frame = `D\t${sequence}\t${encoded.slice(offset, offset + FRAME_CHARS)}${RECORD_SEPARATOR}`;
      const write = await tools.write_stdin({
        session_id: sessionId,
        chars: frame,
        yield_time_ms: 250,
        max_output_tokens: 1000,
      });
      assert(write?.exit_code === null || write?.exit_code === undefined, "File receiver exited before commit");
      sequence += 1;
    }
    const committed = await tools.write_stdin({
      session_id: sessionId,
      chars: `C${RECORD_SEPARATOR}`,
      yield_time_ms: 30000,
      max_output_tokens: 1000,
    });
    const completed = await waitForMarker(tools, committed, sessionId, COMMITTED_MARKER);
    const receipt = /SLIDES_BRIDGE_COMMITTED\s+(\d+)\s+([a-f0-9]{64})/i.exec(completed.output);
    assert(receipt, "File receiver returned an invalid receipt");
    assert(Number(receipt[1]) === bytes, "File receiver wrote the wrong byte count");
    assert(completed.result?.exit_code === 0, "File receiver did not exit cleanly");
    return { path: output, bytes, sha256: receipt[2].toLowerCase() };
  } catch (error) {
    try {
      await tools.write_stdin({ session_id: sessionId, chars: `A${RECORD_SEPARATOR}`, yield_time_ms: 1000, max_output_tokens: 1000 });
    } catch {
      // Receiver may already have exited.
    }
    throw error;
  }
}

export async function readTemplateToFile({
  presentationId = null,
  presentationUrl = null,
  outputPath,
  workspaceRoot,
  skillRoot,
  tools,
  host = null,
} = {}) {
  assert(Boolean(presentationId) !== Boolean(presentationUrl), "Provide exactly one of presentationId or presentationUrl");
  assert(tools && (host || typeof tools.exec_command === "function" && typeof tools.write_stdin === "function"), "Code-mode tools are required");
  const toolName = resolveGetPresentation(tools);
  const args = presentationId ? { presentation_id: presentationId } : { presentation_url: presentationUrl };
  const raw = await tools[toolName](args); // Omit `fields` to request the full presentation resource.
  assert(raw?.isError !== true && raw?.structuredContent?.result?.isError !== true, "Google Slides presentation read failed");
  const file = host ? await host.saveTemplate({raw,outputPath,workspaceRoot}) : await writeText({
    text: `${JSON.stringify(raw, null, 2)}\n`,
    outputPath,
    workspaceRoot,
    skillRoot,
    tools,
  });
  return {
    status: "complete",
    presentationId: presentationId ?? null,
    usedPresentationUrl: Boolean(presentationUrl),
    connectorTool: toolName,
    file,
  };
}
```

### File: `host/slides-stdin-receiver.pl`

```perl
#!/usr/bin/perl

use strict;
use warnings;
use Fcntl qw(O_CREAT O_EXCL O_WRONLY);
use Digest::SHA;
use MIME::Base64 qw(decode_base64);

use constant READY_MARKER => "SLIDES_BRIDGE_READY";
use constant COMMITTED_MARKER => "SLIDES_BRIDGE_COMMITTED";
use constant ERROR_MARKER => "SLIDES_BRIDGE_ERROR";
use constant MAX_RECORD_BYTES => 1024 * 1024;

sub fail {
  my ($code, $reason) = @_;
  print STDERR ERROR_MARKER . " $reason\n";
  exit $code;
}

@ARGV == 4 or fail(64, "invalid-arguments");
my ($output_path, $expected_bytes, $expected_sha256, $temporary_path) = @ARGV;
$expected_bytes =~ /^\d+$/ or fail(65, "invalid-expected-bytes");
($expected_sha256 eq "-" or $expected_sha256 =~ /^[a-f0-9]{64}$/)
  or fail(65, "invalid-expected-sha256");
for my $path ($output_path, $temporary_path) {
  $path !~ /[\0\r\n]/ or fail(65, "invalid-path");
}
(!-e $output_path and !-e $temporary_path) or fail(66, "destination-exists");

umask 0077;
sysopen(my $output, $temporary_path, O_WRONLY | O_CREAT | O_EXCL, 0600)
  or fail(67, "temporary-create-failed");
binmode($output);

my $committed = 0;
END {
  unlink $temporary_path unless $committed;
}
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
      ($expected_sha256 eq "-" or $actual_sha256 eq $expected_sha256)
        or fail(74, "sha256-mismatch");
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

### File: `references/windows-host.md`

#### Windows: native template reading and rendering

Use the existing Google Drive connector and the bundled Node host adapter. Keep the same artifacts as the POSIX workflow: the complete `raw-template.json`, parsed `design-system.json`, one `presentation.pdf`, and ordered PNGs mapped to native slide IDs. Do not replace Google Slides with a different account or file provider.

##### Host preparation

1. Resolve this skill's absolute directory and a dedicated existing task workspace. Use the host's workspace dependency loader for its existing Node runtime. Resolve the existing `pdftoppm.exe` from that bundle or `Get-Command pdftoppm`. Do not install WSL, Perl, packages or a paid renderer as an implicit step.
2. Use the local Node REPL, or an equivalent authorized local Node bridge, to import these modules by file URL:

```js
var {pathToFileURL} = await import('node:url');
var {createNodeSlidesHost} = await import(pathToFileURL(SKILL_DIR + '/host/node-slides-host.mjs').href);
var {exportAndRenderSlides} = await import(pathToFileURL(SKILL_DIR + '/host/export-and-render-slides.mjs').href);
var slidesHost = createNodeSlidesHost();
```

`SKILL_DIR`, `WORKSPACE` and `PDFTOPPM` must be actual absolute local Windows paths. Never guess a drive prefix for a `/workspace/...` path. The adapter rejects relative paths, UNC/device paths, alternate data streams and paths outside the selected roots. Only supply `connectorResultsRoot` when the host has actually exposed a trusted local connector-results directory; a path returned inside file content cannot authorize a new trusted root.

##### Relay connector data without shell interpolation

Call the existing Google Drive tool from code mode, keeping its response in code rather than printing complete presentation/PDF content. The local Node REPL does not automatically inherit code-mode tool bindings.

Transfer the response to the local Node session as data: serialize it with `JSON.stringify`, split that string into bounded chunks, and use `JSON.stringify(chunk)` to form each JavaScript string literal sent to the Node tool. Append those string literals to a fresh local array, join the strings once, then `JSON.parse` the response. Never put response content into a shell command, a generated executable script or `eval`. Print only bounded receipts. Clear the response buffers after use.

For a small response, pass one JSON-escaped string literal. For larger responses, keep each Node-tool code payload bounded (for example 32 KiB of source text per chunk). Join JavaScript strings before UTF-8 encoding; this preserves a surrogate pair even if its halves fall in different chunks. If using a byte/base64 relay instead, encode the complete text to UTF-8 before splitting buffers and decode only after concatenation. The response stays on the existing connector-to-local-host route; do not upload it to a conversion service.

##### Template

Call `get_presentation` on the existing Google Drive connector with the selected native presentation ID, omitting `fields`. Relay the complete raw response to the local session as `templateRaw`, then save it:

```js
var templateReceipt = await slidesHost.saveTemplate({
  raw: templateRaw,
  outputPath: WORKSPACE + '/raw-template.json',
  workspaceRoot: WORKSPACE,
});
nodeRepl.write(templateReceipt);
```

Check connector errors before saving: an error response is not a template. The adapter limits the serialized template to 64 MiB, rejects symlinks/junctions in output directories and refuses replacement of an existing file. The public `readTemplateToFile` helper also accepts `host: slidesHost` and an explicitly supplied connector function; it omits `fields` itself.

Run `scripts/parse_template_design_system.mjs` with the existing Node executable and its documented input/output/catalog arguments. Pass command arguments as separate elements, or use correctly quoted literal PowerShell paths. Retain the complete raw response; do not build a reduced template from model memory.

##### Render

Call the current Google Drive `fetch` tool with the canonical presentation URL, `download_raw_file: true`, `raw_export_mime_type: 'application/pdf'` and `include_base64: false`. Relay the complete response as `pdfRaw`. Then:

```js
var renderReceipt = await exportAndRenderSlides({
  presentationId: PRESENTATION_ID,
  outputDir: WORKSPACE + '/renders/source-deck',
  workspaceRoot: WORKSPACE,
  designSystemPath: WORKSPACE + '/design-system.json',
  pdftoppmPath: PDFTOPPM,
  dpi: 120,
  host: slidesHost,
  tools: {mcp__codex_apps__google_drive_fetch: async () => pdfRaw},
});
nodeRepl.write(renderReceipt);
```

This explicit response binding consumes the already-completed connector request; it does not make a second fetch. The adapter prefers a real locally materialized file over duplicate inline bytes. If the host supplies a file reference without a usable local path or inline PDF, report that exact materialization limitation. Do not fetch an arbitrary returned URL, relabel a remote path as local, silently convert to text, or claim a complete render. An explicitly requested inline export may be used only within the connector's observed limits; it does not remove the provider's export ceiling.

The adapter checks the source/output directory chains, rejects symlinks/junctions, checks opened-file identity and size before/after reading, verifies the PDF header, enforces the 32 MiB limit, publishes through an exclusive temporary file and no-replacement hard link, and records SHA-256. It invokes the selected renderer with an argument array and no shell. Returned images must have PNG headers. Existing common checks still validate the presentation ID, design-system order, unique slide IDs and PDF page count.

Inspect every PNG using the host image viewer. Local fixture tests prove filesystem and renderer behavior; they do not prove a live Google export or editing grant. Preserve that distinction in reports.

### File: `runtime/common.mjs`

```javascript
import { createHash } from "node:crypto";

export const SHA256_RE = /^[a-f0-9]{64}$/;
export const OBJECT_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_:-]{4,49}$/;

export class SlidesValidationError extends Error {
  constructor(message, { path = null, details = null } = {}) {
    super(path ? `${path}: ${message}` : message);
    this.name = "SlidesValidationError";
    this.path = path;
    this.details = details;
  }
}

export function fail(message, path = null, details = null) {
  throw new SlidesValidationError(message, { path, details });
}

export function assert(condition, message, path = null, details = null) {
  if (!condition) fail(message, path, details);
}

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function requireRecord(value, path) {
  assert(isRecord(value), "must be an object", path);
  return value;
}

export function requireString(value, path, { nonempty = true } = {}) {
  assert(typeof value === "string", "must be a string", path);
  if (nonempty) assert(value.trim().length > 0, "must not be empty", path);
  return value;
}

export function requireStringArray(value, path, { unique = true } = {}) {
  assert(Array.isArray(value), "must be an array", path);
  for (let index = 0; index < value.length; index += 1) {
    requireString(value[index], `${path}[${index}]`);
  }
  if (unique) {
    assert(new Set(value).size === value.length, "must not contain duplicates", path);
  }
  return value;
}

export function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) output[key] = canonicalize(value[key]);
  }
  return output;
}

export function stableStringify(value, space = 0) {
  return JSON.stringify(canonicalize(value), null, space);
}

export function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Json(value) {
  return sha256Text(stableStringify(value));
}

export function snapshotPayload(snapshot) {
  const { sha256: _ignored, ...payload } = requireRecord(snapshot, "snapshot");
  return payload;
}

export function verifySnapshotHash(snapshot) {
  requireString(snapshot.sha256, "snapshot.sha256");
  assert(SHA256_RE.test(snapshot.sha256), "must be a lowercase SHA-256 hex digest", "snapshot.sha256");
  const actual = sha256Json(snapshotPayload(snapshot));
  assert(actual === snapshot.sha256, `does not match snapshot payload (actual ${actual})`, "snapshot.sha256");
  return actual;
}

export function deepEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === "string") {
    return value.replace(/https?:\/\/[^\s"'<>]+/gi, (url) =>
      /(?:x-goog-|x-amz-|access_token=|refresh_token=|[?&]token=|[?&]signature=|googleaccessid=)/i.test(url)
        ? "[EPHEMERAL_URL_REDACTED]"
        : url,
    )
      .replace(/\b(authorization\s*:\s*bearer|bearer)\s+[A-Za-z0-9._~+\/=:-]+/gi, "$1 [REDACTED]")
      .replace(/\b(x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["']?[^\s"',;}]*/gi, "$1=[REDACTED]")
      .replace(/\b(set-cookie|cookie)\s*:\s*[^\r\n]+/gi, "$1: [REDACTED]");
  }
  if (!isRecord(value)) return value;

  const redacted = {};
  for (const [key, child] of Object.entries(value)) {
    if (/authorization|access.?token|refresh.?token|oauth|signed.?url/i.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (/content.?url|thumbnail.?url|download.?url|image.?pointer|staged.?url/i.test(key)) {
      redacted[key] = "[EPHEMERAL_URL_REDACTED]";
    } else {
      redacted[key] = redactSensitive(child);
    }
  }
  return redacted;
}

export function findFirstRecord(root, predicate, { maxNodes = 10000 } = {}) {
  const queue = [root];
  const seen = new Set();
  let visited = 0;

  while (queue.length > 0 && visited < maxNodes) {
    const value = queue.shift();
    if (!isRecord(value) && !Array.isArray(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    visited += 1;

    if (isRecord(value) && predicate(value)) return value;
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      if (isRecord(child) || Array.isArray(child)) queue.push(child);
    }
  }
  return null;
}

export function getAtPath(value, path) {
  let current = value;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

export function firstDefined(value, paths) {
  for (const path of paths) {
    const candidate = getAtPath(value, path);
    if (candidate !== undefined && candidate !== null && candidate !== "") return candidate;
  }
  return undefined;
}

export function validateObjectId(value, path) {
  requireString(value, path);
  assert(
    OBJECT_ID_RE.test(value),
    "must be 5-50 characters, start with an alphanumeric or underscore, and contain only alphanumerics, underscores, hyphens, or colons",
    path,
  );
  return value;
}

export function assertNoPlaceholders(value, path) {
  requireString(value, path);
  assert(!/^(?:TODO|TBD|UNKNOWN|PLACEHOLDER)$/i.test(value), "contains an unresolved placeholder", path);
  assert(!/^<[^>]+>$/.test(value), "contains an unresolved angle-bracket placeholder", path);
  assert(!/^\{\{[^}]+\}\}$/.test(value), "contains an unresolved template placeholder", path);
  return value;
}
```

### File: `runtime/design-system.mjs`

```javascript
import { isRecord, uniqueSorted, verifySnapshotHash } from "./common.mjs";
import { aspectRatio, mediaGeometry, panelGeometry } from "./media-geometry.mjs";

const EMU_PER_POINT = 12700;
const TEXT_PLACEHOLDER_TYPES = new Set([
  "BODY", "CENTERED_TITLE", "DATE_AND_TIME", "FOOTER", "HEADER", "SLIDE_NUMBER", "SUBTITLE", "TITLE",
]);
const MEDIA_PLACEHOLDER_TYPES = new Set(["CHART", "CLIP_ART", "DIAGRAM", "MEDIA", "OBJECT", "PICTURE", "SLIDE_IMAGE", "TABLE"]);
const PROTECTED_PLACEHOLDER_TYPES = new Set(["DATE_AND_TIME", "FOOTER", "HEADER", "SLIDE_NUMBER"]);
const CONTENT_KINDS = new Set(["image", "table", "sheetsChart", "video", "wordArt", "speakerSpotlight"]);
const CHROME_PATTERN = /\b(?:brand|chrome|footer|header|logo|navigation|page number|slide number)\b/i;

function clone(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

function dimensionToPoints(dimension) {
  if (dimension === null || dimension === undefined) return null;
  if (typeof dimension === "number") return Number.isFinite(dimension) ? dimension : null;
  if (!isRecord(dimension)) return null;
  const magnitude = Number(dimension.magnitude);
  if (!Number.isFinite(magnitude)) return null;
  const unit = String(dimension.unit ?? "PT").toUpperCase();
  if (["PT", "POINT", "POINTS"].includes(unit)) return magnitude;
  if (unit === "EMU") return magnitude / EMU_PER_POINT;
  if (["IN", "INCH", "INCHES"].includes(unit)) return magnitude * 72;
  if (unit === "PX") return magnitude * 0.75;
  return null;
}

function mergeInherited(parent, child) {
  if (child === null || child === undefined) return clone(parent) ?? null;
  if (!isRecord(child)) return clone(child);
  if (child.propertyState === "INHERIT") return clone(parent) ?? clone(child);
  if (child.propertyState === "NOT_RENDERED") return clone(child);
  const output = isRecord(parent) ? clone(parent) : {};
  for (const [key, value] of Object.entries(child)) {
    if (value === undefined) continue;
    output[key] = isRecord(value) ? mergeInherited(output[key], value) : clone(value);
  }
  return output;
}

export function flattenPageElements(elements) {
  return (elements ?? []).flatMap((element) => [element, ...flattenPageElements(element.group?.children)]);
}

function elementText(element) {
  const values = [];
  if (element?.text?.plainText) values.push(element.text.plainText);
  if (element?.wordArt?.renderedText) values.push(element.wordArt.renderedText);
  for (const row of element?.table?.cells ?? []) {
    for (const cell of row ?? []) if (cell.text?.plainText) values.push(cell.text.plainText);
  }
  return values.join("\n").trim();
}

function elementKinds(elements) {
  const counts = {};
  for (const element of flattenPageElements(elements)) counts[element.kind] = (counts[element.kind] ?? 0) + 1;
  return counts;
}

function boundsAreaRatio(bounds, pageSize) {
  if (!bounds || !Number.isFinite(pageSize?.width) || !Number.isFinite(pageSize?.height)) return null;
  const pageArea = pageSize.width * pageSize.height;
  if (!(pageArea > 0)) return null;
  return Math.max(0, bounds.width) * Math.max(0, bounds.height) / pageArea;
}

function edgeRegion(bounds, pageSize) {
  if (!bounds || !Number.isFinite(pageSize?.width) || !Number.isFinite(pageSize?.height)) return false;
  const edgeX = pageSize.width * 0.08;
  const edgeY = pageSize.height * 0.08;
  return bounds.x <= edgeX || bounds.y <= edgeY ||
    bounds.x + bounds.width >= pageSize.width - edgeX ||
    bounds.y + bounds.height >= pageSize.height - edgeY;
}

function themeColors(pageProperties) {
  return Object.fromEntries((pageProperties?.colorScheme?.colors ?? [])
    .filter((entry) => entry?.type && entry?.color)
    .map((entry) => [entry.type, entry.color]));
}

function stylesByNesting(element) {
  return element?.text?.styleDefaultsByNesting ?? {};
}

function mergeStyleMaps(parent, child) {
  const output = {};
  for (const key of uniqueSorted([...Object.keys(parent ?? {}), ...Object.keys(child ?? {})])) {
    output[key] = mergeInherited(parent?.[key], child?.[key]);
  }
  return output;
}

function renderedFontSizes(styles, shapeProperties) {
  const fontScale = Number(shapeProperties?.autofit?.fontScale ?? 1);
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return Object.fromEntries(Object.entries(styles ?? {}).flatMap(([level, style]) => {
    const size = dimensionToPoints(style?.fontSize);
    return Number.isFinite(size) ? [[level, size * scale]] : [];
  }));
}

function semanticHints(slot, layoutLabel) {
  const type = slot.type;
  const hints = [];
  const add = (role, confidence, reason) => hints.push({ role, confidence, reason });
  const standard = {
    BODY: "body", CENTERED_TITLE: "title", DATE_AND_TIME: "date", FOOTER: "footer",
    HEADER: "header", SLIDE_NUMBER: "slide-number", SUBTITLE: "subtitle", TITLE: "title",
    CHART: "chart", CLIP_ART: "image", DIAGRAM: "diagram", MEDIA: "media", OBJECT: "evidence",
    PICTURE: "image", SLIDE_IMAGE: "slide-image", TABLE: "table",
  }[type];
  if (standard) add(standard, "high", `Google placeholder type ${type}`);
  if (/speaker/i.test(layoutLabel)) {
    if (["TITLE", "CENTERED_TITLE"].includes(type)) add("talk-title", "medium", "speaker layout title region");
    if (type === "PICTURE") add("speaker-portrait", "medium", "speaker layout picture region");
    if (["SUBTITLE", "BODY"].includes(type)) add("speaker-name", "low", "speaker layout secondary text region; confirm from exemplar labels");
  }
  if (/quote|testimonial/i.test(layoutLabel)) {
    if (["TITLE", "BODY"].includes(type)) add("quote", "low", "quote-oriented layout text region; confirm from exemplar labels");
    if (type === "SUBTITLE") add("attribution", "medium", "quote-oriented layout subtitle region");
  }
  return hints;
}

function protectedRegionsForPage(page, origin, pageSize) {
  return flattenPageElements(page?.elements).flatMap((element) => {
    if (!element.boundsPt) return [];
    const placeholderProtected = PROTECTED_PLACEHOLDER_TYPES.has(element.placeholderType);
    const label = `${element.title ?? ""} ${element.description ?? ""} ${elementText(element)}`;
    const namedChrome = CHROME_PATTERN.test(label);
    const areaRatio = boundsAreaRatio(element.boundsPt, pageSize);
    const edgeChrome = !element.placeholder && areaRatio !== null && areaRatio <= 0.12 && edgeRegion(element.boundsPt, pageSize);
    if (!placeholderProtected && !namedChrome && !edgeChrome) return [];
    return [{
      objectId: element.objectId,
      origin,
      kind: element.kind,
      placeholderType: element.placeholderType ?? null,
      boundsPt: element.boundsPt,
      reason: placeholderProtected ? "reserved-placeholder" : namedChrome ? "named-brand-chrome" : "edge-chrome",
    }];
  });
}

function localComposition(slide, pageSize) {
  const objects = flattenPageElements(slide.elements).map((element) => {
    const text = elementText(element);
    const areaRatio = boundsAreaRatio(element.boundsPt, pageSize);
    const placeholder = Boolean(element.placeholder);
    const contentBearing = Boolean(text || CONTENT_KINDS.has(element.kind));
    return {
      objectId: element.objectId,
      kind: element.kind,
      placeholder: placeholder ? {
        type: element.placeholder.type,
        index: element.placeholder.index,
        parentObjectId: element.placeholder.parentObjectId,
      } : null,
      classification: placeholder ? "placeholder-slot" : contentBearing ? "slide-local-content" : "slide-local-decoration",
      contentBearing,
      boundsPt: element.boundsPt ?? null,
      areaRatio,
      aspectRatio: aspectRatio(element.boundsPt?.width, element.boundsPt?.height),
      panel: panelGeometry(element.boundsPt, pageSize),
      mediaGeometry: ["image", "video", "sheetsChart", "table"].includes(element.kind)
        ? mediaGeometry(element, pageSize)
        : null,
      textPreview: text ? text.replace(/\s+/g, " ").slice(0, 120) : null,
      mediaIdentity: element.image?.sourceUrl ?? element.video?.id ?? element.sheetsChart?.chartId ?? null,
    };
  });
  return {
    objects,
    contentBearingObjectIds: objects.filter((entry) => entry.contentBearing).map((entry) => entry.objectId),
    slideLocalContentObjectIds: objects.filter((entry) => entry.classification === "slide-local-content").map((entry) => entry.objectId),
    slideLocalDecorationObjectIds: objects.filter((entry) => entry.classification === "slide-local-decoration").map((entry) => entry.objectId),
  };
}

function titlePreview(slide) {
  const elements = flattenPageElements(slide.elements);
  const title = elements.find((element) => ["TITLE", "CENTERED_TITLE"].includes(element.placeholderType) && elementText(element));
  const fallback = elements.find((element) => elementText(element));
  return elementText(title ?? fallback ?? {}).replace(/\s+/g, " ").slice(0, 140) || null;
}

export function buildDesignSystem(snapshot) {
  const pageSize = snapshot.presentation?.pageSizePt ?? {};
  const masters = new Map((snapshot.masters ?? []).map((page) => [page.objectId, page]));
  const layouts = new Map((snapshot.layouts ?? []).map((page) => [page.objectId, page]));
  const pages = [...(snapshot.masters ?? []), ...(snapshot.layouts ?? []), ...(snapshot.slides ?? [])];
  const elements = new Map();
  for (const page of pages) {
    for (const element of flattenPageElements(page.elements)) {
      if (element.objectId) elements.set(element.objectId, { page, element });
    }
  }

  const effectivePageProperties = new Map();
  for (const master of snapshot.masters ?? []) effectivePageProperties.set(master.objectId, mergeInherited(null, master.pageProperties));
  for (const layout of snapshot.layouts ?? []) {
    effectivePageProperties.set(layout.objectId, mergeInherited(effectivePageProperties.get(layout.masterId), layout.pageProperties));
  }
  for (const slide of snapshot.slides ?? []) {
    const layout = layouts.get(slide.layoutId);
    const masterId = slide.masterId ?? layout?.masterId ?? null;
    const parent = layout ? effectivePageProperties.get(layout.objectId) : effectivePageProperties.get(masterId);
    effectivePageProperties.set(slide.objectId, mergeInherited(parent, slide.pageProperties));
  }

  const placeholderCache = new Map();
  const resolvePlaceholder = (objectId, stack = new Set()) => {
    if (placeholderCache.has(objectId)) return placeholderCache.get(objectId);
    const located = elements.get(objectId);
    if (!located?.element?.placeholder) return null;
    const element = located.element;
    const parentObjectId = element.placeholder.parentObjectId ?? null;
    if (stack.has(objectId)) {
      const cycle = { objectId, pageId: located.page.objectId, lineage: [objectId], cycle: true };
      placeholderCache.set(objectId, cycle);
      return cycle;
    }
    const nextStack = new Set(stack).add(objectId);
    const parent = parentObjectId ? resolvePlaceholder(parentObjectId, nextStack) : null;
    const effectiveShapeProperties = mergeInherited(parent?.effectiveShapeProperties, element.shapeProperties);
    const effectiveTextStylesByNesting = mergeStyleMaps(parent?.effectiveTextStylesByNesting, stylesByNesting(element));
    const record = {
      objectId,
      pageId: located.page.objectId,
      pageKind: located.page.kind,
      type: element.placeholder.type,
      index: element.placeholder.index,
      parentObjectId,
      missingParentObjectId: parentObjectId && !parent ? parentObjectId : null,
      lineage: [...(parent?.lineage ?? []), objectId],
      cycle: Boolean(parent?.cycle),
      boundsPt: element.boundsPt ?? null,
      effectiveShapeProperties,
      effectiveTextStylesByNesting,
      renderedFontSizePtByNesting: renderedFontSizes(effectiveTextStylesByNesting, effectiveShapeProperties),
    };
    placeholderCache.set(objectId, record);
    return record;
  };
  for (const objectId of elements.keys()) resolvePlaceholder(objectId);

  const slideIdsByLayout = new Map();
  for (const slide of snapshot.slides ?? []) {
    if (!slideIdsByLayout.has(slide.layoutId)) slideIdsByLayout.set(slide.layoutId, []);
    slideIdsByLayout.get(slide.layoutId).push(slide.objectId);
  }

  const masterCatalog = (snapshot.masters ?? []).map((master) => ({
    masterId: master.objectId,
    displayName: master.displayName ?? master.name ?? null,
    effectivePageProperties: effectivePageProperties.get(master.objectId) ?? null,
    themeColors: themeColors(effectivePageProperties.get(master.objectId)),
    elementKinds: elementKinds(master.elements),
    placeholderObjectIds: flattenPageElements(master.elements).filter((element) => element.placeholder).map((element) => element.objectId),
    protectedRegions: protectedRegionsForPage(master, "master", pageSize),
  }));

  const layoutCatalog = (snapshot.layouts ?? []).map((layout) => {
    const layoutLabel = `${layout.displayName ?? ""} ${layout.name ?? ""}`.trim();
    const slots = flattenPageElements(layout.elements).filter((element) => element.placeholder).map((element) => {
      const lineage = placeholderCache.get(element.objectId);
      const areaRatio = boundsAreaRatio(element.boundsPt, pageSize);
      return {
        objectId: element.objectId,
        type: element.placeholder.type,
        index: element.placeholder.index,
        parentObjectId: element.placeholder.parentObjectId,
        boundsPt: element.boundsPt ?? null,
        areaRatio,
        aspectRatio: aspectRatio(element.boundsPt?.width, element.boundsPt?.height),
        panel: panelGeometry(element.boundsPt, pageSize),
        semanticHints: semanticHints(element.placeholder, layoutLabel),
        renderedFontSizePtByNesting: lineage?.renderedFontSizePtByNesting ?? {},
      };
    });
    const placeholderCounts = {};
    for (const slot of slots) placeholderCounts[slot.type] = (placeholderCounts[slot.type] ?? 0) + 1;
    const previewSlideIds = slideIdsByLayout.get(layout.objectId) ?? [];
    const textSlots = slots.filter((slot) => TEXT_PLACEHOLDER_TYPES.has(slot.type));
    const mediaSlots = slots.filter((slot) => MEDIA_PLACEHOLDER_TYPES.has(slot.type));
    const dominantMediaSlot = [...mediaSlots].sort((left, right) => (right.areaRatio ?? 0) - (left.areaRatio ?? 0))[0] ?? null;
    return {
      layoutId: layout.objectId,
      masterId: layout.masterId,
      name: layout.name ?? null,
      displayName: layout.displayName ?? layout.name ?? null,
      effectivePageProperties: effectivePageProperties.get(layout.objectId) ?? null,
      themeColors: themeColors(effectivePageProperties.get(layout.objectId)),
      elementKinds: elementKinds(layout.elements),
      placeholderSlots: slots,
      signature: {
        placeholderCounts,
        placeholderTypes: uniqueSorted(slots.map((slot) => slot.type)),
        textSlotCount: textSlots.length,
        mediaSlotCount: mediaSlots.length,
        textAreaRatio: textSlots.reduce((sum, slot) => sum + (slot.areaRatio ?? 0), 0),
        mediaAreaRatio: mediaSlots.reduce((sum, slot) => sum + (slot.areaRatio ?? 0), 0),
        dominantMediaAspectRatio: dominantMediaSlot?.aspectRatio ?? null,
        dominantMediaAreaRatio: dominantMediaSlot?.areaRatio ?? null,
        dominantMediaPanel: dominantMediaSlot?.panel ?? null,
      },
      previewSlideIds,
      usageCount: previewSlideIds.length,
      protectedRegions: [
        ...protectedRegionsForPage(masters.get(layout.masterId), "master", pageSize),
        ...protectedRegionsForPage(layout, "layout", pageSize),
      ],
    };
  });

  const slideCatalog = (snapshot.slides ?? []).map((slide) => {
    const layout = layouts.get(slide.layoutId);
    const masterId = slide.masterId ?? layout?.masterId ?? null;
    const master = masters.get(masterId);
    const placeholderObjectIds = flattenPageElements(slide.elements).filter((element) => element.placeholder).map((element) => element.objectId);
    const placeholderLineage = placeholderObjectIds.map((objectId) => placeholderCache.get(objectId)).filter(Boolean);
    const inheritedVisualObjectIds = [master, layout].filter(Boolean).flatMap((page) =>
      flattenPageElements(page.elements).filter((element) => !element.placeholder).map((element) => element.objectId));
    const composition = localComposition(slide, pageSize);
    const localMedia = composition.objects.filter((entry) => entry.mediaGeometry);
    const dominantMedia = [...localMedia].sort((left, right) => (right.areaRatio ?? 0) - (left.areaRatio ?? 0))[0] ?? null;
    const attentionReasons = [];
    if (slide.isSkipped) attentionReasons.push("DELIVERED_SLIDE_SKIPPED");
    if (!layout) attentionReasons.push("LAYOUT_REFERENCE_MISSING");
    if (layout && !master) attentionReasons.push("MASTER_REFERENCE_MISSING");
    if (placeholderLineage.some((entry) => entry.missingParentObjectId || entry.cycle)) attentionReasons.push("PLACEHOLDER_LINEAGE_INVALID");
    if (placeholderLineage.some((entry) => Object.values(entry.renderedFontSizePtByNesting ?? {}).some((size) => size < 12))) attentionReasons.push("SMALL_EFFECTIVE_PLACEHOLDER_TEXT");
    if (composition.objects.some((entry) => ["image", "video", "sheetsChart", "table"].includes(entry.kind))) attentionReasons.push("MEDIA_OR_EVIDENCE");
    return {
      slideId: slide.objectId,
      index: slide.index,
      layoutId: slide.layoutId,
      masterId,
      isSkipped: slide.isSkipped === true,
      titlePreview: titlePreview(slide),
      effectivePageProperties: effectivePageProperties.get(slide.objectId) ?? null,
      placeholderLineage,
      effectiveContent: {
        directContentObjectIds: composition.contentBearingObjectIds,
        inheritedVisualObjectIds,
        hasDirectContent: composition.contentBearingObjectIds.length > 0,
        hasInheritedVisual: inheritedVisualObjectIds.length > 0,
      },
      localComposition: composition,
      mediaSignature: {
        mediaObjectCount: localMedia.length,
        occupiedAreaRatio: localMedia.reduce((sum, entry) => sum + (entry.areaRatio ?? 0), 0),
        dominantObjectId: dominantMedia?.objectId ?? null,
        dominantAspectRatio: dominantMedia?.mediaGeometry?.contentAspectRatioEstimate ?? dominantMedia?.aspectRatio ?? null,
        dominantAreaRatio: dominantMedia?.areaRatio ?? null,
        dominantPanel: dominantMedia?.panel ?? null,
      },
      protectedRegions: [
        ...protectedRegionsForPage(master, "master", pageSize),
        ...protectedRegionsForPage(layout, "layout", pageSize),
      ],
      attentionReasons: uniqueSorted(attentionReasons),
    };
  });

  return {
    version: 1,
    kind: "slides-derived-design-system",
    pageSizePt: clone(pageSize),
    multiMaster: masterCatalog.length > 1,
    masters: masterCatalog,
    layouts: layoutCatalog,
    slides: slideCatalog,
    placeholders: Object.fromEntries([...placeholderCache.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

export function designSystemSlide(snapshot, slideId) {
  return snapshot.designSystem?.slides?.find((slide) => slide.slideId === slideId) ?? null;
}

export function designSystemPlaceholder(snapshot, objectId) {
  return snapshot.designSystem?.placeholders?.[objectId] ?? null;
}

function formatRatio(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : "unknown";
}

function oneLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function renderDesignCatalog(snapshot) {
  verifySnapshotHash(snapshot);
  const design = snapshot.designSystem;
  const lines = [
    "# Generated Slides Design Catalog",
    "",
    `- Presentation: ${oneLine(snapshot.presentation.title) || "(untitled)"}`,
    `- Presentation ID: \`${snapshot.presentation.id}\``,
    `- Snapshot SHA-256: \`${snapshot.sha256}\``,
    `- Masters: ${design.masters.length}`,
    `- Layouts: ${design.layouts.length}`,
    `- Slides available as exemplars: ${design.slides.length}`,
    "",
    "This is derived evidence, not a model-authored contract. Confirm semantic roles from rendered exemplars.",
    "",
    "## Masters",
    "",
    "| Master ID | Name | Layouts | Theme colors | Protected regions |",
    "| --- | --- | ---: | ---: | ---: |",
  ];
  for (const master of design.masters) {
    const layoutCount = design.layouts.filter((layout) => layout.masterId === master.masterId).length;
    lines.push(`| \`${master.masterId}\` | ${oneLine(master.displayName) || "(unnamed)"} | ${layoutCount} | ${Object.keys(master.themeColors).length} | ${master.protectedRegions.length} |`);
  }
  lines.push("", "## Layouts", "");
  for (const layout of design.layouts) {
    lines.push(
      `### ${oneLine(layout.displayName) || layout.layoutId}`,
      "",
      `- Layout ID: \`${layout.layoutId}\``,
      `- Master ID: \`${layout.masterId ?? "missing"}\``,
      `- Preview slides: ${layout.previewSlideIds.map((id) => `\`${id}\``).join(", ") || "none"}`,
      `- Text capacity signals: ${layout.signature.textSlotCount} slots covering ${formatRatio(layout.signature.textAreaRatio)} of the canvas`,
      `- Media/evidence signals: ${layout.signature.mediaSlotCount} slots covering ${formatRatio(layout.signature.mediaAreaRatio)} of the canvas`,
      `- Inherited protected regions: ${layout.protectedRegions.length}`,
      "",
      "| Placeholder ID | Type | Index | Area | Ratio | Panel | Suggested semantic roles |",
      "| --- | --- | ---: | ---: | ---: | --- | --- |",
    );
    for (const slot of layout.placeholderSlots) {
      const hints = slot.semanticHints.map((hint) => `${hint.role} (${hint.confidence})`).join(", ");
      const ratio = Number.isFinite(slot.aspectRatio) ? slot.aspectRatio.toFixed(2) : "unknown";
      lines.push(`| \`${slot.objectId}\` | ${slot.type} | ${slot.index ?? 0} | ${formatRatio(slot.areaRatio)} | ${ratio} | ${slot.panel?.classification ?? "unknown"} | ${hints || "none"} |`);
    }
    if (layout.placeholderSlots.length === 0) lines.push("| (none) | | | | | | |");
    lines.push("");
  }
  lines.push(
    "## Exemplar Slides",
    "",
    "| # | Slide ID | Layout | Title/content preview | Local content objects | Dominant media | Attention |",
    "| ---: | --- | --- | --- | ---: | --- | --- |",
  );
  for (const slide of design.slides) {
    const media = slide.mediaSignature;
    const mediaSummary = media?.dominantObjectId
      ? `${Number.isFinite(media.dominantAspectRatio) ? media.dominantAspectRatio.toFixed(2) : "?"} ratio; ${formatRatio(media.dominantAreaRatio)} area; ${media.dominantPanel?.classification ?? "unknown"}`
      : "none";
    lines.push(`| ${slide.index + 1} | \`${slide.slideId}\` | \`${slide.layoutId ?? "missing"}\` | ${oneLine(slide.titlePreview) || "(none)"} | ${slide.localComposition.slideLocalContentObjectIds.length} | ${mediaSummary} | ${slide.attentionReasons.join(", ") || "none"} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
```

### File: `runtime/media-geometry.mjs`

```javascript
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { assert, isRecord } from "./common.mjs";
import { dimensionToPoints } from "./normalize.mjs";

const VERSION = "1.18";
const RATIO_TOLERANCE = 0.01;

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function aspectRatio(width, height) {
  const safeWidth = finitePositive(width);
  const safeHeight = finitePositive(height);
  return safeWidth && safeHeight ? safeWidth / safeHeight : null;
}

export function ratioDrift(left, right) {
  const a = finitePositive(left);
  const b = finitePositive(right);
  return a && b ? Math.abs(a / b - 1) : null;
}

export function panelGeometry(bounds, pageSize) {
  if (!bounds || !Number.isFinite(pageSize?.width) || !Number.isFinite(pageSize?.height)) return null;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const areaRatio = bounds.width * bounds.height / (pageSize.width * pageSize.height);
  const horizontal = centerX < pageSize.width * 0.4 ? "left" : centerX > pageSize.width * 0.6 ? "right" : "center";
  const vertical = centerY < pageSize.height * 0.4 ? "top" : centerY > pageSize.height * 0.6 ? "bottom" : "middle";
  const fullWidth = bounds.width >= pageSize.width * 0.9;
  const fullHeight = bounds.height >= pageSize.height * 0.9;
  return {
    horizontal,
    vertical,
    classification: fullWidth && fullHeight ? "full-canvas" : fullWidth ? "horizontal-band" : fullHeight ? "vertical-band" : `${horizontal}-${vertical}`,
    areaRatio,
  };
}

export function cropGeometry(element) {
  const crop = element?.image?.properties?.cropProperties ?? element?.image?.imageProperties?.cropProperties ?? {};
  const left = Math.max(0, Number(crop.leftOffset ?? 0));
  const right = Math.max(0, Number(crop.rightOffset ?? 0));
  const top = Math.max(0, Number(crop.topOffset ?? 0));
  const bottom = Math.max(0, Number(crop.bottomOffset ?? 0));
  const visibleWidthFraction = Math.max(0, 1 - left - right);
  const visibleHeightFraction = Math.max(0, 1 - top - bottom);
  return {
    left,
    right,
    top,
    bottom,
    visibleWidthFraction,
    visibleHeightFraction,
    visibleAreaFraction: visibleWidthFraction * visibleHeightFraction,
  };
}

function transformedEdgeLengths(element) {
  const width = dimensionToPoints(element?.size?.width);
  const height = dimensionToPoints(element?.size?.height);
  const transform = element?.absoluteTransform ?? element?.transform ?? {};
  if (!finitePositive(width) || !finitePositive(height)) return null;
  const scaleX = Number(transform.scaleX ?? 1);
  const scaleY = Number(transform.scaleY ?? 1);
  const shearX = Number(transform.shearX ?? 0);
  const shearY = Number(transform.shearY ?? 0);
  if (![scaleX, scaleY, shearX, shearY].every(Number.isFinite)) return null;
  return {
    width: width * Math.hypot(scaleX, shearY),
    height: height * Math.hypot(shearX, scaleY),
  };
}

export function frameAspectRatio(element) {
  const edges = transformedEdgeLengths(element);
  return edges ? aspectRatio(edges.width, edges.height) : aspectRatio(element?.boundsPt?.width, element?.boundsPt?.height);
}

export function estimatedContentAspectRatio(element) {
  const frameRatio = frameAspectRatio(element);
  if (!frameRatio) return null;
  if (!element?.image) return frameRatio;
  const crop = cropGeometry(element);
  if (!(crop.visibleWidthFraction > 0) || !(crop.visibleHeightFraction > 0)) return null;
  return frameRatio * crop.visibleHeightFraction / crop.visibleWidthFraction;
}

export function mediaGeometry(element, pageSize) {
  const bounds = element?.boundsPt ?? null;
  const crop = element?.image ? cropGeometry(element) : null;
  return {
    mediaType: element?.kind ?? null,
    boundsPt: bounds,
    frameAspectRatio: frameAspectRatio(element),
    contentAspectRatioEstimate: estimatedContentAspectRatio(element),
    occupiedAreaRatio: bounds && Number.isFinite(pageSize?.width) && Number.isFinite(pageSize?.height)
      ? bounds.width * bounds.height / (pageSize.width * pageSize.height)
      : null,
    panel: panelGeometry(bounds, pageSize),
    crop,
  };
}

export function fitRect({ sourceAspectRatio, targetBounds, fit = "contain", alignX = 0.5, alignY = 0.5 } = {}) {
  const ratio = finitePositive(sourceAspectRatio);
  assert(ratio, "sourceAspectRatio must be positive", "sourceAspectRatio");
  assert(targetBounds && finitePositive(targetBounds.width) && finitePositive(targetBounds.height), "targetBounds must have positive width and height", "targetBounds");
  assert(["contain", "cover"].includes(fit), "fit must be contain or cover", "fit");
  assert(Number.isFinite(alignX) && alignX >= 0 && alignX <= 1, "alignX must be between 0 and 1", "alignX");
  assert(Number.isFinite(alignY) && alignY >= 0 && alignY <= 1, "alignY must be between 0 and 1", "alignY");
  const targetRatio = targetBounds.width / targetBounds.height;
  let width;
  let height;
  if ((fit === "contain" && ratio >= targetRatio) || (fit === "cover" && ratio < targetRatio)) {
    width = targetBounds.width;
    height = width / ratio;
  } else {
    height = targetBounds.height;
    width = height * ratio;
  }
  return {
    x: targetBounds.x + (targetBounds.width - width) * alignX,
    y: targetBounds.y + (targetBounds.height - height) * alignY,
    width,
    height,
    sourceAspectRatio: ratio,
    targetAspectRatio: targetRatio,
    fit,
  };
}

export function buildAspectSafeImageRequests({
  imageObjectId,
  url,
  targetElement,
  sourceAspectRatio,
  targetBounds = targetElement?.boundsPt,
  fit = "contain",
  alignX = 0.5,
  alignY = 0.5,
} = {}) {
  assert(typeof imageObjectId === "string" && imageObjectId.length > 0, "imageObjectId is required", "imageObjectId");
  assert(typeof url === "string" && url.length > 0, "url is required", "url");
  assert(targetElement?.kind === "image", "targetElement must be an image", "targetElement");
  const sourceRatio = finitePositive(sourceAspectRatio);
  assert(sourceRatio, "sourceAspectRatio must be positive", "sourceAspectRatio");
  const targetRatio = aspectRatio(targetBounds?.width, targetBounds?.height);
  assert(targetRatio, "targetBounds must have positive width and height", "targetBounds");
  assert(["contain", "cover"].includes(fit), "fit must be contain or cover", "fit");
  if (fit === "cover") {
    const visibleAreaFraction = Math.min(sourceRatio / targetRatio, targetRatio / sourceRatio);
    return {
      requests: [{ replaceImage: { imageObjectId, url, imageReplaceMethod: "CENTER_CROP" } }],
      analysis: { fit, sourceAspectRatio: sourceRatio, targetAspectRatio: targetRatio, visibleAreaFraction, expectedCropFraction: 1 - visibleAreaFraction },
    };
  }
  const rect = fitRect({ sourceAspectRatio: sourceRatio, targetBounds, fit: "contain", alignX, alignY });
  return {
    requests: [{ replaceImage: { imageObjectId, url, imageReplaceMethod: "CENTER_INSIDE" } }],
    analysis: { ...rect, expectedCropFraction: 0 },
  };
}

export function buildAspectSafeVideoRequest({ objectId, source, id, pageObjectId, sourceAspectRatio, targetBounds, alignX = 0.5, alignY = 0.5 } = {}) {
  const rect = fitRect({ sourceAspectRatio, targetBounds, fit: "contain", alignX, alignY });
  return {
    createVideo: {
      objectId,
      source,
      id,
      elementProperties: {
        pageObjectId,
        size: {
          width: { magnitude: rect.width, unit: "PT" },
          height: { magnitude: rect.height, unit: "PT" },
        },
        transform: { scaleX: 1, scaleY: 1, translateX: rect.x, translateY: rect.y, unit: "PT" },
      },
    },
  };
}

function pngDimensions(bytes) {
  if (bytes.length < 24 || bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), mimeType: "image/png", animated: false };
}

function gifDimensions(bytes) {
  if (bytes.length < 10 || !["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return null;
  return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8), mimeType: "image/gif", animated: true };
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5), mimeType: "image/jpeg", animated: false };
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (!Number.isInteger(length) || length < 2) break;
    offset += 2 + length;
  }
  return null;
}

export function imageMetadataFromBytes(bytes) {
  assert(Buffer.isBuffer(bytes), "image bytes must be a Buffer", "bytes");
  const metadata = pngDimensions(bytes) ?? gifDimensions(bytes) ?? jpegDimensions(bytes);
  assert(metadata && finitePositive(metadata.width) && finitePositive(metadata.height), "unsupported or invalid PNG, JPEG, or GIF", "bytes");
  return {
    ...metadata,
    aspectRatio: metadata.width / metadata.height,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function inspectImageFiles(paths = []) {
  const assets = [];
  for (const path of paths) {
    assert(typeof path === "string" && path.length > 0, "image path must be a non-empty string", "paths");
    const bytes = await readFile(path);
    assets.push({ path, ...imageMetadataFromBytes(bytes) });
  }
  return { version: VERSION, kind: "slides-media-assets", assets };
}

export function mediaAssetMap(manifest) {
  if (!isRecord(manifest) || manifest.kind !== "slides-media-assets" || !Array.isArray(manifest.assets)) return new Map();
  return new Map(manifest.assets.map((asset) => [asset.path, asset]));
}

export { RATIO_TOLERANCE };
```

### File: `runtime/normalize.mjs`

```javascript
import {
  assert,
  findFirstRecord,
  firstDefined,
  isRecord,
  redactSensitive,
  sha256Json,
  uniqueSorted,
} from "./common.mjs";
import { buildDesignSystem } from "./design-system.mjs";
import { unwrapCallToolResult } from "./result.mjs";

const EMU_PER_POINT = 12700;

export function dimensionToPoints(dimension) {
  if (dimension === null || dimension === undefined) return null;
  if (typeof dimension === "number") return dimension;
  if (!isRecord(dimension)) return null;

  const magnitude = Number(dimension.magnitude);
  if (!Number.isFinite(magnitude)) return null;
  const unit = String(dimension.unit ?? "PT").toUpperCase();
  if (unit === "PT" || unit === "POINT" || unit === "POINTS") return magnitude;
  if (unit === "EMU") return magnitude / EMU_PER_POINT;
  if (unit === "IN" || unit === "INCH" || unit === "INCHES") return magnitude * 72;
  if (unit === "PX") return magnitude * 0.75;
  return null;
}

function textFromElements(textElements) {
  if (!Array.isArray(textElements)) return "";
  return textElements
    .map((element) => element?.textRun?.content ?? element?.autoText?.content ?? "")
    .join("");
}

function normalizeText(text) {
  if (!isRecord(text)) return null;
  const elements = Array.isArray(text.textElements) ? text.textElements : [];
  const runs = [];
  const paragraphs = [];
  const styleDefaultsByNesting = {};
  const stylePriorityByNesting = {};
  let cursor = 0;
  let nestingLevel = 0;

  for (const element of elements) {
    const content = element?.textRun?.content ?? element?.autoText?.content ?? "";
    const startIndex = Number.isInteger(element?.startIndex) ? element.startIndex : cursor;
    const endIndex = Number.isInteger(element?.endIndex) ? element.endIndex : startIndex + content.length;
    if (element?.paragraphMarker) {
      nestingLevel = Number(element.paragraphMarker.bullet?.nestingLevel ?? 0);
      paragraphs.push({
        startIndex,
        endIndex,
        style: element.paragraphMarker.style ?? null,
        bullet: element.paragraphMarker.bullet ?? null,
      });
    }
    if (element?.textRun || element?.autoText) {
      const style = element.textRun?.style ?? element.autoText?.style ?? null;
      runs.push({
        startIndex,
        endIndex,
        content,
        style,
        kind: element.textRun ? "textRun" : "autoText",
        autoTextType: element.autoText?.type ?? null,
        nestingLevel,
      });
      if (isRecord(style)) {
        const key = String(nestingLevel);
        const priority = content.includes("\n") ? 2 : 1;
        if ((stylePriorityByNesting[key] ?? 0) <= priority) {
          styleDefaultsByNesting[key] = style;
          stylePriorityByNesting[key] = priority;
        }
      }
    }
    cursor = Math.max(cursor, endIndex);
  }

  return {
    plainText: textFromElements(elements),
    runs,
    paragraphs,
    lists: text.lists ?? null,
    styleDefaultsByNesting,
  };
}

function normalizeTable(table) {
  if (!isRecord(table)) return null;
  const rows = Array.isArray(table.tableRows) ? table.tableRows : [];
  return {
    rows: Number(table.rows ?? rows.length),
    columns: Number(table.columns ?? rows[0]?.tableCells?.length ?? 0),
    cells: rows.map((row, rowIndex) =>
      (row.tableCells ?? []).map((cell, columnIndex) => ({
        rowIndex,
        columnIndex,
        text: normalizeText(cell.text),
        rowSpan: cell.rowSpan ?? 1,
        columnSpan: cell.columnSpan ?? 1,
        properties: cell.tableCellProperties ?? null,
      })),
    ),
  };
}

function elementKind(element) {
  for (const key of [
    "shape",
    "image",
    "table",
    "line",
    "wordArt",
    "sheetsChart",
    "video",
    "speakerSpotlight",
    "elementGroup",
  ]) {
    if (element?.[key] !== undefined) return key;
  }
  return "unknown";
}

function affineMatrix(transform = {}) {
  const translateX = dimensionToPoints({ magnitude: transform.translateX ?? 0, unit: transform.unit ?? "PT" });
  const translateY = dimensionToPoints({ magnitude: transform.translateY ?? 0, unit: transform.unit ?? "PT" });
  const values = [transform.scaleX ?? 1, transform.scaleY ?? 1, transform.shearX ?? 0, transform.shearY ?? 0].map(Number);
  if (translateX === null || translateY === null || values.some((value) => !Number.isFinite(value))) return null;
  const [scaleX, scaleY, shearX, shearY] = values;
  return { a: scaleX, b: shearY, c: shearX, d: scaleY, e: translateX, f: translateY };
}

function multiplyAffine(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function normalizeGeometry(element, parentMatrix = null) {
  const size = element?.size ?? {};
  const transform = element?.transform ?? {};
  const width = dimensionToPoints(size.width);
  const height = dimensionToPoints(size.height);
  const localMatrix = affineMatrix(transform);
  const absoluteMatrix = parentMatrix && localMatrix ? multiplyAffine(parentMatrix, localMatrix) : localMatrix;
  const serializedMatrix = absoluteMatrix
    ? {
        scaleX: absoluteMatrix.a,
        shearY: absoluteMatrix.b,
        shearX: absoluteMatrix.c,
        scaleY: absoluteMatrix.d,
        translateX: absoluteMatrix.e,
        translateY: absoluteMatrix.f,
        unit: "PT",
      }
    : null;
  if (width === null || height === null || !absoluteMatrix) {
    return { boundsPt: null, absoluteMatrix, absoluteTransform: serializedMatrix };
  }
  const points = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => ({
    x: absoluteMatrix.a * x + absoluteMatrix.c * y + absoluteMatrix.e,
    y: absoluteMatrix.b * x + absoluteMatrix.d * y + absoluteMatrix.f,
  }));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    boundsPt: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      rotatedOrSkewed: Boolean(absoluteMatrix.b || absoluteMatrix.c || absoluteMatrix.a < 0 || absoluteMatrix.d < 0),
    },
    absoluteMatrix,
    absoluteTransform: serializedMatrix,
  };
}

function normalizeElement(element, pageId, parentMatrix = null, groupChild = false) {
  const kind = elementKind(element);
  const shape = element?.shape ?? null;
  const objectId = element?.objectId ?? element?.id ?? null;
  const geometry = normalizeGeometry(element, parentMatrix);
  return {
    objectId,
    pageId,
    kind,
    placeholderType: shape?.placeholder?.type ?? null,
    placeholder: shape?.placeholder
      ? {
          type: shape.placeholder.type ?? null,
          index: Number.isInteger(shape.placeholder.index) ? shape.placeholder.index : 0,
          parentObjectId: shape.placeholder.parentObjectId ?? null,
        }
      : null,
    shapeType: shape?.shapeType ?? null,
    shapeProperties: shape?.shapeProperties ?? null,
    boundsPt: geometry.boundsPt,
    transform: element?.transform ?? null,
    absoluteTransform: geometry.absoluteTransform,
    groupChild,
    size: element?.size ?? null,
    text: normalizeText(shape?.text),
    table: normalizeTable(element?.table),
    wordArt: element?.wordArt
      ? { renderedText: element.wordArt.renderedText ?? "" }
      : null,
    image: element?.image
      ? {
          contentUrl: element.image.contentUrl ? "[EPHEMERAL_URL]" : null,
          sourceUrl: element.image.sourceUrl ?? null,
          properties: element.image.imageProperties ?? null,
        }
      : null,
    sheetsChart: element?.sheetsChart ?? null,
    video: element?.video ?? null,
    speakerSpotlight: element?.speakerSpotlight ?? null,
    line: element?.line ?? null,
    group: element?.elementGroup
      ? {
          children: (element.elementGroup.children ?? []).map((child) =>
            normalizeElement(child, pageId, geometry.absoluteMatrix, true)),
        }
      : null,
    description: element?.description ?? null,
    title: element?.title ?? null,
  };
}

function normalizeNotes(slide) {
  const notesPage = slide?.notesPage ?? slide?.slideProperties?.notesPage;
  if (!isRecord(notesPage)) return { objectId: null, text: "", elements: [] };
  const notesObjectId = notesPage?.notesProperties?.speakerNotesObjectId ?? null;
  const elements = (notesPage.pageElements ?? []).map((element) => normalizeElement(element, notesPage.objectId));
  const notesElement = elements.find((element) => element.objectId === notesObjectId);
  return {
    objectId: notesObjectId,
    text: notesElement?.text?.plainText ?? "",
    elements,
  };
}

function normalizePage(page, index, kind) {
  const objectId = page?.objectId ?? page?.id ?? null;
  const properties =
    kind === "slide"
      ? page?.slideProperties
      : kind === "layout"
        ? page?.layoutProperties
        : page?.masterProperties;
  return {
    objectId,
    index,
    kind,
    layoutId: page?.slideProperties?.layoutObjectId ?? null,
    masterId: properties?.masterObjectId ?? null,
    name: properties?.name ?? properties?.displayName ?? null,
    displayName: properties?.displayName ?? properties?.name ?? null,
    revisionId: page?.revisionId ?? null,
    isSkipped: kind === "slide" ? page?.slideProperties?.isSkipped === true : false,
    pageProperties: page?.pageProperties ?? null,
    elements: (page?.pageElements ?? []).map((element) => normalizeElement(element, objectId)),
    notes: kind === "slide" ? normalizeNotes(page) : null,
    properties: properties ?? null,
  };
}

function locatePresentation(value) {
  const directCandidates = [
    value?.presentation,
    value?.result?.presentation,
    value?.data?.presentation,
    value?.result,
    value?.data,
    value,
  ];
  for (const candidate of directCandidates) {
    if (isRecord(candidate) && (Array.isArray(candidate.slides) || candidate.presentationId || candidate.pageSize)) {
      return candidate;
    }
  }
  return findFirstRecord(
    value,
    (candidate) => Array.isArray(candidate.slides) && (candidate.presentationId || candidate.title || candidate.pageSize),
  );
}

function indexPages(pages) {
  const objectIndex = {};
  const visitElement = (element, pageId) => {
    if (element.objectId) objectIndex[element.objectId] = { pageId, kind: element.kind };
    for (const child of element.group?.children ?? []) visitElement(child, pageId);
  };
  for (const page of pages) {
    if (page.objectId) objectIndex[page.objectId] = { pageId: page.objectId, kind: page.kind };
    for (const element of page.elements) visitElement(element, page.objectId);
    for (const element of page.notes?.elements ?? []) {
      visitElement({ ...element, kind: "notes" }, page.objectId);
    }
  }
  return objectIndex;
}

export function normalizePresentation(raw, { presentationId = null } = {}) {
  const unwrapped = unwrapCallToolResult(raw);
  const presentation = locatePresentation(unwrapped);
  assert(presentation, "Could not locate a presentation object in the connector result");

  const id = firstDefined(presentation, [
    ["presentationId"],
    ["presentation_id"],
    ["id"],
  ]) ?? presentationId;
  const title = firstDefined(presentation, [["title"], ["name"]]) ?? null;
  const revisionId = firstDefined(presentation, [
    ["revisionId"],
    ["revision_id"],
    ["writeControl", "requiredRevisionId"],
    ["write_control", "requiredRevisionId"],
    ["metadata", "revisionId"],
  ]) ?? firstDefined(unwrapped, [
    ["revisionId"],
    ["revision_id"],
    ["writeControl", "requiredRevisionId"],
    ["metadata", "revisionId"],
  ]) ?? null;

  const slides = (presentation.slides ?? []).map((slide, index) => normalizePage(slide, index, "slide"));
  const layouts = (presentation.layouts ?? []).map((layout, index) => normalizePage(layout, index, "layout"));
  const masters = (presentation.masters ?? []).map((master, index) => normalizePage(master, index, "master"));
  const pages = [...slides, ...layouts, ...masters];
  const pageSize = presentation.pageSize ?? {};

  const payload = {
    snapshotVersion: 2,
    presentation: {
      id,
      title,
      revisionId,
      locale: presentation.locale ?? null,
      pageSizePt: {
        width: dimensionToPoints(pageSize.width),
        height: dimensionToPoints(pageSize.height),
      },
      slideCount: slides.length,
      slideIds: slides.map((slide) => slide.objectId),
    },
    slides,
    layouts,
    masters,
    objectIndex: indexPages(pages),
    rawPresentation: redactSensitive(presentation),
  };
  payload.designSystem = buildDesignSystem(payload);

  return { ...payload, sha256: sha256Json(payload) };
}

function oneLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function renderSlideInventory(snapshot) {
  const lines = [
    "# Slide Inventory",
    "",
    `- Presentation ID: \`${snapshot.presentation.id ?? "missing"}\``,
    `- Title: ${snapshot.presentation.title ?? "(missing)"}`,
    `- Revision ID: \`${snapshot.presentation.revisionId ?? "missing"}\``,
    `- Snapshot SHA-256: \`${snapshot.sha256}\``,
    `- Slide count: ${snapshot.slides.length}`,
    "",
    "| # | Slide ID | Layout ID | Master ID | Skipped | Elements | Title/Text Preview |",
    "| ---: | --- | --- | --- | --- | ---: | --- |",
  ];

  for (const slide of snapshot.slides) {
    const flatten = (elements) => elements.flatMap((element) => [element, ...flatten(element.group?.children ?? [])]);
    const elements = flatten(slide.elements);
    const texts = elements
      .flatMap((element) => [
        element.text?.plainText,
        element.wordArt?.renderedText,
        ...(element.table?.cells ?? []).flatMap((row) => (row ?? []).map((cell) => cell.text?.plainText)),
      ])
      .filter(Boolean)
      .map(oneLine);
    const preview = texts.join(" / ").slice(0, 180).replace(/\|/g, "\\|");
    lines.push(
      `| ${slide.index + 1} | \`${slide.objectId ?? "missing"}\` | \`${slide.layoutId ?? ""}\` | \`${slide.masterId ?? ""}\` | ${slide.isSkipped ? "yes" : "no"} | ${elements.length} | ${preview} |`,
    );
  }

  const kinds = uniqueSorted(
    snapshot.slides.flatMap((slide) => {
      const flatten = (elements) => elements.flatMap((element) => [element, ...flatten(element.group?.children ?? [])]);
      return flatten(slide.elements).map((element) => element.kind);
    }),
  );
  lines.push("", `Element kinds: ${kinds.join(", ") || "none"}`, "");
  return lines.join("\n");
}
```

### File: `runtime/output-issues.mjs`

```javascript
import { dimensionToPoints } from "./normalize.mjs";

const HARD_READABILITY_FLOOR_PT = 8;
const NARRATIVE_TARGET_PT = 12;
const DEFAULT_MAX_ISSUES = 100;

const PROTECTED_PLACEHOLDER_TYPES = new Set([
  "CAPTION",
  "DATE_AND_TIME",
  "FOOTER",
  "HEADER",
  "SLIDE_NUMBER",
]);
const TEXT_PLACEHOLDER_TYPES = new Set(["BODY", "CENTERED_TITLE", "SUBTITLE", "TITLE"]);
const NARRATIVE_PLACEHOLDER_TYPES = new Set(["BODY", "CENTERED_TITLE", "OBJECT", "SUBTITLE", "TITLE"]);

const VISIBLE_BULLET_MARKER =
  /^\s*(?<marker>[\u2022\u2023\u2024\u2027\u2043\u204C\u204D\u2219\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1\u25C6\u25C7\u279C\u27A4\u2192\u21D2])(?=\s)/u;
const DUPLICATE_LIST_MARKER =
  /^\s*(?<marker>(?:[\u2022\u2023\u2024\u2027\u2043\u204C\u204D\u2219\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1\u25C6\u25C7\u279C\u27A4\u2192\u21D2]|-\s*>|->|=>|[-\u2013\u2014]|\d{1,2}[.)]|[A-Za-z][.)]))(?=\s)/u;

const GENERIC_PLACEHOLDER_PATTERNS = [
  /\blorem ipsum\b/i,
  /\bclick to add (?:title|text|subtitle|media|image)\b/i,
  /^\s*(?:sample|placeholder)\s+(?:title|text|copy|name|image|media)\s*$/i,
  /^\s*(?:title|subtitle|speaker name|image|media|demo|chart|table)\s+goes\s+here\s*$/i,
  /^\s*demo\s+can\s+be\s+(?:embedded|inserted|placed)\s+here\s*$/i,
  /^\s*[\[<{].*\b(?:insert|add|replace|paste|upload|drop|embed|place|placeholder|sample|demo|goes\s+here)\b.*[\]}>]\s*$/i,
  /^\s*(?:insert|add|replace|paste|upload|drop|embed|place)\b[^\n]{0,160}\b(?:here|below|above|this)\b/i,
];

function flattenElements(elements) {
  return (elements ?? []).flatMap((element) => [element, ...flattenElements(element.group?.children)]);
}

function textSurfaces(element) {
  const surfaces = [];
  if (element.text) surfaces.push({ key: "shape", text: element.text, cellLocation: null });
  for (const row of element.table?.cells ?? []) {
    for (const cell of row ?? []) {
      if (!cell.text) continue;
      surfaces.push({
        key: `table:${cell.rowIndex}:${cell.columnIndex}`,
        text: cell.text,
        cellLocation: { rowIndex: cell.rowIndex, columnIndex: cell.columnIndex },
      });
    }
  }
  return surfaces;
}

function paragraphRanges(text) {
  const plainText = String(text?.plainText ?? "");
  const markers = [...(text?.paragraphs ?? [])]
    .filter((paragraph) => Number.isInteger(paragraph?.startIndex))
    .sort((left, right) => left.startIndex - right.startIndex);
  if (markers.length > 0) {
    return markers.map((paragraph, index) => {
      const startIndex = paragraph.startIndex;
      const endIndex = Math.max(startIndex, Number(markers[index + 1]?.startIndex ?? plainText.length));
      return {
        startIndex,
        endIndex,
        content: plainText.slice(startIndex, endIndex).replace(/\n+$/g, ""),
        bullet: paragraph.bullet ?? null,
      };
    });
  }

  const ranges = [];
  let startIndex = 0;
  for (const line of plainText.split("\n")) {
    ranges.push({ startIndex, endIndex: startIndex + line.length, content: line, bullet: null });
    startIndex += line.length + 1;
  }
  return ranges;
}

function explicitMinimumFontSize(text, element) {
  const scaleValue = Number(element.shapeProperties?.autofit?.fontScale ?? 1);
  const scale = Number.isFinite(scaleValue) && scaleValue > 0 ? scaleValue : 1;
  const sizes = (text?.runs ?? [])
    .filter((run) => String(run.content ?? "").trim().length > 0)
    .map((run) => dimensionToPoints(run.style?.fontSize))
    .filter(Number.isFinite)
    .map((size) => size * scale);
  return {
    minimumFontSizePt: sizes.length > 0 ? Math.min(...sizes) : null,
    autofitScale: scale,
  };
}

function isSupportingText(element, text, pageHeightPt) {
  if (PROTECTED_PLACEHOLDER_TYPES.has(element.placeholderType)) return true;
  const value = String(text?.plainText ?? "").trim();
  const bounds = element.boundsPt;
  const bottomBand = Number.isFinite(pageHeightPt) && bounds &&
    bounds.y >= pageHeightPt * 0.8 && bounds.height <= pageHeightPt * 0.2;
  const supportingLabel = /^(?:source|sources|note|notes|footnote|confidential|internal use|©)\b/i.test(value);
  return value.length <= 240 && (bottomBand || supportingLabel);
}

function isLikelyNarrative(element, text) {
  if (NARRATIVE_PLACEHOLDER_TYPES.has(element.placeholderType)) return true;
  if ((text?.paragraphs ?? []).some((paragraph) => Boolean(paragraph.bullet))) return true;
  const value = String(text?.plainText ?? "").trim();
  if (element.kind === "table") return value.length >= 40;
  return value.length >= 80;
}

function isGenericPlaceholder(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 && GENERIC_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

function issueId(issue) {
  const location = issue.cellLocation
    ? `${issue.cellLocation.rowIndex}-${issue.cellLocation.columnIndex}`
    : issue.surface ?? "slide";
  const startIndex = issue.range?.startIndex ?? "all";
  return [issue.code, issue.slideId, issue.objectId ?? issue.slideId, location, startIndex]
    .map((part) => String(part ?? "unknown").replace(/[^A-Za-z0-9_-]+/g, "-"))
    .join(":");
}

function compareIssues(left, right) {
  return left.slideIndex - right.slideIndex ||
    (left.severity === right.severity ? 0 : left.severity === "error" ? -1 : 1) ||
    left.code.localeCompare(right.code) ||
    String(left.objectId ?? "").localeCompare(String(right.objectId ?? "")) ||
    Number(left.range?.startIndex ?? 0) - Number(right.range?.startIndex ?? 0);
}

function countBy(items, key) {
  return Object.fromEntries(
    [...new Set(items.map((item) => item[key]))]
      .sort()
      .map((value) => [value, items.filter((item) => item[key] === value).length]),
  );
}

export function inspectOutputIssues(snapshot, { maxIssues = DEFAULT_MAX_ISSUES } = {}) {
  const limit = Number(maxIssues);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("maxIssues must be an integer between 1 and 1000");
  }

  const issues = [];
  const add = (issue) => issues.push({ id: issueId(issue), ...issue });
  const pageHeightPt = Number(snapshot?.presentation?.pageSizePt?.height);

  for (const slide of snapshot.slides ?? []) {
    const slideId = slide.objectId;
    const slideIndex = slide.index;
    if ((slide.elements ?? []).length === 0) {
      add({
        code: "BLANK_SLIDE",
        severity: "warning",
        slideId,
        slideIndex,
        objectId: slideId,
        surface: "slide",
        message: "The slide has no slide-local page elements.",
        remediation: "Confirm the slide is intentionally blank; otherwise populate it from its selected exemplar.",
      });
    }

    for (const element of flattenElements(slide.elements)) {
      const objectId = element.objectId;
      const plainShapeText = String(element.text?.plainText ?? "").trim();
      if (element.kind === "shape" && TEXT_PLACEHOLDER_TYPES.has(element.placeholderType) && !plainShapeText) {
        add({
          code: "EMPTY_TEXT_PLACEHOLDER",
          severity: "warning",
          slideId,
          slideIndex,
          objectId,
          surface: "shape",
          message: `An empty ${element.placeholderType} placeholder remains on the slide.`,
          remediation: "Populate it or delete it when the selected exemplar does not need that slot.",
        });
      }

      for (const surface of textSurfaces(element)) {
        const value = String(surface.text?.plainText ?? "").trim();
        const location = {
          slideId,
          slideIndex,
          objectId,
          surface: surface.key,
          ...(surface.cellLocation ? { cellLocation: surface.cellLocation } : {}),
        };

        if (isGenericPlaceholder(value)) {
          add({
            code: "GENERIC_PLACEHOLDER_TEXT",
            severity: "error",
            ...location,
            message: "Visible editor instruction or generic placeholder text remains.",
            remediation: "Replace it with final content or remove the underlying template object.",
            evidence: { textPreview: value.slice(0, 160) },
          });
        }

        for (const paragraph of paragraphRanges(surface.text)) {
          if (paragraph.bullet && paragraph.content.trim().length === 0 && paragraph.endIndex > paragraph.startIndex) {
            add({
              code: "EMPTY_BULLET_PARAGRAPH",
              severity: "error",
              ...location,
              range: { startIndex: paragraph.startIndex, endIndex: paragraph.endIndex },
              message: "A whitespace-only native bullet paragraph can render a stray bullet.",
              remediation: "Delete the empty paragraph range or remove its bullet formatting.",
            });
            continue;
          }

          const duplicate = paragraph.bullet ? DUPLICATE_LIST_MARKER.exec(paragraph.content) : null;
          if (duplicate) {
            add({
              code: "DUPLICATE_LIST_MARKER",
              severity: "error",
              ...location,
              range: { startIndex: paragraph.startIndex, endIndex: paragraph.endIndex },
              message: "A native bulleted paragraph also begins with a typed list marker.",
              remediation: "Remove the typed marker and preserve the paragraph's native bullet formatting.",
              evidence: {
                marker: duplicate.groups?.marker ?? duplicate[0].trim(),
                textPreview: paragraph.content.trim().slice(0, 120),
              },
            });
            continue;
          }

          const literal = paragraph.bullet ? null : VISIBLE_BULLET_MARKER.exec(paragraph.content);
          if (literal) {
            add({
              code: "LITERAL_BULLET_CHARACTER",
              severity: "warning",
              ...location,
              range: { startIndex: paragraph.startIndex, endIndex: paragraph.endIndex },
              message: "A paragraph begins with a typed bullet character instead of native list formatting.",
              remediation: "Use a native bullet unless this character is an intentional template-native decorative element.",
              evidence: {
                marker: literal.groups?.marker ?? literal[0].trim(),
                textPreview: paragraph.content.trim().slice(0, 120),
              },
            });
          }
        }

        if (!value || isSupportingText(element, surface.text, pageHeightPt) || !isLikelyNarrative(element, surface.text)) continue;
        const { minimumFontSizePt, autofitScale } = explicitMinimumFontSize(surface.text, element);
        if (!Number.isFinite(minimumFontSizePt)) continue;
        const roundedSize = Math.round(minimumFontSizePt * 10) / 10;
        if (minimumFontSizePt < HARD_READABILITY_FLOOR_PT) {
          add({
            code: "TEXT_EFFECTIVELY_UNREADABLE",
            severity: "error",
            ...location,
            message: `Narrative text explicitly renders at ${roundedSize} pt, below the ${HARD_READABILITY_FLOOR_PT} pt hard floor.`,
            remediation: "Restore a readable template size, then shorten the copy or select a denser appropriate exemplar.",
            evidence: { minimumFontSizePt: roundedSize, autofitScale, textPreview: value.slice(0, 160) },
          });
        } else if (minimumFontSizePt < NARRATIVE_TARGET_PT) {
          add({
            code: "TEXT_BELOW_NARRATIVE_TARGET",
            severity: "warning",
            ...location,
            message: `Narrative text explicitly renders at ${roundedSize} pt, below the ${NARRATIVE_TARGET_PT} pt target.`,
            remediation: "Preserve the template size when possible; otherwise shorten the copy or choose a denser exemplar instead of shrinking further.",
            evidence: { minimumFontSizePt: roundedSize, autofitScale, textPreview: value.slice(0, 160) },
          });
        }
      }
    }
  }

  issues.sort(compareIssues);
  const reported = issues.slice(0, limit);
  return {
    schemaVersion: 1,
    presentation: {
      id: snapshot.presentation?.id ?? null,
      title: snapshot.presentation?.title ?? null,
      revisionId: snapshot.presentation?.revisionId ?? null,
      slideCount: snapshot.presentation?.slideCount ?? snapshot.slides?.length ?? 0,
    },
    snapshotSha256: snapshot.sha256 ?? null,
    summary: {
      totalIssues: issues.length,
      reportedIssues: reported.length,
      truncated: reported.length < issues.length,
      bySeverity: countBy(issues, "severity"),
      byCode: countBy(issues, "code"),
    },
    issues: reported,
  };
}
```

### File: `runtime/result.mjs`

```javascript
import { isRecord, redactSensitive } from "./common.mjs";

export class ToolCallError extends Error {
  constructor(message, { raw = null } = {}) {
    super(redactSensitive(message));
    this.name = "ToolCallError";
    this.raw = redactSensitive(raw);
  }
}

export function extractToolText(raw) {
  if (typeof raw === "string") return raw;
  if (!raw) return "Unknown connector error";

  if (Array.isArray(raw.content)) {
    const text = raw.content
      .filter((item) => item?.type === "text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n")
      .trim();
    if (text) return text;
  }

  for (const key of ["message", "error", "detail"]) {
    if (typeof raw[key] === "string" && raw[key]) return raw[key];
    if (isRecord(raw[key]) && typeof raw[key].message === "string") return raw[key].message;
  }
  return "Connector returned an error result";
}

function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function returnOrThrow(value, raw) {
  if (value?.isError === true) {
    throw new ToolCallError(extractToolText(value), { raw });
  }
  return value;
}

export function unwrapCallToolResult(raw) {
  if (raw?.isError === true) {
    throw new ToolCallError(extractToolText(raw), { raw });
  }

  if (raw?.structuredContent?.result !== undefined) return returnOrThrow(raw.structuredContent.result, raw);
  if (raw?.structuredContent !== undefined) return returnOrThrow(raw.structuredContent, raw);

  const textItem = Array.isArray(raw?.content)
    ? raw.content.find((item) => item?.type === "text" && typeof item.text === "string")
    : null;
  if (textItem) {
    const parsed = parseJsonText(textItem.text);
    if (parsed?.isError === true) {
      throw new ToolCallError(extractToolText(parsed), { raw });
    }
    if (parsed?.structuredContent?.result !== undefined) return returnOrThrow(parsed.structuredContent.result, raw);
    if (parsed?.structuredContent !== undefined) return returnOrThrow(parsed.structuredContent, raw);
    return returnOrThrow(parsed, raw);
  }

  return returnOrThrow(raw, raw);
}
```

### File: `scripts/check_output_issues.mjs`

```javascript
#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { inspectOutputIssues } from "../runtime/output-issues.mjs";
import { normalizePresentation } from "../runtime/normalize.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "help") {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function requireOption(options, key) {
  if (!options[key]) throw new Error(`Missing required --${key}`);
  return resolve(options[key]);
}

async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, contents, "utf8");
  await rename(temporary, path);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("Usage: check_output_issues.mjs --input <raw-output.json> --output <output-issues.json> [--presentation-id <id>] [--max-issues <1-1000>]\n");
    return;
  }

  const inputPath = requireOption(options, "input");
  const outputPath = requireOption(options, "output");
  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const snapshot = normalizePresentation(raw, {
    presentationId: options["presentation-id"] ?? null,
  });
  const report = inspectOutputIssues(snapshot, {
    maxIssues: options["max-issues"] === undefined ? undefined : Number(options["max-issues"]),
  });
  await writeAtomic(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    output: outputPath,
    presentation: report.presentation,
    summary: report.summary,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.name ?? "Error"}: ${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});
```

### File: `scripts/parse_template_design_system.mjs`

```javascript
#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderDesignCatalog } from "../runtime/design-system.mjs";
import { normalizePresentation } from "../runtime/normalize.mjs";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "help") {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function requireOption(options, key) {
  if (!options[key]) throw new Error(`Missing required --${key}`);
  return resolve(options[key]);
}

async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, contents, "utf8");
  await rename(temporary, path);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("Usage: parse_template_design_system.mjs --input <raw-template.json> --output <design-system.json> [--catalog <design-catalog.md>] [--presentation-id <id>]\n");
    return;
  }
  const inputPath = requireOption(options, "input");
  const outputPath = requireOption(options, "output");
  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const snapshot = normalizePresentation(raw, {
    presentationId: options["presentation-id"] ?? null,
  });
  const designSystem = {
    ...snapshot.designSystem,
    source: {
      presentation: snapshot.presentation,
      snapshotSha256: snapshot.sha256,
    },
  };

  await writeAtomic(outputPath, `${JSON.stringify(designSystem, null, 2)}\n`);
  const catalogPath = options.catalog ? resolve(options.catalog) : null;
  if (catalogPath) await writeAtomic(catalogPath, renderDesignCatalog(snapshot));

  process.stdout.write(`${JSON.stringify({
    output: outputPath,
    catalog: catalogPath,
    presentation: snapshot.presentation,
    masters: designSystem.masters.length,
    layouts: designSystem.layouts.length,
    exemplarSlides: designSystem.slides.length,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.name ?? "Error"}: ${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});
```

### Not embedded

- `assets/google-slides-small.svg` (binary asset, not embedded)
- `assets/google-slides.png` (binary asset, not embedded)
