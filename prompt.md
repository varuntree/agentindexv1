# Agent Loop Prompt

> **This file is read at the start of every agent iteration.**

---

## Your Mission

You are implementing ARI (Australian Real Estate Agents Index). You will complete one step at a time from the implementation plan, then commit and stop.

---

## Execution Flow

### Phase 1: Read Core Documentation

**Do this every iteration:**

1. Read `agents.md` - Development standards (MUST follow)
2. Read `implementation-plan.md` - Find next incomplete step (status `[ ]`)

### Phase 2: Identify Next Step

1. Find the first step with status `[ ]`
2. Read that step's full description
3. Note all verification criteria - ALL must pass

### Phase 3: Research & Understand

**Before writing any code:**

1. **Read relevant documentation:**
   - If step involves database → read SPEC_V1.md database schemas section
   - If step involves Claude Agent SDK → WebSearch for latest Anthropic Agent SDK docs
   - If step involves Next.js → WebSearch for Next.js 14 App Router docs if needed
   - If step involves any external library → search for its documentation

2. **Explore the codebase thoroughly:**
   - Read ALL files relevant to this step
   - Understand how previous steps were implemented
   - Identify patterns already established
   - Understand the data flow

3. **Identify dependencies:**
   - What does this step depend on?
   - Is everything it needs already built?
   - If not, implement the dependency FIRST, mark it as completed step

### Phase 4: Plan with Todos

**Before implementing:**

1. Use the todo system to create tasks for this step
2. Break down the step into logical subtasks
3. Include verification tasks
4. Mark tasks as you complete them

### Phase 5: Implement

**Rules during implementation:**

1. **Follow agents.md standards strictly** - No exceptions
2. **Implement completely** - No partial work, every feature fully functional
3. **Test as you go** - Don't wait until the end
4. **If you discover a blocker:**
   - Implement the fix immediately
   - Add it as a COMPLETED step in implementation-plan.md (before current step)
   - Continue with original step
5. **If you find a useful pattern:**
   - Add it to agents.md under the appropriate section
   - This helps future iterations

### Phase 6: Verify

**Run ALL verifications for the step:**

1. Execute every verification command listed
2. Check every pass criterion
3. For Playwright MCP tests: Use browser automation to verify UI
4. **ALL criteria must pass** - If any fail, fix and re-verify
5. **Do not stop until all pass** - Iterate as many times as needed

### Phase 7: Complete

**Only after ALL verifications pass:**

1. Update `implementation-plan.md`:
   - Change step status from `[ ]` to `[x]`
   - Add any notes about implementation decisions

2. Commit all changes:
   ```bash
   git add -A
   git commit -m "Complete Step X: [Step Title]"
   ```

3. **STOP** - Do not continue to next step

---

## Critical Rules

### Never Stop On Failure

- If verification fails → fix it and re-verify
- If you hit a blocker → implement the fix
- If you find a bug → fix it immediately
- Keep iterating until the step is complete

### Never Leave Partial Work

- Every file you create must be complete
- Every function must work
- Every UI element must be functional
- Every test must pass

### Always Update Documentation

If you discover something that would help future iterations:

1. **Patterns** → Add to agents.md
2. **Gotchas** → Add to agents.md under "Never Do"
3. **Blockers you fixed** → Add as completed step in implementation-plan.md

### Thorough Research First

- Read before you write
- Understand before you implement
- Search documentation for unfamiliar APIs
- Explore existing code for patterns

---

## External Documentation Searches

When implementing, search for these docs as needed:

| Topic | Search Query |
|-------|--------------|
| Claude Agent SDK | `Anthropic Claude Agent SDK documentation 2024` |
| Next.js App Router | `Next.js 14 App Router documentation` |
| Next.js Static Generation | `Next.js generateStaticParams static generation` |
| better-sqlite3 | `better-sqlite3 npm documentation` |
| Express.js | `Express.js API reference` |
| Tailwind CSS | `Tailwind CSS documentation` |
| JSON-LD Schema | `Schema.org RealEstateAgent JSON-LD` |

---

## Verification Using Playwright MCP

For UI verifications marked "Playwright MCP":

1. Start the relevant dev server in background
2. Use browser automation tools to:
   - Navigate to pages
   - Find elements
   - Verify content
   - Take screenshots
   - Click interactions
3. Stop the server after verification

Example pattern:
```
1. Start server: npm run dev:control &
2. Navigate to URL
3. Verify elements exist
4. Take screenshot
5. Kill server
```

---

## Summary Checklist

Every iteration:

- [ ] Read agents.md
- [ ] Read implementation-plan.md, find next step
- [ ] Read all relevant files and documentation
- [ ] Search web for external docs if needed
- [ ] Explore codebase thoroughly
- [ ] Create todos for the step
- [ ] Implement completely
- [ ] Run ALL verifications
- [ ] Fix any failures (do not stop)
- [ ] Update agents.md if patterns discovered
- [ ] Mark step complete in implementation-plan.md
- [ ] Commit all changes
- [ ] STOP

---

## Starting Point

Begin now:

1. Read `agents.md`
2. Read `implementation-plan.md`
3. Find the next incomplete step
4. Execute the flow above
