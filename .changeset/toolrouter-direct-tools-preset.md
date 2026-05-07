---
'@composio/core': patch
---

Expose and document the Tool Router direct-tools preset via `SessionPreset.DIRECT_TOOLS`, with Python parity through `SESSION_PRESET_DIRECT_TOOLS`. Direct-tools examples now use the constants and keep the agent prompt generic while still asserting that only direct tools are exposed.
