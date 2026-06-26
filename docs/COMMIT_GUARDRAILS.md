# Commit guardrails

Career OS keeps commits safe by running the same verification stack before local commits.

## Enable the hook

```sh
git config core.hooksPath .githooks
```

## Run the guard manually

```sh
npm run commit:guard
```

## Guard checks

The guard runs:

1. `npm run typecheck`
2. `npm test`
3. `npm run lint`

Fix any failure before committing.
