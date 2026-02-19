
import React, { useState, useEffect } from 'react';
import { useAuth, useTranslation } from '../App';
import { UserRole, Notification } from '../types';
import { dataService } from '../dataService';
import { IMAGES } from '../constants';

const Icons = {
  Stats: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="4" /><path d="M12 11v2l1 1" /></svg>,
  Projects: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" /></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Packages: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>,
  Documents: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><path d="M12 11h4" /><path d="M12 15h4" /></svg>,
  Inbox: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M10 11h.01M14 11h.01M18 11h.01" /></svg>,
  Exceptions: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
};

const Sidebar: React.FC = () => {
  const { user, logout, activeView, setActiveView, isSidebarOpen, setSidebarOpen } = useAuth();
  const { t } = useTranslation();
  const [escalatedCount, setEscalatedCount] = useState(0);

  useEffect(() => {
    if (user && (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.PROJECT_ADMIN)) {
      dataService.getAllMessages().then(msgs => {
        const escalated = new Set(msgs.filter(m => m.isEscalated && !m.isArchived).map(m => m.customerId));
        setEscalatedCount(escalated.size);
      });
    }
  }, [user, activeView]);

  const getMenuItems = () => {
    if (user?.role === UserRole.SUPER_ADMIN) {
      return [
        { label: 'Statistieken', trans: t('stats_title'), icon: <Icons.Stats /> },
        { label: 'Projecten', trans: t('project_title'), icon: <Icons.Projects /> },
        { label: 'Gebruikers', trans: t('user_title'), icon: <Icons.Users /> },
        { label: 'Pakketten', trans: t('package_title'), icon: <Icons.Packages /> },
        { label: 'Uitzonderingen', trans: t('exceptions_title'), icon: <Icons.Exceptions /> },
        { label: 'Centrale Inbox', trans: 'Centrale Inbox', icon: <Icons.Inbox />, badge: escalatedCount > 0 }
      ];
    }
    if (user?.role === UserRole.PROJECT_ADMIN) {
      return [
        { label: 'Dashboard', trans: t('dashboard'), icon: <Icons.Stats /> },
        { label: 'Project', trans: t('project'), icon: <Icons.Projects /> },
        { label: 'Klanten', trans: t('customers'), icon: <Icons.Users /> },
        { label: 'Berichten', trans: t('messages'), icon: <Icons.Inbox /> }
      ];
    }
    if (user?.role === UserRole.CUSTOMER) {
      return [
        { label: 'Overzicht', trans: t('overview'), icon: <Icons.Stats /> },
        { label: 'Mijn Appartement', trans: t('my_apartment'), icon: <Icons.Projects /> },
        { label: 'Mijn Pakket', trans: t('my_package'), icon: <Icons.Packages /> },
        { label: 'Documenten', trans: t('documents'), icon: <Icons.Documents /> },
        { label: 'Berichten', trans: t('notifications'), icon: <Icons.Inbox /> }
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#B7A996] text-slate-900 shadow-2xl overflow-hidden">
      <div className="p-10 flex flex-col items-center gap-6 border-b border-black/5">
        <div className="w-24 h-24 bg-white/40 p-3 rounded-[2.5rem] backdrop-blur-md shadow-inner flex items-center justify-center">
           <img src={IMAGES.LOGO} alt="Portal Logo" className="w-full h-full object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-xs font-black tracking-[0.2em] uppercase">Portal</h1>
          <p className="text-[10px] text-slate-700 font-bold uppercase mt-1 opacity-60 truncate w-40">{user?.name}</p>
        </div>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <button key={item.label} onClick={() => { setActiveView(item.label); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeView === item.label ? 'bg-white text-[#8C7864] shadow-lg scale-[1.02]' : 'hover:bg-white/10'}`}>
            <div className="flex items-center gap-4">
               <span className={`${activeView === item.label ? 'text-[#8C7864]' : 'opacity-50'}`}>{item.icon}</span>
               {item.trans}
            </div>
            {item.badge && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
          </button>
        ))}
      </nav>
      <div className="p-8 border-t border-black/5">
        <button onClick={logout} className="w-full flex items-center gap-3 text-slate-800 hover:text-[#8C7864] text-[10px] font-black uppercase tracking-widest transition-all group">
          <span className="w-2 h-2 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          {t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="w-72 flex-shrink-0 hidden md:flex flex-col z-40 h-screen">{sidebarContent}</aside>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 shadow-2xl animate-in slide-in-from-left duration-300 h-screen">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
