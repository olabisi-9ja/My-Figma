import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Lightbulb, X } from 'lucide-react'

export type TourStep = {
  title: string
  body: ReactNode
  selector?: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Canvasly 👋',
    body: 'Your offline design workspace — everything is saved on this device, no account needed. This 90-second tour shows the essentials. You can replay it anytime from the Tips button.',
  },
  {
    title: 'Your projects live here',
    selector: '.file-control',
    body: 'Click the project name to switch, create, rename, or delete local projects, import backups, and install Canvasly as an app.',
  },
  {
    title: 'Tools',
    selector: '.toolbar',
    body: 'Move (V), Frame (F), Rectangle (R), Ellipse (O), Pen (P), Text (T), and Hand (H). Pick a tool, then click the canvas to place it. The Comment tool pins a note to a layer.',
  },
  {
    title: 'The canvas',
    selector: '.canvas-area',
    body: 'Click a layer to select it, drag to move it. Use the Hand tool (or middle mouse button) to pan, and the zoom controls at the bottom-left to zoom.',
  },
  {
    title: 'Layers panel',
    selector: '.left-panel',
    body: 'Every object on the canvas appears here, grouped by section. Click a row to select that layer. The Assets tab holds reusable starter components.',
  },
  {
    title: 'Inspector',
    selector: '.right-panel',
    body: 'With a layer selected, edit its position, size, colors, and text here. The Design tab styles it, Prototype holds comments, and Inspect gives developer-ready values.',
  },
  {
    title: 'Comments & notes',
    selector: '.inspector-tabs',
    body: 'Switch to the Prototype tab to leave comments on layers — handy for capturing feedback without leaving the file.',
  },
  {
    title: 'Canvasly AI — bring your own key',
    selector: '.ai-button',
    body: 'Paste your own OpenAI, Anthropic, or Gemini API key (stored only in this browser) to unlock AI: generate wireframes from a prompt, get a plain-language design review, or rewrite copy on any text layer.',
  },
  {
    title: 'Export your work',
    selector: '.export-wrap',
    body: 'Export the design as SVG, as editable Design JSON, or take a full offline backup of every project.',
  },
  {
    title: 'You’re ready 🎉',
    body: 'Press ⌘/Ctrl+Z to undo anything, and open the Tips button (?) for shortcuts and AI setup help. Have fun designing!',
  },
]

type Rect = { top: number; left: number; width: number; height: number }

function targetRect(selector?: string): Rect | null {
  if (!selector) return null
  const element = document.querySelector(selector)
  if (!element) return null
  const rect = element.getBoundingClientRect()
  if (rect.width < 4 || rect.height < 4) return null
  // Panels slide off-screen on small viewports — treat those as "no target".
  if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) return null
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

export function Tour({ onClose }: { onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [card, setCard] = useState<{ top: number; left: number } | null>(null)
  const step = TOUR_STEPS[stepIndex]
  const last = stepIndex === TOUR_STEPS.length - 1

  useLayoutEffect(() => {
    const position = () => {
      const target = targetRect(step.selector)
      setRect(target)
      if (!target) {
        setCard({ top: Math.max(24, (window.innerHeight - 260) / 2), left: Math.max(16, (window.innerWidth - Math.min(380, window.innerWidth - 32)) / 2) })
        return
      }
      const cardWidth = Math.min(360, window.innerWidth - 28)
      const cardHeight = 240
      const pad = 12
      let top = target.top + target.height + pad
      let left = Math.min(Math.max(14, target.left + target.width / 2 - cardWidth / 2), window.innerWidth - cardWidth - 14)
      if (top + cardHeight > window.innerHeight - 12) top = Math.max(12, target.top - cardHeight - pad)
      if (top < 12) {
        // No vertical room — place beside the target or fall back to center.
        if (target.left + target.width + cardWidth + 24 < window.innerWidth) left = target.left + target.width + pad
        else left = Math.max(14, (window.innerWidth - cardWidth) / 2)
        top = Math.min(Math.max(12, target.top), Math.max(12, window.innerHeight - cardHeight - 12))
      }
      setCard({ top, left })
    }
    position()
    window.addEventListener('resize', position)
    return () => window.removeEventListener('resize', position)
  }, [stepIndex, step.selector])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' && !last) setStepIndex((index) => index + 1)
      if (event.key === 'ArrowLeft') setStepIndex((index) => Math.max(0, index - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  if (!card) return null

  return (
    <div className="tour-overlay" role="dialog" aria-label="Canvasly guided tour">
      {rect && <div className="tour-spotlight" style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} />}
      <div className="tour-card" style={{ top: card.top, left: card.left }}>
        <div className="tour-card-head">
          <span className="tour-step-count"><Lightbulb size={13} /> {stepIndex + 1} / {TOUR_STEPS.length}</span>
          <button aria-label="Skip tour" onClick={onClose}><X size={15} /></button>
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-progress">{TOUR_STEPS.map((item, index) => <span key={item.title} className={index === stepIndex ? 'is-current' : index < stepIndex ? 'is-done' : ''} />)}</div>
        <div className="tour-actions">
          <button className="tour-secondary" onClick={onClose}>{last ? 'Close' : 'Skip tour'}</button>
          <div className="tour-nav">
            {stepIndex > 0 && <button className="tour-secondary" aria-label="Previous tip" onClick={() => setStepIndex((index) => index - 1)}><ChevronLeft size={15} /></button>}
            <button className="tour-primary" onClick={() => (last ? onClose() : setStepIndex((index) => index + 1))}>
              {last ? 'Start designing' : 'Next'} {!last && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
