---
name: Verify and Commit Workflow
description: A workflow to automatically run project verification scripts before committing and pushing code to the repository.
---

# Verify and Commit Workflow

This skill acts as a standard workflow to enforce code quality and prevent broken builds before committing to the repository.

## 1. Trigger Condition
Execute this workflow whenever the user asks to "commit code", "push task", "run verification", or "run the pre-commit workflow".

## 2. Workflow Steps

1. **Run Verification Script**:
   - Execute the workspace verification script located at `scripts/verify-all.sh`.
   - Wait for the script to finish.
   
2. **Handle Errors**:
   - If the script fails (returns a non-zero exit code), **DO NOT commit**.
   - Read the error output and proactively suggest fixes to the user. Ask the user for permission to apply the fixes.
   - Once fixed, re-run `scripts/verify-all.sh` until it passes.

3. **Commit and Push**:
   - Only after a successful verification, analyze the current chat history, task context, and the output of `git diff --cached` or `git status`.
   - Automatically generate a high-quality, concise commit message following **Conventional Commits** best practices (e.g., `feat: ...`, `fix: ...`, `chore: ...`).
   - The commit message should have a short imperative subject line (max 50 characters) and, if necessary, an explanatory body wrapping at 72 characters.
   - Show the generated commit message to the user for final approval before committing.
   - Run `git add .` (or add specific files if instructed).
   - Run `git commit -m "[AI_GENERATED_MESSAGE]"`.
   - Run `git push`.

4. **Report**:
   - Inform the user that the workflow completed successfully and the code is pushed.
