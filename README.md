# Rustam's Music (web) 0.2
Upload every file and the `fonts` folder to a GitHub repo, then Settings > Pages > Deploy from branch (main, root).
Open the Pages link in Chrome on the phone, then menu > Add to Home screen.
To update: upload the new files over the old ones. The app refreshes itself on the next open.

## 0.3 (web)
- **Online details (opt-in).** Library suggests "N songs have no cover · Find them". Only cleaned title, artist and length go to MusicBrainz; covers come from the Cover Art Archive. Before/after rows, accept one or all, Undo, manual cover and manual edit. Saved inside the app only; originals are kept (Settings > Restore original details).
- **Visualisers.** None, Blob (half size), Bars, Wave, Meter, Lights, Rings, Disc. Colour: accent, white, grey, spectrum.
- **Play-button ripple.** Off to Max, own colour.
- **Listening panel** (top-right chip): speed, sleep timer, save this moment, favourite.
- Double-tap cover = favourite; long-press previous/next = -/+10 s; tap the time on the right = time left.
- Library: Favourites, Recently added, Recently played, Bookmarks; sort links; album length.
- Files added: `net.js`, `viz.js`.
- Known limits: regional songs may not match; no audio fingerprinting. If music stops with the screen off, turn off "Visuals move with the music".

## 0.3.1
- Long-press the cover, visualiser or any song row: one editor for title, artist, album, lyrics and cover. Online (MusicBrainz, Cover Art Archive, LRCLIB, lyrics.ovh) or by hand (photos, paste). Copy buttons on every field.
- Listening panel: Lyrics and Edit details.
- "Cover behind the visualiser": Clear, Soft, Faint, Hidden.
- "Save tagged copy" writes title, artist, album, lyrics and cover into a copy of an MP3 (saved to Downloads). A web app cannot edit the original file; other formats keep details inside the app.
- Gentler ripple (stays inside the buttons around it); slower, 60-frame motion everywhere; visualisers keep soft trails and falling peaks.

## 0.4 (web)
- Calmer, smaller look: lighter type, rows and buttons; the mini-player now shares the tab bar's width, margins and corners.
- Now Playing: after a few quiet seconds, the top bar, shuffle/queue row and "plays alone" chip slide off their edges; the seek bar and controls sink and shrink; the tabs fold into stacked glass capsules at bottom left. Any touch brings everything back.
- Cover art is a plain square with no border or rounding. Songs without a cover show your CD image.
- Visualisers have soft faded edges and blurred echoes that jump in size and angle with the beat. Settings > Visualiser: echoes, visibility, size, angle, softness, sensitivity, cover fade.
- Song editor is two steps (cover, title, artist; then More for album, lyrics, copy, tagged copy).
- Sources: iTunes India first (Bollywood), then MusicBrainz and Cover Art Archive; Wikipedia for artists. Switch each on or off, choose the order, and "Test sources" shows which work on your phone. If a cover cannot be copied it is linked online.
- Library: Home, Songs, Albums, Artists, Playlists. Automatic playlists from your own listening (mornings, afternoons, evenings, late nights, weekdays, weekends, on repeat, long listens, short and sweet, not played yet, and calm/lively learned from the music). Artist pages with intro and photo, "Update artist details" now or about every two weeks.
- Fixed: warm night mode made light-theme text hard to read.

## 0.4.1
- Fixed: tapping the folded tab stack no longer lands on a tab (the selected pill went wrong). The first tap only wakes the screen.
- Stacked glass sheets are now real layers with a shining top edge. Settings > Playing screen: place the stack Left, Centre or Right, or let the tabs Slide away.
- Albums: grouped by album name (or folder), A to Z by default, with Recent, Artist and Size.
- Home: a row of round artist photos.
- Playlist rows and tiles tidied.

## 0.5
- Glass: light catches the top and bottom edges only. The upright edges stay calm.
- Songs waiting for you: covers stay sharp. Albums grid no longer spills off the screen.
- Playing: the tab capsule stack is gone. In the quiet state everything, tabs included, slides away to its edge.
- Playing layout: square cover in front, oversized blurred echoes behind, one visualiser strip below the cover. New signature visualiser "Tide". Cover can be shown or hidden. The CD picture is now a high-quality photograph.
- Quiet insights: format, quality (LOW below 128 kbps, CD, HD from 320 kbps or lossless above 1500 kbps), favourite, position in queue, five-star rating (automatic or yours, both remembered), when you listen, next song, save queue as playlist, suggestions, tips.
- The tap that wakes the screen no longer pauses the music.
- DJ mode (experimental) and Lofi mode (reverb, echo, slowed, rain/fire/crickets/wind/storm/ocean/river made in the browser). Buttons on the Playing screen, a Modes screen, and a "DJ and Lofi" group in Settings.
- Files: new `fx.js` (Lofi and sounds) and `dj.js`.

## 0.5.1
- Insight cards now cross-fade (slowly) instead of sliding. Swipe still works. Long lines drift from right to left, then fade and begin again.
- DJ mode picks sections at random, leaning towards what you replay, and remembers which sections, lengths and song pairs it has used, so each mix differs. Settings: shortest and longest section (with Short, Medium, Long presets).
- DJ mode skips lectures, audiobooks and long spoken files by default (Settings: "Include lectures and audiobooks").
- Lofi keeps voices natural: it slows the music without lowering the pitch (can be turned off).
- Separate volumes for music, effects (reverb and echo) and the sound underneath, in Settings and on the Modes screen.

## 0.5.2
- Sliders no longer move while you scroll. A vertical swipe scrolls the page; only a sideways drag moves a slider. The rule is shared in `common/sliders.css` for all apps.

## 0.5.3
- Every slider shows its number beside its name (percent, or seconds), live while you drag.

