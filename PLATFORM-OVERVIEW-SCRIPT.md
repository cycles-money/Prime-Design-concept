# Platform overview — script for Axel

Read or paraphrase. Stage directions in brackets, spoken words in plain prose.
**Target: ~5 min, brisk.**

---

*[Share screen. Land on Batches dashboard. Make sure filter says "All time".]*

> **Quick orientation before we hand it over to you.** You're looking at the UI for the **pilot version of Cycles Prime** — so the assumption here is CSV upload for now; the production version will be API-driven and the flow around uploads will change. The rest of the UI carries over.

*[Point to top nav.]*

> **Up top you've got two tabs — Batches and Cycles.** Settings and Help are in the corner; we won't cover those today. Everything you need is in those two tabs.

---

*[Stay on Batches landing.]*

> **This is the Batches view.** It's where everything you're working on lives — anything you've drafted, anything you've sent, anything someone's sent to you.

*[Gesture to the four status cards.]*

> **At the top you've got four status cards.** They're also filters — click one and the list below narrows down. Below that you've got date, status, and counterparty filters in case you want to slice further.

*[Gesture to the table.]*

> **And here's the list itself.** A row per batch, with the counterparty, the status, the number of obligations in it, what's being delivered and received in dollars, and the net position. By default we're showing all of them.

*[Click any row to enter the detail page — pick a Pending approval one if possible so the action row shows up.]*

---

*[Now on batch detail.]*

> **Click any batch and you land here.** Three things going on:

*[Point to phase stepper.]*

> **The stepper at the top tells you where the batch is in its life cycle** — draft, then awaiting approval, then approved, then cleared. The current step is highlighted.

*[Point to the action row top-right.]*

> **The buttons on the right adapt to the status.** If the batch is yours and still a draft, you can send it. If it's pending your approval, you can approve, reject, or propose changes. If you've already sent it and you're waiting on the counterparty, you can revoke it. Same idea for every state — only the actions you can actually take show up.

*[Gesture to the obligations table below.]*

> **And below is the actual content of the batch — the obligations.** Both directions in one list with a Direction column so you can see what you're delivering and what you're receiving side by side. You can filter by asset if there are a lot.

*[Scroll briefly if helpful, then move on.]*

> **That's the batch view. Let's look at Cycles.**

---

*[Click Cycles tab.]*

> **This is Cycles.** A cycle is when the protocol actually runs — collects all the eligible batches, nets them out, and clears whatever can be cleared.

*[Point to the Upcoming cycle card top-left.]*

> **Top-left is your next scheduled cycle** with a live countdown. The right side shows everything that'll be part of it.

*[Point to the Simulate button.]*

> **For the purpose of today, this Simulate button lets us fast-forward the cycle** so you don't have to wait for the countdown to actually run.

*[Click Simulate so a cycle appears in History.]*

> **And that's what just happened.** The upcoming one ran, and now it's at the top of the History below.

---

*[Click the just-created history entry — should auto-select. Walk through what's on the page.]*

> **This is what a completed cycle looks like.** You've got:

*[Gesture to KPI tiles.]*

> **Up top, the deliver and receive totals** — what you put in, what got cleared, what's remaining.

*[Gesture to bar chart.]*

> **In the middle, a chart you can flip between counterparty and asset view** to see where the clearing concentrated.

*[Scroll down to the cleared obligations table.]*

> **And down here, the Cleared Obligations** — the actual batches that went through this cycle, with their cleared percentages. You can browse by batch or by asset.

*[Scroll back up to the history list on the left.]*

> **And on the left you've got the History list** — every past cycle, clickable. Same view structure for each.

---

*[Hand-off line.]*

> **That's the tour. Now I'd like to hand it over to you.** Browse around — click into whatever catches your eye. The most useful thing you can do is **think out loud while you're doing it**: tell us what you're looking at, what you'd expect to happen, what doesn't make sense, what you'd reach for that isn't there. There's no script and no wrong answers. We'll jump in with questions if it feels like the right moment.

*[Stop sharing — let them take over.]*

---

## Cheat sheet — what to skip if running long

If you're 4 minutes in and not yet on Cycles, cut:

- The filter row explanation on Batches (just say "you can filter by date, status, counterparty").
- The phase stepper detail on batch detail (just say "the stepper shows where it's at").
- The bar chart toggle on cycles (don't open it; mention "there's also an asset breakdown").

## Things to **not** say (we want users' words, not ours)

- Don't define **"Pending approval"** or **"Awaiting counterparty"** — let them tell us what they think it means.
- Don't say **"cleared % slider"** or any demo-affordance language — Simulate is just "fast-forward the cycle."
- Don't say **"netting"** unless they say it first.
- Don't apologize for anything missing — they'll tell us what they miss.
