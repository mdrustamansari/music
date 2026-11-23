# Rustam's apps: design language and philosophy
One living file for every app (Budget Manager, Goal Manager, and any future one).
Rule: when something new is decided, add it here in the same release. Never delete a rule; mark it "replaced by" instead.
Last updated: 18 Oct 2026 (Goal v5.25, Budget v2.23)

## 1. Philosophy
1. **Frosted glass is the heart of the design.** It is never switched off or weakened on any theme. We save energy by smarter means instead.
2. **Calm precision and airy clarity.** Thin large type, normal-weight small type, never bold. Slow, silky motion with no bounce.
3. **Think about logic and human psychology first, design second.** The app should feel helpful and non-judgemental.
4. **Learn from use, on the device only.** Habits, usual amounts, pace, and which sections he opens. Everything learned can be switched off.
5. **Show less by default.** The most useful things stay on top. Rarely used things fold under a quiet "More".
6. **Honest with little data.** Say how many days or records a number rests on. Do not draw conclusions from too few.
7. **Never change the user's records to fix a display.** Fix the calculation or the wording.
8. **Every enhancement is switchable in Settings.**

## 2. Look
- Flagship is the default theme (Sapphire accent; Champagne Gold as the second accent). Light and dark themes are fixed and never auto-converted. "Follow my phone" switches between Flagship Light and Dark.
- Shape: soft superellipse, generously rounded corners on cards, buttons and sheets.
- Type: sans only, with a choice of families.
- Dark themes are muted, flat and modern. Other light themes are light and muted with only a slight gradient.
- Old-paper tooltip colour is kept for the top banner.

## 3. Visibility checklist (run on every interface change)
1. Every button has a visible edge or fill on every theme, light and dark (hairline outline on light themes).
2. Text on a coloured button is checked (a later CSS rule must not turn it white-on-white).
3. Look at the screen on Flagship light, Flagship dark, Paper, a nature theme and Aurora.
4. Icons have a tooltip (`title`) and a spoken label (`aria-label`).
5. Destructive actions ask first, then still offer Undo.
6. Run the visibility audit on all 10 themes and every tab, plus the open entry sheet. It flags any button whose fill and edge both match its background, and any button text below 3:1 contrast. Result must be 0 flags. Run it with real backup data, not made-up data (Goal: log sheet, page picker and log history too). Last run 17 Oct 2026: 0 flags in both apps.
9. Small text buttons ("Log history", "Last finished: N · change", "New daily task") and info chips keep a hairline edge. Chip text is darkened on light themes so it passes 3:1 contrast.
7. Include buttons the Companion draws (its question box) and folded-section buttons.
8. Do not show a dropdown with only one choice. If one option remains, remove the list.

## 4. Components
- **Banner** (`banner.js`): one line at the top of Today. Info icon for "last finished"; bulb icon for a tip or proverb. Text slides up inside the banner, about 0.7 s. Tips are in normal upright type, never italic. Never switches while typing or with a sheet open. Reduced motion: it only fades.
- **Icon-only Edit and Delete:** Lucide `square-pen` (neutral) and `trash-2` (red), 34 px, same spacing everywhere.
- **Smart sections** (`sections.js`): a section tagged `data-sec` folds under "More" if untouched for 3 weeks, after 2 weeks of learning. Decided once when the app opens. Settings is never touched. Today, Plan, Life, Outlook, Month, Mindful and Insights use it.
- **Companion** (`companion.js`): always translucent, blobby, soft, supple and cute. Gentle bloom only (no photographic flare). Rests and wakes smoothly (its own clock slows and speeds up). Speaks rarely.
- **First-launch wizard** (`wizard.js`): short, five questions only (name, look, Companion, privacy and comfort, backup time). Appears only on a fresh install; existing data never sees it. "Run setup again" in Settings fills in current answers and changes no records. Skip is always possible.
- **Tour:** an optional six-card tour after the wizard, replayable from Settings.
- **Ask later:** everything else is asked one small question at a time on Today ("Quick question" card): at most one card, every answer wired to a real setting, "Later" snoozes 3 days. Never ask what the app can learn by itself. Current questions: PIN (day 2), day-close reminder (day 4) and 24-hour wait (day 5) in Budget, cost of delay (day 8) in Goal.
- **Sheets and confirmations:** `confirmSheet` with a red primary button for dangerous actions.

## 5. Energy and speed rules
1. Draw only when something changes. Static parts stay static.
2. The Companion draws about 12 pictures a second when awake, 0 when resting. A governor draws less if the phone is working hard or the battery is low.
3. Every picture that reaches the screen makes the phone re-blur the glass under it. So fewer pictures, not less glass.
4. Do not write the same value to the screen twice (`put()` dedupes).
5. Measure before and after.

## 6. Writing
- British English. Simple, concrete, ESL-friendly (B2 ceiling). Short sentences.
- Time in natural words: "today at 2:20 pm", "yesterday at 9:05 am", "on Monday at 6:40 pm".
- Not judgemental about money or work.