## 0.5.4
- Sliders can only be moved by their round handle (a bit larger now). Touching the line, or scrolling past a slider, never changes it.

## 0.6
- Quiet mode: smooth hand-over (no jump). The seek bar becomes mirrored dots that rise with the sound; bright = played, pale = still to come.
- Disc and Rings visualisers are back (circular, slowly turning).
- Smoother sound: DJ sections are decoded and cut ahead of time and scheduled on the audio clock. Lofi slows the song ahead of time (long-window stretch), so it keeps its pitch and cannot break up when the screen is busy. While it prepares, the song plays live.
- Lofi sounds are now short, different events (drops, crackles, chirps, gusts, waves, thunder, bird calls, chimes) at irregular times. New: Birds and Chimes.
- Each mode has its own atmosphere: Playing (cover colours), DJ (cool violet and cyan, slow pulse), Lofi (warm amber, grain, breathing vignette).
- Backup and restore in Settings (ratings, playlists, history, settings).
- Not in 0.6: A-B repeat, equaliser, queue re-ordering, ReplayGain, waveform scrubber, mood groups, volume swipe.

## 0.6.1
- Quiet seek bar: tight vertical capsules (3 px wide, 2 px gaps, up to 7 px above the line) with a same-opacity mirror joined at the foot. White on dark, dark on light; played is full tone, still to come a softer tone.
- Quiet change is slower and more even (1.5 s, one easing). The app checks its own frame rate once; on a slow phone it uses a shorter, lighter fade. Reduced motion makes it instant.

## 0.7
- Removed: Rings visualiser, and the circle of bars around the Disc. Disc is now only a slowly turning CD. (Rings users are moved to Tide.)
- New: one master volume. Tap the speaker button (next to repeat) for a slim panel; the slider is on a decibel (logarithmic) scale, shows its value, and closes by itself. It covers normal play, DJ, Lofi and the sounds underneath.
- New: loudness evening. Each song is measured once, the first time it plays, then lifted or lowered (up to 9 dB) towards a common level, with a soft limiter against clipping. On/off switch in the volume panel and in Settings.
- New: equaliser in Settings (Bass, Voice, Treble, ±10 dB, five presets).
- New: A-B repeat. Hold the repeat button to set the start, hold again to set the end (it loops that part), hold a third time to clear.
- Audit: every screen at 412×830, 360×640, 412×520, dark and light: no overflow, no console errors. Found and fixed a leftover error from removing the circle.
- Still open: queue re-ordering, waveform scrubber, mood groups, volume swipe, lyrics, online music (opt-in).

