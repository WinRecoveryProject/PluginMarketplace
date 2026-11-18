"""Parse JSON text snapshots with Python's grammar, without imports from the target."""
import ast
import json
import re
import sys

results = []
# Node's snapshot protocol is UTF-8 regardless of Windows' default pipe text
# codec. Reading the text wrapper can introduce surrogateescape characters.
for item in json.loads(sys.stdin.buffer.read().decode("utf-8", errors="strict")):
    try:
        # JSON can carry lone surrogates even though Python source must be
        # encodable. Reject that snapshot without losing the rest of the batch.
        item["content"].encode("utf-8")
    except UnicodeEncodeError as error:
        before = item["content"][:error.start]
        lines = re.split(r"\r\n|\r|\n", before)
        results.append({"file": item["file"], "line": len(lines),
                        "column": len(lines[-1]) + 1, "rule": "python-encoding",
                        "severity": "error", "incomplete": True,
                        "message": "Source contains an unpaired Unicode surrogate; Python parsing was not completed."})
        continue
    try:
        ast.parse(item["content"], filename=item["file"])
    except UnicodeEncodeError:
        results.append({"file": item["file"], "line": 1, "column": 1,
                        "rule": "python-encoding", "severity": "error",
                        "incomplete": True,
                        "message": "Python could not encode this snapshot; parsing was not completed."})
    except SyntaxError as error:
        results.append({"file": item["file"], "line": error.lineno or 1,
                        "column": error.offset or 1, "rule": "python-syntax",
                        "severity": "error", "message": error.msg})
json.dump(results, sys.stdout, ensure_ascii=True)
