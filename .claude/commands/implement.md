Implement the Notion board task named: $ARGUMENTS

Follow these steps in order:

## Step 1 — Find the task

Search the Notion Board database for a task whose "Project name" matches "$ARGUMENTS". Use the `mcp__notion__notion-search` tool with:
- query: "$ARGUMENTS"
- data_source_url: "collection://3782e63c-fec1-8014-aa10-000b91f93504"

If no result is found, try a broader workspace search. If still not found, tell the user and stop.

## Step 2 — Fetch the full task page

Use `mcp__notion__notion-fetch` with the task's page ID to get:
- The "About project" section — this is the implementation description
- The "Action items" checklist — these are the acceptance criteria

Read them carefully. They define exactly what needs to be built.

## Step 3 — Move task to In Progress

Before writing any code, use `mcp__notion__notion-update-page` with:
- command: "update_properties"
- properties: `{ "Status": "In progress" }`

This prevents anyone else from picking up the task.

## Step 4 — Implement

Using the "About project" description and "Action items" as your spec, implement the required changes in the codebase. Follow all conventions in CLAUDE.md:
- Client components with `'use client'`
- Dark theme (#030712 bg, #f97316 accent)
- Inline styles (not Tailwind) for non-auth pages
- ISO date strings via `toDateStr()`
- No new files unless required; prefer editing existing ones
- No comments unless the WHY is non-obvious

Work through each action item one at a time.

## Step 5 — Check off acceptance criteria

As each action item is completed, update the page content to mark it checked. Use `mcp__notion__notion-update-page` with:
- command: "update_content"
- content_updates: replace `- [ ] <item text>` with `- [x] <item text>`

Do this for each item as you finish it, not all at once at the end.

## Step 6 — Move task to Done

Once all action items are checked and the implementation is complete, use `mcp__notion__notion-update-page` with:
- command: "update_properties"  
- properties: `{ "Status": "Done" }`

Then give the user a brief summary of what was implemented.
