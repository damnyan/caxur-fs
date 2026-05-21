---
name: verify-commit
description: "Run verification checks (build, lint, test) and commit/push code if successful."
---

# Verify and Commit Workflow

This workflow enforces code quality standards and automates the git commit and push process safely.

## Steps

1. **Run Verification**:
   - Run the workspace verification script located at `scripts/verify-all.sh`.
   - Wait for the verification process to complete.
   - **Display the script output as well, and explicitly show if there are any warnings or errors.**

2. **Handle Verification Failures**:
   - If the verification fails, **DO NOT commit or push**.
   - Read the output and error logs, suggest fixes, and request permission to apply them.
   - Once fixed, re-run `scripts/verify-all.sh` until it passes completely.

3. **Generate Conventional Commit**:
   - Only after a successful verification, analyze your changes using `git diff --cached` or `git status`.
   - Display the list of modified/staged files (e.g. via `git status` or `git diff --cached --stat`) to the user first.
   - Generate a high-quality, concise commit message following **Conventional Commits** (e.g. `feat: ...`, `fix: ...`, `chore: ...`).
   - The subject line must be imperative and max 50 characters.

4. **Execute Git Operations**:
   - Present the staged changes/git status output first, followed by the proposed commit message.
   - Present the user with an interactive multiple-choice question to select the next action:
     1. Commit and push
     2. Commit only
     3. Regenerate commit message
   - Execute the selected action accordingly:
     - **Commit and push**: Run `git commit -m "[AI_GENERATED_MESSAGE]"` and `git push`.
     - **Commit only**: Run `git commit -m "[AI_GENERATED_MESSAGE]"`.
     - **Regenerate commit message**: Re-analyze the diff and propose a new commit message.


