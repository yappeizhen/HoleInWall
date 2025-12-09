# Shapeshift

A "Hole in the Wall" game powered by computer vision. Match your body pose to the approaching wall cutouts before time runs out!

## Features

- **Real-time pose detection** using MediaPipe Pose Landmarker
- **Progressive difficulty** with checkpoints and increasing challenge
- **Lives system** - start with 3 lives, earn more at checkpoints
- **Arcade-style UI** with flashy animations and effects
- **Keyboard controls** - Space/Enter to start, ESC to pause

## Getting Started

### Prerequisites

- Node.js 18+ 
- A webcam
- Modern browser with WebGL support

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How to Play

1. **Start the game** - Click "START GAME" and allow camera access
2. **Get in position** - Stand where your full body is visible
3. **Match the shape** - A wall with a cutout will approach you
4. **Strike the pose** - Match your body to the cyan silhouette
5. **Beat the wall** - Hold the pose until the wall reaches you
6. **Score points** - Better matches = more points!

## Controls

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Start game / Continue |
| `Escape` | Pause / Resume |

## Difficulty Progression

| Checkpoint | Rounds | Wall Speed | Poses |
|------------|--------|------------|-------|
| Warm Up | 1-5 | 4s | Easy poses |
| Getting Started | 6-10 | 3.5s | Easy + Medium |
| Challenge Mode | 11-15 | 3s | Medium |
| Expert Zone | 16-20 | 2.5s | Medium + Hard |
| Master Level | 21-25 | 2.2s | Hard |
| Shapeshifter | 26+ | 2s | Hard + Expert |

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **MediaPipe** - Pose detection
- **Zustand** - State management

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Deploy!

Or use the Vercel CLI:

```bash
npx vercel
```

### Netlify

```bash
npm run build
# Deploy the `dist` folder
```

## Future Roadmap

- [ ] Split-screen multiplayer
- [ ] Online leaderboards
- [ ] Sound effects and music
- [ ] More pose shapes
- [ ] Custom pose editor
- [ ] Mobile touch controls

## License

MIT

