"""Parse JSON text snapshots with Python's grammar, without imports from the target."""
import ast
import json
import sys

results = []
for item in json.load(sys.stdin):
    try:
        ast.parse(item["content"], filename=item["file"])
    except SyntaxError as error:
        results.append({"file": item["file"], "line": error.lineno or 1,
                        "column": error.offset or 1, "rule": "python-syntax",
                        "severity": "error", "message": error.msg})
json.dump(results, sys.stdout)
