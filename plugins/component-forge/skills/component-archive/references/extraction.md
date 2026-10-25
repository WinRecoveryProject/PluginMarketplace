# Untangling and composition

Treat assignment as a possible output, not proof of local ownership. Resolve parent, script and global scope; distinguish automatic variables from caller state. Trace aliases, splatting, callbacks, scriptblocks, closures, member mutation, pipeline enumeration and error preferences. Record dependencies that static analysis cannot resolve. Do not convert exit into return or move try/finally without proving equivalent caller behavior.

Example: a region reads $MountPath, calls a helper, appends to $Results and reads $LASTEXITCODE. Extract the helper dependency, expose MountPath, return a structured result, and capture the native exit code immediately after invocation. Preserve stream behavior and caller aggregation. Until tested, keep it draft. An unresolved dynamically selected helper prevents verified standalone status.

PowerShell 5.1 and 7 are separate validation targets. Native command quoting and encoding require target testing. A module import must not invoke servicing or modify registry/files as an import side effect. Declare exports explicitly. Do not execute untrusted code during inventory or tests. Unit tests mock all mutating adapters; an integration test must name its disposable target and authorization.