## 0.8
- **Your sounds.** The generated sounds are gone. Your six recordings are used, split by what is in them: two rain beds (Soft rain, Heavy rain), Night crickets, Morning birds, and five thunder clips. Several recordings opened with a loud clap before settling into steady rain, so the clap was cut out of the beds and kept as thunder.
- **Used cautiously.** Beds never repeat plainly: each plays random stretches of its recording, overlapping with slow crossfades. Thunder is rare (about every one to three minutes), softened and distant. Everything fades in and out; nothing starts suddenly. All sounds were levelled to the same loudness and a soft limiter guards the sum.
- **Sound mixer.** Each sound has a switch and its own volume (value shown). Five quick mixes: Rainy night, Storm, Dawn, Quiet night, Silence.
- **Drift.** Each sound rises and falls by itself between a Quietest and a Loudest level, at a Slow, Medium, Lively or Wander pace, each sound on its own rhythm.
- **Sleep.** Choose 30 minutes to 2 hours. The music softens and darkens (more reverb and echo), then fades; the natural sounds stay a little longer, then fade too; then it stops with "Good night".
- **Switches** now slide with the spring knob everywhere (volume panel, mixer, drift); before, new switches did not move.
- **Crossfade on Next and Previous**, on by default, with a length slider (1 to 10 s). The old song carries on in a spare player and fades as the new one fades in.
- **Info card** on the Playing screen: a rounded card with its own contrasting surface (dark on light, light on dark). It fades when the song changes, long lines drift right to left, and cards are tappable (next up opens the queue, this week's top song plays, others move on).

### Progress against web 0.1
| Area | 0.1 | Now |
|---|---|---|
| Playback | plain list and play | queue, infinity play, soft start/stop, crossfade on skip, A-B repeat, sleep, loudness evening, master volume (dB), equaliser |
| Look | basic | glass, cover colours, light/dark/phone, three visualisers plus Disc, echoes, quiet mode with capsule seek bar, info card |
| Library | files list | albums, artists, playlists (automatic and yours), favourites, ratings, "songs waiting" |
| Smarts | none | listening heat, "when you listen", suggestions, auto ratings, DJ that learns your replayed parts |
| Modes | none | DJ and Lofi with prepared audio, sound mixer, drift, sleep, own atmospheres |
| Safety | none | backup and restore |
| Open | | queue re-ordering, waveform scrubber, mood groups, volume swipe, lyrics, online music |

### What makes it different
One app that is a calm player by day and a sleep sound system by night, with three things most players lack: a DJ mode that plays the parts of your songs you actually return to, a mixer whose sounds drift so no night sounds the same, and a sleep fade that ends with the sounds, not before them.

## 0.8.1
- Fixed: Settings showed nothing in 0.8 (it still pointed at the old single-sound list). Settings now has one "Sounds underneath" row that opens the mixer.
- Info card now uses the shared tooltip surface (`common/tooltip.css`): off-white to pale yellow (#FFFFE1) vertical gradient, hairline border with clear top and bottom and faint sides, same in light and dark.

## 0.8.2
- Info card has two styles, chosen in Settings (Card style): Tooltip (pale yellow, default) or Glass (the same glass as other cards, hairline border only, follows light and dark).

## 0.8.4
- Info card: two styles only, Tooltip and Glass. Two sliders, Card background and Hairline border (0 to 100%, default 100), work on whichever style is chosen. Background 0 with the hairline on gives an outline-only look; both 0 shows nothing. Below 55% background the tooltip's text switches to the theme colour so it stays readable.


## 0.9
- Settings rebuilt like the Goal and Budget apps: two glass summary cards (Backup, Look), then grouped lists with coloured icons and the current value on each row (Appearance, Playing screen, Visualiser, Quiet screen, Playing and sound, DJ and Lofi, Your songs, Online details, Backup and data). Each row opens a small page with a Back link; advanced options (equaliser, echoes, Lofi tuning) sit one level deeper.
- Visualiser: new "Echoes and sensitivity" page with Randomize (a fresh, sensible mix of every option) and a heart to keep a look. Liked looks are stored for each visualiser separately. Tapping the visualiser on the Playing screen morphs smoothly to one of your liked looks; with none saved it tries a fresh good one and now and then hints to save favourites.
- Play button: a short tap pauses everything; hold it to pause only the sounds underneath (hold again to bring them back).
- Crossfade now also softens the A-B loop jump.
- Fixed: Settings pages could fail to open (renamed lists).


## 0.10
- Library Home: one big lead card, then medium shelves and small tiles, arriving with one slow fade. Shelves reorder themselves by what you tap most (kept on this phone, shown with a quiet note). New "This week" card: a bar for each day, and a ring and legend for morning, afternoon, evening and night.
- Hint buttons (the small yellow i, tooltip style) on Artists, This week, Songs waiting, Photos and introductions, About and When you listen. Each says what it is, why to use it and how.
- Songs: Play all and Shuffle at the top, sort as soft chips, A to Z letter dividers, a live count (and "n found" while searching).
- Albums and Artists: sort chips, a three-across grid of round artist photos, and one card for photos and introductions.
- Artist page: a large photo (or a collage of covers), Play and Shuffle, blocks for plays, albums and last played, most played song, a short introduction with Read more, and bars for when you listen to them.
- Album page: a large cover in full quality, the same blocks, and a short note built from your own listening plus the artist's first line (Wikipedia, labelled).
- Wikipedia photos are now fetched at 640 px.


## 0.11
- Library: new "Your listening" page (tap More on This week): numbers and streak, day-by-day bars (week or month), time-of-day ring, weekday bars, top artists, top songs, and a ring for how much of your library you have heard. Every chart has a hint button. Home now also reorders the week card by use, the Library reopens on the part you used last, and the Songs sort is remembered.
- Quiet mode with the carded Playing panel: the cover, the info card and the playback card now share one column (the same left and right edges). The playback card is the primary surface (wider, solid, unscaled); the info card is lighter, with softer shadow, a smaller corner and more air around it. On short phones the card scales slightly but keeps the same edges.
- Volume pop-over: placed above its own button every time, with a small pointer, and closed when quiet mode starts (it used to sit at a fixed height).
- DJ mode: sections you set with A-B repeat are saved. About 65% of the time DJ picks one of them (least used first); otherwise it finds its own parts as before. Songs with saved sections are chosen more often.
- The orb: the one floating glass button from Goal and Budget, now on the Playing screen. For music it says "Save moment"; for audiobooks and lectures "Bookmark"; while an A-B start is set it changes to "Set loop end". It steps aside in quiet mode, DJ mode, sheets and the keyboard. Tapping it opens a small sheet with a note field; for long recordings you can mark a Bookmark or a Chapter, and see, jump to or remove what you saved in that recording. Notes show on the Bookmarks page.

## 0.12 (web): Library keeps itself fresh
- More sources. Artists: Wikipedia (English, then Hindi), TheAudioDB, Deezer, MusicBrainz. Albums: iTunes, Deezer, MusicBrainz and Cover Art Archive. Each is tried in turn until a photo and an introduction are found.
- No more 30-artist limit, and a failed lookup is retried after 1, 3, 7, then 30 days (it used to be blocked for 30 days).
- Runs in the background: at start, when the phone is back online, when you return to the app, and every 30 minutes. Complete entries refresh after 60 days. Settings: "Keep details fresh automatically" and a TheAudioDB switch.
- Edit by hand: artist photo and introduction, album cover and note. Your edits always win. "Back to automatic" returns to online details.
- Photos are kept on the phone for offline use. Your own photos are inside backups.
- Limits: tested with simulated services only; a wrong match is possible for common names; sites that block copying stay as links (not shown offline).

## 0.12.1 (web)
- Backups now include automatic artist and album pictures, and restore puts them back (backup file is larger: about 30 to 60 KB per picture).
- Picture chooser: a 3x3 grid of best matches with "More" for the next nine and "From my phone". Opens from "Choose a picture" or "Choose a cover" when nothing is found, and from the photo in the edit screen. Pictures come from Google (only if you add your own free key in Settings), Wikimedia Commons, Openverse, Deezer and iTunes.
- No written introduction found: a short factual summary from open data (Wikidata, MusicBrainz) is shown, marked "Short summary", and replaced when a fuller text is found. Google's own AI summary cannot be fetched by an app.
- Quiet screen: Settings has "Info card when quiet", a slider with seven stops (Never, Rarely, Seldom, Sometimes, Often, Mostly, Always). The chance is decided once per song. When the card is hidden, the song's lyrics (if it has them) show in plain text with no background and drift slowly upward as the song plays. Default is Always, as before.
- Quiet, carded: the playback panel is now a wide, low panel (about 330 x 195 px at 412 wide) with 40 px side margins and more empty space.

## 0.12.2 (web)
- Quiet lyrics now sit in the upper part of the screen, ending just above the visualisation. The visualisation stays in front and covers the last lines a little, for depth. Layers, front to back: visualisation, lyrics, echoes.
- While lyrics show, the big cover hides. It glides down into a small 45 px cover just below the visualisation, with the next four covers beside it, each fainter the farther it is in the queue. The current one has a ring.

## 0.12.3 (web)
- Quiet screen: the visualisation keeps its full size and exact place, and no longer shrinks or moves when the screen goes quiet (the block under it keeps its distance from the bottom edge). When the info card shows, card and panel together are taller, so the visualisation moves up a little.
- Lyrics rest on the visualisation from above, capped to a little over the top half. They fade out gradually towards the top, into calm empty space. For depth: the wave covers the last line and casts a soft shadow, and the echoes glow behind the text.
- Settings, Quiet screen: "Lyrics text size" slider (14 to 28 px, shown beside the label).

## 0.12.4 (web)
- Quiet lyrics now fade at the bottom as well as the top, with the same soft gradient, so they melt into the visualisation.

## 0.12.5 (web)
- The Carded playing screen is removed completely. There is one playing screen (cardless): the Settings choice, its styles, the quiet-mode card layout and the stored setting are gone. The Playing screen page in Settings now holds the four switches only, and its summary line shows Calm, Album art or Visualiser.

## 0.12.6 (web)
- Fixed: on the quiet screen a dark band with a hard lower edge showed over the last lines of the lyrics, just above the visualisation. It was the soft "depth shadow" added in 0.12.3, which ended abruptly at the top of the visualisation. The shadow is removed. Depth now comes from the fades at the top and bottom of the lyrics and the echoes behind them.

## 0.12.7 (web)
- Visualiser frame: the drawing area is now 40 px taller above and below the strip, with soft edges, so peaks and glow are never clipped. The flat cut at the bottom of the wave and the hard edges of the echoes are gone, for every visualiser, present and future.
- Stars: on by default, far behind everything. They fade in and out, glow with halos, shine with a four-point flare now and then, and twinkle. On the beat a few flare (they blink, they do not move like the wave). Settings, Visualiser, Stars: a switch and six sliders (Amount, Size, Glow and halo, Twinkle, Beat reaction, Pace).
- Always lyrics or art: the playing and quiet screens show the lyrics when the song has them, otherwise the album art at 125 px (switch: Settings, Playing screen, Small album art).
- Quiet with lyrics: a row of covers centred in the space above the controls, two previous, the current one larger and centred, two next, fainter with distance.
- If music does not pass through the app (no analysis), the stars flare on a gentle steady pulse.

## 0.12.8 (web)
- Covers row: always visible on the playing and quiet screens, as part of the lower block. It scrolls sideways (30 songs each way), the current cover is larger and ringed, covers fade with distance from the centre, and tapping one plays it at once. A live line above it reads "3 played · 12 ahead".
- Stars: Randomize and a heart in Settings, Visualiser, Stars; liked looks are saved per visualiser. Double-tapping the background of the Playing screen applies a liked look, or a fresh good one (with a hint to save favourites). Double-tapping the cover or art still likes the song.
- Light theme: with stars on, the background takes a soft, slightly darker shade of the accent, and the stars are drawn about a third brighter.
- Small screens: the 125 px art shrinks to fit the space above the visualiser.

## 0.12.9 (web)
- Power tiers (new `power.js`, one switch): Full on the Playing, quiet, DJ and Lofi screens; Rest after 20 s without touch (about 4 frames a second, touch wakes at once); Away on Library, Settings and other screens (no drawing, no visual timers); Off when the screen dims or the app is hidden (only audio runs). Measured here in a test browser: about 49 frames a second at Full, 92% fewer at Rest, none at Away. Real battery needs the phone's own battery statistics.
- Duplicates: songs get a quiet content fingerprint and genre. Identical files are removed by themselves (one kept; plays, ratings, hearts, playlist places, marks and loops move to it), with "Undo". Songs with the same title but different files are listed in Settings, Duplicates and removed, for you to remove by hand.
- Remove from app: every song's details sheet has it. Removed songs wait 7 days in Recently removed (Restore, Empty now). The file on the phone is never touched.
- Library search is universal: artists, albums, playlists, genres, moods and types (calm, lively, mornings…), then songs, in groups.

## 0.12.10 (web)
- Cover / lyrics capsule: a small, wide glass capsule (picture and text-lines icons) sits just above the song title, centred, same size and place on the Playing, quiet and Calm minimal screens. A tap chooses; a long tap returns to automatic. The pale thumb glides across; it is faint while automatic and solid once you have chosen. The lyrics icon dims when a song has none.
- Power saving switch: Settings (top of the list) and Playing, Listening options. On by default; Off keeps the screen at full quality.
- Rest in three smooth steps after your last touch (the steps glide into each other, with no jump): about 30 frames a second up to 20 s, about 15 up to 40 s, about 4 up to 60 s. After a minute with music playing, the screen fades to black with a quiet "Tap to return"; nothing is drawn, and the first tap only wakes the app.
- Small screens: the picture shrinks a little so the capsule fits without moving the controls.

## 0.12.11 (web)
- Calm minimal in quiet mode: fixed. The lock that holds the visualiser still was squeezing the lyrics to one line at the top when there is no visualiser; it now only runs when one exists, so the lyrics fill the space above the covers row.
- Glow: a 3 px soft outer glow (50%) on the lyrics text and the cover, white on light and near-black on dark.
- DJ and Lofi toggles: a tap switches the mode on or off, a long tap opens its screen. Icons come alive when on (DJ sliders glide, Lofi raindrops fall) and rest when off; they pause when the screen is resting.
- Long tap on a cover opens the song editor everywhere: Playing cover, covers row, queue, mini player, Library covers and rows.
- The message at the top no longer blocks the buttons beneath it; only its Undo is tappable.

## 0.12.12 (web) quality round 1
- Backup now survives a fresh install: ratings, hearts, playlists, plays and marks are carried to your songs by file name and size when you add them again after restoring ("N songs matched to your backup"). Before, they would have been orphaned because every install gives songs new ids.
- Song ids can no longer collide when many songs are added in the same millisecond.
- The memory-capture orb now sits level with the cover/lyrics capsule and its label above it, no longer over the covers row.
- Small round buttons (the "i" help marks) keep a thumb-sized touch area.
- Tested: 300 songs (added in 4 s, fingerprinted quietly in 44 s, Duplicates page opens in 26 ms), backup to restore round trip, position and queue after reload, removing the playing song, and an automatic layout audit at 360×640, 412×830 and 430×932 in light and dark (no overflow, no clipped text, no script errors).

## 0.13 (web)
- One upper group: the cover (or lyrics), the visualiser and the covers row now sit together in the upper part of the screen. The free space is shared equally above the cover, between the wave and the covers row, and between the row and the lower group. The wave crosses the bottom edge of the cover, in front of it, for depth. The covers row stays close to the wave.
- The lower group (capsule, title, seek bar, controls) rests at the bottom as before.
- Quiet mode keeps the top bar's space, so the cover and wave move less. With the info card showing, the wave still rises a little (the card needs room).
- Checked: the glow (3 px, white on light, near-black on dark) is active on the cover and the lyrics in both themes.

## 0.14 (web)
- Quiet mode: the lower group (capsule, title, seek bar, controls) now keeps its full size and rests at the very bottom, fixed. Before, it shrank to 80% and floated up, leaving empty space beneath it.

## 0.15 (web)
- Two groups. Upper: the cover (or lyrics) and the wave, centred in the space above the covers row. Lower: the covers row joins the capsule, title, seek bar and controls at the bottom, at full size. In quiet mode the info card now sits above the covers row.
- Sizes matched to 0.12.12 (checked at 390×859): cover 266 px (was 265), small album art 125 px, covers-row tiles 45 px and 58 px for the current one, capsule 88×26, title 25.7 px, seek bar and controls the same. The earlier 0.13 had shrunk the cover to 234 px and the small art to 105 px; both are restored.
- In quiet mode the cover now stays the same size as in the normal screen (before it grew to 311 px), and the wave moves only a few pixels.

## 0.16 (web)
- Permanent standard sizes. Lower group (covers row, capsule, title, seek bar, controls) at 90%. Big cover about 30% larger (343 px on a 390 px screen, was 265). Info card at 75%.
- The cover-or-lyrics and wave group always stays centred between the top bar and the covers row, in normal, quiet and Calm Minimal screens. Quiet mode keeps the same positions as the normal screen.

## 0.17 (web)
- Phase 3 combination audit. 128 combinations of album art, small art, Calm minimal, companion, visuals, info card and lyrics were checked in normal and quiet screens at 360×640, 390×859 and 412×830, light and dark. No overlaps, clipping, off-screen items or errors. Queue, song editor, DJ and Lofi screens were checked in four screen variants.
- Fixed: turning Lofi on while DJ was on left the music silent and kept the quiet and black screens from starting. Lofi now resumes playback at once.

## 0.18 (web)
- **Learning (new, `taste.js`).** The app learns on the phone which songs you like, how much and when. Nothing is sent out.
  - Skips: 12 bands of 10 s (0–120 s, scaled for short songs). The sooner the skip, the stronger and longer the song rests (up to 30 days, and it returns slowly). Accidental taps (under 1 s) and runs of 3+ skips count less.
  - Likes: whole plays, replays, rewinds, hearts, songs chosen by hand (which also forgives an earlier skip), and the answers to a rare 5-second question.
  - Time of day: 8 slots of 3 hours per song. Old feelings fade (likes about 30 days, dislikes about 21 days).
  - Used by: shuffle (weighted, with some room for surprise), DJ mode (the choice of the next section) and a new Auto list "For you now" (after about 25 plays).
  - Settings > What the app has learned: stage, patterns in words, skip histogram, likes now, resting songs with "Bring back", two switches, and "Clear what it has learned".
  - The 5-second question appears after a whole song, at most every 3 days, and rarer if ignored. It is a pale-yellow tip banner with a 5-second line.
- Phase 4 long-session run (270 s, 100 cycles of skips, tabs and quiet screens): heap flat at about 3.3 MB, timers constant, covers row capped at 61 buttons.

## 0.19 (web)
- **Adaptive visualisers.** All visualisers now fit each song: loud songs are scaled down so the waves are not stuck at the top, and calm songs (ASMR) are opened up so the rise and fall stays visible. Each song's loudness profile is learned in its first seconds and saved (`mp_loud`), so the next play fits from the first frame.
- **Lights:** 48 columns of LEDs, each a 2:1 rectangle. Off is dark, on is bright with a glow. A white peak LED waits, then falls. Dark glass panel with depth.
- **Bars:** colour now runs from bottom to top. White peak caps wait at the top, then fall. Light on the left, shade on the right, shadow and reflection.
- **Wave:** adaptive height, shadow and a thin highlight.
- **Quiet seek-bar waveform:** faster (attack and release), uses the full bar height, with a reflection and an edge light.
- **Queue:** drag the grip to move a song. Hold a row for Play next or Move to end.
- **Volume swipe:** swipe up or down on the cover. A small level bar shows the value.
- **Moods:** new Auto lists Late night, Focus and ASMR (from tags and names, or a very calm learned profile). Search understands "asmr", "focus", "late night".

## 0.20 (web)
- **Pixel art:** Bars and Lights are now pixel art. Bars are stacks of square pixels with the colour stepping from bottom to top. The white peak pixel waits, then falls, and never rises above the top row (one row above the tallest bar). Lights show only the lit LEDs (2:1), with the same top-row limit for the white peak LED. Wave and Tide stay smooth.
- **Clear background:** All visualisers draw on a transparent layer. No panel, shadows, reflections or 3D shading. The wave is back to its two plain lines.
- **Response:** Every band is now scaled on its own to the song, so loud songs no longer fill every bar and calm songs still move. Rising and falling are faster (about 2× on bands, faster peak fall). In a beat-track test the bars swing about 4× more per beat than in 0.16.
- **Seek-bar waveform:** Back to 0.16's size: 7 px above and 7 px below the baseline, 3 px bars with 2 px gaps, rounded. It follows the sound directly and quickly.

## 0.21 (web)
- **Auto playlists you can change.** Open any Auto list, tap Edit to remove a song or pin it to the top, and tap Add songs to search and add one. Changes are kept when the list refreshes. A banner says the list is changed, and "Reset to automatic" undoes it. A list stays visible even when you remove songs until it is empty.
- **Learning from your changes.** For the feel lists (Calm, Lively, Late night, Focus, ASMR) each removal or addition teaches the app how that list looks to you (energy rank, learned loudness, length). Songs nearer to what you removed leave the list, and songs nearer to what you added join it, after about 3 changes.
- **ASMR.** Tag, title, album, artist and file name decide first. The measured loudness (dB profile) and energy come second, and your changes override both.
- **Questions when unsure.** About a song you are hearing, the app asks at most 3 times a day (and not more often than every 4 hours): "Does this belong in …?" with Yes, No and Not sure. It uses the same pale-yellow banner, and follows the "Ask a quick question" switch.

## 0.22 (web)
- **Play button, Lofi:** hold the button (without sliding) to keep only the sounds underneath (rain, thunder, birds and so on). The music and effects stop, a soft ring shows the state, and a short tap then pauses or plays just those sounds. Hold again to return to full Lofi. Outside Lofi the button is unchanged, and DJ mode is untouched. The state resets on a new song, when you leave Lofi and when the app closes.
- **Switch mode from the play button:** hold and slide up to Normal, Lofi or DJ, then release. Settings → Playing and sound → "Tap, then hold to switch mode" (off: hold and slide, on: tap once, then hold and slide).
- **System pause:** the sounds underneath now follow the music's own pause and play at once, also from the lock screen, a headset or another app that takes the audio.
- **DJ mode:** the cover, lyrics, info card and heart now follow the section that is playing.
- **Disc viz:** works without the "Visuals move with the music" switch and uses the Wave behind the disc.
- **Bars:** tiny square pixels (2 px, 1 px gap) form solid bars, clearly different from the larger glowing LEDs.

## 0.23 (web)
- **Mode choice on a real finger:** the play button now keeps the touch, so sliding to Normal, Lofi or DJ no longer cancels the choice. Each pill has a small icon.
- **Play button taps:** a single tap waits about 0.35 s for a second tap, then plays or pauses. A double tap mutes or unmutes everything (a slash draws across the volume icon); raising the volume lifts the mute.
- **Tap, then hold** (Settings, a switch with a small picture): the second press opens the mode choice and the first tap never toggles playback.
- Fewer words: the mode and Lofi changes show themselves (pill, ring, slash) and no longer pop up messages.

## 0.24 (web)
- **Play a DJ song in full:** while DJ mode plays, a small pill at the top left shows a mini timeline of the song with the part you are hearing highlighted. Tap it to leave DJ mode and play that whole song from the start. Your queue is kept.
- **Found by DJ (Auto list):** songs the DJ played to the end, that you have not played yourself since.
- **Forgotten gems (Auto list, replaces "Not played yet"):** songs never played, or not played for two months. Songs found by the DJ come first, then never-played ones, then the longest unplayed. Edits you made to the old list are kept.

## 0.25 (web): smart playlists
- **Library → Playlists → Smart · always fresh.** Make a playlist from rules that keep it up to date by themselves. Start from an idea (Calm evenings, Loved but not heard lately, New and unplayed, Weekend favourites, Long listens) or from nothing.
- **18 rules in three groups.** Listening: last played, play count, favourite, rating, liked now (what the app has learnt), found by DJ. The song: artist, album, genre, length, quality, folder, words. Feel and time: feel (calm, lively, late night, focus, ASMR), loudness, time of day, day, date added. Each tile shows how many songs it can speak about.
- **The builder shows as you build:** a live number and a cover mosaic, and each rule has a bar and a count of how many songs it matches alone. Choose Match all or Match any, a limit (up to 200 or no limit), and an order (most liked, random, newest, longest unplayed).
- **Keeps refreshing** (on by default). Turn it off to keep the playlist as it is now.
- Lists are worked out when you open Library or a list, never during playback. A test with 5000 songs and five rules took about 2.5 ms.
- Not included: a Year rule (the app does not store years yet). Auto lists keep their own engine, with their editing and learning, and sit under "From your listening".

## 0.26 (web): skins
- **Skins.** The app is a fixed skeleton (layout, sizes, gestures) with a skin on top: materials, colours, shapes, type and the visualiser palette. Choose one in Settings → Appearance → Skin, with a small live picture of each. A skin is a stylesheet plus a short entry in `skins.js`; anything it leaves out falls back to Glass, so an unfinished skin cannot break the app. To add a skin: add a stylesheet in `skins/` and one entry in `skins.js`.
- **Glass** is the current look, unchanged.
- **Winamp Classic 3** (redrawn in 0.27 from your reference): graphite brushed metal in a 2 px frame, copper twin-line title strips with pixel capitals, silver bevelled keys that press in (sunken, no movement), joined tab keys with the current one pressed, a black LCD plate with green pixel title and digits, a capsule seek groove with a three-grip silver thumb, LED squares on toggles and switches, a black list in cream text with a peach selected row, dashed dB-style dividers in Settings, and a tan stepped spectrum. One look (dark). The layout and sizes of the app are untouched.
- Fonts bundled for it: VT323, DSEG7 Classic and Silkscreen (all SIL Open Font Licence).
- **Volume panel fix:** the closed panel is now completely inert. Its invisible slider thumb used to catch touches and bring the panel back by itself.

## 0.29 and 0.30
- **Year**: stored for every song (file tag, original-release tag first, then a year in the file name), shown and editable in the song sheet with three confidence pips; tap them to see which sources agreed. New smart-playlist rule "Year" (decades and "Year unknown"). Album pages show the year or span of years.
- **Queue**: Tidy (icon in the queue sheet): remove played, remove repeats, keep next 10, 25 or 50, clear all but this song, each with a live count and Undo. Starting an album, artist, playlist or smart list while a queue exists asks Replace or Add; Replace offers to save the old queue under a fitting name (album, "Artist mix", or "Evening mix · 16 Nov"). "Always replace" tick in that panel and in Settings; an "Ask again" button shows for 6 seconds after each automatic replace.
- **Night volume**: once a night, from the chosen hour (default 11 PM), the app volume eases to the night level (default 7%). A yellow tooltip message stays until you tick it, undo it or swipe it away. A raise by hand is never overridden; the earlier level returns at the chosen morning hour (default 5 AM) or at the first open after. Settings: on/off, start hour, level, return hour.
- **Thunder**: built from all five recordings (a crack, a rumble and sometimes a far echo, each with its own pitch, softness, distance and stereo place; no trio repeats soon). Heavier rain gives louder, closer storms. It now sits clearly above the rain.
- **Details engine**: iTunes, MusicBrainz and Deezer each offer candidates, scored by title, artist and length; the best leads, agreeing sources raise confidence. The year is the earliest year that at least half the weight supports, so reissues do not win. Fills year, album, genre, track number and cover. Manual edits always win, "Restore original details" goes back to automatic, and "Keep details fresh automatically" now also fills songs quietly in the background (confident matches only, empty slots only, each song once a week).
- **Optimisation (0.31 nord5)**: one switch in Settings, wordless (green dot = steady, amber = the app has eased the stars and seek dots because the phone is warm, grey = off; a tiny frame trace beside it). On by default. It draws the same pixels more cheaply: stars and seek dots at 30 frames a second (15 when warm), the play-button ripple layer cleared only when something was drawn, and settings and position writes gathered and sent to storage together (every 20 s at most, and at once when the app is hidden or closed). Warmth comes from the phone's pressure reading where Chrome offers it, otherwise from frame-time drift. Off = exactly the 0.30 behaviour. Separate from Power saving. Internal version `0.31 nord5`: a tuned profile for the OnePlus Nord 5, the same program.
- **0.32 nord5**: with Optimisation on, background song lookups run in bursts of four songs then rest 3 s (MusicBrainz still gets at most one request a second; its pacing was also made safe for overlapping calls), and the background refresh waits for an idle moment. Off = one song, then a 0.9 s pause, as in 0.30.
- **0.33 nord5**: with Optimisation on, background and counting data (plays, loudness, song details, the saved position) waits in memory and is written once per new track, when the app is hidden or closed, and every 10 min at most. Things you chose (ratings, playlists, favourites, settings) are saved at once. While music plays, background song lookups run four songs, then the radio rests until the next song starts.
- **0.34 nord5**: background artwork and automatic song details (the library's own database) also wait in memory with Optimisation on, and go to disk in one write per new track, when hidden or closed, or every 10 min. Songs you add and edits you make are saved at once.
- **0.35 mi11x**: first build tuned for the Xiaomi Mi 11X (Snapdragon 870, older and warmer than the Nord 5). Same program and same Optimisation switch; the profile (`window.MP_DEVICE` in engine.js, `V.profiles` in viz.js) eases effects sooner when warm and draws the quiet layers (stars, seek dots) at 25 frames a second (12 when warm) instead of 30 (15). Check: the Library list differs between Optimisation on and off by no more than between two runs with it off, so the switch changes nothing you can see except its own row.
- **0.36 nord5 (sound engine 2)**: Lofi background sounds rebuilt. Sounds are planned 4 s ahead (up to 10 s if the phone is busy) on the audio clock, with the timer in a Worker; recordings are decoded once and kept in memory; beds are three overlapping voices with their own pitch, brightness and place, choosing the least recently heard parts of the recording; birds are cut into single calls and sung in small flocks; a watchdog resumes suspended audio, rebuilds a stalled engine, retries failed downloads with growing waits, and plays a made sound meanwhile so it is never silent. `Amb.health()` reports state, seconds scheduled ahead, late count, restarts and fallbacks. Test (headless, 34 s each): with the recordings blocked the old engine was 100% silent and the new one 0%; after a 4 s suspension the old engine stayed silent and the new one resumed; under heavy screen load both held steady.

- **0.37 nord5 (library safety)**: the backup now also holds every song's details (title, artist, album, year, genre, lyrics, hand-edit marks) and covers. When songs are added again (after a reset or a removed folder) each one gets its details back, matched by file name and size, then by content, so renamed files still match. Details of removed folders and purged songs are kept aside in the app for the same reason. First-launch card guides adding everything in one go (Select all in the picker, or Add a whole folder where the phone allows it); songs are added in the background with progress. New Backup and data row "Songs with details inside": zip files (about 400 MB each) of copies with ID3 tags and cover written into MP3s; other formats are copied as they are and listed in a table; a list of originals you may delete is inside. Limits: the web app cannot write into the original files, scan folders on its own, remember folders or delete originals; that is for the native app.

- **0.38 nord5 (gapless + folder add)**: songs now join with no audible gap. Two players take turns: the next song is read ahead and waits ready; it starts a few milliseconds before the current one ends (the start lead adapts to the phone, 8 to 120 ms). The browser already trims MP3 encoder padding. Measured in a tone test: old gap about 110 ms plus fade-in; now 0 gap and 0 overlap at 5 to 20 ms lead, and 41 ms at worst if the timer is late (screen off). Used only on natural song ends; Next, Previous, crossfade, repeat one, Lofi and DJ behave as before. The + button now opens a small chooser with **Add a whole folder** first and **Add songs** second, so files in many places can be added one location at a time. Limits: tested in desktop Chrome with tones, not yet on a phone; the folder picker depends on Chrome Android supporting folder choice.

- **0.39 nord5**: Settings, Playing and sound, new **Gapless** switch (on by default) with a live count for this session: exact joins, late joins, and joins that fell back to a pause. Lets you see on the phone whether gapless is working.

- **0.40 nord5 (Goal and Budget themes)**: Settings, Appearance, new Theme grid with the shared palettes: Light, Dark, Phone, Royal Gold, Midnight Forest, Deep Ocean, Ember Dusk, Graphite (the five dark ones are fixed and bring their own accent). New Accent choice (Sapphire or Champagne Gold) for Light, Dark and Phone. On the five dark themes and Gold, Colours from album stop tinting the accent so the theme stays itself; DJ and Lofi keep their own atmospheres. Not ported yet: Aurora, Paper and the nature themes (scenes and textures).

- **0.41 nord5 (ReplayGain and clutter)**: loudness tags are read from MP3 (ID3 and LAME), FLAC and Ogg comments, M4A and APE, at adding and once in the background for existing songs; a tagged song is levelled from its tag (limited by its peak) and never measured, which saves battery. Songs without a tag are measured as before. Clutter: when adding, short clips (default under 30 s, slider 10 to 90 s), voice notes, ringtones, recordings and system sounds are left out, with a count in the message; Settings, Clean up (formerly Duplicates and removed) lists what already looks like clutter and moves it to Recently removed in one tap (restorable for 7 days). Limits: album gain and Opus R128 tags are not used yet; names are matched in English patterns.

- **0.42 nord5 (Lofi repeat fix, thunder, sound health)**: Lofi mode used a prepared slowed copy of the song; when a song ended with the screen off, the app was slow to tell Lofi about the next song, so the old song's copy played again until the screen came on. Lofi is now told by the player itself at once, and a prepared copy is used only for the song it belongs to. Thunder is now made ahead of time into one finished sound (three recordings blended offline) so the live engine only plays a single source. The Lofi screen shows a quiet line: recordings loaded, made sounds in use, late ticks, restarts. Not done yet: seam fades for the beds (still queued); the cause of the thunder break on the phone is not confirmed, the new line will help find it.

- **0.43 nord5**: Settings, Online details, Google pictures: the Add/Change button did nothing because its handler lived in the Library page's click handler. Moved to a shared function reachable from Settings; the key and search engine ID are typed on the phone and stay there.

- **0.44 nord5 (see what was fetched, search by words, My sounds)**: The picture chooser now has a words box and Search button, a row of source chips (Google, iTunes or Deezer, TheAudioDB, Wikimedia, Openverse) each with a count or a plain reason it failed, a Try again button, and a small letter badge on each picture naming its source. Settings, Online details, shows a Google status line with a Test button and a "How the sources are doing" card (good/failed counts, last reason, time taken). TheAudioDB now uses the shared free key 123 (the old key 2 was rejected) and an optional personal key can be set; its failures are explained, not hidden. In the Lofi tab of Modes: Add my own sound reads a file, trims quiet ends, levels it, decides if it is a steady background or separate sounds (cut out one by one), shows its shape, asks name and description, and adds it to the mixer. Mixes can be saved with a name, and two more app mixes were added. Sounds are stored in a new database store (database version 2); backups keep names and mixes, not audio. Limits: 10 minutes per sound, 80 MB per file; TheAudioDB and Google could not be reached from the build sandbox, so they were tested with mocked replies.

- **0.45 nord5 (Google and Openverse removed)**: Google refuses new keys for image search, and Openverse pictures carry copying conditions, so both are gone (settings, code and tests). Albums now search iTunes (paged), Cover Art Archive through MusicBrainz (only covers that really exist are shown) and TheAudioDB; artists search Deezer (paged), TheAudioDB and Wikimedia Commons. Source chips and letter badges (i, C, D, A, W) remain, plus the words box. Settings, Online details: "Pictures still missing" lists artists and albums with no picture, most played first, each opens the chooser; an optional personal TheAudioDB key. Fixed picture tiles overlapping in a short sheet.

- **0.46 nord5 (sounds that move)**: In the Lofi tab, every background sound now pans slowly and separately between your left and right ears (switch "Pan by itself" and a "How far" slider). A new "Right now" card shows each playing sound with a dot moving left and right and a bar rising and falling with its volume drift, plus the Sound health line (recordings loaded, late, restarts) with a green or red dot, so it is no longer hidden. Settings seen on your phone: TheAudioDB works; Deezer and MusicBrainz fail now and then.

- **0.47 nord5 (tidy-up and gentler loops)**: The Winamp skin and the whole skin system are removed (files, fonts, picker, code); anyone who had Winamp selected returns to their normal theme. Themes stay. Sound beds now start and end each stretch at a quiet moment of the recording and cross-fade for a different length every time: long and soft for steady sounds such as rain, short for rhythmic ones. My sounds: for "separate sounds" recordings, Edit now lists the sounds found (by time) and you can tap any to leave it out; at least three must stay.