## 7. Behaviour
- The app always asks for "last page I finished" (real page numbers).
- Budget is a monthly pool only (no per-day allowance).
- Sounds are short (under 3 s). A separate switch silences the glass tap sound. Vibration pulses are gentle.
- Backups are encrypted. Data stays on the device.

## 8. Working agreement (with Claude)
- "Discuss" or "what do you think" means text only. Build only after "go".
- Summarise and ask before big builds. Ask clarifying questions one at a time.
- Ask before starting Release 2 (first-launch wizard and Companion tips and tricks).
- Save durable decisions to memory and to this file.

## 9. Tracker
The progress on the ten humane-design aspects lives in HUMANE-TRACKER.md. Read it before interface work and update it with each release.

## 10. Word list (same word, same meaning, in every app)
- Entry: one thing you recorded (a spend in Budget, a log in Goal). Never "transaction" or "record".
- Add: put something new in. Log: write progress in Goal only.
- Edit: change an entry. Delete: remove it (it waits 30 days in Recently deleted). Undo: take back the last action.
- Task: one thing you plan and log work on in Goal (reading, writing, editing, proofreading). Never "piece".
- Speed: how much you do in one hour ("5 pages an hour"). Daily pace is a different thing: the amount you plan each day.
- Pool: the month's money in Budget. Never "wallet" or "fund".
- Companion: the soft character. Banner: the strip at the top.
- Button order in a sheet: Cancel on the left, the main action on the right.
- Tone: calm, short, kind, no blame. Say what happened, then what can be done.
- Companion unasked talk: within the daily limit, and never twice within 10 minutes.

## 11. Glass styles
- Frosted (default): the original frosted glass. Never changed.
- Liquid (opt-in, Settings, Glass style): clear glass learned from the macOS-style window screenshot. Parts: light rim on the top-left that fades, dark rim along the bottom, a faint inner glow, a soft tinted shadow, large smooth corners, flat translucent pills for the selected item.
- Liquid has no refraction (bending). It was tried and dropped: the browser feature is not reliable on phones.
- Liquid settings: Frost (default 7 px), Tint (22%, Paper pages get +16%), Light rim brightness (100%) and blur (1 px) for the white edge just inside the hairline, Dark rim darkness (60%) and blur (3 px) for the dark edge just outside it, Shadow (60%), Top shine (60%, a soft white glow just inside the top edge), Diagonal highlight (off). An adaptive hairline (dark on light themes, light on dark themes, stronger when the glass is clearer) runs round every glass object. Buttons use a denser fill instead of blur, to keep the phone cool.
- Never set position on .nav-bar in Liquid: it is fixed, and must stay the same size in both styles. Sheets always keep a strong tint and at least 14 px frost.
- Rule: every interface change is audited with Liquid on as well as Frosted, on all 10 themes (buttons and text contrast).
- Messages after an action (toast with Undo, Companion bubble, question card) use the chosen glass style.
- Gestures: swipe a row left (delete, asks first) or right (edit); press and hold a row to edit; swipe anywhere else to change tab (not from the 24 px screen edges, not on sliders, inputs or sideways-scrolling strips).

## 12 Rise and fall marker
- One marker everywhere: a small triangle, ▲ for a rise and ▼ for a fall, always followed by the amount ("▲ ₹3", "▼ ₹180"). The app already uses it ("▼ ₹40 below your average"). Never mix in arrows (↑ ↓).
- Colour for spending: ▲ red, ▼ green. For saving or goals the colours are swapped. The triangle carries the meaning, so colour is never the only signal.
- Neutral or "no change": a flat dash "–".

## 13 Budget report (v2.34)
- Lives at the top of Insights: Week/Month switch, This/Last switch, total with a day ring, donut, paired bars, day strip (calendar for months), habits, one small note.
- Running periods use the same days of the last period; closed periods use full against full. A brand-new period with no entries shows the last one in full.
- Habits: category + note words + price per person + rhythm. "sure" = 3 or more clues, "likely" = 2, never fewer than 3 entries. A number plus N in a note ("2N") means persons; price is judged per person.
- Calendar cells show spend as a dot, never a coloured fill, so the day number keeps full contrast.
- All class names start with rp-; rise and fall always use the .rf triangle marker.

## 14 Speed (Goal v5.36)
- One hour of work is the common unit across tasks, so pages, words and subsections can be added up as hours. The conversion is the person's own speed, never a guess.
- Clues: timed sittings, usual (untimed) sittings, the person's own setting. Words on screen: **confident** and **still learning**.
- Confident: the app adopts the speed quietly, keeps a history line ("Adapted about N days ago: a to b") with Undo. Still learning: nothing changes; show what was noticed and ask (Keep or Use). Undo pins the old speed until "Let the app adapt it".
- Deadlines are never moved by the app. Only speed, estimates and suggested amounts adapt.
- Speed changes use a neutral triangle (colour is not good or bad), because faster is not always better.
- Tab swipe does not slide the screen (see section 15). Never animate a whole screen of frosted glass: opacity switches the glass off, and a transform makes every card re-blur on every frame.

