# CLI Pipelines

Use the existing tools, dependencies and connections first. Dependency changes must fit the requested project change. Confirm the account, target, approved data and expected charges before provisioning, deploying or sharing data externally. Set `VERCEL_CLI_VERSION` to the reviewed exact CLI version in the project’s CI configuration before adopting a global-install example.

These are CI examples for an authorized project and environment. Use the project’s reviewed, pinned Vercel CLI version in the pipeline. Deployments, environment changes and production promotions require authorization for the exact environment.

These pipelines build and deploy with the Vercel CLI. Each needs the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` variables described in the skill's Required Environment Variables section.

## Preview Deployments on PRs

The Git integration posts preview URLs on pull requests automatically. A CLI pipeline posts them itself:

```yaml
# GitHub Actions
on:
  pull_request:
    types: [opened, synchronize]

env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g "vercel@${VERCEL_CLI_VERSION:?set the reviewed version}"
      - run: vercel pull --yes --environment=preview
      - run: vercel build
      - id: deploy
        run: echo "url=$(vercel deploy --prebuilt)" >> $GITHUB_OUTPUT
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview: ${{ steps.deploy.outputs.url }}`
            })
```

## GitLab CI

```yaml
deploy:
  image: node:20
  stage: deploy
  script:
    - npm install -g "vercel@${VERCEL_CLI_VERSION:?set the reviewed version}"
    - vercel pull --yes --environment=production
    - vercel build --prod
    - vercel deploy --prebuilt --prod
  only:
    - main
```

## Bitbucket Pipelines

```yaml
pipelines:
  branches:
    main:
      - step:
          name: Deploy to Vercel
          image: node:20
          script:
            - npm install -g "vercel@${VERCEL_CLI_VERSION:?set the reviewed version}"
            - vercel pull --yes --environment=production
            - vercel build --prod
            - vercel deploy --prebuilt --prod
```
