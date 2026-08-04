import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertTriangle,
  ArrowUpRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Cloud,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Frame,
  Hand,
  Image as ImageIcon,
  KeyRound,
  Layers3,
  LayoutGrid,
  Lightbulb,
  Link2,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Palette,
  PenTool,
  Play,
  Plus,
  Puzzle,
  Redo2,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Square,
  Star,
  TextCursorInput,
  Trash2,
  Undo2,
  User,
  Users,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { deleteProject, getProjects, makeProject, parseImport, putProject, type LocalProject } from './storage'
import {
  AiError,
  PROVIDERS,
  aiConfigured,
  buildDesignSummary,
  clearAiSettings,
  generateWireframe,
  loadAiSettings,
  providerMeta,
  reviewDesign,
  saveAiSettings,
  suggestCopy,
  testAiConnection,
  type AiSettings,
  type WireframeNode,
} from './ai'
import { Tour } from './tour'
import { HelpModal } from './help'
import {
  DEFAULT_PROFILE,
  PROFILE_COLORS,
  composeSkillInstructions,
  initialsFromName,
  loadProfile,
  loadSkills,
  saveProfile,
  saveSkills,
  type AiSkill,
  type Profile,
} from './personalize'
import './styles.css'

type NodeKind = 'rect' | 'ellipse' | 'text' | 'image'
type Tool = 'select' | 'frame' | 'rect' | 'ellipse' | 'pen' | 'text' | 'hand' | 'comment'
type InspectorTab = 'design' | 'prototype' | 'inspect'

type DesignNode = {
  id: string
  type: NodeKind
  name: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  radius?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  color?: string
  opacity?: number
  rotation?: number
  shadow?: string
  description?: string
}

type Comment = {
  id: string
  author: string
  initials: string
  color: string
  message: string
  time: string
  nodeId?: string
  resolved?: boolean
}

type Action =
  | { mode: 'drag'; nodeId: string; startX: number; startY: number; initialX: number; initialY: number; moved: boolean }
  | { mode: 'pan'; startX: number; startY: number; initialX: number; initialY: number; moved: boolean }
  | null

const board = { width: 1440, height: 900 }
const legacyStorageKey = 'canvasly-personal-file-v1'

const initialNodes: DesignNode[] = [
  { id: 'nav-logo', type: 'text', name: 'COVE logo', x: 68, y: 55, width: 115, height: 32, fill: 'transparent', text: 'COVE', fontSize: 25, fontWeight: 800, color: '#1C1C1A', description: 'Brand wordmark' },
  { id: 'nav-work', type: 'text', name: 'Navigation / Work', x: 694, y: 62, width: 44, height: 22, fill: 'transparent', text: 'Work', fontSize: 15, fontWeight: 500, color: '#4C4B46' },
  { id: 'nav-studio', type: 'text', name: 'Navigation / Studio', x: 764, y: 62, width: 50, height: 22, fill: 'transparent', text: 'Studio', fontSize: 15, fontWeight: 500, color: '#4C4B46' },
  { id: 'nav-journal', type: 'text', name: 'Navigation / Journal', x: 841, y: 62, width: 56, height: 22, fill: 'transparent', text: 'Journal', fontSize: 15, fontWeight: 500, color: '#4C4B46' },
  { id: 'nav-contact', type: 'rect', name: 'Navigation / Contact', x: 1190, y: 46, width: 174, height: 46, fill: '#1C1C1A', radius: 23 },
  { id: 'nav-contact-label', type: 'text', name: 'Contact label', x: 1220, y: 59, width: 112, height: 24, fill: 'transparent', text: 'Start a project', fontSize: 14, fontWeight: 650, color: '#FFFFFF' },
  { id: 'eyebrow', type: 'text', name: 'Hero / Eyebrow', x: 70, y: 198, width: 270, height: 24, fill: 'transparent', text: 'INDEPENDENT CREATIVE STUDIO', fontSize: 12, fontWeight: 750, color: '#827D73' },
  { id: 'hero-title', type: 'text', name: 'Hero / Heading', x: 65, y: 244, width: 620, height: 240, fill: 'transparent', text: 'Ideas with a\npoint of view.', fontSize: 75, fontWeight: 700, color: '#1C1C1A' },
  { id: 'hero-body', type: 'text', name: 'Hero / Body', x: 70, y: 520, width: 410, height: 72, fill: 'transparent', text: 'We turn ambitious ideas into identities,\ndigital experiences, and brands in motion.', fontSize: 18, fontWeight: 430, color: '#625F58' },
  { id: 'hero-button', type: 'rect', name: 'Button / Primary', x: 70, y: 642, width: 177, height: 56, fill: '#D1FF5C', radius: 28 },
  { id: 'hero-button-label', type: 'text', name: 'Button / Primary label', x: 97, y: 660, width: 124, height: 25, fill: 'transparent', text: 'View our work  ↗', fontSize: 15, fontWeight: 700, color: '#1C1C1A' },
  { id: 'hero-card', type: 'image', name: 'Hero visual / Abstract', x: 760, y: 165, width: 605, height: 576, fill: '#C4B2FF', radius: 26, description: 'Gradient studio artwork' },
  { id: 'hero-card-shape', type: 'ellipse', name: 'Hero visual / Orb', x: 1020, y: 221, width: 258, height: 258, fill: '#D9FF72', opacity: 0.95 },
  { id: 'hero-card-tag', type: 'rect', name: 'Hero visual / Project tag', x: 791, y: 676, width: 170, height: 39, fill: '#FFFFFF', radius: 19 },
  { id: 'hero-card-tag-text', type: 'text', name: 'Hero visual / Project tag text', x: 809, y: 687, width: 135, height: 20, fill: 'transparent', text: 'Orbit — 2024', fontSize: 13, fontWeight: 700, color: '#24211F' },
  { id: 'section-line', type: 'rect', name: 'Section divider', x: 70, y: 814, width: 1294, height: 1, fill: '#DDD9D1' },
  { id: 'section-kicker', type: 'text', name: 'Selected work label', x: 70, y: 846, width: 150, height: 22, fill: 'transparent', text: 'SELECTED WORK', fontSize: 12, fontWeight: 750, color: '#827D73' },
  { id: 'section-count', type: 'text', name: 'Project count', x: 1306, y: 846, width: 65, height: 22, fill: 'transparent', text: '(04)', fontSize: 12, fontWeight: 750, color: '#827D73' },
]

const toolItems: { id: Tool; label: string; shortcut: string; icon: ReactNode }[] = [
  { id: 'select', label: 'Move', shortcut: 'V', icon: <MousePointer2 size={17} /> },
  { id: 'frame', label: 'Frame', shortcut: 'F', icon: <Frame size={17} /> },
  { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: <Square size={17} /> },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: <Circle size={17} /> },
  { id: 'pen', label: 'Pen', shortcut: 'P', icon: <PenTool size={17} /> },
  { id: 'text', label: 'Text', shortcut: 'T', icon: <TextCursorInput size={17} /> },
  { id: 'hand', label: 'Hand tool', shortcut: 'H', icon: <Hand size={17} /> },
]

const defaultComments: Comment[] = [
  { id: 'comment-1', author: 'Maya Chen', initials: 'MC', color: '#d8a5ef', message: 'Could we make this headline a touch more confident?', time: '12m', nodeId: 'hero-title' },
  { id: 'comment-2', author: 'You', initials: 'YO', color: '#c7f162', message: 'The hero visual is ready for the next review.', time: '1h', nodeId: 'hero-card', resolved: false },
]

function cloneNodes(nodes: DesignNode[]) {
  return nodes.map((node) => ({ ...node }))
}

