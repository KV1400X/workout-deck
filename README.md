# Workout Deck

Shuffle a 52-card deck, draw one card at a time, do the reps. Each suit is an exercise; the card value is the rep count.

Live: https://kv1400x.github.io/workout-deck/

- 6 presets plus your own presets: save, edit (✎), rename, delete. Custom presets keep suits, card values, multiplier, jokers and rest time
- Per-suit exercise, unit and multiplier; J/Q/K/A values, "face cards = X" option, global multiplier
- Optional 2 jokers as bonus cards
- Fisher-Yates shuffle, no repeats until "Shuffle all"
- Rest timer (default 30s, −/+ or type it in setup): counts down, then flips the next card. Vibrates and flashes at 0; cancel or skip anytime
- Workout timer starts on the first card flip, timestamp based so it survives screen lock and reload
- No sounds at all, so Spotify / Apple Music keep playing
- Cards left, per-exercise totals, history, finish screen
- Saves everything in localStorage; installable PWA, works offline, keeps screen awake

Plain HTML/CSS/JS, no build step.
