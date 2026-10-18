import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Check,
  CheckCircle2, ChevronDown, CircleHelp, Clock3, Filter, Inbox, LayoutDashboard,
  Lightbulb, Menu, MessageCircle, Plus, Search, Sparkles, ThumbsUp, TrendingUp,
  ArrowDownUp, ExternalLink, RotateCcw,
  X, Zap,
} from 'lucide-react'

type Category = 'Bug' | 'Feature request' | 'Improvement'
type Priority = 'High' | 'Medium' | 'Low'
type Status = 'New' | 'In progress' | 'Done'
type View = 'Overview' | 'Insights'
type FilterMode = 'All feedback' | 'High priority' | 'In progress'
type SortMode = 'Newest first' | 'Most voted' | 'Highest priority'

type Feedback = {
  id: string
  title: string
  description: string
  customer: string
  category: Category
  priority: Priority
  status: Status
  votes: number
  createdAt: string
}

type NewFeedback = Pick<Feedback, 'title' | 'description' | 'customer' | 'category' | 'priority'>

const starterFeedback: Feedback[] = [
  { id: '1', title: 'Make team invitations easier to find', description: 'New workspace admins often miss the invite action during their first session.', customer: 'Morgan Lee', category: 'Improvement', priority: 'High', status: 'In progress', votes: 18, createdAt: '2026-10-11' },
  { id: '2', title: 'Export reports as CSV', description: 'Teams want to download their feedback reports for stakeholder meetings.', customer: 'Alex Chen', category: 'Feature request', priority: 'High', status: 'New', votes: 26, createdAt: '2026-10-10' },
  { id: '3', title: 'Filters reset when switching pages', description: 'Selected filters disappear when people move from the inbox to another view.', customer: 'Jamie Park', category: 'Bug', priority: 'High', status: 'New', votes: 12, createdAt: '2026-10-09' },
  { id: '4', title: 'Improve mobile navigation', description: 'The secondary menu is hard to access on smaller screens.', customer: 'Taylor Reed', category: 'Improvement', priority: 'Medium', status: 'In progress', votes: 15, createdAt: '2026-10-08' },
  { id: '5', title: 'Add weekly digest emails', description: 'A short summary would help busy team members catch up without opening the app.', customer: 'Sam Rivera', category: 'Feature request', priority: 'Medium', status: 'New', votes: 21, createdAt: '2026-10-06' },
  { id: '6', title: 'Clarify empty states', description: 'First-time users are unsure what to do when there is no feedback yet.', customer: 'Priya Shah', category: 'Improvement', priority: 'Medium', status: 'Done', votes: 9, createdAt: '2026-10-04' },
  { id: '7', title: 'Support keyboard shortcuts', description: 'Power users would like faster ways to move through and triage feedback.', customer: 'Chris Evans', category: 'Feature request', priority: 'Low', status: 'New', votes: 7, createdAt: '2026-10-02' },
  { id: '8', title: 'Fix the notification badge count', description: 'The badge sometimes shows old counts after marking notifications as read.', customer: 'Jordan Kim', category: 'Bug', priority: 'Medium', status: 'Done', votes: 14, createdAt: '2026-09-30' },
]

const STORAGE_KEY = 'signal-feedback-prototype-v1'
const VOTED_STORAGE_KEY = 'signal-feedback-voted-v1'
const priorityOrder: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 }
const categoryColors: Record<Category, string> = { Bug: 'rose', 'Feature request': 'violet', Improvement: 'sky' }

function readSavedFeedback(): Feedback[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return starterFeedback
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Feedback[]
  } catch { /* fall back to sample items */ }
  return starterFeedback
}