function loadNodes() {
  try {
    const saved = window.localStorage.getItem(legacyStorageKey)
    if (saved) {
      const parsed = JSON.parse(saved) as DesignNode[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // A corrupted local draft should never prevent the editor from opening.
  }
  return initialNodes
}

function IconButton({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button className={`icon-button ${active ? 'is-active' : ''}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

function Avatar({ initials, color, small = false }: { initials: string; color: string; small?: boolean }) {
  return <span className={`avatar ${small ? 'avatar--small' : ''}`} style={{ background: color }}>{initials}</span>
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function App() {
  const [nodes, setNodes] = useState<DesignNode[]>(initialNodes)
  const nodesRef = useRef(nodes)
  const historyRef = useRef<DesignNode[][]>([cloneNodes(nodes)])
  const historyIndexRef = useRef(0)
  const [selectedId, setSelectedId] = useState<string>('hero-card')
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('design')
  const [leftTab, setLeftTab] = useState<'layers' | 'assets'>('layers')
  const [zoom, setZoom] = useState(0.62)
  const [pan, setPan] = useState({ x: 105, y: 54 })
  const [action, setAction] = useState<Action>(null)
  const [showExport, setShowExport] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [comments, setComments] = useState<Comment[]>(defaultComments)
  const [commentText, setCommentText] = useState('')
  const [toast, setToast] = useState('')
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [fileName, setFileName] = useState('Cove Studio Landing Page')
  const [storageReady, setStorageReady] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'layers' | 'inspector' | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings())
  const [aiOpen, setAiOpen] = useState(false)
  const [aiSetupOpen, setAiSetupOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState<'' | 'wireframe' | 'review' | 'copy'>('')
  const [aiIssue, setAiIssue] = useState<{ message: string; hint?: string } | null>(null)
  const [wireframePrompt, setWireframePrompt] = useState('')
  const [pendingWireframe, setPendingWireframe] = useState<WireframeNode[] | null>(null)
  const [reviewResult, setReviewResult] = useState('')
  const [copyOptions, setCopyOptions] = useState<string[] | null>(null)
  const [skills, setSkills] = useState<AiSkill[]>(() => loadSkills())
  const [profile, setProfile] = useState<Profile>(() => loadProfile())
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const tourCheckedRef = useRef(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const selected = nodes.find((node) => node.id === selectedId)

  const remember = (snapshot: DesignNode[]) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    nextHistory.push(cloneNodes(snapshot))
    historyRef.current = nextHistory.slice(-60)
    historyIndexRef.current = historyRef.current.length - 1
  }

  const replaceNodes = (next: DesignNode[], saveHistory = false) => {
    nodesRef.current = next
    setNodes(next)
    if (saveHistory) remember(next)
  }

  const updateNode = (id: string, patch: Partial<DesignNode>, record = true) => {
    const next = nodesRef.current.map((node) => node.id === id ? { ...node, ...patch } : node)
    replaceNodes(next, record)
  }

  const undo = () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    replaceNodes(cloneNodes(historyRef.current[historyIndexRef.current]))
    setToast('Undid last change')
  }

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    replaceNodes(cloneNodes(historyRef.current[historyIndexRef.current]))
    setToast('Redid last change')
  }

  const saveDraft = async (quiet = false) => {
    if (!activeProjectId) return
    const existing = projects.find((project) => project.id === activeProjectId)
    const project: LocalProject = {
      id: activeProjectId,
      name: fileName.trim() || 'Untitled project',
      nodes: cloneNodes(nodesRef.current),
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    try {
      await putProject(project)
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)].sort((a, b) => b.updatedAt - a.updatedAt))
      if (!quiet) setToast('Saved to this device')
    } catch {
      if (!quiet) setToast('Could not save this project')
    }
  }

  const openProject = (project: LocalProject) => {
    const projectNodes = project.nodes as DesignNode[]
    replaceNodes(cloneNodes(projectNodes.length ? projectNodes : initialNodes))
    historyRef.current = [cloneNodes(projectNodes.length ? projectNodes : initialNodes)]
    historyIndexRef.current = 0
    setSelectedId('')
    setEditingTextId(null)
    setActiveProjectId(project.id)
    setFileName(project.name)
    setProjectMenuOpen(false)
    setMobilePanel(null)
    setToast(`Opened ${project.name}`)
  }

  const createProject = async () => {
    const count = projects.length + 1
    const project = makeProject(`Untitled project ${count}`, cloneNodes(initialNodes))
    try {
      await putProject(project)
      setProjects((current) => [project, ...current])
      openProject(project)
      setProjectMenuOpen(false)
      setToast('Created a local project')
    } catch {
      setToast('Could not create a project')
    }
  }

  const importProjects = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseImport(JSON.parse(await file.text()))
      await Promise.all(imported.map((project) => putProject(project)))
      const freshProjects = await getProjects()
      setProjects(freshProjects)
      openProject(imported[0])
      setProjectMenuOpen(false)
      setToast(`Imported ${imported.length} project${imported.length === 1 ? '' : 's'}`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Import failed')
    } finally {
      event.target.value = ''
    }
  }

  useEffect(() => {
    const bootWorkspace = async () => {
      try {
        let localProjects = await getProjects()
        if (localProjects.length === 0) {
          const migratedNodes = loadNodes()
          const starter = makeProject('Cove Studio Landing Page', cloneNodes(migratedNodes))
          await putProject(starter)
          localProjects = [starter]
        }
        setProjects(localProjects)
        const first = localProjects[0]
        const firstNodes = first.nodes as DesignNode[]
        replaceNodes(cloneNodes(firstNodes.length ? firstNodes : initialNodes))
        historyRef.current = [cloneNodes(firstNodes.length ? firstNodes : initialNodes)]
        historyIndexRef.current = 0
        setActiveProjectId(first.id)
        setFileName(first.name)
      } catch {
        setToast('Local project storage is unavailable in this browser')
      } finally {
        setStorageReady(true)
      }
    }
    void bootWorkspace()
  }, [])

  useEffect(() => {
    if (!storageReady || !activeProjectId) return
    const timer = window.setTimeout(() => { void saveDraft(true) }, 650)
    return () => window.clearTimeout(timer)
  }, [nodes, fileName, activeProjectId, storageReady])

  useEffect(() => {
    if (!storageReady || tourCheckedRef.current) return
    tourCheckedRef.current = true
    if (!window.localStorage.getItem('canvasly-tour-completed')) {
      const timer = window.setTimeout(() => setTourOpen(true), 500)
      return () => window.clearTimeout(timer)
    }
  }, [storageReady])

  const finishTour = () => {
    setTourOpen(false)
    window.localStorage.setItem('canvasly-tour-completed', '1')
  }

  const startTour = () => {
    setHelpOpen(false)
    setTourOpen(true)
  }

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine)
    const captureInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    window.addEventListener('beforeinstallprompt', captureInstall)
    return () => {
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      window.removeEventListener('beforeinstallprompt', captureInstall)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) {
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
      setToast(isAppleMobile ? 'In Safari: Share → Add to Home Screen' : 'Use your browser menu to install Canvasly')
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setToast('Canvasly was installed')
    setInstallPrompt(null)
  }

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (editingTextId || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const key = event.key.toLowerCase()

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (selected) updateNode(selected.id, { y: selected.y - (event.shiftKey ? 10 : 1) })
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (selected) updateNode(selected.id, { y: selected.y + (event.shiftKey ? 10 : 1) })
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (selected) updateNode(selected.id, { x: selected.x - (event.shiftKey ? 10 : 1) })
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (selected) updateNode(selected.id, { x: selected.x + (event.shiftKey ? 10 : 1) })
        return
      }
      if (event.key === 'Enter' && selected?.type === 'text') {
        event.preventDefault()
        setEditingTextId(selected.id)
        return
      }

      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if ((event.metaKey || event.ctrlKey) && key === 'd') {
        event.preventDefault()
        if (selected) duplicateNode()
        return
      }
      if ((event.metaKey || event.ctrlKey) && key === 's') {
        event.preventDefault()
        saveDraft()
        return
      }
      if ((key === 'backspace' || key === 'delete') && selectedId) {
        event.preventDefault()
        deleteSelected()
        return
      }
      const shortcutMap: Record<string, Tool> = { v: 'select', f: 'frame', r: 'rect', o: 'ellipse', p: 'pen', t: 'text', h: 'hand' }
      if (shortcutMap[key]) setActiveTool(shortcutMap[key])
      if (key === 'escape') {
        setSelectedId('')
        setEditingTextId(null)
        setActiveTool('select')
        setShowExport(false)
        setShowShare(false)
        setAiOpen(false)
        setAiSetupOpen(false)
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, selectedId, editingTextId])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!action) return
      if (action.mode === 'pan') {
        const nextPan = { x: action.initialX + event.clientX - action.startX, y: action.initialY + event.clientY - action.startY }
        setPan(nextPan)
        if (Math.abs(event.clientX - action.startX) > 2 || Math.abs(event.clientY - action.startY) > 2) {
          setAction({ ...action, moved: true })
        }
        return
      }
      const dx = (event.clientX - action.startX) / zoom
      const dy = (event.clientY - action.startY) / zoom
      const next = nodesRef.current.map((node) => node.id === action.nodeId ? { ...node, x: Math.round(action.initialX + dx), y: Math.round(action.initialY + dy) } : node)
      replaceNodes(next)
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) setAction({ ...action, moved: true })
    }
    const onPointerUp = () => {
      if (action?.moved && action.mode === 'drag') remember(nodesRef.current)
      setAction(null)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [action, zoom])

  const canvasPoint = (event: ReactPointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: Math.round((event.clientX - rect.left - pan.x) / zoom), y: Math.round((event.clientY - rect.top - pan.y) / zoom) }
  }

  const addNode = (type: NodeKind, x: number, y: number) => {
    const id = `${type}-${Date.now()}`
    const sizes: Record<NodeKind, Pick<DesignNode, 'width' | 'height' | 'fill' | 'radius' | 'text' | 'fontSize' | 'fontWeight' | 'color'>> = {
      rect: { width: 180, height: 120, fill: '#D1FF5C', radius: 12 },
      ellipse: { width: 150, height: 150, fill: '#C4B2FF' },
      text: { width: 220, height: 42, fill: 'transparent', text: 'New text', fontSize: 28, fontWeight: 650, color: '#1C1C1A' },
      image: { width: 240, height: 160, fill: '#C4B2FF', radius: 18 },
    }
    const config = sizes[type]
    const next: DesignNode = { id, type, name: `New ${type === 'rect' ? 'rectangle' : type}`, x, y, ...config }
    replaceNodes([...nodesRef.current, next], true)
    setSelectedId(id)
    if (type === 'text') {
      setEditingTextId(id)
    }
    setActiveTool('select')
    setToast(`Added ${next.name}`)
  }

  const handleCanvasDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return
    if (event.button === 1 || activeTool === 'hand') {
      setAction({ mode: 'pan', startX: event.clientX, startY: event.clientY, initialX: pan.x, initialY: pan.y, moved: false })
      return
    }
    const point = canvasPoint(event)
    if (activeTool === 'rect') addNode('rect', point.x, point.y)
    else if (activeTool === 'ellipse') addNode('ellipse', point.x, point.y)
    else if (activeTool === 'text') addNode('text', point.x, point.y)
    else if (activeTool === 'frame') {
      addNode('rect', point.x, point.y)
      setToast('Frame placeholder added — use it as a container')
    } else if (activeTool === 'pen') {
      addNode('rect', point.x, point.y)
      setToast('Pen paths are on the personal roadmap')
    } else if (activeTool === 'comment') {
      setInspectorTab('prototype')
      setToast('Leave a note in the comments panel')
    } else {
      setSelectedId('')
      setEditingTextId(null)
    }
  }

  const startNodeDrag = (event: ReactPointerEvent<HTMLDivElement>, node: DesignNode) => {
    event.stopPropagation()
    if (editingTextId && editingTextId !== node.id) {
      setEditingTextId(null)
    }
    if (activeTool === 'comment') {
      setSelectedId(node.id)
      setInspectorTab('prototype')
      return
    }
    if (activeTool !== 'select') return
    setSelectedId(node.id)
    setAction({ mode: 'drag', nodeId: node.id, startX: event.clientX, startY: event.clientY, initialX: node.x, initialY: node.y, moved: false })
  }

  const duplicateNode = () => {
    if (!selected) return
    const id = `${selected.type}-${Date.now()}`
    const copy: DesignNode = { ...selected, id, name: `${selected.name} copy`, x: selected.x + 24, y: selected.y + 24 }
    replaceNodes([...nodesRef.current, copy], true)
    setSelectedId(id)
    if (copy.type === 'text') setEditingTextId(null)
    setToast('Duplicated layer')
  }

  const deleteSelected = () => {
    if (!selectedId) return
    const current = nodesRef.current
    if (current.length <= 1) return
    const index = current.findIndex((node) => node.id === selectedId)
    replaceNodes(current.filter((node) => node.id !== selectedId), true)
    setSelectedId(current[Math.max(0, index - 1)]?.id ?? '')
    setEditingTextId(null)
    setToast('Layer deleted')
  }

  const download = (content: string, type: string, name: string) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type }))
    link.download = name
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 800)
  }

  const exportJson = () => {
    download(JSON.stringify({ name: fileName, version: 1, canvas: board, nodes: nodesRef.current }, null, 2), 'application/json', `${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'canvasly-design'}.design.json`)
    setShowExport(false)
    setToast('Design JSON exported')
  }

  const exportBackup = async () => {
    const currentProject = projects.find((project) => project.id === activeProjectId)
    const activeProject: LocalProject | null = activeProjectId ? {
      id: activeProjectId,
      name: fileName.trim() || 'Untitled project',
      nodes: cloneNodes(nodesRef.current),
      createdAt: currentProject?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    } : null
    try {
      if (activeProject) await putProject(activeProject)
      const backup = {
        format: 'canvasly-backup' as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        projects: activeProject ? [activeProject, ...projects.filter((project) => project.id !== activeProject.id)] : projects,
      }
      download(JSON.stringify(backup, null, 2), 'application/json', `canvasly-backup-${new Date().toISOString().slice(0, 10)}.json`)
      setShowExport(false)
      setToast('Offline backup exported')
    } catch {
      setToast('Could not create a backup')
    }
  }

  const deleteActiveProject = async () => {
    if (!activeProjectId || projects.length < 2) {
      setToast('Keep at least one local project')
      return
    }
    const removedName = fileName
    try {
      await deleteProject(activeProjectId)
      const remaining = projects.filter((project) => project.id !== activeProjectId)
      setProjects(remaining)
      openProject(remaining[0])
      setToast(`Deleted ${removedName}`)
    } catch {
      setToast('Could not delete this project')
    }
  }

  const renameProject = () => {
    const nextName = window.prompt('Name this local project', fileName)?.trim()
    if (nextName) {
      setFileName(nextName)
      setProjectMenuOpen(false)
      setToast('Project renamed')
    }
  }

  const exportSvg = () => {
    const shape = (node: DesignNode) => {
      const opacity = node.opacity ?? 1
      const transform = node.rotation ? ` transform="rotate(${node.rotation} ${node.x + node.width / 2} ${node.y + node.height / 2})"` : ''
      const strokeAttr = node.stroke ? ` stroke="${node.stroke}" stroke-width="${node.strokeWidth ?? 1}"` : ''
      const filter = node.shadow ? ' filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.2))"' : ''
      const fontFam = node.fontFamily ? ` font-family="${node.fontFamily}, sans-serif"` : ' font-family="Arial, sans-serif"'

      if (node.type === 'text') {
        const lines = (node.text ?? '').split('\n')
        const lh = (node.fontSize ?? 16) * 1.2
        return `<text x="${node.x}" y="${node.y + (node.fontSize ?? 16)}"${fontFam} fill="${node.color ?? '#1C1C1A'}" font-size="${node.fontSize ?? 16}" font-weight="${node.fontWeight ?? 400}" opacity="${opacity}"${transform}${filter}>${lines.map((line, index) => `<tspan x="${node.x}" dy="${index === 0 ? 0 : lh}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</tspan>`).join('')}</text>`
      }
      if (node.type === 'ellipse') {
        return `<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${node.fill}" opacity="${opacity}"${strokeAttr}${transform}${filter} />`
      }
      return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.radius ?? 0}" fill="${node.fill}" opacity="${opacity}"${strokeAttr}${transform}${filter} />`
    }
    download(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${board.width} ${board.height}" width="${board.width}" height="${board.height}"><rect width="100%" height="100%" fill="#FCFAF8"/>${nodesRef.current.map(shape).join('')}</svg>`, 'image/svg+xml', `${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'canvasly-design'}.svg`)
    setShowExport(false)
    setToast('SVG exported')
  }

  const exportPng = () => {
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = board.width * scale
    canvas.height = board.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setToast('PNG export is not supported in this browser')
      return
    }
    ctx.scale(scale, scale)
    ctx.fillStyle = '#FCFAF8'
    ctx.fillRect(0, 0, board.width, board.height)

    for (const node of nodesRef.current) {
      ctx.save()
      ctx.globalAlpha = node.opacity ?? 1

      const cx = node.x + node.width / 2
      const cy = node.y + node.height / 2

      if (node.rotation) {
        ctx.translate(cx, cy)
        ctx.rotate((node.rotation * Math.PI) / 180)
        ctx.translate(-cx, -cy)
      }

      if (node.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)'
        ctx.shadowBlur = 12
        ctx.shadowOffsetY = 4
      }

      if (node.type === 'text') {
        ctx.fillStyle = node.color ?? '#1C1C1A'
        ctx.font = `${node.fontWeight ?? 400} ${node.fontSize ?? 16}px ${node.fontFamily ?? 'Inter'}, Arial, sans-serif`
        ctx.textBaseline = 'top'
        const lineHeight = (node.fontSize ?? 16) * 1.2
        ;(node.text ?? '').split('\n').forEach((line, index) => {
          ctx.fillText(line, node.x, node.y + index * lineHeight)
        })
      } else if (node.type === 'ellipse') {
        if (node.fill !== 'transparent') {
          ctx.fillStyle = node.fill
          ctx.beginPath()
          ctx.ellipse(cx, cy, Math.max(1, node.width / 2), Math.max(1, node.height / 2), 0, 0, Math.PI * 2)
          ctx.fill()
        }
        if (node.stroke) {
          ctx.strokeStyle = node.stroke
          ctx.lineWidth = node.strokeWidth ?? 1
          ctx.stroke()
        }
      } else {
        if (node.fill !== 'transparent') {
          ctx.fillStyle = node.fill
          ctx.beginPath()
          const radius = Math.min(node.radius ?? 0, node.width / 2, node.height / 2)
          if (typeof ctx.roundRect === 'function') ctx.roundRect(node.x, node.y, node.width, node.height, radius)
          else ctx.rect(node.x, node.y, node.width, node.height)
          ctx.fill()
        }
        if (node.stroke) {
          ctx.strokeStyle = node.stroke
          ctx.lineWidth = node.strokeWidth ?? 1
          ctx.beginPath()
          const radius = Math.min(node.radius ?? 0, node.width / 2, node.height / 2)
          if (typeof ctx.roundRect === 'function') ctx.roundRect(node.x, node.y, node.width, node.height, radius)
          else ctx.rect(node.x, node.y, node.width, node.height)
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setToast('Could not create the PNG')
        return
      }
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'canvasly-design'}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(link.href), 800)
      setShowExport(false)
      setToast('PNG exported')
    }, 'image/png')
  }

  const exportTokens = () => {
    const colors = new Map<string, number>()
    const textStyles: { name: string; fontSize: number; fontWeight: number; color: string }[] = []
    for (const node of nodesRef.current) {
      const swatch = node.type === 'text' ? node.color : node.fill
      if (swatch && swatch !== 'transparent') colors.set(swatch.toUpperCase(), (colors.get(swatch.toUpperCase()) ?? 0) + 1)
      if (node.type === 'text') textStyles.push({ name: node.name, fontSize: node.fontSize ?? 16, fontWeight: node.fontWeight ?? 400, color: node.color ?? '#1C1C1A' })
    }
    const palette = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([value, uses], index) => ({ name: `color-${index + 1}`, value, uses }))
    const slug = fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'canvasly-design'
    download(JSON.stringify({ format: 'canvasly-tokens', version: 1, project: fileName, exportedAt: new Date().toISOString(), colors: palette, textStyles }, null, 2), 'application/json', `${slug}-tokens.json`)
    setShowExport(false)
    setToast('Design tokens exported')
  }

  const addComment = () => {
    const message = commentText.trim()
    if (!message) return
    setComments((current) => [{ id: `comment-${Date.now()}`, author: profile.name, initials: initialsFromName(profile.name), color: profile.color, message, time: 'now', nodeId: selectedId || undefined }, ...current])
    setCommentText('')
    setToast('Comment added')
  }

  const changeSkills = (next: AiSkill[]) => {
    setSkills(next)
    saveSkills(next)
  }

  const changeProfile = (next: Profile) => {
    setProfile(next)
    saveProfile(next)
    setProfileOpen(false)
    setToast(`Workspace is now ${next.name === 'You' ? 'yours' : `${next.name}'s`}`)
  }

  const handleAiError = (error: unknown) => {
    if (error instanceof AiError) setAiIssue({ message: error.message, hint: error.hint })
    else setAiIssue({ message: 'Something went wrong while calling the AI.', hint: 'Check your connection and AI settings, then try again.' })
  }

  const runWireframe = async () => {
    const prompt = wireframePrompt.trim()
    if (!prompt || aiBusy) return
    setAiBusy('wireframe')
    setAiIssue(null)
    setPendingWireframe(null)
    try {
      setPendingWireframe(await generateWireframe(aiSettings, prompt, composeSkillInstructions(skills)))
    } catch (error) {
      handleAiError(error)
    } finally {
      setAiBusy('')
    }
  }

  const addWireframeToCanvas = () => {
    if (!pendingWireframe?.length) return
    const stamp = Date.now()
    const current = nodesRef.current
    const maxY = current.reduce((max, node) => Math.max(max, node.y + node.height), 0)
    const startY = maxY + 90
    const startX = 80
    const generated: DesignNode[] = pendingWireframe.map((node, index) => ({
      id: `ai-${stamp}-${index}`,
      type: node.type,
      name: node.name ? `AI / ${node.name}` : `AI / ${node.type} ${index + 1}`,
      x: startX + node.x,
      y: startY + node.y,
      width: node.width,
      height: node.height,
      fill: node.fill ?? 'transparent',
      radius: node.radius,
      text: node.text,
      fontSize: node.fontSize,
      fontWeight: node.fontWeight,
      color: node.color,
    }))
    replaceNodes([...current, ...generated], true)
    setSelectedId(generated[0]?.id ?? '')
    setPendingWireframe(null)
    setWireframePrompt('')
    setAiOpen(false)
    setPan({ x: Math.round(105 - startX * zoom), y: Math.round(90 - startY * zoom) })
    setToast(`Added ${generated.length} AI layers below your design`)
  }

  const runReview = async () => {
    if (aiBusy) return
    setAiBusy('review')
    setAiIssue(null)
    setReviewResult('')
    try {
      setReviewResult(await reviewDesign(aiSettings, buildDesignSummary(nodesRef.current), composeSkillInstructions(skills)))
    } catch (error) {
      handleAiError(error)
    } finally {
      setAiBusy('')
    }
  }

  const runCopySuggestions = async () => {
    if (aiBusy || !selected || selected.type !== 'text') return
    setAiBusy('copy')
    setAiIssue(null)
    setCopyOptions(null)
    try {
      setCopyOptions(await suggestCopy(aiSettings, selected.text ?? '', selected.name, composeSkillInstructions(skills)))
    } catch (error) {
      handleAiError(error)
    } finally {
      setAiBusy('')
    }
  }

  const applyCopyOption = (option: string) => {
    if (!selected) return
    updateNode(selected.id, { text: option })
    setCopyOptions(null)
    setToast('Copy updated on the canvas')
  }

  const saveAiSettingsAndClose = (next: AiSettings) => {
    saveAiSettings(next)
    setAiSettings(next)
    setAiSetupOpen(false)
    setAiIssue(null)
    setToast(next.apiKey.trim() ? 'AI is ready to use' : 'AI settings saved')
  }

  const renderNode = (node: DesignNode) => {
    const isSelected = selectedId === node.id
    const isEditing = editingTextId === node.id

    const style: CSSProperties = {
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      opacity: node.opacity ?? 1,
      transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
      boxShadow: node.shadow,
      zIndex: isSelected || isEditing ? 40 : undefined,
    }

    if (node.type === 'text') {
      if (isEditing) {
        return (
          <textarea
            key={node.id}
            className="canvas-text-editor"
            style={{
              left: node.x,
              top: node.y,
              width: Math.max(node.width, 140),
              height: Math.max(node.height, 44),
              color: node.color ?? '#1C1C1A',
              fontSize: node.fontSize ?? 16,
              fontWeight: node.fontWeight ?? 400,
              fontFamily: node.fontFamily ? `${node.fontFamily}, sans-serif` : 'Inter, Arial, sans-serif',
              lineHeight: 1.1,
              transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
            }}
            value={node.text ?? ''}
            onChange={(event) => updateNode(node.id, { text: event.target.value })}
            onBlur={() => setEditingTextId(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setEditingTextId(null)
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                setEditingTextId(null)
              }
              event.stopPropagation()
            }}
            autoFocus
            onPointerDown={(event) => event.stopPropagation()}
          />
        )
      }

      const textShared = {
        className: `canvas-node canvas-node--text ${isSelected ? 'is-selected' : ''}`,
        style: {
          ...style,
          color: node.color ?? '#1C1C1A',
          fontSize: node.fontSize ?? 16,
          fontWeight: node.fontWeight ?? 400,
          fontFamily: node.fontFamily ? `${node.fontFamily}, sans-serif` : 'Inter, Arial, sans-serif',
          lineHeight: 1.1,
          textShadow: node.shadow ? '0 4px 12px rgba(0,0,0,0.2)' : undefined,
          WebkitTextStroke: node.stroke ? `${node.strokeWidth ?? 1}px ${node.stroke}` : undefined,
        },
        onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => startNodeDrag(event, node),
        onDoubleClick: (event: ReactPointerEvent<HTMLDivElement>) => {
          event.stopPropagation()
          setSelectedId(node.id)
          setEditingTextId(node.id)
        },
        title: `${node.name} — Double-click to edit text`,
      }

      return (
        <div key={node.id} {...textShared}>
          {node.text}
        </div>
      )
    }

    const shared = {
      className: `canvas-node canvas-node--${node.type} ${isSelected ? 'is-selected' : ''}`,
      style: {
        ...style,
        border: node.stroke ? `${node.strokeWidth ?? 1}px solid ${node.stroke}` : undefined,
      },
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => startNodeDrag(event, node),
      title: node.name,
    }

    if (node.type === 'ellipse') {
      return <div key={node.id} {...shared} style={{ ...shared.style, background: node.fill, borderRadius: '50%' }} />
    }
    if (node.type === 'image') {
      return (
        <div key={node.id} {...shared} style={{ ...shared.style, background: node.fill, borderRadius: node.radius }}>
          <div className="image-noise" />
          <div className="image-ribbon image-ribbon--one" />
          <div className="image-ribbon image-ribbon--two" />
          <div className="image-sphere" />
          <span className="image-caption">COVE<br />ARCHIVE<br />NO. 04</span>
        </div>
      )
    }
    return <div key={node.id} {...shared} style={{ ...shared.style, background: node.fill, borderRadius: node.radius }} />
  }

  const layerGroups = [
    { title: 'Navigation', ids: ['nav-logo', 'nav-work', 'nav-studio', 'nav-journal', 'nav-contact', 'nav-contact-label'] },
    { title: 'Hero', ids: ['eyebrow', 'hero-title', 'hero-body', 'hero-button', 'hero-button-label', 'hero-card', 'hero-card-shape', 'hero-card-tag', 'hero-card-tag-text'] },
    { title: 'Selected work', ids: ['section-line', 'section-kicker', 'section-count'] },
  ]

  const getToolClass = () => {
    if (activeTool === 'hand') return 'tool-hand'
    if (activeTool === 'text') return 'tool-text'
    if (['rect', 'ellipse', 'frame', 'pen'].includes(activeTool)) return 'tool-crosshair'
    if (activeTool === 'comment') return 'tool-comment'
    return ''
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="file-control">
          <button className="brand-mark" aria-label="Open your local projects" onClick={() => setProjectMenuOpen((open) => !open)}><span /><span /><span /></button>
          <div className="file-name-wrap">
            <button className="file-name" onClick={() => setProjectMenuOpen((open) => !open)}>{fileName} <ChevronDown size={14} /></button>
            <div className="file-meta"><Cloud size={13} /> {isOnline ? 'Saved on this device' : 'Offline — saved on this device'}</div>
            {projectMenuOpen && <div className="popover project-popover">
              <div className="popover-title">LOCAL PROJECTS <span>{projects.length}</span></div>
              <div className="project-list">{projects.map((project) => <button className={`project-item ${project.id === activeProjectId ? 'is-current' : ''}`} key={project.id} onClick={() => openProject(project)}><span className="project-thumb"><LayoutGrid size={14} /></span><span><b>{project.name}</b><small>{project.nodes.length} layers · stored offline</small></span>{project.id === activeProjectId && <Check size={15} />}</button>)}</div>
              <div className="project-actions"><button onClick={() => { void createProject() }}><Plus size={15} /> New project</button><button onClick={() => importInputRef.current?.click()}><Download size={15} /> Import</button></div>
              <div className="project-utility"><button onClick={() => { void installApp() }}>Install app</button><button onClick={renameProject}>Rename</button><button onClick={() => { void deleteActiveProject() }}>Delete</button></div>
            </div>}
          </div>
          <input ref={importInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importProjects(event) }} />
        </div>

        <div className="toolbar" aria-label="Tools">
          {toolItems.map((item, index) => (
            <div className="tool-wrap" key={item.id}>
              {index === 6 && <span className="toolbar-separator" />}
              <IconButton label={`${item.label} (${item.shortcut})`} active={activeTool === item.id} onClick={() => setActiveTool(item.id)}>{item.icon}</IconButton>
            </div>
          ))}
          <IconButton label="Add comment" active={activeTool === 'comment'} onClick={() => { setActiveTool('comment'); setInspectorTab('prototype') }}><MessageCircle size={17} /></IconButton>
        </div>

        <div className="top-actions">
          <div className="collaborators" title="3 people have access">
            <button className="avatar-button" title={`Your profile — ${profile.name}`} onClick={() => setProfileOpen(true)}>
              <Avatar initials={initialsFromName(profile.name)} color={profile.color} small />
            </button>
            <Avatar initials="MC" color="#E6B4F7" small />
            <Avatar initials="JD" color="#A4D6FF" small />
            <button className="more-collaborators">+2</button>
          </div>
          {installPrompt && <button className="install-button" onClick={() => { void installApp() }}><Download size={14} /> Install</button>}
          <button className={`ai-button ${aiOpen ? 'is-open' : ''}`} title="Canvasly AI — bring your own key" onClick={() => { setAiOpen((value) => !value); setShowExport(false); setShowShare(false) }}>
            <Sparkles size={14} /> AI
          </button>
          <div className="export-wrap">
            <button className="top-text-button" onClick={() => { setShowExport((value) => !value); setShowShare(false) }}>Export <ChevronDown size={14} /></button>
            {showExport && <div className="popover export-popover">
              <div className="popover-title">Export design</div>
              <button onClick={exportSvg}><ImageIcon size={16} /><span><b>SVG</b><small>Vector artwork</small></span><ArrowUpRight size={15} /></button>
              <button onClick={exportPng}><Camera size={16} /><span><b>PNG</b><small>2× resolution image</small></span><ArrowUpRight size={15} /></button>
              <button onClick={exportJson}><Code2 size={16} /><span><b>Design JSON</b><small>Editable document data</small></span><ArrowUpRight size={15} /></button>
              <button onClick={exportTokens}><Palette size={16} /><span><b>Design tokens</b><small>Colors & text styles</small></span><ArrowUpRight size={15} /></button>
              <button onClick={() => { void exportBackup() }}><Cloud size={16} /><span><b>Offline backup</b><small>Every local project</small></span><ArrowUpRight size={15} /></button>
              <p className="export-note">.fig and .sketch are proprietary formats only those apps can write. Import the SVG into Figma or Sketch instead.</p>
            </div>}
          </div>
          <div className="share-wrap">
            <button className="share-button" onClick={() => { setShowShare((value) => !value); setShowExport(false) }}><Share2 size={15} /> Share</button>
            {showShare && <div className="popover share-popover">
              <div className="popover-title">Share this file</div>
              <div className="share-people"><Avatar initials="YO" color="#C7F162" /><span><b>You</b><small>Owner</small></span><Check size={16} /></div>
              <div className="share-people"><Avatar initials="MC" color="#E6B4F7" /><span><b>Maya Chen</b><small>Can edit</small></span><ChevronDown size={15} /></div>
              <button className="copy-link" onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Share link copied') }}><Link2 size={15} /> Copy link</button>
              <p><LockKeyhole size={13} /> Only invited people can access this file.</p>
            </div>}
          </div>
          <IconButton label="Tips & help" active={helpOpen} onClick={() => setHelpOpen((value) => !value)}><Lightbulb size={16} /></IconButton>
        </div>
      </header>

      <section className="workspace">
        {mobilePanel && <button className="mobile-panel-scrim" aria-label="Close panel" onClick={() => setMobilePanel(null)} />}
        <aside className={`left-panel ${mobilePanel === 'layers' ? 'is-mobile-open' : ''}`}>
          <div className="panel-tabs">
            <button className={leftTab === 'layers' ? 'is-active' : ''} onClick={() => setLeftTab('layers')}><Layers3 size={15} /> Layers</button>
            <button className={leftTab === 'assets' ? 'is-active' : ''} onClick={() => setLeftTab('assets')}><LayoutGrid size={15} /> Assets</button>
          </div>
          {leftTab === 'layers' ? <>
            <div className="page-heading"><span>Pages</span><button aria-label="Add page" onClick={() => setToast('New pages are coming next')}><Plus size={14} /></button></div>
            <button className="page-row is-current"><span className="page-dot" /> Landing page <MoreHorizontal size={15} /></button>
            <button className="page-row"><span className="page-dot" /> Explorations</button>
            <div className="layers-heading"><span>Layers</span><button aria-label="Search layers"><Search size={14} /></button></div>
            <div className="layer-list">
              <button className={`layer-row layer-row--frame ${selectedId === 'frame-root' ? 'is-selected' : ''}`} onClick={() => { setSelectedId(''); setEditingTextId(null); }}><ChevronDown size={14} /><Frame size={14} /><span>Desktop — 1440</span><Eye size={13} /></button>
              {layerGroups.map((group) => <div className="layer-group" key={group.title}>
                <div className="layer-group-title"><ChevronDown size={13} /><span>{group.title}</span></div>
                {group.ids.map((id) => {
                  const node = nodes.find((item) => item.id === id)
                  if (!node) return null
                  const NodeIcon = node.type === 'text' ? TextCursorInput : node.type === 'ellipse' ? Circle : node.type === 'image' ? ImageIcon : Square
                  return <button key={id} className={`layer-row ${selectedId === id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(id); setEditingTextId(null); }}><span className="indent" /><NodeIcon size={13} /><span>{node.name.replace(/^.*\/ /, '')}</span>{id === 'hero-card' && <MessageCircle className="layer-comment" size={12} />}</button>
                })}
              </div>)}
              {nodes.filter((node) => !layerGroups.some((group) => group.ids.includes(node.id))).map((node) => <button key={node.id} className={`layer-row ${selectedId === node.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(node.id); setEditingTextId(null); }}><span className="indent" />{node.type === 'text' ? <TextCursorInput size={13} /> : <Square size={13} />}<span>{node.name}</span></button>)}
            </div>
          </> : <div className="assets-view">
            <div className="asset-search"><Search size={14} /><input placeholder="Search assets" /></div>
            <div className="asset-section"><span>LOCAL COMPONENTS</span><button><Plus size={14} /></button></div>
            <div className="component-card" onClick={() => addNode('rect', 120, 150)}>
              <div className="component-preview"><span /><span /><span /></div>
              <b>Primary button</b><small>Component</small>
            </div>
            <div className="component-card" onClick={() => addNode('rect', 160, 250)}>
              <div className="component-preview component-preview--card"><span /><span /></div>
              <b>Project card</b><small>Component</small>
            </div>
            <p className="assets-note">Create components from any selected layer to build your personal library.</p>
          </div>}
        </aside>

        <section className={`canvas-area ${getToolClass()}`} ref={canvasRef} onPointerDown={handleCanvasDown}>
          <div className="canvas-instructions">{activeTool === 'select' ? 'Click a layer to select · drag to move · double-click text to edit' : activeTool === 'hand' ? 'Drag to pan around your canvas' : `Click the canvas to add a ${activeTool === 'frame' ? 'frame' : activeTool}`}</div>
          <div className="artboard-shadow" style={{ width: board.width, height: board.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
          <div className="artboard" style={{ width: board.width, height: board.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <div className="artboard-label"><Monitor size={12} /> Desktop — 1440</div>
            {nodes.map(renderNode)}
          </div>
          <div className="canvas-controls" onPointerDown={(event) => event.stopPropagation()}>
            <IconButton label="Zoom out" onClick={() => setZoom((value) => Math.max(0.25, Number((value - 0.08).toFixed(2))))}><ZoomOut size={16} /></IconButton>
            <button className="zoom-readout" onClick={() => { setZoom(0.62); setPan({ x: 105, y: 54 }) }}>{Math.round(zoom * 100)}%</button>
            <IconButton label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.08).toFixed(2))))}><ZoomIn size={16} /></IconButton>
          </div>
          <div className="canvas-footer">{selected ? <><span className="selection-status"><span /> {selected.name}</span><span>{Math.round(selected.x)}, {Math.round(selected.y)}</span></> : <span>Canvasly personal edition</span>}</div>
        </section>

        <aside className={`right-panel ${mobilePanel === 'inspector' ? 'is-mobile-open' : ''}`}>
          <div className="inspector-tabs">
            {(['design', 'prototype', 'inspect'] as InspectorTab[]).map((tab) => <button key={tab} className={inspectorTab === tab ? 'is-active' : ''} onClick={() => setInspectorTab(tab)}>{tab}</button>)}
          </div>
          {inspectorTab === 'design' && <div className="inspector-content">
            {selected ? <>
              <div className="selection-name"><span className={`type-badge type-badge--${selected.type}`}>{selected.type === 'text' ? 'T' : selected.type === 'ellipse' ? '○' : selected.type === 'image' ? '◈' : '□'}</span><input value={selected.name} onChange={(event) => updateNode(selected.id, { name: event.target.value })} /></div>
              <div className="inspector-section position-section">
                <div className="two-up"><Field label="X" value={selected.x} onChange={(value) => updateNode(selected.id, { x: value })} /><Field label="Y" value={selected.y} onChange={(value) => updateNode(selected.id, { y: value })} /></div>
                <div className="two-up"><Field label="W" value={selected.width} onChange={(value) => updateNode(selected.id, { width: Math.max(1, value) })} /><Field label="H" value={selected.height} onChange={(value) => updateNode(selected.id, { height: Math.max(1, value) })} /></div>
                <div className="two-up"><Field label="Rotation" value={selected.rotation ?? 0} suffix="°" onChange={(value) => updateNode(selected.id, { rotation: value })} /><Field label="Opacity" value={Math.round((selected.opacity ?? 1) * 100)} suffix="%" onChange={(value) => updateNode(selected.id, { opacity: Math.max(0, Math.min(1, value / 100)) })} /></div>
              </div>
              {selected.type === 'text' ? <div className="inspector-section">
                <SectionLabel label="Typography" />
                <label className="text-input-label">
                  <span>Text Content</span>
                  <textarea
                    className="text-content-input"
                    value={selected.text ?? ''}
                    onChange={(event) => updateNode(selected.id, { text: event.target.value })}
                    rows={3}
                    placeholder="Enter text content..."
                  />
                </label>
                <div className="font-field">
                  <select
                    value={selected.fontFamily ?? 'Inter'}
                    onChange={(e) => updateNode(selected.id, { fontFamily: e.target.value })}
                  >
                    <option value="Inter">Inter (Sans-serif)</option>
                    <option value="Arial">Arial (Sans-serif)</option>
                    <option value="Roboto">Roboto (Sans-serif)</option>
                    <option value="Georgia">Georgia (Serif)</option>
                    <option value="DM Mono">DM Mono (Monospace)</option>
                  </select>
                </div>
                <div className="two-up"><Field label="Size" value={selected.fontSize ?? 16} onChange={(value) => updateNode(selected.id, { fontSize: Math.max(8, value) })} /><Field label="Weight" value={selected.fontWeight ?? 400} onChange={(value) => updateNode(selected.id, { fontWeight: Math.max(100, Math.min(900, value)) })} /></div>
                <div className="color-field">
                  <input
                    className="native-color"
                    type="color"
                    value={selected.color && selected.color.startsWith('#') ? selected.color : '#1C1C1A'}
                    onChange={(event) => updateNode(selected.id, { color: event.target.value })}
                  />
                  <input value={selected.color ?? '#1C1C1A'} onChange={(event) => updateNode(selected.id, { color: event.target.value })} />
                </div>
              </div> : <div className="inspector-section">
                <SectionLabel label="Fill" action={<Plus size={14} />} />
                <div className="color-field"><input className="native-color" type="color" value={selected.fill.startsWith('#') ? selected.fill : '#C4B2FF'} onChange={(event) => updateNode(selected.id, { fill: event.target.value })} /><input value={selected.fill} onChange={(event) => updateNode(selected.id, { fill: event.target.value })} /><span className="fill-percent">{Math.round((selected.opacity ?? 1) * 100)}%</span></div>
                {selected.type !== 'ellipse' && <Field label="Corner radius" value={selected.radius ?? 0} onChange={(value) => updateNode(selected.id, { radius: Math.max(0, value) })} />}
              </div>}

              <div className="inspector-section">
                <div className="section-label">
                  <span>Stroke</span>
                  <button
                    title={selected.stroke ? 'Remove stroke' : 'Add stroke'}
                    onClick={() => updateNode(selected.id, { stroke: selected.stroke ? undefined : '#1C1C1A', strokeWidth: selected.stroke ? undefined : 1 })}
                  >
                    {selected.stroke ? <Trash2 size={13} /> : <Plus size={14} />}
                  </button>
                </div>
                {selected.stroke ? (
                  <>
                    <div className="color-field">
                      <input
                        className="native-color"
                        type="color"
                        value={selected.stroke.startsWith('#') ? selected.stroke : '#1C1C1A'}
                        onChange={(event) => updateNode(selected.id, { stroke: event.target.value })}
                      />
                      <input value={selected.stroke} onChange={(event) => updateNode(selected.id, { stroke: event.target.value })} />
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Field label="Width" value={selected.strokeWidth ?? 1} suffix="px" onChange={(value) => updateNode(selected.id, { strokeWidth: Math.max(1, value) })} />
                    </div>
                  </>
                ) : (
                  <div className="collapsed-hint" onClick={() => updateNode(selected.id, { stroke: '#1C1C1A', strokeWidth: 1 })}>
                    No stroke · Click + to add
                  </div>
                )}
              </div>

              <div className="inspector-section">
                <div className="section-label">
                  <span>Effects</span>
                  <button
                    title={selected.shadow ? 'Remove effect' : 'Add drop shadow'}
                    onClick={() => updateNode(selected.id, { shadow: selected.shadow ? undefined : '0px 4px 12px rgba(0,0,0,0.15)' })}
                  >
                    {selected.shadow ? <Trash2 size={13} /> : <Plus size={14} />}
                  </button>
                </div>
                {selected.shadow ? (
                  <div className="effect-row">
                    <span>Drop Shadow</span>
                    <button className="icon-button" onClick={() => updateNode(selected.id, { shadow: undefined })} title="Remove shadow">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="collapsed-hint" onClick={() => updateNode(selected.id, { shadow: '0px 4px 12px rgba(0,0,0,0.15)' })}>
                    No effects · Click + to add shadow
                  </div>
                )}
              </div>

              <div className="inspector-section action-section"><button onClick={duplicateNode}><Copy size={14} /> Duplicate</button><button onClick={deleteSelected}><Trash2 size={14} /> Delete</button></div>
            </> : <EmptyInspector />}
          </div>}
          {inspectorTab === 'prototype' && <div className="prototype-panel">
            <div className="prototype-intro"><div className="prototype-icon"><Play size={18} fill="currentColor" /></div><h3>Prototype flow</h3><p>Select a layer and connect it to another frame. Your links stay in this personal file.</p><button onClick={() => setToast('Select a layer, then drag its prototype handle')}><Plus size={15} /> Add interaction</button></div>
            <div className="comments-heading"><span>COMMENTS</span><button onClick={() => setActiveTool('comment')}><MessageCircle size={14} /> Comment</button></div>
            <div className="new-comment"><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={selected ? `Comment on ${selected.name}` : 'Leave a comment'} /><button disabled={!commentText.trim()} onClick={addComment}>Send</button></div>
            <div className="comment-list">{comments.filter((comment) => !comment.resolved).map((comment) => <div className="comment-card" key={comment.id}><Avatar initials={comment.initials} color={comment.color} /><div><div className="comment-author"><b>{comment.author}</b><span>{comment.time}</span></div><p>{comment.message}</p>{comment.nodeId && <button onClick={() => { setSelectedId(comment.nodeId ?? ''); setInspectorTab('design') }}><Link2 size={12} /> {nodes.find((node) => node.id === comment.nodeId)?.name ?? 'Layer'}</button>}</div><button className="resolve-comment" aria-label="Resolve comment" onClick={() => setComments((items) => items.map((item) => item.id === comment.id ? { ...item, resolved: true } : item))}><Check size={14} /></button></div>)}</div>
          </div>}
          {inspectorTab === 'inspect' && <div className="inspect-panel">
            <Code2 size={24} /><h3>Ready for handoff</h3><p>Select an element to inspect its dimensions, color values, and copy a CSS-ready snippet.</p>
            {selected && <><div className="code-preview">{`${selected.type === 'text' ? 'color' : 'background'}: ${selected.type === 'text' ? selected.color : selected.fill};`}<br />{`width: ${selected.width}px;`}<br />{`height: ${selected.height}px;`}</div><button onClick={() => { navigator.clipboard?.writeText(`width: ${selected.width}px; height: ${selected.height}px;`); setToast('CSS copied') }}><Copy size={14} /> Copy CSS</button></>}
          </div>}
        </aside>
        <div className="responsive-panel-actions">
          <button className={mobilePanel === 'layers' ? 'is-active' : ''} onClick={() => setMobilePanel((panel) => panel === 'layers' ? null : 'layers')}><Layers3 size={15} /> Layers</button>
          <button className={mobilePanel === 'inspector' ? 'is-active' : ''} onClick={() => setMobilePanel((panel) => panel === 'inspector' ? null : 'inspector')}><MoreHorizontal size={16} /> Edit</button>
        </div>
      </section>
      <footer className="bottom-bar">
        <div><button onClick={undo} disabled={historyIndexRef.current === 0}><Undo2 size={15} /> Undo</button><button onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1}><Redo2 size={15} /> Redo</button></div>
        <div className="bottom-center"><span className={`sync-dot ${isOnline ? '' : 'is-offline'}`} /> {isOnline ? 'Autosaved offline' : 'Offline — local projects ready'}</div>
        <div><button onClick={() => setInspectorTab('prototype')}><MessageCircle size={15} /> {comments.filter((item) => !item.resolved).length}</button><button onClick={() => { void saveDraft() }}><Cloud size={15} /> Save</button></div>
      </footer>
      {tourOpen && <Tour onClose={finishTour} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onReplayTour={startTour} />}
      {aiOpen && <AiPanel
        settings={aiSettings}
        busy={aiBusy}
        issue={aiIssue}
        prompt={wireframePrompt}
        onPromptChange={(value) => { setWireframePrompt(value); setAiIssue(null) }}
        pending={pendingWireframe}
        onGenerate={() => { void runWireframe() }}
        onAddWireframe={addWireframeToCanvas}
        onDiscard={() => setPendingWireframe(null)}
        review={reviewResult}
        onReview={() => { void runReview() }}
        selectedText={selected?.type === 'text' ? selected.text ?? '' : null}
        selectedName={selected?.type === 'text' ? selected.name : ''}
        copyOptions={copyOptions}
        onCopySuggestions={() => { void runCopySuggestions() }}
        onApplyCopy={applyCopyOption}
        onOpenSetup={() => setAiSetupOpen(true)}
        activeSkills={skills.filter((skill) => skill.enabled).length}
        onOpenSkills={() => setSkillsOpen(true)}
        onClose={() => setAiOpen(false)}
      />}
      {aiSetupOpen && <AiSetupModal
        initial={aiSettings}
        onClose={() => setAiSetupOpen(false)}
        onSave={saveAiSettingsAndClose}
      />}
      {skillsOpen && <SkillsModal
        skills={skills}
        onChange={changeSkills}
        onClose={() => setSkillsOpen(false)}
      />}
      {profileOpen && <ProfileModal
        profile={profile}
        onSave={changeProfile}
        onClose={() => setProfileOpen(false)}
      />}
      {toast && <div className="toast"><Check size={15} /> {toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button></div>}
    </main>
  )
}

