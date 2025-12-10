# Hole in Wall

Webcam game where you mirror the on‑screen outline before time runs out. The app uses TensorFlow MoveNet for real‑time pose detection and overlays shapes on top of your video feed.

## Features
- Live webcam feed with canvas overlay for outlines and pose keypoints
- Randomized hole positions/shapes each round to prevent memorizing
- 10-second countdown per shape with pass/fail feedback and score/lives HUD
- Shape library with triangles, rectangles, and custom polygon letters
- Built with React + TypeScript + Vite; uses TensorFlow.js MoveNet (WebGL backend)

## Prerequisites
- Node.js 18+ and npm
- A webcam and permission to access it in the browser
- Modern browser with WebGL enabled (needed for TensorFlow.js)

## Setup
```bash
npm install
npm run dev
```
Then open the printed localhost URL (Vite defaults to `http://localhost:5173`) and allow camera access.

## How to Play
- Stand so your whole body fits in the camera view.
- Press “Start Game”. A glowing outline appears with a 10s timer.
- Move to fit your keypoints inside the outline before the timer ends.
- You earn points for passes; missing costs a life. Run out of lives to reset.
- Use “Skip” to jump to the next shape.

## Building & Preview
```bash
npm run build   # type-check + Vite build
npm run preview # serve the production build locally
```

## Project Structure
- `src/App.tsx` – game loop, state, and UI controls
- `src/components/VideoOverlay.tsx` – video canvas overlay, HUD, countdown/feedback badges
- `src/game/shapeLogic.ts` – shape definitions, randomization, and pose fitting math
- `src/game/stateMachine.ts` – simple game state helpers
- `src/services/poseDetector.ts` – MoveNet setup (WebGL), pose estimation, disposal

## Privacy & Data
All pose detection runs in the browser; no video or pose data is sent to a server. Camera access is only requested locally and you can revoke it from your browser settings.
