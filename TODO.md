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
- Phone-only checks: phone call, unplugged headphones, battery statistics, Lofi sounds with the screen off after a hold, the 0.35 s tap wait.
- Real-use tuning: Taste weights, Auto lists, smart-playlist rules.
- Move Auto lists onto the smart-playlist engine.

## Native app (needs the parked Android project)
- Scan chosen music folders at first launch and add everything in the background; remember folders (including SD card).
- Write tags and covers straight into the original files; if a file is read-only, offer one-click tagged export to one folder and an option to delete the untagged originals.
- Tagged export for non-MP3 formats (m4a, flac, ogg).

## Paused
- New skins: on hold by Rustam (18 Nov 2026). Mockups explored (Folio, Aurora Glass, Andalusian arabesque, Studio dashboard style); nothing was added to the app.
