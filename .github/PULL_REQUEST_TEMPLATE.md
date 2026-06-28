<!-- Thanks for contributing! Keep PRs to one logical change. -->

## What

<!-- What does this PR do, and why? Link any related issue. -->

## How

<!-- Key implementation notes — anything a reviewer should know. -->

## Checklist

- [ ] One logical change; branched off `main`.
- [ ] `bun run ci` passes locally (typecheck + lint + test).
- [ ] Follows the layering rules in `CLAUDE.md` (components render strings; logic in hooks; semantic tokens, not raw colors).
- [ ] `src/api/types.gen.ts` / `src/routeTree.gen.ts` were regenerated, not hand-edited, if touched.
- [ ] No secrets, credentials, or private-infra references added.
- [ ] Screenshots included for visible UI changes.
