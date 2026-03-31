# gtr-scales

Guitar scale fingering chart generator for exploring modes, symmetric scales, bebop scales, and other scale families across the fretboard.

Live site: [gtr-scales.alesh.com](https://gtr-scales.alesh.com)

## What This Is

`gtr-scales` is a small React app for generating guitar scale charts from a selected root note and scale type. It is designed as a practical reference and practice tool rather than a theory encyclopedia.

## How It Was Built

This app was built in Codex from a lightweight prompt and a series of small visual and UX adjustments. The initial direction was essentially:

- Build a React/Vite app for guitar scale fingering charts
- Let the user choose the root note and mode/scale
- Label each note with its scale degree
- Include extra scale families and short usage descriptions

From there, the project was shaped through iterative feedback on layout, spacing, palette, typography, defaults, and chart clarity.

Technically, the project is built with:

- [React](https://react.dev/) for the UI
- [Vite](https://vite.dev/) for development and bundling
- Plain CSS for layout, styling, and fretboard rendering
- A small local scale/fretboard data model for generating note positions and practice windows

There are no heavy music-theory or visualization dependencies. The scale charts are generated from local pitch-class and interval data in the app itself.

Typography uses IBM Plex Sans and IBM Plex Serif from Google Fonts.
