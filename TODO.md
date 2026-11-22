# To do (Rustam's Music)

## Now: device builds
Rule: a device-specific build carries the device in the internal version tag and in the zip name (for example `0.31 nord5`, `rustams-music-web-0.31-nord5.zip`).
1. OnePlus Nord 5 (primary): Snapdragon 8s Gen 3, Adreno 735, LPDDR5X, UFS 3.1. First pass done in 0.31 nord5 (stars and dots frame cap, ripple clear, batched writes, heat easing). Network bursts, idle start and write-once-per-track done in 0.32-0.33. Background IndexedDB writes batched in 0.34. Still to do: real-phone readings (the lookup timing could not be shown clearly in the test browser).
2. Xiaomi Mi 11X (secondary): first profile built in 0.35 mi11x; needs real-phone readings. The Nord 5 build is 0.34 nord5 (same code, tag nord5).

## Next releases (agreed order)
- 0.37 Gapless playback: preload the next song, then an exact join with the encoder padding trimmed.
- 0.38 Goal and Budget light and dark themes as a Theme choice (files received: Goal 6.05c, Budget 3.04c).
- 0.39 ReplayGain tags and the clutter filter (short clips, system sounds).
- 0.40 Soundscape finishing: health dot, more recordings for variety, root cause of the jitter on the real phone, optional pre-rendered chunks if still needed.
- Later: large-library real test, online music (opt-in), Auto lists on the smart engine, real-use tuning, Phase 5 consistency, SD card folders (needs the native app).

## After the device work
- Gapless playback for natural song changes.
- Read ReplayGain tags from files (the app's own loudness levelling stays as the fallback).
- Remember SD card folders (needs the parked native Android app).
- Clutter filter: short clips and system sounds.
- Test large libraries on real data.
- Online music, opt-in.
- Phase 5: consistency across Goal, Budget, Habit and Music (needs the latest files of the other apps).
- Phone-only checks: gapless join on a real phone (the start lead adapts; check by ear on a live album), folder picker on Chrome Android, phone call, unplugged headphones, battery statistics, Lofi sounds with the screen off after a hold, the 0.35 s tap wait.
- Real-use tuning: Taste weights, Auto lists, smart-playlist rules.
- Move Auto lists onto the smart-playlist engine.

## Native app (needs the parked Android project)
- Scan chosen music folders at first launch and add everything in the background; remember folders (including SD card).
- Write tags and covers straight into the original files; if a file is read-only, offer one-click tagged export to one folder and an option to delete the untagged originals.
- Tagged export for non-MP3 formats (m4a, flac, ogg).

## Themes still to port from Goal and Budget (saved 2026-11-20)
- Aurora, Paper (colour, texture, dot grid, graph, ruled lines, margins) and the eleven nature themes with their scenes and light/dark palettes; one look per theme.

## Paused
- New skins: on hold by Rustam (18 Nov 2026). Mockups explored (Folio, Aurora Glass, Andalusian arabesque, Studio dashboard style); nothing was added to the app.

## After 0.44 (saved 2026-11-21)
- My sounds: edit cut sections by hand (remove single sounds), loop-point seam fades, sounds inside DJ mode, include audio in backups.
- Pictures: confirm TheAudioDB CORS and Google key on the phone using the health card; if Google is closed to new keys, offer Bing or Pexels alternative.
- 0.45 done: Google/Openverse removed. Still open: confirm TheAudioDB and Cover Art Archive images save on the phone (health card); My sounds items from 0.44 list.
- 0.46 done: auto pan + live view. Next: seam fades for beds, manual removal of cut sounds, My sounds in DJ, phone jitter.
- 0.47 done. Principle: improvement is continuous, no feature freeze. Next: 0.48 reliability (large library, phone jitter, audit), 0.49 smart parts (Auto lists on smart engine, tuning), later skins/themes (Aurora, Paper, nature) and new features.
- 0.48 done. Lesson: after removing a system, test every theme and accent. Next: 0.49 reliability (large library, phone jitter, audit), then smart parts.
- 0.49 done: echo blur baked in canvas. Open: confirm on phone that jitter is gone; first-open stall on huge libraries (350 ms at 20,000 songs); then smart parts (Auto lists on smart engine, tuning).
- 0.50 done. Not yet: stop after this song, drag to reorder inside playlists (arrows used), adding songs to smart playlists (rule based; copy to a playlist instead), Auto lists on smart engine (0.51), tuning.
- 0.51 done. Open: phone check of strip with a real cover and long titles; light-glass depth feel on the phone; apply edge style to remaining small round glass buttons; Auto lists on smart engine, tuning; stop after this song; drag reorder in playlists.
