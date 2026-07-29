import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Menu, HardHat, PanelLeftOpen } from 'lucide-react'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import ExpenseTracker from './pages/ExpenseTracker'
import Billing from './pages/Billing'
import Banking from './pages/Banking'
import Attendance from './pages/Attendance'
import UserManagement from './pages/UserManagement'
import Customers from './pages/Customers'
import Vendors from './pages/Vendors'
import Reports from './pages/Reports'
import OrgMaster from './pages/OrgMaster'
import Sidebar, { Page } from './components/Sidebar'
import Chatbot from './components/Chatbot'
import { getToken, clearToken, getUser, clearUser, saveUser } from './auth'

export default function App() {
  const [user, setUser]           = React.useState<any>(getToken() ? getUser() : null)
  const [theme, setTheme]         = React.useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  )
  const [page, setPage]           = React.useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => localStorage.getItem('sidebarCollapsed') === '1')

  React.useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // Close sidebar on resize to desktop
  React.useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function onLogin(u: any)  { saveUser(u); setUser(u) }
  function onLogout()       { clearToken(); clearUser(); setUser(null) }

  const resetToken = new URLSearchParams(window.location.search).get('resetToken')
  if (resetToken) return (
    <>
      <ResetPassword token={resetToken} onDone={() => { window.location.href = window.location.pathname }} />
      <Toaster position="top-right" />
    </>
  )

  if (!user) return (
    <>
      <Login onLogin={onLogin} />
      <Toaster position="top-right" />
    </>
  )

  const pageMap: Partial<Record<Page, React.ReactNode>> = {
    dashboard:          <Dashboard user={user} />,
    tracker:            <ExpenseTracker />,
    billing:            <Billing />,
    banking:            <Banking />,
    attendance:         <Attendance user={user} />,
    'user-management':  <UserManagement />,
    customers:          <Customers />,
    vendors:            <Vendors />,
    reports:            <Reports />,
    organisation:       <OrgMaster />,
  }

  const currentLabel: Record<Page, string> = {
    dashboard: 'Dashboard', tracker: 'Expense Tracker', billing: 'Billing', banking: 'Banking', attendance: 'Attendance',
    'user-management': 'User Management',
    customers: 'Customers', vendors: 'Vendors', reports: 'Reports', organisation: 'Organisation',
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      {theme === 'dark' && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 20% 30%, rgba(37,99,235,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(99,102,241,0.10) 0%, transparent 45%)',
          }} />
        </div>
      )}

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        page={page} setPage={setPage} onLogout={onLogout}
        user={user} theme={theme} setTheme={setTheme}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed(true)}
      />

      {/* Floating button to bring the sidebar back when collapsed (desktop only) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          title="Show sidebar"
          className="hidden md:flex fixed left-3 top-3 z-30 items-center justify-center w-9 h-9
            bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-colors"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen relative z-10 transition-[margin] duration-300 ${sidebarCollapsed ? 'md:ml-0' : 'md:ml-64'}`}>

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3
          bg-slate-900 border-b border-white/10 shadow-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <HardHat size={13} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">{currentLabel[page] || 'We Work'}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
          {pageMap[page] ?? <Dashboard user={user} />}
        </main>
      </div>

      <Chatbot />
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
    </div>
  )
}
