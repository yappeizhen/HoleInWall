import './GameHUD.css'

interface GameHUDProps {
  round: number
  score: number
  lives: number
  matchScore: number
  wallProgress: number
}

export function GameHUD({ round, score, lives, matchScore, wallProgress }: GameHUDProps) {
  const timeRemaining = Math.max(0, Math.ceil((1 - wallProgress) * 100))
  const matchQuality = getMatchQuality(matchScore)

  return (
    <div className="game-hud">
      {/* Top bar */}
      <div className="hud-top">
        <div className="hud-stat">
          <span className="hud-label">ROUND</span>
          <span className="hud-value font-display">{round}</span>
        </div>

        <div className="hud-stat hud-score">
          <span className="hud-label">SCORE</span>
          <span className="hud-value font-display">{score.toLocaleString()}</span>
        </div>

        <div className="hud-stat">
          <span className="hud-label">LIVES</span>
          <div className="hud-lives">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`life-heart ${i < lives ? 'active' : 'empty'}`}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="hud-progress-container">
        <div className="hud-progress-bar">
          <div
            className="hud-progress-fill"
            style={{ width: `${wallProgress * 100}%` }}
          />
        </div>
        <span className="hud-timer">{timeRemaining}%</span>
      </div>

      {/* Match indicator */}
      <div className="hud-match">
        <div className="match-status" data-quality={matchQuality}>
          <span className="match-status__dot" />
          <span className="match-status__text">{getMatchStatusText(matchScore)}</span>
        </div>

        <div className="match-ring" data-quality={matchQuality}>
          <span className="match-score font-display">{matchScore}%</span>
        </div>
        <span className="match-label">{getMatchLabel(matchScore)}</span>
      </div>
    </div>
  )
}

function getMatchQuality(score: number): string {
  if (score >= 70) return 'good'
  if (score >= 50) return 'close'
  return 'far'
}

function getMatchLabel(score: number): string {
  if (score >= 85) return 'PERFECT!'
  if (score >= 70) return 'GOOD!'
  if (score >= 50) return 'CLOSE...'
  return 'KEEP MOVING!'
}

function getMatchStatusText(score: number): string {
  if (score >= 85) return 'Aligned!'
  if (score >= 70) return 'Almost there'
  if (score >= 50) return 'Adjust a bit'
  return 'Keep matching...'
}

