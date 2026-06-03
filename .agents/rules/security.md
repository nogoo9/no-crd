---
trigger: always_on
description: Security scan and bypass regulations.
---

## Security Scan and Bypass Rules

1. Any security warning or vulnerability flagged by CodeQL, Semgrep, or other scanners must be resolved with a code fix.
2. Security bypasses (such as adding `// nosemgrep` or `// nosemgrep: ...` comments, or dismissing CodeQL alerts) are strictly prohibited without explicit human review and approval.
3. Every proposed bypass must be explicitly documented with a detailed justification explaining why it is a false positive and how it was verified to be safe.
