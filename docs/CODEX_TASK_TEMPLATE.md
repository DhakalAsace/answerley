# Codex task template

Use this for every future feature so implementation stays visual and aligned.

```text
USER-VISIBLE GOAL
Describe what the customer can do after this task.

STARTING POINT
Exact route and visible state where the journey begins.

CLICK PATH
1. ...
2. ...
3. ...

EXPECTED STATES
- loading
- empty
- normal
- error
- completed
- desktop
- mobile

CANONICAL CONTRACT IMPACT
- Answering Plan paths affected
- readiness rules affected
- metadata affected
- manual editor affected
- Plan Assistant affected
- Live runtime/tools affected

OPERATIONAL IMPACT
- calls/events/requests/messages/numbers/usage/subscription records affected

DO NOT CHANGE
List accepted screens, navigation, or behavior that should remain untouched.

DONE MEANS
- perform the full path in the browser
- use real behavior or an explicitly approved simulation
- verify persistence after refresh where expected
- run lint, typecheck, tests, and production build
- capture desktop and mobile screenshots
- update Contract Health and docs when contracts changed
- provide exact founder-review route and click path
```
