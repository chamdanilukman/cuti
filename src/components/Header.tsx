import React from 'react';
import { Home, FileText, BarChart3, Users, Info } from 'lucide-react';

interface HeaderProps {
  activeSection: string;
  setActiveSection: (section: 'dashboard' | 'form' | 'status' | 'role' | 'about') => void;
}

const Header: React.FC<HeaderProps> = ({ activeSection, setActiveSection }) => {
  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: Home },
    { id: 'form', label: 'Pengajuan Cuti', icon: FileText },
    { id: 'status', label: 'Status Pengajuan', icon: BarChart3 },
    { id: 'role', label: 'Administrator', icon: Users },
    { id: 'about', label: 'Tata Cara Penggunaan', icon: Info },
  ];

  return (
    <header className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold">Si CERDAS</h1>
          </div>
          
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-indigo-600 text-white shadow-card'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as any)}
              className="bg-slate-700 text-white border border-slate-600 rounded-xl px-3 py-2 text-sm"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