function Field({ label, value, suffix, onChange }: { label: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="numeric-field"><span>{label}</span><div><input type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} /><i>{suffix}</i></div></label>
}

function SectionLabel({ label, action }: { label: string; action?: ReactNode }) {
  return <div className="section-label"><span>{label}</span>{action && <button>{action}</button>}</div>
}

function EmptyInspector() {
  return <div className="empty-inspector"><div className="empty-icon"><MousePointer2 size={20} /></div><h3>Select a layer</h3><p>Click anything on the canvas to edit its properties, sizing, and styling.</p></div>
}

type AiPanelProps = {
  settings: AiSettings
  busy: '' | 'wireframe' | 'review' | 'copy'
  issue: { message: string; hint?: string } | null
  prompt: string
  onPromptChange: (value: string) => void
  pending: WireframeNode[] | null
  onGenerate: () => void
  onAddWireframe: () => void
  onDiscard: () => void
  review: string
  onReview: () => void
  selectedText: string | null
  selectedName: string
  copyOptions: string[] | null
  onCopySuggestions: () => void
  onApplyCopy: (option: string) => void
  onOpenSetup: () => void
  activeSkills: number
  onOpenSkills: () => void
  onClose: () => void
}

function AiPanel(props: AiPanelProps) {
  const configured = aiConfigured(props.settings)
  const meta = providerMeta(props.settings.provider)
  return (
    <div className="modal-scrim" onClick={props.onClose}>
      <div className="modal ai-modal" role="dialog" aria-label="Canvasly AI" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2><Sparkles size={17} /> Canvasly AI</h2>
          <div className="modal-head-actions">
            <button className="ai-chip" title="AI skills shape every answer" onClick={props.onOpenSkills}><Puzzle size={12} /> Skills{props.activeSkills > 0 ? ` · ${props.activeSkills} on` : ''}</button>
            {configured && <button className="ai-chip" title="Change AI settings" onClick={props.onOpenSetup}><Settings2 size={12} /> {meta.label} · {props.settings.model.trim() || meta.defaultModel}</button>}
            <button aria-label="Close AI panel" onClick={props.onClose}><X size={17} /></button>
          </div>
        </div>
        <div className="modal-body">
          {!configured ? <div className="ai-setup-hero">
            <div className="ai-setup-icon"><KeyRound size={22} /></div>
            <h3>Bring your own AI key (BYOK)</h3>
            <p>Canvasly has no server and no subscription. Paste your own API key and the AI calls go straight from your browser to the provider you choose.</p>
            <ul>
              <li>OpenAI, Anthropic, Google Gemini, or any OpenAI-compatible endpoint</li>
              <li>Your key is stored only in this browser — never anywhere else</li>
              <li>Works with the canvas: wireframes land as editable layers</li>
            </ul>
            <button className="tour-primary" onClick={props.onOpenSetup}><Sparkles size={14} /> Set up AI</button>
          </div> : <>
            {props.issue && <div className="ai-error"><AlertTriangle size={15} /><div><b>{props.issue.message}</b>{props.issue.hint && <small>{props.issue.hint}</small>}</div></div>}

            <section className="ai-section">
              <div className="ai-section-head"><Wand2 size={15} /><h3>Wireframe from a prompt</h3></div>
              <p>Describe a screen and Canvasly adds it below your design as editable layers.</p>
              <textarea value={props.prompt} onChange={(event) => props.onPromptChange(event.target.value)} placeholder="e.g. Landing page for a coffee subscription app: nav, big hero, three benefits, pricing, footer" rows={2} disabled={props.busy === 'wireframe'} />
              {props.pending ? <div className="ai-result">
                <b>{props.pending.length} layers ready</b>
                <span className="ai-result-names">{props.pending.slice(0, 6).map((node) => node.name ?? node.type).join(' · ')}{props.pending.length > 6 ? ' · …' : ''}</span>
                <div className="ai-result-actions">
                  <button className="tour-primary" onClick={props.onAddWireframe}><Plus size={14} /> Add to canvas</button>
                  <button className="tour-secondary" onClick={props.onDiscard}>Discard</button>
                </div>
              </div> : <button className="tour-primary" disabled={props.busy === 'wireframe' || !props.prompt.trim()} onClick={props.onGenerate}>
                {props.busy === 'wireframe' ? <><Loader2 size={14} className="spin" /> Generating…</> : <><Wand2 size={14} /> Generate wireframe</>}
              </button>}
            </section>

            <section className="ai-section">
              <div className="ai-section-head"><Eye size={15} /><h3>Review this design</h3></div>
              <p>Get a plain-language explanation of the current screen plus three concrete improvements.</p>
              {props.review && <div className="ai-answer">{props.review}</div>}
              <button className="tour-secondary" disabled={props.busy === 'review'} onClick={props.onReview}>
                {props.busy === 'review' ? <><Loader2 size={14} className="spin" /> Reviewing…</> : props.review ? 'Review again' : 'Explain & review'}
              </button>
            </section>

            <section className="ai-section ai-section--last">
              <div className="ai-section-head"><TextCursorInput size={15} /><h3>Improve selected copy</h3></div>
              {props.selectedText === null ? <p className="ai-muted">Select a text layer on the canvas, then come back here for three rewritten versions.</p> : <>
                <p className="ai-selected-copy">“{props.selectedText.replace(/\s+/g, ' ').slice(0, 120)}” — <i>{props.selectedName}</i></p>
                {props.copyOptions && <div className="ai-copy-options">
                  {props.copyOptions.map((option) => <button key={option} onClick={() => props.onApplyCopy(option)}>{option}</button>)}
                </div>}
                <button className="tour-secondary" disabled={props.busy === 'copy'} onClick={props.onCopySuggestions}>
                  {props.busy === 'copy' ? <><Loader2 size={14} className="spin" /> Writing…</> : props.copyOptions ? 'Suggest again' : 'Suggest better copy'}
                </button>
              </>}
            </section>
          </>}
        </div>
      </div>
    </div>
  )
}

