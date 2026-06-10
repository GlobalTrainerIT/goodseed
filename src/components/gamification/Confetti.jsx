import { useMemo } from 'react'
import { createPortal } from 'react-dom'

const COLORS = ['#16a34a', '#22c55e', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#fb923c']

/** Lightweight CSS confetti burst. Render when `show` is true. */
export default function Confetti({ show, count = 90 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
      })),
    [count]
  )
  if (!show) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '-5vh',
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            borderRadius: 2,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>,
    document.body
  )
}