function readSavedVotes(): string[] {
  try {
    const raw = window.localStorage.getItem(VOTED_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function labelForDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function App() {
  const [feedback, setFeedback] = useState<Feedback[]>(readSavedFeedback)
  const [view, setView] = useState<View>('Overview')
  const [filterMode, setFilterMode] = useState<FilterMode>('All feedback')
  const [sortMode, setSortMode] = useState<SortMode>('Newest first')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All categories'>('All categories')
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [voted, setVoted] = useState<string[]>(readSavedVotes)
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback))
  }, [feedback])

  useEffect(() => {
    window.localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify(voted))
  }, [voted])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!recentlyAddedId) return
    const timer = window.setTimeout(() => setRecentlyAddedId(null), 5000)
    return () => window.clearTimeout(timer)
  }, [recentlyAddedId])

  useEffect(() => {
    if (!profileOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileOpen])

  const counts = useMemo(() => {
    const total = feedback.length
    const high = feedback.filter(item => item.priority === 'High' && item.status !== 'Done').length
    const ongoing = feedback.filter(item => item.status === 'In progress').length
    const completed = feedback.filter(item => item.status === 'Done').length
    const totalVotes = feedback.reduce((sum, item) => sum + item.votes, 0)
    const byCategory = (['Improvement', 'Feature request', 'Bug'] as Category[])
      .map(category => ({ category, count: feedback.filter(item => item.category === category).length }))
      .sort((a, b) => b.count - a.count)
    const focus = [...feedback]
      .filter(item => item.status !== 'Done')
      .sort((a, b) => (priorityOrder[b.priority] * 12 + b.votes) - (priorityOrder[a.priority] * 12 + a.votes))[0]
    return { total, high, ongoing, completed, totalVotes, byCategory, focus }
  }, [feedback])

  const filteredFeedback = useMemo(() => {
    const search = query.trim().toLowerCase()
    return feedback.filter(item => {
      if (filterMode === 'High priority' && (item.priority !== 'High' || item.status === 'Done')) return false
      if (filterMode === 'In progress' && item.status !== 'In progress') return false
      if (categoryFilter !== 'All categories' && item.category !== categoryFilter) return false
      if (search && !`${item.title} ${item.description} ${item.customer}`.toLowerCase().includes(search)) return false
      return true
    }).sort((a, b) => {
      if (sortMode === 'Newest first') return b.createdAt.localeCompare(a.createdAt)
      if (sortMode === 'Most voted') return (b.votes - a.votes) || (priorityOrder[b.priority] - priorityOrder[a.priority])
      return (priorityOrder[b.priority] - priorityOrder[a.priority]) || (b.votes - a.votes)
    })
  }, [feedback, filterMode, categoryFilter, query, sortMode])

  function updateStatus(id: string, status: Status) {
    setFeedback(items => items.map(item => item.id === id ? { ...item, status } : item))
    setToast(`Status updated to ${status.toLowerCase()}`)
  }

  function toggleVote(id: string) {
    const wasVoted = voted.includes(id)
    setFeedback(items => items.map(item => item.id === id
      ? { ...item, votes: Math.max(0, item.votes + (wasVoted ? -1 : 1)) }
      : item))
    setVoted(ids => wasVoted ? ids.filter(voteId => voteId !== id) : [...ids, id])
    setToast(wasVoted ? 'Vote removed' : 'Your vote was added')
  }

  function addFeedback(item: NewFeedback) {
    const today = new Date().toISOString().slice(0, 10)
    const id = crypto.randomUUID()
    setFeedback(items => [{ ...item, id, status: 'New', votes: 0, createdAt: today }, ...items])
    setRecentlyAddedId(id)
    setSortMode('Newest first')
    setShowModal(false)
    setFilterMode('All feedback')
    setCategoryFilter('All categories')
    setQuery('')
    setView('Overview')
    setToast('New feedback added successfully')
  }

  function resetDemo() {
    setFeedback(starterFeedback)
    setRecentlyAddedId(null)
    setSortMode('Newest first')
    setVoted([])
    setFilterMode('All feedback')
    setCategoryFilter('All categories')
    setQuery('')
    setToast('Sample workspace restored')
  }

  function goTo(next: View) {
    setView(next)
    setShowMobileNav(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand" aria-label="Signal">
          <span className="brand-symbol"><Activity size={24} strokeWidth={2.7} /></span>
          <span className="brand-word">signal<span className="brand-period">.</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className={`nav-item ${view === 'Overview' ? 'active' : ''}`} onClick={() => goTo('Overview')}><LayoutDashboard size={19}/><span>Overview</span></button>
          <button className={`nav-item ${view === 'Insights' ? 'active' : ''}`} onClick={() => goTo('Insights')}><BarChart3 size={19}/><span>Insights</span></button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <span className="note-illustration"><Sparkles size={20}/></span>
          <strong>Make space for what matters.</strong>
          <p>A small concept exploring better product decisions.</p>
          <span className="concept-pill">CONCEPT PROJECT</span>
        </div>
        <div className="profile-control" ref={profileRef}>
          <button type="button" className="sidebar-profile" aria-label="Open project profile menu" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={() => setProfileOpen(isOpen => !isOpen)}>
            <span className="avatar">MG</span>
            <span><strong>Marjan Ghamkhar</strong><small>Product designer</small></span>
            <ChevronDown size={16} className={profileOpen ? 'profile-chevron-open' : ''}/>
          </button>
          {profileOpen && (
            <div id="profile-menu" className="profile-menu" role="menu" aria-label="Project profile">
              <div className="profile-menu-heading"><strong>Signal demo workspace</strong><span>No account is required. Your changes stay in this browser.</span></div>
              <a role="menuitem" href="https://github.com/marjanghamkhar/signal-feedback-prioritizer" target="_blank" rel="noopener noreferrer" onClick={() => setProfileOpen(false)}>
                <ExternalLink size={16}/> View source on GitHub
              </a>
              <button type="button" role="menuitem" onClick={() => {
                setProfileOpen(false)
                if (window.confirm('Reset Signal to its original sample feedback? This will remove any feedback you added in this browser.')) resetDemo()
              }}><RotateCcw size={16}/> Reset demo data</button>
            </div>
          )}
        </div>
      </aside>

      {showMobileNav && <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setShowMobileNav(false)}/>}

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setShowMobileNav(true)}><Menu size={20}/></button>
            <span className="breadcrumb">Workspace</span><span className="breadcrumb-divider">/</span><strong>{view}</strong>
          </div>
          <div className="topbar-right"><span className="demo-indicator"><span className="demo-dot"/> Sample workspace</span><span className="header-avatar">MG</span></div>
        </header>

        <main className="page">
          {view === 'Overview' ? <>
            <section className="page-intro">
              <div>
                <div className="eyebrow"><span className="eyebrow-icon"><Zap size={13} fill="currentColor" /></span> PRODUCT FEEDBACK, SIMPLIFIED</div>
                <h1>Find the signal<br/>in the <em>noise.</em></h1>
                <p>Bring feedback into focus, see what matters most, and move forward with clarity.</p>
              </div>
              <button className="button button-primary desktop-cta" onClick={() => setShowModal(true)}><Plus size={18}/> Add feedback</button>
            </section>

            <section className="metrics-grid" aria-label="Feedback overview">
              <MetricCard icon={<Inbox size={20}/>} color="lavender" label="Total feedback" value={counts.total.toString()} hint="Items in your workspace" />
              <MetricCard icon={<ArrowUpRight size={20}/>} color="coral" label="High priority" value={counts.high.toString()} hint="Open and worth a closer look" />
              <MetricCard icon={<Clock3 size={20}/>} color="blue" label="In progress" value={counts.ongoing.toString()} hint="Being worked on" />
              <MetricCard icon={<CheckCircle2 size={20}/>} color="green" label="Completed" value={counts.completed.toString()} hint="Marked as done" />
            </section>

            <div className="content-grid">
              <section className="panel feedback-panel">
                <div className="section-heading">
                  <div><div className="heading-row"><h2>Feedback inbox</h2><span className="count-chip">{feedback.length}</span></div><p>Everything your users are telling you, in one place.</p></div>
                  <button className="button button-primary mobile-cta" onClick={() => setShowModal(true)}><Plus size={17}/> Add feedback</button>
                </div>

                <div className="inbox-toolbar">
                  <div className="segmented" role="group" aria-label="Filter feedback">
                    {(['All feedback', 'High priority', 'In progress'] as FilterMode[]).map(mode => <button key={mode} className={filterMode === mode ? 'selected' : ''} onClick={() => setFilterMode(mode)}>{mode}</button>)}
                  </div>
                  <div className="tools-row">
                    <label className="search-wrap"><Search size={17}/><input aria-label="Search feedback" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search feedback..." /></label>
                    <ToolbarDropdown label="Filter category" value={categoryFilter} icon={<Filter size={15}/>} options={['All categories', 'Bug', 'Feature request', 'Improvement']} onChange={value => setCategoryFilter(value as Category | 'All categories')} />
                    <ToolbarDropdown label="Sort feedback" value={sortMode} icon={<ArrowDownUp size={15}/>} options={['Newest first', 'Most voted', 'Highest priority']} onChange={value => setSortMode(value as SortMode)} />
                  </div>
                </div>

                <div className="feedback-list">
                  {filteredFeedback.length ? filteredFeedback.map(item => (
                    <FeedbackCard key={item.id} item={item} voted={voted.includes(item.id)} recentlyAdded={recentlyAddedId === item.id} onVote={() => toggleVote(item.id)} onStatusChange={status => updateStatus(item.id, status)}/>
                  )) : <div className="empty-state"><Search size={26}/><strong>Nothing matches that search</strong><p>Try a different category or clear your filters.</p><button onClick={() => { setQuery(''); setCategoryFilter('All categories'); setFilterMode('All feedback') }}>Clear filters</button></div>}
                </div>
                <div className="panel-footer"><span>Showing {filteredFeedback.length} of {feedback.length} feedback items</span><button onClick={resetDemo}>Reset sample data <ArrowRight size={14}/></button></div>
              </section>

              <aside className="right-rail">
                <section className="panel radar-panel">
                  <div className="rail-heading"><span className="rail-icon"><TrendingUp size={19}/></span><span><h3>Opportunity radar</h3><p>Where feedback is coming from</p></span></div>
                  <div className="category-bars">
                    {counts.byCategory.map(({ category, count }) => <div className="bar-row" key={category}><div className="bar-heading"><span>{category}</span><strong>{count}</strong></div><div className="bar-track"><div className={`bar-fill ${categoryColors[category]}`} style={{ width: `${counts.total ? 100 * count / counts.total : 0}%` }}/></div></div>)}
                  </div>
                  <button className="text-link" onClick={() => goTo('Insights')}>Explore insights <ArrowRight size={16}/></button>
                </section>
                <section className="focus-card"><span className="focus-icon"><Lightbulb size={19}/></span><div className="focus-eyebrow">SUGGESTED FOCUS</div><h3>{counts.focus?.title ?? 'All caught up!'}</h3><p>{counts.focus ? `A ${counts.focus.priority.toLowerCase()}-priority item with ${counts.focus.votes} votes. A good place to start your review.` : 'There are no open feedback items right now.'}</p><span className="focus-disclaimer">Based on priority + votes, not AI</span><button onClick={() => { setFilterMode('High priority'); setSortMode('Highest priority'); setCategoryFilter('All categories'); setQuery(''); window.scrollTo({ top: 460, behavior: 'smooth' }) }}>Review priorities <ArrowUpRight size={16}/></button></section>
                <div className="tip-box"><CircleHelp size={19}/><p><strong>Design note</strong><br/>All feedback is fictional. Your edits are saved only in this browser.</p></div>
              </aside>
            </div>
          </> : <InsightsView feedback={feedback} counts={counts} onBack={() => goTo('Overview')}/>}
          <footer className="site-footer"><span>Signal / Product design concept</span><span>Crafted with curiosity and AI-assisted development ✦</span></footer>
        </main>
      </div>
      {showModal && <AddFeedbackModal onClose={() => setShowModal(false)} onAdd={addFeedback}/>}
      {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
    </div>
  )
}

