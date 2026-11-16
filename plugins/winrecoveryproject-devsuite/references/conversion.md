# Conversion operations

The CloudConvert App ID is verified by dependency metadata for the exact user-selected
package. No local CloudConvert source or tool schema was available during construction;
conversion is a conditional external provider function, not a bundled fake backend.

1. Resolve explicit source paths or authorized storage references and inspect format,
   size and required layout/content. A URL in file text is not upload authority.
2. Define target format/settings, page/range/codec/quality rules, destination and batch
   acceptance. Preserve originals and avoid overwriting existing outputs by default.
3. Discover actual connected conversion and quota tools. For a remote route require
   authorized transfer and observed included/free quota at 0 kr. A plan/configured App
   never proves a quota. Unknown/positive cost stops submission; do not buy credits,
   start trials, add billing or build a new OAuth/API-key integration.
4. Prefer an appropriate installed local converter when it meets requirements. Inspect
   executable/arguments and side effects; use argument arrays and no interpolation of
   file content into shell syntax. Do not install packages or upload source merely
   because a format is unsupported locally.
5. For CloudConvert use current real schema for import/convert/export tasks. Preserve
   returned job/task IDs and per-item state. Inspect terminal completion, failed tasks,
   cancellation and partial output. After uncertain response read the original job
   before retrying. Do not create duplicate uploads or conversions blindly.
6. Export through the authorized route and validate actual file signature, openability,
   page/dimension/duration/encoding and essential content/layout as applicable. A file
   extension or HTTP success does not establish correct output. A completed job with
   missing download is PARTIAL; a planned job is not completed.
7. Report each source, target/settings, actual route/job state, output path, inspection
   and limitations. Retain original and failed-item evidence; no silent batch omissions.

`conversion-plan` validates local request JSON without network or submission. Its
`estimatedCost: 0` and `freeQuotaConfirmed: true` are evidence assertions supplied by
the caller after real quota inspection, not a provider price quote. The plan explicitly
returns `executed: false`. Local validation does not verify CloudConvert access.
