# Buddyz — v3.3.1 Hotfix + Polish

## 1. FIXED: blank screen after User B submits (the main bug)

**Cause:** when a friend opens a shared link, `quiz.js` hides
`#creator-dashboard-section` (so they don't see your homepage pitch or
quiz history). But `#result-board-container` — the element that
displays the friend's OWN score + leaderboard after they submit — was
sitting *inside* that same wrapper. So the moment they submitted, the
code tried to show their result inside a parent that was set to
`display:none`. Nothing rendered. Blank screen.

**Fix:** moved `#result-board-container` out of
`#creator-dashboard-section`, into its own spot that's always visible.
Only the "Your Quizzes" history label and the FAQ section stay inside
the creator-only wrapper now. Verified: friend submits → leaderboard +
score now render correctly, while the homepage pitch and your quiz
history dashboard still correctly stay hidden for friends.

This follows the same logic from your earlier instructions — friends
should never see your dashboard/FAQ, but they absolutely need to see
their own result.

## 2. Selected answer now fills with color

Tapping an option no longer just gets a white glow — it fills
completely with that question's own gradient color (whichever of the 6
you picked), with white text and a white checkmark circle. Matches each
question's color exactly, since the rule targets `.qcolor-X
.quiz-option.selected` for all 6 variants.

## 3. Question card is no longer inside a white box

`#quiz-container` was sharing a CSS rule with the white "card" boxes
(name entry, share screen, etc.), so the colored question card was
rendering padded inside another white container — a box inside a box.

Fixed: `#quiz-container` is now just a transparent, full-width layout
wrapper. The colored `.question-card` is the only visible "box" now —
it sits on its own, edge to edge, the way you described.

## 4. Homepage — two boxes merged into one

The pitch card (headline, stats, steps) and the name-entry card
(explainer text + input) are now a single unified card. A thin divider
separates the marketing content from the input section within the same
box — no second white card stacked underneath anymore.

**Fonts, as requested:**
- All the explainer text uses the same font system as before (Plus
  Jakarta Sans body / Baloo 2 headings) — already "cool" fonts from the
  last update, now visually unified since it's one card.
- The name input and its placeholder now specifically use **Baloo 2**
  (the same bold, rounded font as the big headline above it) instead of
  the plain body font — so typing your name feels like a natural
  continuation of "Who Truly Knows You?" rather than a separate form
  bolted onto the bottom. Applied to both the creator's and the
  friend's name input for consistency.

---

## File checklist

| File | What changed |
|---|---|
| `index.html` | Moved `#result-board-container` out of the creator-only wrapper (the bug fix); merged hero card + name-container into one box |
| `styles.css` | Per-color `.selected` fills for all 6 question colors; `#quiz-container` no longer a white card; new `.hero-divider`/`.hero-fineprint` styles; Baloo 2 applied to name inputs + placeholders |

`quiz.js` and `home.js` were not touched — the blank-screen bug was a
pure HTML/CSS structural issue, not a JavaScript bug.