function AiSetupModal({ initial, onClose, onSave }: { initial: AiSettings; onClose: () => void; onSave: (settings: AiSettings) => void }) {
  const [provider, setProvider] = useState(initial.provider)
  const [apiKey, setApiKey] = useState(initial.apiKey)
  const [model, setModel] = useState(initial.model)
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [showKey, setShowKey] = useState(false)
  const [testState, setTestState] = useState<'' | 'busy' | 'ok' | 'fail'>('')
  const [testMessage, setTestMessage] = useState('')
  const meta = providerMeta(provider)

  const draftSettings = (): AiSettings => ({ provider, apiKey, model, baseUrl })

  const runTest = async () => {
    if (!apiKey.trim()) {
      setTestState('fail')
      setTestMessage('Paste an API key first.')
      return
    }
    setTestState('busy')
    setTestMessage('')
    try {
      const reply = await testAiConnection(draftSettings())
      setTestState('ok')
      setTestMessage(`Connected — the model replied “${reply}”.`)
    } catch (error) {
      setTestState('fail')
      setTestMessage(error instanceof AiError ? `${error.message}${error.hint ? ` ${error.hint}` : ''}` : 'Could not reach the provider.')
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal setup-modal" role="dialog" aria-label="AI settings" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2><KeyRound size={17} /> AI settings — bring your own key</h2>
          <button aria-label="Close AI settings" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="modal-body">
          <div className="setup-providers">
            {PROVIDERS.map((item) => (
              <button key={item.id} className={`setup-provider ${provider === item.id ? 'is-active' : ''}`} onClick={() => { setProvider(item.id); setTestState('') }}>
                <span /><b>{item.label}</b>
              </button>
            ))}
          </div>
          <label className="setup-field">
            <span>API key</span>
            <div className="setup-key-row">
              <input type={showKey ? 'text' : 'password'} value={apiKey} placeholder={meta.keyHint} autoComplete="off" spellCheck={false} onChange={(event) => { setApiKey(event.target.value); setTestState('') }} />
              <button type="button" aria-label={showKey ? 'Hide key' : 'Show key'} onClick={() => setShowKey((value) => !value)}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
            <small>Get one at <a href={meta.keyUrl} target="_blank" rel="noreferrer">{meta.keyUrl.replace('https://', '')}</a></small>
          </label>
          <label className="setup-field">
            <span>Model</span>
            <input value={model} placeholder={meta.defaultModel} spellCheck={false} onChange={(event) => { setModel(event.target.value); setTestState('') }} />
            <small>Leave empty to use the default ({meta.defaultModel}).</small>
          </label>
          {provider === 'compatible' && <label className="setup-field">
            <span>Base URL</span>
            <input value={baseUrl} placeholder="https://openrouter.ai/api/v1" spellCheck={false} onChange={(event) => { setBaseUrl(event.target.value); setTestState('') }} />
            <small>For OpenRouter, local servers (LM Studio, Ollama), or any OpenAI-compatible API. The server must allow browser (CORS) requests.</small>
          </label>}
          <div className="setup-test">
            <button className="tour-secondary" disabled={testState === 'busy'} onClick={() => { void runTest() }}>
              {testState === 'busy' ? <><Loader2 size={14} className="spin" /> Testing…</> : 'Test connection'}
            </button>
            {testMessage && <p className={testState === 'ok' ? 'is-ok' : testState === 'fail' ? 'is-fail' : ''}>{testMessage}</p>}
          </div>
          <p className="setup-privacy"><LockKeyhole size={13} /> Stored only in this browser. Sent only to {meta.label === 'OpenAI-compatible (OpenRouter, local…)' ? 'the endpoint you configure' : meta.label} when you use an AI action.</p>
        </div>
        <div className="modal-foot">
          {aiConfigured(initial) && <button className="setup-remove" onClick={() => { clearAiSettings(); onSave({ ...initial, apiKey: '' }) }}>Remove key</button>}
          <div className="modal-foot-right">
            <button className="tour-secondary" onClick={onClose}>Cancel</button>
            <button className="tour-primary" onClick={() => onSave(draftSettings())}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkillsModal({ skills, onChange, onClose }: { skills: AiSkill[]; onChange: (skills: AiSkill[]) => void; onClose: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')

  const toggle = (id: string) => onChange(skills.map((skill) => skill.id === id ? { ...skill, enabled: !skill.enabled } : skill))
  const remove = (id: string) => {
    onChange(skills.filter((skill) => skill.id !== id))
    if (editingId === id) resetForm()
  }
  const resetForm = () => {
    setEditingId(null)
    setName('')
    setInstructions('')
  }
  const editSkill = (skill: AiSkill) => {
    setEditingId(skill.id)
    setName(skill.name)
    setInstructions(skill.instructions)
  }
  const submit = () => {
    const trimmedName = name.trim()
    const trimmedInstructions = instructions.trim()
    if (!trimmedName || !trimmedInstructions) return
    if (editingId) {
      onChange(skills.map((skill) => skill.id === editingId ? { ...skill, name: trimmedName, instructions: trimmedInstructions } : skill))
    } else {
      onChange([...skills, { id: `skill-${Date.now()}`, name: trimmedName, description: 'Custom skill', instructions: trimmedInstructions, enabled: true }])
    }
    resetForm()
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal skills-modal" role="dialog" aria-label="AI skills" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2><Puzzle size={17} /> AI skills</h2>
          <button aria-label="Close skills" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="modal-body">
          <p className="skills-intro">Skills are extra instructions added to every AI request, so answers match how <b>you</b> work. Turn on what you like, or write your own. They are saved on this device permanently.</p>
          <div className="skills-list">
            {skills.map((skill) => <div className={`skill-row ${skill.enabled ? 'is-on' : ''}`} key={skill.id}>
              <div className="skill-text">
                <b>{skill.name}</b>
                <small>{skill.builtin ? skill.description : skill.instructions.slice(0, 110) + (skill.instructions.length > 110 ? '…' : '')}</small>
              </div>
              <div className="skill-actions">
                {!skill.builtin && <button className="skill-edit" title="Edit skill" onClick={() => editSkill(skill)}><PenTool size={13} /></button>}
                {!skill.builtin && <button className="skill-delete" title="Delete skill" onClick={() => remove(skill.id)}><Trash2 size={13} /></button>}
                <button className={`switch ${skill.enabled ? 'is-on' : ''}`} role="switch" aria-checked={skill.enabled} aria-label={`Toggle ${skill.name}`} onClick={() => toggle(skill.id)}><span /></button>
              </div>
            </div>)}
          </div>
          <div className="skill-form">
            <div className="ai-section-head"><Plus size={14} /><h3>{editingId ? 'Edit your skill' : 'Create your own skill'}</h3></div>
            <input value={name} placeholder="Name — e.g. My brand voice" maxLength={60} onChange={(event) => setName(event.target.value)} />
            <textarea value={instructions} rows={3} placeholder="Instructions — e.g. Always use dark buttons with white text, and a playful but professional tone." onChange={(event) => setInstructions(event.target.value)} />
            <div className="skill-form-actions">
              {editingId && <button className="tour-secondary" onClick={resetForm}>Cancel edit</button>}
              <button className="tour-primary" disabled={!name.trim() || !instructions.trim()} onClick={submit}>{editingId ? 'Save changes' : 'Add skill'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileModal({ profile, onSave, onClose }: { profile: Profile; onSave: (profile: Profile) => void; onClose: () => void }) {
  const [name, setName] = useState(profile.name === DEFAULT_PROFILE.name ? '' : profile.name)
  const [color, setColor] = useState(profile.color)
  const previewName = name.trim() || DEFAULT_PROFILE.name
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal profile-modal" role="dialog" aria-label="Your profile" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2><User size={17} /> Make it yours</h2>
          <button aria-label="Close profile" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="modal-body">
          <div className="profile-preview">
            <Avatar initials={initialsFromName(previewName)} color={color} />
            <div><b>{previewName}</b><small>Your name signs comments and personalizes the workspace. Saved on this device.</small></div>
          </div>
          <label className="setup-field">
            <span>Your name</span>
            <input value={name} placeholder="e.g. Olabisi" maxLength={40} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="setup-field">
            <span>Your color</span>
            <div className="profile-colors">
              {PROFILE_COLORS.map((swatch) => <button key={swatch} className={`profile-color ${color === swatch ? 'is-active' : ''}`} style={{ background: swatch }} aria-label={`Choose color ${swatch}`} onClick={() => setColor(swatch)} />)}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <div className="modal-foot-right">
            <button className="tour-secondary" onClick={onClose}>Cancel</button>
            <button className="tour-primary" onClick={() => onSave({ name: name.trim() || DEFAULT_PROFILE.name, color })}>Save profile</button>
          </div>
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

// The service worker is intentionally registered after the UI mounts. It keeps the
// application shell available when there is no network, while project data lives in IndexedDB.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // The editor still works online if a browser or local development server blocks service workers.
    })
  })
}