## 15 Looking, not ticking
- Screens refresh only when you look at them: when the app comes back to the front, or at the next full hour while it is in view (greetings, "today" figures). There is no minute timer. While the app is hidden there are no timers at all (GFresh in fresh.js; the Companion's colour and avoid timers stop too).
- If a sheet or the lock screen is open when a refresh is due, it waits until you close it.
- No browser swipe-back or pull-to-refresh: html and body use overscroll-behavior: none, so our own swipes never fight with the browser's.
- Tab swipe changes the screen without sliding it: moving a whole screen of frosted glass re-blurs every card on every frame.

## 16. Goal work report (v5.37)
Same shape as the Budget report. Hero: "About N hours", one comparison line with the ▲/▼ triangle (more work green, less red), plan-kept ring. Donut of hours by task (tap to isolate), paired bars (solid = now, faint = before) with natural quantities beneath ("3.1 h · 18 pages · 112 of 246 overall"), a days-worked strip or month calendar (dashed = to come, soft = rest day), "How you work" habits with confident / still learning badges, finished tasks named (repeats grouped ×N), work left at current speed as a week range, one calm note. Speed markers use the same triangle but stay neutral. Hours from entered minutes, else amount ÷ speed (marked "estimated"); entries with neither are left out and said so. Code: report.js (pure, tests/report.test.js).

## 17. One button language (Goal v5.38)
Two states, one shape. Pale glass (default) and filled accent (primary, selected, "on"). Large buttons 44-46 px, full pill; small ones 34 px, full pill (radius 999px); icon buttons square. Top shine: white 65%, 2 px, no blur, inside the top edge. Bottom shadow: dark, 2 px down, 3 px blur, outside the hairline. Light themes dim the inside slightly so the shine shows. Danger keeps the same shape; only the words turn red. No backdrop blur on buttons (they sit inside frosted cards, where it would show nothing and cost power). Pressed: 1 px down, shadow tightens. Files: goals/buttons.css.
Look settings can be exported and restored as a file (themes, glass, rim, fonts, paper, sounds, Companion; never goals, entries or PIN).

## 18. Liquid body tone (Goal v5.40, trial; Budget and later apps wait for approval)
A flat tone over the body of each Liquid glass object: dark navy on light themes (slider "Body tone", default 15%), white at 60% of that on dark themes. The rim light and top shine stay as they were, so they read against the body. Files: flagship.css (end), liquid.js (lqBody).

## 19. Three kinds of button (Goal v5.41; replaces the single-style rule in 17)
Distraction and focus. All pills, one height (40 px), only the primary has bold text.
1. PRIMARY: filled accent, bold. The thing you most likely want here. Also the selected choice in a segmented control or chip row.
2. GLASS: tinted glass (accent 9%, black 0% by default, sliders in Settings), crisp white top shine (65%, no blur), soft dark bottom shadow (3 px blur). Actions that belong to the task in hand.
3. OUTLINE: hollow glass, hairline only, no fill, shine or shadow. Something you may start that is not part of the task (Add, Select a task, Choose another task), and the unselected choice in a segmented control.
4. LINK: underlined text, no button. Reveals more or goes somewhere else (13 more).
Rule of thumb: a link goes somewhere, an outline starts something, glass continues the task, primary completes it. Files: buttons.css, btnlook.js.

## 20. Glass tint (Goal v5.42; replaces the Liquid body tone in 18)
Glass buttons and Liquid cards share one tint: the theme's accent (darker on light themes, lighter on dark ones), 9% by default, plus optional black (0% by default, 10% at most). No flat black or white layer. Sliders: Settings, Glass tint (btnlook.js).

## 21. Settings (Goal v5.44)
- Top page shows state before it asks for choices: two tiles with one big number or picture and small words beside it (Backup: days since the last copy; Look: theme swatches), then three groups of rows. Each row: coloured icon tile, label, current value, chevron. Rows need no explanation.
- A page opens from a row and returns with "‹ Settings". Tapping the Settings tab again goes back to the top.
- Hero first: a ring or a big number says the state; the action follows (Back up now = primary, Save to Downloads = glass). Rare or risky things are links; "Erase everything…" stands alone, in red, at the end.
- Nothing is repeated on a page without a reason; switches live with the thing they change.
- Row, tile and link edges are exempt from the button audit: rows sit inside a bordered group, links are underlined text.

## 22. Work days (Goal v5.51)
- One work day is 3 hours. Show effort as a fraction (nearest sixth) in large thin type, with the decimal small and grey beside it.
- Card: coloured icon tile on the left, fraction, small unit text; on the right a ring of three battery-like sections, one per work hour of the part-day, with a ×N badge for full days. The first card on a screen carries the tiny "WORK HOUR" label (60 px ring); others use the 40 px ring.
- Colours in every app: blue = plan, progress or work left; green = gain (banked, saved); red = loss (behind, overspent). Arrows: up = gain, down = loss.

## 22. Light inside the glass button (Goal v5.52 / Budget v2.43)
Glass and primary buttons: top shine white 65% (no blur), inner glow at the bottom edge white 40% with 9 px blur (light refracted into the glass), dark shadow 3 px outside the hairline. Outline pills and links have none of these.

## 23. Where the button system lives (read this before touching any button)
The single source of truth is `shared/buttons.css` (shape, kinds, sizes, glow) and `shared/btnlook.js` (Glass tint sliders). `shared/sync.sh` copies them, with the other shared files, into every app (`bash shared/sync.sh`, with the app folders beside `shared/`). Never edit an app's copy: edit `shared/` and sync.
- Kinds: primary (filled, bold), glass (task-related, accent tint 9%, white top shine 65% no blur, white bottom glow 40% / 9 px, dark shadow 3 px outside), outline (hollow, hairline only, no underline; for things not part of the task), link (underlined text, no button).
- Shape: full pill (999 px). Height by role: 40 px standard (main actions, Week/Month style switches), 28 px compact (Done, chips, mini and icon buttons, pop-up buttons), 52 px number keys.
- Specificity trap: the shared shape rule ends with `:not(.link-btn)`, so any override of height must also end with `:not(.link-btn)` and use an element or class selector, never an ID.
- Every new button gets one of the kinds above through a class; check it with the glow scan (`gl2.js`) and the audit.

## 24. Hour slots (Goal v5.55)
A task counted in hours, or with sub-tasks counted in hours, shows a row of 24 px round slots on its Working-on card, one per sub-task (or per hour). The day's logged hours fill them in order: empty (translucent track), half (left-to-right blue fill), full (green with a white check, 3.4 px stroke). One line below says "2 of 4 done today · 2 h 30 min of 4 h". A newly completed slot plays the soft "glad" sound; the last one plays the goal-met sound. The slots and the Today plan card read the same hour record.

## 25. One action, one record (Goal v5.57)
A button that completes something also records the time it took, in the same tap, on the same record every screen reads. Done = finish day + sitting (start pre-filled from the last sitting, end = now). Anything it created is removed by its undo and by Reopen. Bulk "already done" ticks never invent hours.

## 26. A card must change what you do (Goal v5.58)
A card that only repeats numbers is removed or merged. Every card says what a figure means for the goal (from the engine, not a copy) and ends in one button that does the single most useful next thing. Text that sits on a round icon or chip takes its colours from the theme (text on glass, never a fixed white), so it reads in light and dark.

## 27. One look per theme (Goal v5.58 / Budget v2.45)
Glass, rim, tint, button tint, accent, letters, paper and palette belong to the theme they were set in. Choosing a theme loads that theme's saved look; a theme never customised starts from its own defaults. Nothing carries over from the last theme used.

## 28. Move, order, and show-don't-tell (Goal v5.59)
Any item can be moved by a "Move to…" sheet or by dragging its grip; both write the same event and show a preview first. Adding offers "same for similar chapters". Today's card uses bars and a timeline instead of sentences. Text next to a ring is clipped with a soft fade and slides when too long.

## 29. Every graphic explains itself (Goal v5.60)
A graphic is never left to be guessed. Each part carries data-tell with one line built from the engine's numbers; the companion speaks it (or a glass note shows it when it is hidden). A short pulse on the icons teaches the habit, then stops.

## 30. Your choice wins; only the end stage is locked (Goal v5.61)
A lock protects the one thing that truly needs order (editing). Everything else guides and never blocks. Rows in lists swipe for Edit and Delete in every app, with one shared gesture (swipe.js).

## 31. An action must show its result (Goal v5.62)
After adding, the app opens the path, scrolls to the new row and lets it glow, and the note names the place. "Added" alone is never enough.

## 32. One payment, many months (Budget v2.46)
Money moves once; cost is shared across the days it serves. Cash and balances read the payment, budgets and learning read the shares. A lasting item shows a countdown bar, never a spike.

## 33. Neon accent, calm surface (v5.63 / v2.47)
In the dark themes the accent is vivid; everything around it stays soft, so the accent is the only thing that shouts.

## 34. Nothing moves under your finger (Budget v2.50)
While someone types, the controls they are tapping never change position. New information fades in inside reserved space; it never pushes. A thin accent line separates what you type from what it leaves.

## 35. One question at a time (Budget v2.51)
A multi-part entry is a short conversation, not a form. Three steps (item, quantity, price), each showing only the 2–3 best suggestions (mixed most used and most recent) plus "More…" for the full, searchable list. Any step also accepts a brand-new value, which the app learns. The keypad is a fixed 4×4 grid: ⌫ spans rows 1–2, the action key (+ item / Skip / Next / Add line) spans rows 3–4 and changes only its label. Only entering basket mode may shift the layout, once; after that every area has a fixed height. Lines are small cards in a fixed-height strip with ×. The same "2–3 and More…" rule applies to When, Lasts and note suggestions. "More…" opens a glass list above the sheet and never navigates away.

Update (v2.52): the multi-step flow lives in a wizard layer above the card, never inside it. The card keeps its size; the wizard has its own keypad, Cancel and Done. Lists opened by "More…" sit in a third layer above the wizard.

Rule (v2.53): choices that can change in length are underlined links; a dynamic button is a circle for one or two characters and a pill with a minimum width for longer text. Interface text cannot be selected by long press; only text boxes can.

## Major update, release 1 (Budget 3.00 / Goal 6.00)
Text never below about 11.5 px. Every control has a 44 px touch area even when it looks smaller (an invisible ::after). Bottom of every screen leaves room for the floating bar and the save button. Markers above bars get 32 px of air.

## Release 2 (3.01 / 6.01)
One voice: titles are sans; a setting offers serif for the app name and the big question only. Cards: 24 px corners, 20 px padding, 16 px gap. The frame never moves: nothing may widen the page; pinch zoom is locked. Text size is a user setting (Small, Default, Large, Larger).

## Release 3 (6.02)
- Same spring, Enter-to-next and safety copy as Budget 3.02 (`r3.js`, keys `gl_auto1`, `gl_auto2`).
- Every delete goes through `delU(id)`: one place, one Undo toast.

## 6.03: work named by kind
- Kinds are Reading, Drafting, Editing (shown "Editing" in short lines, "Editing and proofreading" in full). `kindOfGoal(id)` finds it by walking up to the phase or group.
- Pace is learned in hours first (`learned[g].hr`), in days as the fallback.

## The orb (Budget 3.03 / Goal 6.04)
- One floating button per app, `GOrb` (orb.js), class `gorb` (not `orb`, which the Companion uses). Frosted glass, bright rim, blue glow, border-radius morphing over 8 s; squash and bounce when its step changes.
- Icons are the shared line set (plus, check, play, wallet, moon), the same stroke style as Edit and Delete. The word is a glass tag that shows about 2 s.
- Hides during sheets, keyboard, lock, splash, Settings and scroll-down. It is a `data-act` button, so the app's click handler does the work.

## 6.05
- Three kinds, three colours with icons (✍️ Drafting, 📖 Reading, editing); used the same way in ring, bars and lists.
- The blob morphs between Log work / Add task and Save (squash-and-settle), then returns.
- Update strip: quiet pill at the top, never a pop-up.

## 6.06
- Settings number entry: a pill field (set-select style), never the native spinner box.
- Any bulk change (move, remove repeats) ends with a toast carrying Undo.

## Music player 0.1 (native Android engine + glass screen)
- Engine is native (Media3 player, MediaStore); the screen is HTML/CSS in a WebView, so every glass rule from the other apps applies unchanged.
- One blob button: play/pause (path morph, 2 px optical nudge for the triangle). A soft ring glows round it on launch only when a song is restored, so the eye knows where to tap.
- Three tabs only (Playing, Library, Settings). Library shows Continue, three "likely for this morning/afternoon/evening/night" tiles, then "More folders…".
- Choices that vary in length are underlined links (Play next, Add to end, 15 minutes). One filled pill per sheet (Play now).
- Tapping a song while a queue exists never wipes the queue: Play now / Play next / Add to end.
- Quiet mode: after 8 s of playing, links and times dim to 25%; any touch brings them back.
- Short phones (under 740 px): the "Up next" card folds into a "Queue" link.
- Low power: blur radius halves; no animated mesh (two still colour blobs fade slowly to the artwork colours).

## Web version 0.1
- Same glass UI. `engine.js` supplies the "Android" API from browser parts (IndexedDB, HTMLAudioElement, Media Session).
- Counts use "1 song / 2 songs". Row actions that vary in length are underlined links, inline under the name.

## Music player 0.2 (web)
- **Playing screen is cardless by default.** Title, scrubber and controls sit on the background; a soft shade and an automatic white or charcoal text tone keep them readable (WCAG AA or better). Carded (glass panel) is a setting.
- **Hero choices (all in Settings, each shown as a small picture):** Album or Blob; Cardless or Carded; Colours from the album on or off; Calm minimal on or off; Companion on or off; Companion moves with the music on or off. A song with no cover falls back to the Blob, so there is never an empty placeholder.
- **Companion (music version):** fully transparent glass, drawn as an outline only. Its shape follows the sound (bass swells the belly, treble lifts the top), it has two eyes that blink and look where you swipe, and a mouth that changes with the music's energy and brightness. It sleeps when paused, gets drowsy near the end of the sleep timer, and looks surprised on a new song. It is drawn only while visible; about 30 frames a second when playing, 15 on low battery, 8 when paused.
- **Liveliness (six steps):** Still, Gentle, Lively, Playful, Springy, Bouncy. One spring engine drives every shape change (play to pause, repeat, sleep moon to ring, plus to spinner to tick, tab pill, switches, jelly cover and Companion). Squash and stretch keep the area the same; the tab pill's front edge runs ahead and its back edge lags like a drop. Phone "reduce motion" forces Still.
- **Queue:** songs you slip in with "Play next" have a blue edge and a small arrow (shape as well as colour). A song played on its own shows a floating "Plays alone" chip and the queue waits behind it.
- **Rediscover ("Songs waiting for you"):** older songs sit under a thicker, blurrier veil; a short label ("9 d", "5 wk", "3 mo") gives the age.
- **Visual silence:** after 5 seconds of no touch on the Playing screen, the top line, tools and tabs dim and blur slightly.
- **Warm at night:** from 21:00 to 05:00 the glass and colours shift warm.
- **Controls:** every icon has a spoken label; touch targets are at least 48 px (Play is 92 px); swipe the hero for next and back; the mini-player morphs into the full player.
- Counts use "1 song / 2 songs"; varied-length choices are underlined links.

## 0.3
- Visualisers draw inside the cover's squircle; Disc is a true circle that spins only while playing.
- Ripple rings start at the play button and fade outward; strength is a six-step dot scale like Liveliness.
- Tile grid for choices that are pictures; swatches for colour with a tick on the chosen one.

## Motion rule (0.3.1)
Everything moves slower and smoother: springs about 30% softer, 60 frames while playing (30 on low power), trails that fade over about half a second, no fast spinning. Bounce stays, but in slow motion.

## 0.4
- One calm scale: titles 28, rows 56, thumbnails 42, buttons 44, glass kept light.
- Quiet state is a choreography, not a dimming: things leave by their nearest edge, controls sink, the tabs become a stack of capsules.
- Art is square and unframed; a missing cover is a CD, never a gradient with a letter.
- Visualisers fade at their edges and leave blurred echoes that move on springs.

## 0.5
- Light on glass: highlights live on horizontal edges (top bright, bottom faint). Vertical edges stay almost invisible.
- Quiet is one idea: everything leaves, the music and what it knows remain. Space freed becomes the insights.
- Playing depth: echoes (far, blurred, oversized), cover (front), Tide strip (just above the seek bar).
- Showing before saying: stars, bars and dots first; a short sentence second.
- Modes have their own screen and a calm disc that turns slowly only while a mode is on.

## Sliders (common rule, all apps)
A vertical swipe scrolls; only a sideways drag moves a slider (`touch-action:pan-y`). The shared rule lives in `common/sliders.css`.

## Modes have atmospheres (0.6)
Normal follows the cover. DJ: violet and cyan, slow pulse. Lofi: amber and rose, film grain, breathing vignette. Set by `data-dj` and `data-lofi` on the root; colours override after the cover colours.
## Prepare, do not process live (0.6)
Anything that changes sound (stretching, section cutting) is made ahead into a buffer and scheduled on the audio clock.

## Volume is in decibels (0.7)
The master slider moves in equal decibel steps (30 dB range), so each step sounds the same. It shows "−12 dB" beside its name, and closes by itself after a few seconds.

## Switches always move (0.8)
Every switch must be given the spring knob (`M.knob`) when it is drawn; a class change alone does not move it.
## Sounds are cautious (0.8)
Real recordings, levelled to one loudness, faded in and out, drifting slowly, never repeating plainly.

## 0.10 Library
- Rhythm: big (lead card, hero photo), medium (shelves, cards), small (tiles, chips). Space between groups, one slow fade (0.85 s, staggered) on arrival.
- Hint button: 22 px round, tooltip gradient, italic i; opens a tooltip-style box with What, Why, How.
- Charts are plain CSS and SVG: day bars, a conic ring, horizontal bars. Colours: morning gold, afternoon orange, evening violet, night blue.
- Hero pages: 4:3 photo with a soft bottom gradient and the name over it; blocks of three below.

## 0.11
- Quiet carded: one column, 32 px each side, for cover, info card and playback card. Primary = wide, solid, 28 px corner; secondary = same width, lighter, 24 px corner, softer shadow, 20 px gap.
- Orb: 54 px glass blob, accent gradient, slow 9 s morph, 0.9 s squash when its step changes, tag pill beside it.
- Sheets: bottom sheet with 30 px corner, 16 px text fields (no zoom), 44 px rows.

## 0.12
- Edit sheet: same bottom sheet as bookmarks (30 px corner, 16 px field). Round preview for artists, rounded square for albums. "Back to automatic" is a quiet link, shown only when something was edited by hand.
- Source line under text: "Written by you" or "From <service>", small and calm. Updates repaint in place, with no jumps.

## 0.12.1
- Picture chooser: bottom sheet, 3x3 grid with 8 px gaps, 14 px tile corners, "More" primary, "From my phone" secondary. Tiles ease in and press down by 3%.
- Quiet lyrics: 17 px light text, secondary colour, centred, no background, soft fade at top and bottom, slow upward drift tied to playback. Quiet carded panel: 40 px side margins, 26 px corner, single-line title (21 px), 44 px side buttons and 58 px play button.
- 0.12.2 depth: visualisation (front) > lyrics > echoes (back). Lyrics fade only at the top, so the wave overlaps the last lines. Cover row: 45 px tiles, 12 px corners, 10 px gap, opacity 1 / .7 / .5 / .34 / .2, ring on the current one. The cover glides to its place in 1.1 s.
- 0.12.3 quiet depth: the visualisation is a fixed anchor (same size and place as in normal playing). Lyrics fade in over about 60% of their height from the top, and the wave casts a 46 px shadow upwards. Lyrics size 14 to 28 px, default 17.
- 0.12.4: lyrics mask is symmetric: 0 to 100% opacity over the first half, and back to 0 over the second half.
- 0.12.5: the carded panel style is retired. Playback controls always sit directly on the screen, with no card behind them.
- 0.12.6: no shadow is cast from the visualisation onto the lyrics; depth comes from soft fades only. Any gradient that ends at an element edge must reach zero opacity there.
- 0.12.7 stars: 10 to 100 sprites, additive light, four tints (white, blue, warm, violet). Flare lasts about 1 s, shine about 1.3 s. Covers row: 45 px tiles, current 58 px, opacity .34/.62/1/.62/.34. Visualiser canvas: 40 px padding top and bottom, masked.
- 0.12.8 covers row: 45 px tiles, current 58 px with ring, opacity falls .2 per 52 px from the centre; phrase 12 px, letter-spacing .08em, tabular figures. Stars on light: accent veil at 34% over the sky, stars x1.35.
- 0.12.9 power: tiers Full / Rest (20 s idle, 250 ms frames) / Away / Off, decided in one place (`Power`). Any new loop must ask `Power.live()` before drawing. Destructive actions use a toast with Undo and a 7-day safety place; the destructive word is red and underlined, never a filled button. Search results are grouped under small capital headings, avatars round for artists.
- 0.12.10 capsule: 88×26 px, 2 px inset, thumb opacity .55 (automatic) or 1 (chosen), glide .7 s; it lives inside the panel above the title and is counter-scaled 1.25 in quiet so it keeps its size. Rest frame gap is a smoothstep curve (33 → 66 → 270 ms) rather than steps; black fades in over 1.6 s, text after 0.9 s, at 34% white, 11 px.
- 0.12.11 glow: `--glo` white .5 on light, rgb(6,8,14) .5 on dark; text-shadow 0 0 3px for text, drop-shadow 0 0 3px for covers (not on scrolling tiles, for battery). Mode icons animate only while on: 3.6 s glide for DJ knobs (±7 px), 2.4 s fall for Lofi drops. Layout locks must check that the element they hold still exists. Transient messages never take pointer events except their action.
- 0.12.12 audit rules: ids that outlive a device (backups) must be matched by content (file name and size), never by internal id; floating helpers (orb, toast) are placed relative to a fixed anchor (the capsule), not to a block whose height can change; every small round control gets a 44 px hit area through ::after.
- 0.13 layout: spacers (`.sp1`, `.sp2`) share free space equally; cover height `--ch` = min(60vw, 33dvh), 125 px with the small art; wave overlaps the cover by about 44 px (qly's -34 px margin plus -10 px). Group things that belong together, then let one calm gap separate the groups.
- 0.14: a group that the user has called perfect is never resized by a later layout change; check its size and its distance from the screen edge against the earlier screenshot before delivering.
- 0.15: before delivering a layout change, measure the same elements before and after (cover, small art, tiles, capsule, text, controls) and keep sizes equal unless the change is meant to resize them.
- 0.16: standard sizes are fixed: lower group 90%, big cover +30%, info card 75%. The upper group is centred by two equal spacers (above and below it); the same spacers are used in quiet mode so nothing jumps.
- 0.17: when one mode replaces another (DJ to Lofi), the new mode must start playback itself and the screen tiers must follow the real playing state.
- 0.18: the quick question uses the tooltip banner (`.tipbox`), appears from above with a slow fade, never moves the layout, and shows a 5-second line that runs down. The Taste page uses one banner, glass lists and a small pink histogram.
- 0.19: depth by light and shadow: light from the left and above, shade on the right and below, a soft cast shadow, and a faint reflection. LEDs are 2:1 rectangles; off is dark, on is bright with a glow. Peak markers are white, wait, then fall with growing speed. Visualisers adapt to each song's loudness.
- 0.20: Bars and Lights are pixel art (hard-edged square pixels, no glow on bars, stepped colour). Peak markers are single white pixels that never leave the top row. No visualiser has a background, shadow or 3D shading; transparency lets the cover and lyrics show through. Wave and Tide stay smooth.
- 0.21: edit controls stay hidden until Edit is tapped (pin and remove sit at the row's end). A changed list shows the tooltip banner. Questions reuse the tooltip banner with a longer line (8 s).
- 0.22: the mode choice is a glass pill row above the play button, opening slowly; the chosen pill takes the accent gradient and the current mode has a hairline accent. "Sounds underneath only" is shown by a thin accent ring around the play button that breathes slowly (dotted and still when paused). Bars are dense 2 px pixels with 1 px gaps; Lights stay larger 2:1 glowing LEDs.
- 0.23: gestures show rather than say: mode pills carry icons, mute is a slash that draws across the volume icon, the Lofi "sounds only" state is the breathing ring. No toasts for these. Settings rows may carry a tiny picture of the gesture in place of a paragraph.
- 0.24: the DJ pill has no words: a play glyph and a tiny song timeline with the heard section lit. It replaces the "playing from" label while DJ is on and fades in slowly.
- 0.25: smart playlists show the result while you build: a large live number, a cover mosaic, and a bar with a count on every rule. Rule tiles are drawn icons with a live count; tiles that cannot match anything fade. The rule sheet rises slowly from the bottom.
- 0.26 skins: skeleton (layout, sizes, gestures) is fixed; a skin may change materials, colours, shapes, type, icon feel, visualiser palette and press feedback. Skins never move or resize a group. Winamp Classic: hard bevels, no blur, no rounding, LCD green on black, chrome buttons that press in instantly.
- 0.27 Winamp Classic 3 rules: one light from the top left; 1 px two-tone bevels (raised light top-left, dark bottom-right, sunken the reverse); brushed graphite metal from tiled 1 px lines; palette of graphite, black, silver, copper, LCD green, peach (selection only); pixel capitals for labels, plain sans for reading; LED squares show on/off; pressed keys sink in colour, never in position.
- 0.28: groups of keys join into strips on the same edges as the seek bar and tabs (Winamp skin); state shows as a pressed key and a green glyph, never a lone LED.
- 0.29/0.30: confidence is shown as three pips, never as a percentage; counts sit beside icon-led actions (Tidy); the night message uses the tooltip surface and leaves by swipe or tick.

- Optimisation key: a status dot (green steady, amber eased, grey off) plus a 60 px frame trace, then the label and the switch. Show more than say.

- 0.32 nord5: no visual change.

- 0.33 nord5: no visual change.

- 0.34 nord5: no visual change.

- 0.35 mi11x: no visual change. Device profiles live in `V.profiles` (viz.js); a device build sets `window.MP_DEVICE` in engine.js.

- 0.36 nord5: no visual change. Rule added: background sounds must never fail silently; the engine plans ahead, retries and falls back to made sounds.

- 0.37 nord5: info banners inside pages use the pale-yellow tooltip gradient with 16 px corners (class tipbox bkn); two first-launch buttons sit side by side with a 10 px gap. Rule added: nothing the person typed is stored only in one place; it must be in the backup.

- 0.38 nord5: the add chooser is a glass bottom card (24 px corners); the primary choice uses the accent gradient, the second is plain. No gap or fade is allowed between songs on a natural end.
- 0.39 nord5: a setting that claims a behaviour shows a live count of it, so the person can verify it.
- 0.40 nord5: themes use the same palette values as the shared flagship.css; a themed accent is never overridden by album colours. Theme tiles: 4 per row, 20 px squircle swatches, selected ring in the accent.
- 0.41 nord5: Clean up page: switch, then slider with value beside label, then a list of what was found with one primary pill. Nothing is deleted; it moves to Recently removed.
- 0.42 nord5: the sound mixer shows one small status line (s2 size) under the mix chips.
- 0.44 nord5: standing principle for all apps: show more than say, and be transparent wherever practical (status chips with counts and reasons, a health card, a waveform before saving). Source chips are 12 px pills with a status dot; picture tiles carry a small letter badge for their source.
- 0.45 nord5: a review list shows what is missing (name, kind, song count) with one quiet Choose action per row; tile grid never compresses (flex none).
- 0.46 nord5: motion is shown, not described: a dot per sound for pan, a bar for drifting level, a health dot; updated 2.5 times a second only while visible.
- 0.47 nord5: themes are the only appearance system; left-out items look struck through and dim, not removed, so they can be switched back.
- 0.48 nord5: with no cover the accent is fixed sapphire blue; warm-at-night shifts hue at most 18 degrees.
- 0.49 nord5: cost of a look matters: effects are baked small, not blurred large every frame.
- 0.50 nord5: one sheet for adding, saying what is already there; row action is a quiet three-dot control, 40 px target; menus are plain lists with hairlines; every destructive step has Undo.
- 0.51 nord5: glass follows physics: clear body, bright horizontal edges only, vertical edges invisible; in light mode the body is slightly darker than the background so the edges can shine. Facts the listener always needs (format, quality, favourite, place, rating) sit freely on the screen, never in a card.
- 0.52 nord5: keep the original glass as a permanent option; text on glass follows the glass, not the page (dark text on bright glass, light only when the glass is dark); one fixed box per strip cell so rows and columns align; glass edges symmetrical top and bottom.
- 0.53 nord5: a glass edge is a ring that follows the corner radius, brightest at top and bottom and fading to nothing down the sides; never a straight line. Smoke stays light in light mode (max 35%); text follows the glass. An optional faded hairline outline separates glass from a light background.
- 0.54 nord5: an edge is full on the straight run and fades along the corner arc, invisible by the arc's midpoint. Nothing may overlap the song strip: a hidden element must not leave a negative margin behind.
