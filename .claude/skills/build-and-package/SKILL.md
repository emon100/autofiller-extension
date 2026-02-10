---
name: build-and-package
description: Build the Chrome extension in production mode, package it as a zip, and optionally push to git.
disable-model-invocation: true
argument-hint: [push]
allowed-tools: Bash(npm run build:prod:*), Bash(npm test:*), Bash(zip:*), Bash(git:*), Bash(ls:*), Bash(wc:*), Bash(rm:*)
---

# Build & Package Extension

Production build, test, zip packaging, and optional git push for the 1Fillr Chrome extension.

## Steps

1. **Run tests** to make sure everything passes:
   ```
   npm test
   ```
   If tests fail, stop and report errors.

2. **Production build**:
   ```
   npm run build:prod
   ```
   If build fails, stop and report errors.

3. **Package dist/ into zip** (excluding source maps):
   ```
   cd dist && zip -r ../1fillr-extension.zip . -x "*.map"
   ```

4. **Report** the zip file size and contents summary.

5. **If `$ARGUMENTS` contains "push"**, also:
   - Run `git status` to check for uncommitted changes
   - If there are uncommitted changes, stage relevant files (NOT `offerlink-data/`, `omnifill.pdf`, `research/`, `.env*`), commit with a descriptive message, and push
   - If no changes, just push the current branch

## Notes

- The zip file is saved at the project root as `1fillr-extension.zip`
- Source maps (`*.map` files) are excluded from the zip to reduce size
- Never include `node_modules/`, `.env`, or other sensitive files in the zip
- The zip can be loaded directly in Chrome via `chrome://extensions` > "Load unpacked" (after unzipping)
