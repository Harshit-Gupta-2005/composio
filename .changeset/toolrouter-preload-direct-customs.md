---
'@composio/core': patch
---

Document and tighten Tool Router preload behavior for app tools, `preload.tools = "all"`, and SDK custom tools. Custom tool and toolkit preload hints now have clearer user-facing comments, direct custom tool descriptions now only state that search is not needed beforehand, examples assert the normalized `LOCAL_*` tool slugs exposed by `session.tools()`, and `composio.use(..., customTools/customToolkits)` reuses the same custom preload preparation path as session creation.
