import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Home, Info, LogOut, Menu, Users, X } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const navItems = [
  { label: 'Beranda', path: '/', icon: Home },
  { label: 'Pengajuan Cuti', path: '/pengajuan', icon: FileText },
  { label: 'Status Pengajuan', path: '/status', icon: BarChart3 },
  { label: 'Dinas', path: '/dinas', icon: Users },
  { label: 'Tata Cara', path: '/tatacara', icon: Info },
];

const V2Header: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAdminAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInitial = user?.nama?.charAt(0)?.toUpperCase() || 'A';
  const roleLabel = user?.role === 'admin_disdik' ? 'Admin Dinas' : user?.role === 'korwil' ? 'Korwil' : 'SMP/SKB';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    setMobileOpen(false);
    window.location.href = '/dinas';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Lewati ke konten utama
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 shrink-0">
          <img src="/Lambang_Grobogan.png" alt="Lambang Grobogan" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight text-slate-950">Si CERDAS</p>
            <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
              Dinas Pendidikan Grobogan
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: mobile hamburger + admin badge */}
        <div className="flex items-center gap-2">
          {/* Admin badge — visible on all screens */}
          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 sm:px-3 py-1.5 rounded-full transition-colors duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {userInitial}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.nama}</span>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-card p-2 z-50">
                  <div className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100 mb-1">
                    <p className="font-semibold text-slate-800">{user.nama}</p>
                    <p className="text-xs">{roleLabel}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors duration-200"
            aria-label="Buka menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          {isAuthenticated && user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default V2Header;
