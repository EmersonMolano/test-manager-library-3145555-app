import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

async function api(path, options = {}) {
  const token = localStorage.getItem('library_token')
  const headers = { Accept: 'application/json', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const response = await fetch(`${API}${path}`, { ...options, headers })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.message || 'No fue posible completar la operación.')
  return body
}

function App() {
  const [session, setSession] = useState(() => localStorage.getItem('library_token') ? { role: localStorage.getItem('library_role') } : null)
  const [error, setError] = useState('')
  const [section, setSection] = useState('books')
  const [books, setBooks] = useState([])
  const [members, setMembers] = useState([])
  const [overdue, setOverdue] = useState([])
  const [report, setReport] = useState([])
  const [login, setLogin] = useState({ username: 'admin', password: 'change-me-now' })
  const [memberForm, setMemberForm] = useState({ full_name: '', document_number: '' })
  const [loanForm, setLoanForm] = useState({ member_id: '', book_id: '' })

  const load = async (target = section) => {
    try {
      setError('')
      if (target === 'books') setBooks((await api('/books?size=50')).items)
      if (target === 'members') setMembers((await api('/members?size=50')).items)
      if (target === 'overdue') setOverdue((await api('/loans/overdue')).items)
      if (target === 'report') setReport((await api('/reports/most-borrowed?from=2000-01-01&to=2100-01-01')).rows)
    } catch (e) { setError(e.message) }
  }

  useEffect(() => { if (session) load() }, [session, section])

  const signIn = async (event) => {
    event.preventDefault()
    try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(login) }); localStorage.setItem('library_token', result.access_token); localStorage.setItem('library_role', result.role); setSession({ role: result.role }) } catch (e) { setError(e.message) }
  }
  const createMember = async (event) => {
    event.preventDefault()
    try { await api('/members', { method: 'POST', body: JSON.stringify(memberForm) }); setMemberForm({ full_name: '', document_number: '' }); load('members') } catch (e) { setError(e.message) }
  }
  const createLoan = async (event) => {
    event.preventDefault()
    try { await api('/loans', { method: 'POST', body: JSON.stringify({ member_id: loanForm.member_id, items: [{ book_id: loanForm.book_id }] }) }); setLoanForm({ member_id: '', book_id: '' }); load('books') } catch (e) { setError(e.message) }
  }

  if (!session) return <main className="login-shell"><section className="login-card"><p className="eyebrow">MANAGER LIBRARY</p><h1>Controla tu biblioteca.</h1><p>Catálogo, miembros y préstamos en un solo lugar.</p><form onSubmit={signIn}><label>Usuario<input value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} /></label><label>Contraseña<input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /></label><button>Iniciar sesión</button></form>{error && <p className="error">{error}</p>}</section></main>

  return <div className="layout"><aside><p className="eyebrow">MANAGER LIBRARY</p><h2>Biblioteca<br />en orden.</h2><nav>{[['books', 'Catálogo'], ['members', 'Miembros'], ['overdue', 'Vencidos'], ['report', 'Reporte']].map(([key, label]) => <button className={section === key ? 'active' : ''} onClick={() => setSection(key)} key={key}>{label}</button>)}</nav><button className="logout" onClick={() => { localStorage.clear(); setSession(null) }}>Cerrar sesión</button></aside><main className="content"><header><div><p className="eyebrow">PANEL DE OPERACIÓN</p><h1>{section === 'books' ? 'Catálogo' : section === 'members' ? 'Miembros' : section === 'overdue' ? 'Préstamos vencidos' : 'Más prestados'}</h1></div><span className="role">{session.role}</span></header>{error && <p className="error banner">{error}</p>}{section === 'books' && <Books books={books} loanForm={loanForm} setLoanForm={setLoanForm} onLoan={createLoan} />}{section === 'members' && <Members members={members} form={memberForm} setForm={setMemberForm} onCreate={createMember} />}{section === 'overdue' && <Overdue items={overdue} />}{section === 'report' && <Report rows={report} />}</main></div>
}

function Books({ books, loanForm, setLoanForm, onLoan }) { return <><section className="hero"><div><p className="eyebrow">INVENTARIO ACTIVO</p><h2>{books.length} títulos listos para prestar</h2></div><span className="stat">{books.reduce((sum, book) => sum + book.available_copies, 0)} copias disponibles</span></section><section className="panel"><div className="panel-heading"><h3>Libros</h3><span>Ordenados por título</span></div><div className="book-grid">{books.map(book => <article className="book" key={book.id}><div className="book-mark">{book.title.slice(0, 1)}</div><div><h3>{book.title}</h3><p>{book.author}</p><span className="tag">{book.category.name}</span></div><strong>{book.available_copies}/{book.total_copies}</strong></article>)}</div></section><section className="panel"><div className="panel-heading"><h3>Registrar préstamo rápido</h3><span>Una copia por línea</span></div><form className="inline-form" onSubmit={onLoan}><input required placeholder="ID del miembro" value={loanForm.member_id} onChange={e => setLoanForm({ ...loanForm, member_id: e.target.value })} /><select required value={loanForm.book_id} onChange={e => setLoanForm({ ...loanForm, book_id: e.target.value })}><option value="">Selecciona libro</option>{books.filter(book => book.available_copies > 0).map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select><button>Prestar</button></form><p className="hint">También puedes utilizar directamente la API para préstamos de hasta tres líneas.</p></section></> }
function Members({ members, form, setForm, onCreate }) { return <><section className="panel"><div className="panel-heading"><h3>Nuevo miembro</h3><span>Los documentos son únicos</span></div><form className="inline-form" onSubmit={onCreate}><input required placeholder="Nombre completo" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /><input required placeholder="Documento" value={form.document_number} onChange={e => setForm({ ...form, document_number: e.target.value })} /><button>Agregar</button></form></section><section className="panel"><div className="panel-heading"><h3>Directorio</h3><span>{members.length} miembros</span></div>{members.map(member => <div className="list-row" key={member.id}><span className="avatar">{member.full_name.slice(0, 1)}</span><div><strong>{member.full_name}</strong><p>{member.document_number}</p></div></div>)}</section></> }
function Overdue({ items }) { return <section className="panel"><div className="panel-heading"><h3>Requieren atención</h3><span>{items.length} líneas vencidas</span></div>{items.length === 0 ? <p className="empty">No hay préstamos vencidos.</p> : items.map(item => <div className="list-row" key={item.item_id}><div><strong>{item.book_title}</strong><p>{item.member_name}</p></div><span className="late">{item.days_late} días</span></div>)}</section> }
function Report({ rows }) { return <section className="panel"><div className="panel-heading"><h3>Libros más prestados</h3><span>Histórico</span></div>{rows.length === 0 ? <p className="empty">Todavía no hay préstamos.</p> : rows.map(row => <div className="list-row" key={`${row.book_id}-${row.category_name}`}><div><strong>{row.book_title}</strong><p>{row.category_name}</p></div><span className="count">{row.times_borrowed}</span></div>)}</section> }

export default App
