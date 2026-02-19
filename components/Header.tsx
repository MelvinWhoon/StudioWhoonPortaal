
import React, { useState, useEffect } from 'react';
import { useAuth, useTranslation } from '../App';
import { dataService } from '../dataService';
import { UserRole, Project } from '../types';
import { Language } from '../translations';

const Header: React.FC = () => {
  const { user, activeProject, setActiveProject, setSidebarOpen } = useAuth();
  const { lang, setLang, t } = useTranslation();
  
  // Fix: Initialize projects as an empty array and fetch them asynchronously
  const [projects, setProjects] = useState<Project[]>([]);

  // Fix: Fetch projects when user changes or component mounts
  useEffect(() => {
    const fetchProjects = async () => {
      if (user?.role === UserRole.SUPER_ADMIN) {
        try {
          const data = await dataService.getProjects();
          setProjects(data);
        } catch (error) {
          console.error("Error loading projects for header:", error);
        }
      }
    };
    fetchProjects();
  }, [user]);

  const langFlags = {
    nl: '🇳🇱',
    en: '🇬🇧',
    es: '🇪🇸'
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 flex-shrink-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-3 -ml-3 text-slate-400 hover:bg-slate-50 rounded-2xl md:hidden transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h2 className="text-base md:text-lg font-black text-slate-900 truncate max-w-[150px] md:max-w-none uppercase tracking-tighter">
          {activeProject?.name || 'Portal'}
        </h2>

        {user?.role === UserRole.SUPER_ADMIN && (
          <div className="hidden xl:flex items-center gap-3 ml-10">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('project')}:</span>
            <select
              className="bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-[#8C7864]/5 transition-all cursor-pointer"
              value={activeProject?.id || ''}
              onChange={(e) => {
                // Fix: projects is now an array from state
                const p = projects.find(p => p.id === e.target.value);
                setActiveProject(p || null);
              }}
            >
              <option value="">GLOBAAL</option>
              {/* Fix: projects is now an array from state */}
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Language Switcher Small */}
        <div className="hidden sm:flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
           {(['nl', 'en', 'es'] as Language[]).map(l => (
             <button 
               key={l}
               onClick={() => setLang(l)}
               className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${lang === l ? 'bg-white shadow-sm border border-slate-100 scale-110' : 'opacity-40 hover:opacity-80'}`}
             >
               <span className="text-sm">{langFlags[l]}</span>
             </button>
           ))}
        </div>

        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-100">
          <span className="w-2 h-2 rounded-full bg-[#8C7864] animate-pulse" />
          <span className="hidden sm:inline">Portal System v2</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
