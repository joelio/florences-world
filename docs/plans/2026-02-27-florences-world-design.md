# Florence's World - Toddler Keyboard Game

## Overview

A browser-based game for Florence (age 2-3) where bashing an old USB keyboard triggers
colourful animations, characters, and synthesized music. The screen is divided into 4
themed quadrants, each mapped to a zone of the keyboard.

## Keyboard Zones

Standard Dell UK keyboard split into 4 zones:

- **Left Zone**: Esc, F1-F4, 1-5, Q-T, A-G, Z-B, Tab, CapsLock, left Shift
- **Right Zone**: F5-F12, 6-0, Y-P, H-;, N-/, Backspace, \, right Shift, Enter
- **Space Zone**: Space bar, Alt, Cmd/Meta keys
- **Special Zone**: Arrow keys, Numpad, Delete, Home, End, PgUp, PgDn, Insert, NumLock

## Quadrant Themes

### Top-Left: Dinosaur Land (Left Zone)
- Green/brown jungle background with volcanoes and ferns
- Events: T-Rex stomps, volcano erupts, pterodactyl flies, eggs hatch
- Audio: Deep percussion, low synth roars, stomping sounds
- Rapid bashing: More dinos, bigger eruptions, screen shake

### Top-Right: Outer Space (Right Zone)
- Dark blue/purple starry background with planets and nebulae
- Events: Rockets launch, planets spin, shooting stars, UFOs appear
- Audio: Spacey synth pads, whooshes, high twinkly tones
- Rapid bashing: Meteor showers, multiple rockets, warp speed effect

### Bottom-Left: Character Parade (Space Zone)
- Bright pastel town/garden background
- Events: Cartoon characters walk/bounce across (penguin, pig, bunny, puppy - original designs)
- Audio: Melodic pentatonic tones, fun bouncy notes
- Rapid bashing: Conga line of characters, builds a tune

### Bottom-Right: Florence's Magic (Special Zone)
- Rainbow/sparkle background
- Events: "FLORENCE" in sparkly letters, fireworks, rainbow waves, hearts and stars rain
- Audio: Celebratory chimes, ascending arpeggios
- Rapid bashing: Full-screen party mode that spills across all quadrants

## Audio Design
- Web Audio API (no external audio files)
- Each zone has a distinct sound palette
- Pentatonic scale base so random notes always sound harmonious
- Sounds layer on rapid presses rather than cutting off
- Volume limiting to protect little ears

## Technical Approach
- Single page: index.html + style.css + game.js
- HTML5 Canvas for animations
- CSS for backgrounds and layout
- Web Audio API for sound synthesis
- Zero dependencies, no build step
- Fullscreen on first interaction

## Toddler-Proofing
- All keys captured (no accidental browser shortcuts)
- Fullscreen mode on start
- No fail states or game over
- Key repeat supported (holding keys keeps triggering)
- Gentle idle animations when not pressing (screen never blank)
- No way to accidentally exit
