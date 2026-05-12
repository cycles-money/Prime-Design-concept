# User interview — Cycles Prime pilot UI

**Format:** ~30 min · pure overview + open browsing · **no exercises**

**Roles:**
- **Justin** — intro + framing
- **Axel** — platform overview, drive the browsing session, lead the questions
- **Benji** — observer, jumps in for anything specific

The deployed link + the `clean.csv` / `with-errors.csv` fixtures are pre-shared in the chat. The build opens with **All time** filter active so batches are visible immediately and dark mode only (light mode removed).

---

## 1 · Intro & framing — Justin (~3 min)

Things to cover (in Justin's words):

- Quick thank-you, intro the team.
- **No wrong answers.** Think out loud. We're testing the product, not the user.
- This is the UI for the **pilot implementation** — flows assume CSV upload, not API. The API integration changes the shape of the upload flow but the rest of the UI carries over.
- The goal today: see whether the new UI is readable on first contact. We're not asking them to follow a script.

---

## 2 · Platform overview — Axel (~5 min)

Keep it brisk. Don't explain every state — just enough that they know what's where. The build is pre-filled so this is mostly a tour.

- **Top nav:** Batches · Cycles (Settings + Help exist; not covered).
- **Batches landing**
  - Four status cards at the top, **clickable as filters** (Draft · Pending approval · Awaiting counterparty · Approved).
  - Filter row: date · status · counterparty. Default is "All time" so the dashboard shows everything.
  - Click any row → batch detail page.
- **Batch detail**
  - Phase stepper shows where in the lifecycle the batch is.
  - Combined obligations table — one list with a Direction column.
  - The action row on the right adapts to status (Approve / Reject / Propose changes / Send / Revoke).
- **Cycles**
  - Upcoming cycle pill at the top with countdown.
  - **Simulate next cycle** button (demo affordance — we'll use it during browsing).
  - History list below. Click any to see the cleared view: KPIs · bar chart · per-batch breakdown.

Hand off: *"That's the tour — you're going to drive now. Browse around, click into anything that catches your eye. Talk out loud while you do it: what you're looking at, what you'd expect, what's confusing."*

---

## 3 · Open browsing — Axel (~15 min)

**No tasks.** Let them go. Watch silently for as long as possible.

The three views we want to learn about:

1. **Batches list** — do they understand the statuses + filters?
2. **Batch detail** — does the combined obligations table + action row make sense?
3. **Completed cycle** — do they understand cleared vs remaining at a glance?

If they're quiet for 30+ seconds or jump screens without commenting, gently prompt:
- *"What do you think this page is for?"*
- *"What stands out first?"*
- *"What were you about to do?"*

If they skip past one of the three target views, ask: *"Could you go back to X for a sec and tell me what you make of it?"*

---

## 4 · Targeted questions — Axel (~7 min)

Ask these only if browsing didn't already surface answers.

1. **Combined obligations table.** *"What do you think of having deliver and receive in one list with a Direction column, versus two separate tables?"*

2. **Status vocabulary.** *"How would you describe 'Pending approval' vs 'Awaiting counterparty' to a teammate?"* — and: *"Do these labels match what you use internally? Anything you'd rename?"*

3. **Friction.** *"Anything that felt like more clicks than it should have?"*

4. **Missing.** *"What's missing? What would you reach for on a real Prime day?"*

5. **Cycle readability.** *"On the completed cycle screen, can you tell at a glance what was cleared vs what's remaining? Does the bar chart help or get in the way?"*

6. **Post-cycle data.** *"After a cycle runs, what's the one piece of information you need most? How would you get it out of here into your internal records today?"*

7. **Workflow fit.** *"Do you have the right information in front of you to feel like you can move forward?"* — stick to workflow, **not** data/security questions per Benji's guidance.

---

## 5 · Wrap — Justin (~2 min)

- Thank them.
- Mention this is one of two pilot conversations today; we'll share back what we learned.
- Confirm next touchpoint.

---

## Notes for the room

- **Per-call adjustments:**
  - The **first user** has never heard of Cycles. Justin will frame more deeply.
  - The **second user** (Mat) is an advisor — minimal framing, jump faster.
- **Don't ask about:** data handling, security, anything legal/compliance — touchy with these users.
- **Watch for:**
  - Whether they confuse `Awaiting counterparty` and `Pending approval` (Benji flagged this internally; we're leaving the labels to see).
  - Whether they look for a way to settle the post-cycle remainder and can't find it.
  - Whether the cycle bar chart's clear/remaining split reads correctly.
- **Capture in notes:**
  - First reaction quotes (verbatim where possible).
  - Anywhere they hesitated or backtracked.
  - Vocab they used naturally vs vocab we used.

---

## Build state heading into the test

- Light/dark toggle **removed** — dark only.
- Batches dashboard defaults to **"All time"** so the table is populated.
- Cycle detail page: **no embedded cleared-% slider** (Benji's call).
- Status labels: `Draft · Pending approval · Awaiting counterparty · Approved · Cleared`.
- Counterparties tab removed from nav (central registry assumption).
- Import flow: drag CSV into the **Add batch** modal → single review screen.
- Test fixtures available at `/test-csvs/clean.csv` and `/test-csvs/with-errors.csv` (we won't ask them to drive this today).
