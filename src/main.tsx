/* Canvasly — your creative life, in one place.
 *
 * This file is the workspace shell: the personal creative operating system
 * around the design editor. It owns the global navigation
 * (Home · Ideas · Design · Systems · Library · Journal · Archive)
 * while `editor.tsx` stays a focused production environment.
 * Everything is local-first: IndexedDB + localStorage on this device. */

import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Archive as ArchiveIcon,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Dna,
  Home as HomeIcon,
  Layers3,
  Library as LibraryIcon,
  Lightbulb,
  Link2,
  NotebookPen,
  Palette,
  PenTool,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Editor } from './editor'
import { getProjects, makeProject, putProject, type LocalProject } from './storage'
import {
  ASSET_KINDS,
  IDEA_COLORS,
  IDEA_KINDS,
  deleteAsset,
  deleteIdea,
  deleteJournalEntry,
  deleteSnapshot,
  getAssets,
  getIdeas,
  getJournal,
  getSnapshots,
  makeAsset,
  makeIdea,
  makeJournalEntry,
  putAsset,
  putIdea,
  putJournalEntry,
  type AssetItem,
  type AssetKind,
  type Idea,
  type IdeaKind,
  type JournalEntry,
  type Snapshot,
} from './spaces'
import { brandTokensJson, loadBrandKit, saveBrandKit, spacingScale, type BrandKit } from './systems'
import { DEFAULT_DNA, DNA_FIELDS, dnaIsEmpty, loadDna, saveDna, type CreativeDna } from './dna'
import { initialsFromName, loadProfile } from './personalize'
import './styles.css'

type Space = 'home' | 'ideas' | 'design' | 'systems' | 'library' | 'journal' | 'archive'

const NAV: { id: Space; label: string; icon: JSX.Element; hint: string }[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon size={16} />, hint: 'Your creative dashboard' },
  { id: 'ideas', label: 'Ideas', icon: <Lightbulb size={16} />, hint: 'Capture before you design' },
  { id: 'design', label: 'Design', icon: <PenTool size={16} />, hint: 'The canvas editor' },
  { id: 'systems', label: 'Systems', icon: <Palette size={16} />, hint: 'Brand kit, tokens & DNA' },
  { id: 'library', label: 'Library', icon: <LibraryIcon size={16} />, hint: 'Your personal assets' },
  { id: 'journal', label: 'Journal', icon: <NotebookPen size={16} />, hint: 'Document the process' },
  { id: 'archive', label: 'Archive', icon: <ArchiveIcon size={16} />, hint: 'Named snapshots' },
]

const LOOP: { space: Space | null; label: string }[] = [
  { space: 'ideas', label: 'Think' },
  { space: 'design', label: 'Design' },
  { space: 'systems', label: 'Systemize' },
  { space: 'library', label: 'Reuse' },
  { space: 'journal', label: 'Document' },
  { space: 'archive', label: 'Archive' },
]

