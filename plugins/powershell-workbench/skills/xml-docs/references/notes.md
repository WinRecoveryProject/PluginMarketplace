# XML: version cues, pitfalls and safe checks

These notes are research leads, not verified facts for a given project. Identify the exact version first, open the primary source for anything you rely on, and record what you checked.

## Identify the version first

- Separate the layers: XML 1.0 or 1.1 syntax, namespaces, a schema (XSD, RELAX NG or DTD), and the application dialect (MSBuild, `.config`, manifests and so on).

## Primary sources

Start with the catalog seed for this language, then:

- <https://www.w3.org/TR/xml/> (XML 1.0)
- <https://www.w3.org/TR/xml-names/> (namespaces)
- <https://www.w3.org/TR/xmlschema11-1/> (XSD 1.1; many tools still implement XSD 1.0)
- <https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html>

## Pitfalls that change behavior

- Well-formed is not the same as valid against a schema, and neither proves the application accepts it.
- A default namespace (`xmlns="…"`) applies to elements, not attributes, and XPath queries need an explicit prefix mapping for it.
- External entities and DTDs can read files or reach the network (XXE). Keep DTD processing off for untrusted input.
- The encoding declaration must match the actual bytes; a BOM and the declaration should agree.
- PowerShell `[xml]` loads into `XmlDocument`; whitespace is not preserved unless `PreserveWhitespace` is set before loading.

## Safe checks that do not run the code

- Parse with DTD processing disabled and no network access.
- Validate against the schema only with a local copy of the schema, and report syntax, schema and application checks separately.
