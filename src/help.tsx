import { ArrowUpRight, Keyboard, KeyRound, Lightbulb, Play, Rocket, Sparkles, X } from 'lucide-react'

const SHORTCUTS: [string, string][] = [
  ['V', 'Move / select'],
  ['F · R · O · T', 'Frame, Rectangle, Ellipse, Text'],
  ['H', 'Hand — pan the canvas'],
  ['⌘/Ctrl + Z', 'Undo'],
  ['⌘/Ctrl + Shift + Z', 'Redo'],
  ['⌘/Ctrl + D', 'Duplicate selected layer'],
  ['⌘/Ctrl + S', 'Save local draft'],
  ['Delete', 'Remove selected layer'],
  ['Esc', 'Deselect & close panels'],
]

export function HelpModal({ onClose, onReplayTour }: { onClose: () => void; onReplayTour: () => void }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal help-modal" role="dialog" aria-label="Help and tips" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2><Lightbulb size={17} /> Tips & help</h2>
          <button aria-label="Close help" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="modal-body">
          <section className="help-section">
            <h3><Rocket size={14} /> First-time quick tips</h3>
            <ol className="help-tips">
              <li><b>Everything saves to this device automatically.</b> Close the tab, go offline, come back — your work is still here. Use Export → Offline backup before clearing browser data.</li>
              <li><b>Start from what’s already on the canvas.</b> Click any layer, then change its color, size, or words in the right-hand Inspector.</li>
              <li><b>Add shapes with the toolbar.</b> Press <code>R</code>, click the canvas, then drag the new rectangle into place. <code>⌘/Ctrl+Z</code> undoes anything.</li>
              <li><b>Duplicate instead of rebuilding.</b> Select a layer and press <code>⌘/Ctrl+D</code> to copy it.</li>
              <li><b>Capture feedback with comments.</b> Open the Prototype tab (right panel) or use the comment tool in the toolbar.</li>
              <li><b>Let AI do the heavy lifting.</b> Set up your key once, then generate whole wireframes from a single sentence.</li>
              <li><b>Make it yours.</b> Click your avatar (top bar) to set your name and color, and open <b>AI → Skills</b> to teach the AI your style. Both are saved permanently on this device.</li>
              <li><b>Exporting for other tools?</b> Use SVG (imports into Figma & Sketch), PNG for images, and Design tokens for colors/type. .fig/.sketch files can only be created by those apps themselves.</li>
            </ol>
          </section>

          <section className="help-section">
            <h3><Sparkles size={14} /> Using AI (bring your own key)</h3>
            <ol className="help-tips">
              <li>Click the <b>AI</b> button (sparkles) in the top bar, then <b>Set up AI</b>.</li>
              <li>Pick a provider — OpenAI, Anthropic, Google Gemini, or any OpenAI-compatible endpoint — and paste your API key.</li>
              <li>Press <b>Test connection</b>, then <b>Save</b>. The key is stored only in this browser and is sent only to the provider you chose.</li>
              <li>Now use the three AI actions: <b>generate a wireframe</b> from a prompt, <b>review the design</b> in plain language, or select a text layer and <b>improve its copy</b>.</li>
              <li>To shape how the AI works, open <b>AI → Skills</b>: toggle built-in styles (plain voice, minimal wireframes, mobile-first, accessibility focus) or write your own rules — they’re saved permanently.</li>
            </ol>
            <p className="help-links">
              Get a key: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI <ArrowUpRight size={11} /></a>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Anthropic <ArrowUpRight size={11} /></a>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio <ArrowUpRight size={11} /></a>
            </p>
          </section>

          <section className="help-section">
            <h3><Keyboard size={14} /> Keyboard shortcuts</h3>
            <div className="help-shortcuts">
              {SHORTCUTS.map(([keys, action]) => <div className="help-shortcut-row" key={keys}><code>{keys}</code><span>{action}</span></div>)}
            </div>
          </section>

          <section className="help-section help-section--note">
            <h3><KeyRound size={14} /> Privacy note</h3>
            <p>Canvasly is offline-first: your designs never leave this device. When you use AI, only your prompt and a summary of the canvas go to the AI provider you configured — never to Canvasly itself.</p>
          </section>
        </div>
        <div className="modal-foot">
          <button className="tour-secondary" onClick={onReplayTour}><Play size={14} /> Replay guided tour</button>
          <button className="tour-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
