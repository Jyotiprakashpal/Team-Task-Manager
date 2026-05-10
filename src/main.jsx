import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  FolderKanban,
  Menu,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { format, isPast, parseISO } from 'date-fns';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const statusLabels = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done'
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('ttm_token'));
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmState, setConfirmState] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const api = useMemo(() => makeApi(token, handleLogout), [token]);
  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 3200);
  }, []);

  const refreshProject = useCallback(async (projectId = selectedProjectId) => {
    if (!projectId) return;
    try {
      const project = await api.get(`/projects/${projectId}`);
      setSelectedProject(project);
    } catch (error) {
      showToast(error.message);
    }
  }, [api, selectedProjectId, showToast]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [me, projectList, stats] = await Promise.all([
        api.get('/auth/me'),
        api.get('/projects'),
        api.get('/dashboard')
      ]);
      setUser(me.user);
      setProjects(projectList);
      setDashboard(stats);
      if (!selectedProjectId && projectList[0]) setSelectedProjectId(projectList[0].id);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  }, [api, selectedProjectId, showToast]);

  useEffect(() => {
    if (!token) return;
    refreshAll();
  }, [token, refreshAll]);

  useEffect(() => {
    if (selectedProjectId) refreshProject(selectedProjectId);
  }, [selectedProjectId, refreshProject]);

  function saveSession(data) {
    localStorage.setItem('ttm_token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function handleLogout() {
    localStorage.removeItem('ttm_token');
    setToken(null);
    setUser(null);
    setProjects([]);
    setSelectedProject(null);
    setDashboard(null);
  }

  function openConfirm(config) {
    setConfirmState(config);
  }

  async function runConfirmedAction() {
    if (!confirmState) return;
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch (error) {
      showToast(error.message);
    }
  }

  if (!token) {
    return <AuthScreen api={api} onSession={saveSession} onToast={showToast} />;
  }

  const isAdmin = selectedProject?.currentRole === 'ADMIN';

  return (
    <div className="app-shell">
      {mobileMenuOpen && <button className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" />}

      <aside className={clsx('sidebar', mobileMenuOpen && 'open')}>
        <div className="brand">
          <FolderKanban />
          <div>
            <strong>Task Manager</strong>
            <span>Team workspace</span>
          </div>
          {mobileMenuOpen && (
            <button className="icon-button mobile-close" onClick={() => setMobileMenuOpen(false)} title="Close menu">
              <X size={18} />
            </button>
          )}
        </div>

        <button
          className={clsx('nav-item', view === 'dashboard' && 'active')}
          onClick={() => {
            setView('dashboard');
            setMobileMenuOpen(false);
          }}
        >
          <BarChart3 size={18} /> Dashboard
        </button>
        <button
          className={clsx('nav-item', view === 'project' && 'active')}
          onClick={() => {
            setView('project');
            setMobileMenuOpen(false);
          }}
        >
          <CheckCircle2 size={18} /> Projects & tasks
        </button>

        <div className="project-list">
          <div className="sidebar-label">Projects</div>
          {projects.map((project) => (
            <button
              key={project.id}
              className={clsx('project-chip', selectedProjectId === project.id && 'active')}
              onClick={() => {
                setSelectedProjectId(project.id);
                setView('project');
                setMobileMenuOpen(false);
              }}
            >
              <span>{project.name}</span>
              <small>{project.doneCount}/{project.taskCount}</small>
            </button>
          ))}
        </div>

        <div className="account">
          <div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button
            className="icon-button"
            onClick={() =>
              openConfirm({
                title: 'Log out now?',
                message: 'You will be signed out of this workspace on this device.',
                confirmLabel: 'Log out',
                tone: 'danger',
                onConfirm: async () => handleLogout()
              })
            }
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="mobile-topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenuOpen(true)} title="Open menu">
            <Menu size={18} />
          </button>
          <div className="mobile-topbar-title">
            <strong>{view === 'dashboard' ? 'Dashboard' : selectedProject?.name || 'Projects'}</strong>
            <span>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <header className="topbar topbar-card">
          <div className="topbar-copy">
            <div className="eyebrow"><Sparkles size={15} /> Team productivity</div>
            <h1>{view === 'dashboard' ? 'Dashboard' : selectedProject?.name || 'Projects'}</h1>
            <p>{view === 'dashboard' ? 'Track team progress, deadlines, and ownership.' : selectedProject?.description || 'Create a project to begin.'}</p>
          </div>
          <div className="topbar-actions">
            <div className="header-stat">
              <span>Projects</span>
              <strong>{projects.length}</strong>
            </div>
            <ProjectForm api={api} onCreated={(project) => {
              setProjects((items) => [project, ...items]);
              setSelectedProjectId(project.id);
              setView('project');
              showToast('Project created');
            }} />
          </div>
        </header>

        {view === 'dashboard' ? (
          <Dashboard
            dashboard={dashboard}
            loading={loading}
            projects={projects}
            onOpenProject={(projectId) => {
              setSelectedProjectId(projectId);
              setView('project');
            }}
          />
        ) : (
          <ProjectWorkspace
            api={api}
            project={selectedProject}
            isAdmin={isAdmin}
            onRequestConfirm={openConfirm}
            onRefresh={async () => {
              await Promise.all([refreshAll(), refreshProject()]);
            }}
            onToast={showToast}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        onCancel={() => setConfirmState(null)}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}

function AuthScreen({ api, onSession, onToast }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = mode === 'signup' ? form : { email: form.email, password: form.password };
      const data = await api.post(`/auth/${mode}`, payload);
      onSession(data);
    } catch (error) {
      onToast(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <FolderKanban />
          <div>
            <strong>Team Task Manager</strong>
            <span>Projects, people, progress</span>
          </div>
        </div>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Signup</button>
        </div>
        <form onSubmit={submit} className="stack">
          {mode === 'signup' && (
            <label>
              Name
              <input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Password
            <input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <button className="primary-button" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}</button>
        </form>
        <p className="demo-note">Seed demo: admin@example.com / Admin@1234</p>
      </section>
    </main>
  );
}

function Dashboard({ dashboard, loading, projects, onOpenProject }) {
  if (loading || !dashboard) return <div className="empty-state">Loading dashboard...</div>;
  const cards = [
    ['Projects', dashboard.totals.projects, FolderKanban],
    ['Tasks', dashboard.totals.tasks, CheckCircle2],
    ['Completed', dashboard.totals.completed, Shield],
    ['Overdue', dashboard.totals.overdue, AlertCircle]
  ];
  const completionRate = dashboard.totals.tasks ? Math.round((dashboard.totals.completed / dashboard.totals.tasks) * 100) : 0;
  const activeProjects = projects.filter((project) => project.taskCount > 0).length;
  const attentionProjects = projects.filter((project) => project.overdueCount > 0).length;
  const sortedProjects = [...projects].sort((a, b) => {
    if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount;
    return b.taskCount - a.taskCount;
  });

  return (
    <div className="dashboard-grid">
      {cards.map(([label, value, Icon]) => (
        <div className="metric-card" key={label}>
          <Icon size={20} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <section className="panel dashboard-spotlight">
        <div className="panel-kicker">Workspace health</div>
        <div className="spotlight-grid">
          <div>
            <h2>{completionRate}% complete</h2>
            <p>{dashboard.totals.completed} of {dashboard.totals.tasks} tasks are finished across all projects.</p>
          </div>
          <div className="spotlight-stats">
            <div>
              <span>Active projects</span>
              <strong>{activeProjects}</strong>
            </div>
            <div>
              <span>Need attention</span>
              <strong>{attentionProjects}</strong>
            </div>
            <div>
              <span>Due today</span>
              <strong>{dashboard.dueSoonTasks.length}</strong>
            </div>
          </div>
        </div>
      </section>
      <section className="panel project-overview-panel">
        <div className="panel-title-row">
          <div>
            <div className="panel-kicker">Project overview</div>
            <h2>All projects at a glance</h2>
          </div>
          <div className="project-overview-count">{projects.length} total</div>
        </div>
        <div className="project-overview-list">
          {sortedProjects.length === 0 && <p className="muted">No projects yet.</p>}
          {sortedProjects.map((project) => {
            const progress = project.taskCount ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
            return (
              <button key={project.id} className="project-overview-card" onClick={() => onOpenProject(project.id)}>
                <div className="project-overview-head">
                  <div>
                    <strong>{project.name}</strong>
                    <span>{project.description || `${project.members.length} team member${project.members.length === 1 ? '' : 's'}`}</span>
                  </div>
                  <b>{progress}%</b>
                </div>
                <div className="project-progress"><i style={{ width: `${progress}%` }} /></div>
                <div className="project-overview-meta">
                  <span>{project.doneCount}/{project.taskCount} done</span>
                  <span>{project.overdueCount} overdue</span>
                  <span>{project.members.length} members</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <h2>Status breakdown</h2>
        <div className="status-bars">
          {statuses.map((status) => (
            <div key={status}>
              <span>{statusLabels[status]}</span>
              <div><i style={{ width: `${Math.min(100, (dashboard.byStatus[status] || 0) * 14)}%` }} /></div>
              <b>{dashboard.byStatus[status] || 0}</b>
            </div>
          ))}
        </div>
      </section>
      <section className="panel priority-panel">
        <h2>Priority breakdown</h2>
        <div className="priority-summary">
          {priorities.map((priority) => (
            <div key={priority} className={clsx('priority-summary-chip', priority.toLowerCase())}>
              <span>{priority}</span>
              <strong>{dashboard.byPriority[priority] || 0}</strong>
            </div>
          ))}
        </div>
      </section>
      <TaskListPanel title="My open tasks" tasks={dashboard.myTasks} />
      <TaskListPanel title="Overdue tasks" tasks={dashboard.overdueTasks} />
      <TaskListPanel title="Due today" tasks={dashboard.dueSoonTasks} />
    </div>
  );
}

function TaskListPanel({ title, tasks }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div className="mini-list">
        {tasks.length === 0 && <p className="muted">Nothing here.</p>}
        {tasks.map((task) => (
          <div key={task.id} className="mini-task">
            <strong>{task.title}</strong>
            <span>{task.project?.name} {task.dueDate ? `• ${formatDate(task.dueDate)}` : ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectWorkspace({ api, project, isAdmin, onRequestConfirm, onRefresh, onToast }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!project) {
    return <div className="empty-state">Create or select a project to manage tasks.</div>;
  }

  const tasks = project.tasks.filter((task) => {
    const matchesText = `${task.title} ${task.description || ''}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    return matchesText && matchesStatus;
  });

  return (
    <div className="workspace-grid">
      <section className="panel project-main">
        <div className="panel-header">
          <div className="toolbar">
            <div className="search-box"><Search size={17} /><input placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All status</option>
              {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>
          <TaskForm api={api} project={project} disabled={!isAdmin} onSaved={onRefresh} onToast={onToast} />
        </div>
        <div className="task-board">
          {statuses.map((status) => (
            <div className="task-column" key={status}>
              <h3>{statusLabels[status]}</h3>
              {tasks.filter((task) => task.status === status).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  api={api}
                  isAdmin={isAdmin}
                  members={project.members}
                  onRefresh={onRefresh}
                  onToast={onToast}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <aside className="side-panel">
        <section className="panel">
          <div className="role-badge"><Shield size={16} /> {project.currentRole}</div>
          <h2>Team</h2>
          <div className="member-list">
            {project.members.map((member) => (
              <div key={member.id} className="member-row">
                <div className="avatar small">{member.user.name.slice(0, 1).toUpperCase()}</div>
                <div><strong>{member.user.name}</strong><span>{member.role}</span></div>
                {isAdmin && (
                  <button
                    className="icon-button danger"
                    title="Remove member"
                    onClick={() =>
                      onRequestConfirm({
                        title: 'Remove team member?',
                        message: `${member.user.name} will lose access to ${project.name}.`,
                        confirmLabel: 'Remove',
                        tone: 'danger',
                        onConfirm: () => removeMember(api, project.id, member.id, onRefresh, onToast)
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {isAdmin && <MemberForm api={api} projectId={project.id} onSaved={onRefresh} onToast={onToast} />}
        </section>
      </aside>
    </div>
  );
}

function ProjectForm({ api, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  async function submit(event) {
    event.preventDefault();
    const project = await api.post('/projects', form);
    setForm({ name: '', description: '' });
    setOpen(false);
    onCreated(project);
  }

  return (
    <div>
      <button className="primary-button" onClick={() => setOpen(!open)}><Plus size={17} /> Project</button>
      <ModalFrame open={open} title="Create project" onClose={() => setOpen(false)}>
        <form className="stack" onSubmit={submit}>
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Close</button>
            <button className="primary-button">Create project</button>
          </div>
        </form>
      </ModalFrame>
    </div>
  );
}

function TaskForm({ api, project, disabled, onSaved, onToast }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', dueDate: '', assigneeId: '' });

  async function submit(event) {
    event.preventDefault();
    try {
      await api.post(`/tasks/projects/${project.id}/tasks`, {
        ...form,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null
      });
      setForm({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', dueDate: '', assigneeId: '' });
      setOpen(false);
      await onSaved();
    } catch (error) {
      onToast(error.message);
    }
  }

  return (
    <div>
      <button className="primary-button" disabled={disabled} onClick={() => setOpen(!open)}><Plus size={17} /> Task</button>
      <ModalFrame open={open} title="Create task" onClose={() => setOpen(false)} wide>
        <form className="stack" onSubmit={submit}>
          <label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <div className="form-grid">
            <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
          </div>
          <label>Assignee<select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}><option value="">Unassigned</option>{project.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></label>
          <label>Due date<input type="datetime-local" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => setOpen(false)}>Close</button>
            <button className="primary-button">Create task</button>
          </div>
        </form>
      </ModalFrame>
    </div>
  );
}

function TaskCard({ task, api, isAdmin, members, onRefresh, onToast }) {
  async function updateStatus(status) {
    try {
      await api.patch(`/tasks/${task.id}`, { status });
      await onRefresh();
    } catch (error) {
      onToast(error.message);
    }
  }

  async function updateAssignee(assigneeId) {
    try {
      await api.patch(`/tasks/${task.id}`, { assigneeId: assigneeId || null });
      await onRefresh();
    } catch (error) {
      onToast(error.message);
    }
  }

  async function removeTask() {
    try {
      await api.delete(`/tasks/${task.id}`);
      await onRefresh();
    } catch (error) {
      onToast(error.message);
    }
  }

  const overdue = task.dueDate && task.status !== 'DONE' && isPast(parseISO(task.dueDate));

  return (
    <article className={clsx('task-card', overdue && 'overdue')}>
      <div className="task-top">
        <strong>{task.title}</strong>
        <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
      </div>
      {task.description && <p>{task.description}</p>}
      <div className="task-meta">
        <span><Users size={14} /> {task.assignee?.name || 'Unassigned'}</span>
        {task.dueDate && <span><Clock size={14} /> {formatDate(task.dueDate)}</span>}
      </div>
      {isAdmin && (
        <div className="task-assignee-row">
          <label>
            Assign user
            <select value={task.assignee?.id || ''} onChange={(event) => updateAssignee(event.target.value)}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="task-actions">
        <select value={task.status} onChange={(event) => updateStatus(event.target.value)}>
          {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        {isAdmin && <TaskDeleteButton task={task} onDelete={removeTask} />}
      </div>
    </article>
  );
}

function TaskDeleteButton({ task, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="icon-button danger" title="Delete task" onClick={() => setOpen(true)}><Trash2 size={16} /></button>
      <ConfirmModal
        open={open}
        title="Delete task?"
        message={`"${task.title}" will be permanently removed from this project.`}
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await onDelete();
          setOpen(false);
        }}
      />
    </>
  );
}

function MemberForm({ api, projectId, onSaved, onToast }) {
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });

  async function submit(event) {
    event.preventDefault();
    try {
      await api.post(`/projects/${projectId}/members`, form);
      setForm({ email: '', role: 'MEMBER' });
      await onSaved();
    } catch (error) {
      onToast(error.message);
    }
  }

  return (
    <form className="member-form" onSubmit={submit}>
      <input type="email" placeholder="member@email.com" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
        <option>MEMBER</option>
        <option>ADMIN</option>
      </select>
      <button className="primary-button"><UserPlus size={16} /> Add</button>
    </form>
  );
}

async function removeMember(api, projectId, memberId, onRefresh, onToast) {
  try {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
    await onRefresh();
  } catch (error) {
    onToast(error.message);
  }
}

function ModalFrame({ open, title, onClose, children, wide = false }) {
  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className={clsx('modal-card', wide && 'wide')} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', tone = 'default', onCancel, onConfirm }) {
  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card confirm-card" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-icon">
          <AlertCircle size={18} />
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="button" className={clsx('primary-button', tone === 'danger' && 'danger-button')} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function makeApi(token, onUnauthorized) {
  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    if (response.status === 401 && token) onUnauthorized();
    if (response.status === 204) return null;

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' })
  };
}

function formatDate(value) {
  return format(parseISO(value), 'MMM d, h:mm a');
}

createRoot(document.getElementById('root')).render(<App />);