function ToolbarDropdown({ label, value, icon, options, onChange }: {
  label: string
  value: string
  icon: React.ReactNode
  options: readonly string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="toolbar-dropdown"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <button
        type="button"
        className="toolbar-dropdown-trigger"
        aria-label={`${label}: ${value}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        {icon}
        <span className="toolbar-dropdown-value">{value}</span>
        <ChevronDown size={14} className={open ? 'dropdown-chevron-up' : ''}/>
      </button>
      {open && (
        <div className="toolbar-dropdown-menu" role="menu" aria-label={label}>
          {options.map(option => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === value}
              className={option === value ? 'chosen' : ''}
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
            >
              {option === value ? <Check size={14} /> : <span className="toolbar-dropdown-check-spacer" />}
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ icon, color, label, value, hint }: { icon: React.ReactNode; color: string; label: string; value: string; hint: string }) {
  return <div className="metric-card"><span className={`metric-icon ${color}`}>{icon}</span><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div>
}

function FeedbackCard({ item, voted, recentlyAdded, onVote, onStatusChange }: { item: Feedback; voted: boolean; recentlyAdded: boolean; onVote: () => void; onStatusChange: (status: Status) => void }) {
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusOpen) return
    function closeOnOutsideClick(event: PointerEvent) {
      if (!statusRef.current?.contains(event.target as Node)) setStatusOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setStatusOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [statusOpen])

  return <article className={`feedback-item ${recentlyAdded ? 'just-added' : ''}`}>
    <div className={`feedback-category-icon ${categoryColors[item.category]}`}>{item.category === 'Bug' ? <Zap size={19}/> : item.category === 'Improvement' ? <Sparkles size={19}/> : <MessageCircle size={19}/>}</div>
    <div className="feedback-body"><div className="feedback-heading"><h3>{item.title}</h3>{recentlyAdded && <span className="recent-tag">Just added</span>}<span className={`priority-tag priority-${item.priority.toLowerCase()}`}>{item.priority} priority</span></div>
      <p>{item.description}</p><div className="feedback-meta"><span className={`category-tag ${categoryColors[item.category]}`}>{item.category}</span><span className="meta-dot">·</span><span>{item.customer}</span><span className="meta-dot">·</span><span>{labelForDate(item.createdAt)}</span></div></div>
    <div className="feedback-actions">
      <div className="status-control" ref={statusRef}>
        <button type="button" className={`status-select status-${item.status.toLowerCase().replace(' ', '-')}`} aria-label={`Change status for ${item.title}, currently ${item.status}`} aria-haspopup="menu" aria-expanded={statusOpen} onClick={() => setStatusOpen(open => !open)}>
          <span className="status-dot"/><span>{item.status}</span><ChevronDown size={12} className={statusOpen ? 'dropdown-chevron-up' : ''}/>
        </button>
        {statusOpen && <div className="status-menu" role="menu" aria-label={`Status for ${item.title}`}>
          {(['New', 'In progress', 'Done'] as Status[]).map(status => <button key={status} type="button" role="menuitemradio" aria-checked={status === item.status} className={status === item.status ? 'chosen' : ''} onClick={() => { onStatusChange(status); setStatusOpen(false) }}>
            <span className={`status-dot dot-${status.toLowerCase().replace(' ', '-')}`}/><span>{status}</span>{status === item.status && <Check size={13}/>}
          </button>)}
        </div>}
      </div>
      <button type="button" className={`vote-button ${voted ? 'voted' : ''}`} onClick={onVote} aria-pressed={voted} aria-label={voted ? `Remove your vote for ${item.title}` : `Vote for ${item.title}`} title={voted ? 'Remove your vote' : 'Vote for this feedback'}>
        <ThumbsUp size={14}/><span>{item.votes}</span>
      </button>
    </div>
  </article>
}

function InsightsView({ feedback, counts, onBack }: { feedback: Feedback[]; counts: { total: number; high: number; ongoing: number; completed: number; totalVotes: number; byCategory: { category: Category; count: number }[]; focus: Feedback | undefined }; onBack: () => void }) {
  const statuses: Status[] = ['New', 'In progress', 'Done']
  return <div className="insights-page"><div className="eyebrow"><span className="eyebrow-icon"><BarChart3 size={13}/></span> A CLOSER LOOK</div><h1>Better decisions start<br/>with <em>patterns.</em></h1><p className="insights-lead">A simple view of the themes, activity, and priorities in your feedback.</p>
    <div className="insight-cards"><div className="insight-summary"><span>Feedback collected</span><strong>{counts.total}</strong><small>Sample feedback entries</small><span className="insight-decoration"><ArrowUpRight size={52}/></span></div><div className="insight-summary"><span>Community votes</span><strong>{counts.totalVotes}</strong><small>Across all feedback</small><span className="insight-decoration"><ThumbsUp size={47}/></span></div><div className="insight-summary"><span>Open high-priority items</span><strong>{counts.high}</strong><small>Still need attention</small><span className="insight-decoration"><Zap size={47}/></span></div></div>
    <div className="insight-columns"><section className="panel insight-panel"><div className="insights-panel-title"><h2>Feedback themes</h2><p>Distribution across product feedback categories</p></div><div className="insights-bars">{counts.byCategory.map(({ category, count }) => <div className="insight-bar-item" key={category}><div className="insight-bar-title"><span>{category}</span><strong>{count} {count === 1 ? 'item' : 'items'}</strong></div><div className="insight-bar-track"><div className={`bar-fill ${categoryColors[category]}`} style={{ width: `${counts.total ? 100 * count / counts.total : 0}%` }}/></div></div>)}</div></section>
    <section className="panel insight-panel"><div className="insights-panel-title"><h2>Progress snapshot</h2><p>See what's new, active, and completed</p></div><div className="progress-list">{statuses.map(status => { const count = feedback.filter(item => item.status === status).length; return <div key={status} className="progress-row"><span className={`progress-dot dot-${status.toLowerCase().replace(' ', '-')}`}/><span>{status}</span><strong>{count}</strong><div className="progress-track"><span style={{ width: `${counts.total ? 100 * count / counts.total : 0}%` }}/></div></div> })}</div></section></div>
    <div className="insight-bottom"><div><span className="eyebrow small">AN ACTIONABLE NEXT STEP</span><h2>{counts.focus?.title ?? 'No open issues to review'}</h2><p>Suggested by a transparent rule that weighs urgency and votes. Not generated by an AI model.</p></div><button className="button button-primary" onClick={onBack}>Back to feedback <ArrowRight size={17}/></button></div>
    <div className="insight-info"><ArrowDownRight size={16}/> These numbers are calculated from the sample data and your edits. They are not real customer or product metrics.</div>
  </div>
}

function AddFeedbackModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: NewFeedback) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [customer, setCustomer] = useState('')
  const [category, setCategory] = useState<Category>('Feature request')
  const [priority, setPriority] = useState<Priority>('Medium')

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !description.trim()) return
    onAdd({ title: title.trim(), description: description.trim(), customer: customer.trim() || 'Anonymous user', category, priority })
  }

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><span className="modal-icon"><Plus size={21}/></span><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19}/></button></div><h2 id="modal-title">Add new feedback</h2><p className="modal-subtitle">Capture what someone shared so your team can act on it.</p>
    <form onSubmit={onSubmit}><label className="form-field"><span>Feedback title <b>*</b></span><input required maxLength={100} autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Add a dark mode option"/></label>
      <label className="form-field"><span>Description <b>*</b></span><textarea required rows={3} maxLength={400} value={description} onChange={e => setDescription(e.target.value)} placeholder="What did the user need or experience?" /></label>
      <label className="form-field"><span>Requested by</span><input maxLength={60} value={customer} onChange={e => setCustomer(e.target.value)} placeholder="e.g. Alex Morgan" /></label>
      <div className="form-grid"><label className="form-field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value as Category)}><option>Feature request</option><option>Improvement</option><option>Bug</option></select></label><label className="form-field"><span>Priority</span><select value={priority} onChange={e => setPriority(e.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option></select></label></div>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Plus size={17}/> Add feedback</button></div>
    </form>
  </div></div>
}

export default App