function timeAgo(stamp: number): string {
  const seconds = Math.floor((Date.now() - stamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function dayLabel(stamp: number): string {
  return new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Workspace() {
  const [space, setSpace] = useState<Space>('home')
  const [openProjectId, setOpenProjectId] = useState<string | undefined>(undefined)
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [journal, setJournal] = useState<JournalEntry[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [toast, setToast] = useState('')
  const profile = loadProfile()

  const refresh = async () => {
    try {
      const [p, i, j, a, s] = await Promise.all([getProjects(), getIdeas(), getJournal(), getAssets(), getSnapshots()])
      setProjects(p)
      setIdeas(i)
      setJournal(j)
      setAssets(a)
      setSnapshots(s)
    } catch {
      setToast('Local storage is unavailable in this browser')
    }
  }

  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const enterEditor = (projectId?: string) => {
    setOpenProjectId(projectId)
    setSpace('design')
  }

  const exitEditor = () => {
    setSpace('home')
    void refresh()
  }

  /** Turn an idea into a starter design and open it. */
  const ideaToDesign = async (idea: Idea) => {
    const title = idea.title.trim() || 'New idea'
    const starterNodes = [
      { id: `idea-frame-${Date.now()}`, type: 'rect', name: 'Idea frame', x: 60, y: 60, width: 1320, height: 300, fill: idea.color, radius: 24 },
      { id: `idea-title-${Date.now()}`, type: 'text', name: 'Idea / Title', x: 110, y: 120, width: 900, height: 70, fill: 'transparent', text: title, fontSize: 52, fontWeight: 750, color: '#1C1C1A' },
      { id: `idea-body-${Date.now()}`, type: 'text', name: 'Idea / Notes', x: 112, y: 215, width: 1100, height: 90, fill: 'transparent', text: idea.body.trim() || 'Start designing from this idea.', fontSize: 18, fontWeight: 450, color: '#4C4B46' },
    ]
    try {
      const project = makeProject(title, starterNodes)
      await putProject(project)
      await refresh()
      enterEditor(project.id)
      setToast(`Turned “${title}” into a design`)
    } catch {
      setToast('Could not create the design')
    }
  }

  /** Restore an Archive snapshot as a fresh project. */
  const restoreSnapshot = async (snapshot: Snapshot) => {
    try {
      const project = makeProject(`${snapshot.projectName} — ${snapshot.label}`, snapshot.nodes)
      await putProject(project)
      await refresh()
      enterEditor(project.id)
      setToast('Snapshot restored as a new project')
    } catch {
      setToast('Could not restore the snapshot')
    }
  }

  if (space === 'design') {
    return <Editor requestedProjectId={openProjectId} onExit={exitEditor} onProjectsChanged={() => { void refresh() }} />
  }

  return (
    <div className="os-shell">
      <aside className="os-nav">
        <div className="os-brand">
          <span className="brand-mark brand-mark--static"><span /><span /><span /></span>
          <div><b>Canvasly</b><small>Your creative life, in one place.</small></div>
        </div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`os-nav-item ${space === item.id ? 'is-active' : ''}`}
              onClick={() => item.id === 'design' ? enterEditor(projects[0]?.id) : setSpace(item.id)}
            >
              {item.icon}<span>{item.label}</span><small>{item.hint}</small>
            </button>
          ))}
        </nav>
        <div className="os-nav-foot">
          <span className="avatar" style={{ background: profile.color }}>{initialsFromName(profile.name)}</span>
          <div><b>{profile.name}</b><small>Local-first · everything on this device</small></div>
        </div>
      </aside>

      <main className="os-main">
        {space === 'home' && <HomeSpace
          profileName={profile.name}
          projects={projects}
          ideas={ideas}
          journal={journal}
          snapshots={snapshots}
          onOpenProject={(id) => enterEditor(id)}
          onGo={(target) => target === 'design' ? enterEditor(projects[0]?.id) : setSpace(target)}
          onNewProject={async () => {
            const project = makeProject(`Untitled project ${projects.length + 1}`)
            await putProject(project)
            await refresh()
            enterEditor(project.id)
          }}
        />}
        {space === 'ideas' && <IdeasSpace ideas={ideas} onChanged={refresh} onToDesign={ideaToDesign} setToast={setToast} />}
        {space === 'systems' && <SystemsSpace setToast={setToast} />}
        {space === 'library' && <LibrarySpace assets={assets} projects={projects} onChanged={refresh} onOpenProject={(id) => enterEditor(id)} setToast={setToast} />}
        {space === 'journal' && <JournalSpace entries={journal} projects={projects} onChanged={refresh} setToast={setToast} />}
        {space === 'archive' && <ArchiveSpace snapshots={snapshots} onChanged={refresh} onRestore={restoreSnapshot} setToast={setToast} />}
      </main>

      {toast && <div className="toast"><Check size={15} /> {toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button></div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function HomeSpace({ profileName, projects, ideas, journal, snapshots, onOpenProject, onGo, onNewProject }: {
  profileName: string
  projects: LocalProject[]
  ideas: Idea[]
  journal: JournalEntry[]
  snapshots: Snapshot[]
  onOpenProject: (id: string) => void
  onGo: (space: Space) => void
  onNewProject: () => Promise<void>
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return (
    <div className="space">
      <header className="space-head">
        <div>
          <h1>{greeting}{profileName !== 'You' ? `, ${profileName}` : ''}.</h1>
          <p>Think → Design → Systemize → Build → Publish → Archive. All of it lives here, on your device.</p>
        </div>
        <button className="tour-primary" onClick={() => { void onNewProject() }}><Plus size={15} /> New design</button>
      </header>

      <div className="loop-strip" aria-label="The Canvasly loop">
        {LOOP.map((step, index) => (
          <span key={step.label} className="loop-step">
            <button onClick={() => step.space && onGo(step.space)}>{step.label}</button>
            {index < LOOP.length - 1 && <ArrowRight size={13} />}
          </span>
        ))}
      </div>

      <div className="home-grid">
        <section className="home-card home-card--wide">
          <div className="home-card-head"><h2><Layers3 size={15} /> Recent designs</h2><button onClick={() => onGo('design')}>Open editor <ArrowRight size={13} /></button></div>
          {projects.length === 0 ? <p className="home-empty">No projects yet — create your first design.</p> : (
            <div className="home-projects">
              {projects.slice(0, 6).map((project) => (
                <button key={project.id} className="home-project" onClick={() => onOpenProject(project.id)}>
                  <span className="project-thumb"><Layers3 size={14} /></span>
                  <span><b>{project.name}</b><small>{project.nodes.length} layers · {timeAgo(project.updatedAt)}</small></span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head"><h2><Lightbulb size={15} /> Ideas</h2><button onClick={() => onGo('ideas')}>All ideas <ArrowRight size={13} /></button></div>
          {ideas.length === 0 ? <p className="home-empty">Capture a thought before it disappears.</p> : (
            <ul className="home-list">
              {ideas.slice(0, 4).map((idea) => <li key={idea.id}><span className="home-dot" style={{ background: idea.color }} />{idea.title || 'Untitled idea'}</li>)}
            </ul>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head"><h2><NotebookPen size={15} /> Journal</h2><button onClick={() => onGo('journal')}>Open <ArrowRight size={13} /></button></div>
          {journal.length === 0 ? <p className="home-empty">Document why you made a decision — future you will thank you.</p> : (
            <ul className="home-list">
              {journal.slice(0, 4).map((entry) => <li key={entry.id}><b>{dayLabel(entry.createdAt)}</b> {entry.title || entry.body.slice(0, 48) || 'Entry'}</li>)}
            </ul>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head"><h2><ArchiveIcon size={15} /> Archive</h2><button onClick={() => onGo('archive')}>Open <ArrowRight size={13} /></button></div>
          {snapshots.length === 0 ? <p className="home-empty">Save named snapshots instead of final-final-v4.</p> : (
            <ul className="home-list">
              {snapshots.slice(0, 4).map((snapshot) => <li key={snapshot.id}><b>{dayLabel(snapshot.createdAt)}</b> {snapshot.label} · {snapshot.projectName}</li>)}
            </ul>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head"><h2><Dna size={15} /> Canvasly DNA</h2><button onClick={() => onGo('systems')}>Edit <ArrowRight size={13} /></button></div>
          <DnaSummary />
        </section>
      </div>
    </div>
  )
}

function DnaSummary() {
  const dna = loadDna()
  if (dnaIsEmpty(dna)) return <p className="home-empty">Teach Canvasly your style — type, spacing, colors, voice and stack. Every AI action reads it.</p>
  const filled = DNA_FIELDS.filter((field) => dna[field.key].trim())
  return (
    <ul className="home-list">
      {filled.slice(0, 4).map((field) => <li key={field.key}><b>{field.label}</b> {dna[field.key]}</li>)}
      {filled.length > 4 && <li className="home-more">+ {filled.length - 4} more</li>}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Ideas                                                               */
/* ------------------------------------------------------------------ */

function IdeasSpace({ ideas, onChanged, onToDesign, setToast }: {
  ideas: Idea[]
  onChanged: () => Promise<void>
  onToDesign: (idea: Idea) => Promise<void>
  setToast: (message: string) => void
}) {
  const [draftKind, setDraftKind] = useState<IdeaKind>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [color, setColor] = useState(IDEA_COLORS[0])

  const capture = async () => {
    if (!title.trim() && !body.trim()) return
    await putIdea(makeIdea({ kind: draftKind, title: title.trim(), body: body.trim(), color }))
    setTitle('')
    setBody('')
    await onChanged()
    setToast('Idea captured')
  }

  return (
    <div className="space">
      <header className="space-head">
        <div><h1>Ideas</h1><p>Capture → explore → turn an idea into a design. No blank-file dread.</p></div>
      </header>

      <div className="idea-capture">
        <div className="idea-capture-row">
          {IDEA_KINDS.map((kind) => <button key={kind.id} className={`chip ${draftKind === kind.id ? 'is-active' : ''}`} onClick={() => setDraftKind(kind.id)}>{kind.label}</button>)}
          <span className="idea-colors">
            {IDEA_COLORS.map((swatch) => <button key={swatch} className={`idea-color ${color === swatch ? 'is-active' : ''}`} style={{ background: swatch }} aria-label={`Card color ${swatch}`} onClick={() => setColor(swatch)} />)}
          </span>
        </div>
        <input value={title} placeholder="What's the idea?" maxLength={120} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void capture() }} />
        <textarea value={body} rows={2} placeholder="Notes, references, moodboard links, prompts — anything messy is fine." onChange={(event) => setBody(event.target.value)} />
        <div className="idea-capture-actions"><button className="tour-primary" disabled={!title.trim() && !body.trim()} onClick={() => { void capture() }}><Plus size={14} /> Capture idea</button></div>
      </div>

      {ideas.length === 0 ? <div className="space-empty"><Lightbulb size={22} /><h3>Nothing captured yet</h3><p>Before designing, people think. This is the visual thinking space that turns sparks into projects.</p></div> : (
        <div className="idea-grid">
          {ideas.map((idea) => (
            <article key={idea.id} className="idea-card" style={{ background: idea.color }}>
              <header><span className="idea-kind">{IDEA_KINDS.find((kind) => kind.id === idea.kind)?.label ?? 'Note'}</span><small>{timeAgo(idea.updatedAt)}</small></header>
              <input value={idea.title} placeholder="Untitled idea" onChange={(event) => { void putIdea({ ...idea, title: event.target.value }).then(onChanged) }} />
              <textarea value={idea.body} rows={3} placeholder="Notes…" onChange={(event) => { void putIdea({ ...idea, body: event.target.value }).then(onChanged) }} />
              <footer>
                <button className="idea-design" onClick={() => { void onToDesign(idea) }}><Sparkles size={13} /> Create design</button>
                <button className="idea-delete" aria-label="Delete idea" onClick={() => { void deleteIdea(idea.id).then(onChanged); setToast('Idea deleted') }}><Trash2 size={13} /></button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Systems — brand kit, tokens & Canvasly DNA                          */
/* ------------------------------------------------------------------ */

function SystemsSpace({ setToast }: { setToast: (message: string) => void }) {
  const [kit, setKit] = useState<BrandKit>(() => loadBrandKit())
  const [dna, setDna] = useState<CreativeDna>(() => loadDna())

  const updateKit = (next: BrandKit) => {
    setKit(next)
    saveBrandKit(next)
  }
  const updateDna = (next: CreativeDna) => {
    setDna(next)
    saveDna(next)
  }

  const copyTokens = async () => {
    try {
      await navigator.clipboard.writeText(brandTokensJson(kit))
      setToast('Design tokens copied as JSON')
    } catch {
      setToast('Could not access the clipboard')
    }
  }

  const scale = useMemo(() => spacingScale(kit.spacingBase), [kit.spacingBase])
  const dnaGroups = [...new Set(DNA_FIELDS.map((field) => field.group))]

  return (
    <div className="space">
      <header className="space-head">
        <div><h1>Systems</h1><p>A solo creator still needs a design system. Your brand kit and creative DNA follow you into every project and every AI request.</p></div>
        <button className="tour-secondary" onClick={() => { void copyTokens() }}><Copy size={14} /> Copy tokens JSON</button>
      </header>

      <div className="systems-grid">
        <section className="panel-card">
          <h2><Palette size={15} /> Brand colors</h2>
          <div className="brand-colors">
            {kit.colors.map((color, index) => (
              <div key={index} className="brand-color-row">
                <input type="color" className="native-color" value={/^#[0-9a-fA-F]{6}$/.test(color.value) ? color.value : '#1C1C1A'} onChange={(event) => updateKit({ ...kit, colors: kit.colors.map((item, i) => i === index ? { ...item, value: event.target.value } : item) })} />
                <input className="brand-color-name" value={color.name} onChange={(event) => updateKit({ ...kit, colors: kit.colors.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} />
                <code>{color.value.toUpperCase()}</code>
                <button aria-label="Remove color" disabled={kit.colors.length <= 1} onClick={() => updateKit({ ...kit, colors: kit.colors.filter((_, i) => i !== index) })}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <button className="tour-secondary" onClick={() => updateKit({ ...kit, colors: [...kit.colors, { name: `brand.color-${kit.colors.length + 1}`, value: '#C4B2FF' }] })}><Plus size={14} /> Add color</button>
        </section>

        <section className="panel-card">
          <h2><PenTool size={15} /> Type, spacing & radius</h2>
          <div className="two-up">
            <label className="setup-field"><span>Heading font</span><input value={kit.fontHeading} onChange={(event) => updateKit({ ...kit, fontHeading: event.target.value })} /></label>
            <label className="setup-field"><span>Body font</span><input value={kit.fontBody} onChange={(event) => updateKit({ ...kit, fontBody: event.target.value })} /></label>
          </div>
          <label className="setup-field"><span>Spacing base (px)</span><input type="number" min={2} max={16} value={kit.spacingBase} onChange={(event) => updateKit({ ...kit, spacingBase: Math.max(2, Math.min(16, Number(event.target.value) || 8)) })} /></label>
          <div className="token-strip">{scale.map((space) => <span key={space.name} title={`${space.name} = ${space.value}px`}><i style={{ width: Math.min(space.value, 72) }} />{space.value}</span>)}</div>
          <div className="radius-row">
            {kit.radii.map((radius, index) => (
              <label key={radius.name} className="radius-item">
                <span className="radius-preview" style={{ borderRadius: radius.value }} />
                <small>{radius.name}</small>
                <input type="number" min={0} value={radius.value} onChange={(event) => updateKit({ ...kit, radii: kit.radii.map((item, i) => i === index ? { ...item, value: Math.max(0, Number(event.target.value) || 0) } : item) })} />
              </label>
            ))}
          </div>
          <label className="setup-field"><span>Brand voice</span><textarea rows={2} value={kit.voice} onChange={(event) => updateKit({ ...kit, voice: event.target.value })} /></label>
        </section>

        <section className="panel-card panel-card--wide">
          <h2><Dna size={15} /> Canvasly DNA</h2>
          <p className="panel-note">Design DNA + Brand DNA + Code DNA + AI DNA — one personal creative profile. Every AI action in the editor automatically respects it. Stored only on this device.</p>
          <div className="dna-grid">
            {dnaGroups.map((group) => (
              <div key={group} className="dna-group">
                <h3>{group}</h3>
                {DNA_FIELDS.filter((field) => field.group === group).map((field) => (
                  <label key={field.key} className="setup-field">
                    <span>{field.label}</span>
                    <input value={dna[field.key]} placeholder={field.placeholder} onChange={(event) => updateDna({ ...dna, [field.key]: event.target.value })} />
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="dna-actions">
            <button className="tour-secondary" onClick={() => { updateDna({ ...DEFAULT_DNA }); setToast('DNA cleared') }}><RotateCcw size={13} /> Reset</button>
            <small>{dnaIsEmpty(dna) ? 'Empty — the AI uses only your Skills for now.' : 'Active — appended to every AI request.'}</small>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Library                                                             */
/* ------------------------------------------------------------------ */

function LibrarySpace({ assets, projects, onChanged, onOpenProject, setToast }: {
  assets: AssetItem[]
  projects: LocalProject[]
  onChanged: () => Promise<void>
  onOpenProject: (id: string) => void
  setToast: (message: string) => void
}) {
  const [kind, setKind] = useState<AssetKind>('color')
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const kindMeta = ASSET_KINDS.find((item) => item.id === kind)!

  const add = async () => {
    if (!name.trim() || !value.trim()) return
    await putAsset(makeAsset({ kind, name: name.trim(), value: value.trim() }))
    setName('')
    setValue('')
    await onChanged()
    setToast('Saved to your library')
  }

  const copyValue = async (asset: AssetItem) => {
    try {
      await navigator.clipboard.writeText(asset.value)
      setToast(`Copied ${asset.name}`)
    } catch {
      setToast('Could not access the clipboard')
    }
  }

  return (
    <div className="space">
      <header className="space-head">
        <div><h1>Library</h1><p>Your personal asset universe — colors, snippets, links and prompts you keep reaching for.</p></div>
      </header>

      <div className="library-add">
        <div className="idea-capture-row">
          {ASSET_KINDS.map((item) => <button key={item.id} className={`chip ${kind === item.id ? 'is-active' : ''}`} onClick={() => setKind(item.id)}>{item.label}</button>)}
        </div>
        <div className="library-add-fields">
          <input value={name} placeholder="Name — e.g. Accent lime" maxLength={60} onChange={(event) => setName(event.target.value)} />
          <input value={value} placeholder={kindMeta.hint} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void add() }} />
          <button className="tour-primary" disabled={!name.trim() || !value.trim()} onClick={() => { void add() }}><Plus size={14} /> Add</button>
        </div>
      </div>

      <div className="library-columns">
        <section>
          <h2 className="space-section-title">My assets · {assets.length}</h2>
          {assets.length === 0 ? <div className="space-empty"><LibraryIcon size={22} /><h3>An empty shelf</h3><p>Save the colors, snippets, links and prompts you reuse. They stay on this device.</p></div> : (
            <div className="asset-grid">
              {assets.map((asset) => (
                <article key={asset.id} className="asset-card">
                  {asset.kind === 'color' && <span className="asset-swatch" style={{ background: asset.value }} />}
                  {asset.kind === 'link' && <span className="asset-icon"><Link2 size={14} /></span>}
                  {asset.kind === 'snippet' && <span className="asset-icon"><BookOpen size={14} /></span>}
                  {asset.kind === 'prompt' && <span className="asset-icon"><Sparkles size={14} /></span>}
                  <div className="asset-text"><b>{asset.name}</b><small>{asset.value}</small></div>
                  <div className="asset-actions">
                    <button aria-label="Copy value" onClick={() => { void copyValue(asset) }}><Copy size={13} /></button>
                    <button aria-label="Delete asset" onClick={() => { void deleteAsset(asset.id).then(onChanged) }}><Trash2 size={13} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="space-section-title">My projects · {projects.length}</h2>
          <div className="home-projects home-projects--column">
            {projects.map((project) => (
              <button key={project.id} className="home-project" onClick={() => onOpenProject(project.id)}>
                <span className="project-thumb"><Layers3 size={14} /></span>
                <span><b>{project.name}</b><small>{project.nodes.length} layers · {timeAgo(project.updatedAt)}</small></span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Journal                                                             */
/* ------------------------------------------------------------------ */

function JournalSpace({ entries, projects, onChanged, setToast }: {
  entries: JournalEntry[]
  projects: LocalProject[]
  onChanged: () => Promise<void>
  setToast: (message: string) => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [projectId, setProjectId] = useState('')

  const add = async () => {
    if (!title.trim() && !body.trim()) return
    const project = projects.find((item) => item.id === projectId)
    await putJournalEntry(makeJournalEntry({
      title: title.trim(),
      body: body.trim(),
      projectId: project?.id,
      projectName: project?.name,
    }))
    setTitle('')
    setBody('')
    await onChanged()
    setToast('Journal entry saved')
  }

  return (
    <div className="space">
      <header className="space-head">
        <div><h1>Journal</h1><p>Canvasly doesn't just store the output — it stores the creative process. Decisions, direction changes, client notes, lessons.</p></div>
      </header>

      <div className="idea-capture">
        <input value={title} placeholder="What happened? — e.g. Changed identity direction" maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        <textarea value={body} rows={3} placeholder="Why you made the decision, what you rejected, what to remember…" onChange={(event) => setBody(event.target.value)} />
        <div className="journal-row">
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">No linked project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <button className="tour-primary" disabled={!title.trim() && !body.trim()} onClick={() => { void add() }}><Plus size={14} /> Add entry</button>
        </div>
      </div>

      {entries.length === 0 ? <div className="space-empty"><NotebookPen size={22} /><h3>No entries yet</h3><p>Write down why you made a decision. Six months from now, the “why” is worth more than the file.</p></div> : (
        <div className="journal-list">
          {entries.map((entry) => (
            <article key={entry.id} className="journal-entry">
              <div className="journal-date"><b>{dayLabel(entry.createdAt)}</b><small>{timeAgo(entry.createdAt)}</small></div>
              <div className="journal-body">
                {entry.title && <h3>{entry.title}</h3>}
                {entry.body && <p>{entry.body}</p>}
                {entry.projectName && <span className="journal-project"><Layers3 size={11} /> {entry.projectName}</span>}
              </div>
              <button className="journal-delete" aria-label="Delete entry" onClick={() => { void deleteJournalEntry(entry.id).then(onChanged) }}><Trash2 size={13} /></button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Archive                                                             */
/* ------------------------------------------------------------------ */

function ArchiveSpace({ snapshots, onChanged, onRestore, setToast }: {
  snapshots: Snapshot[]
  onChanged: () => Promise<void>
  onRestore: (snapshot: Snapshot) => Promise<void>
  setToast: (message: string) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Snapshot[]>()
    for (const snapshot of snapshots) {
      const key = snapshot.projectName || 'Untitled project'
      map.set(key, [...(map.get(key) ?? []), snapshot])
    }
    return [...map.entries()]
  }, [snapshots])

  return (
    <div className="space">
      <header className="space-head">
        <div><h1>Archive</h1><p>Named snapshots instead of <code>final-final-v4-really-final.fig</code>. Save one anytime from the editor's Export menu.</p></div>
      </header>

      {snapshots.length === 0 ? <div className="space-empty"><ArchiveIcon size={22} /><h3>No snapshots yet</h3><p>In the editor, open Export → “Snapshot to Archive” to save a named version of any design. Restore it here anytime.</p></div> : (
        <div className="archive-groups">
          {grouped.map(([projectName, items]) => (
            <section key={projectName} className="panel-card">
              <h2><Layers3 size={15} /> {projectName}</h2>
              <div className="archive-list">
                {items.map((snapshot) => (
                  <div key={snapshot.id} className="archive-row">
                    <div><b>{dayLabel(snapshot.createdAt)} — {snapshot.label}</b><small>{snapshot.nodes.length} layers · {timeAgo(snapshot.createdAt)}</small></div>
                    <div className="archive-actions">
                      <button className="tour-secondary" onClick={() => { void onRestore(snapshot) }}><RotateCcw size={13} /> Restore</button>
                      <button className="archive-delete" aria-label="Delete snapshot" onClick={() => { void deleteSnapshot(snapshot.id).then(onChanged); setToast('Snapshot deleted') }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Workspace />)

// The service worker is intentionally registered after the UI mounts. It keeps the
// application shell available when there is no network, while all data lives in IndexedDB.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // The workspace still works online if a browser or dev server blocks service workers.
    })
  })
}
