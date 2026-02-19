
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth, useTranslation } from '../App';
import { dataService } from '../dataService';
import { Project, MasterPackage, User, UserRole, ProjectStatus, Message, UserException } from '../types';
import DashboardStats from './DashboardStats';
import { IMAGES } from '../constants';

const generateRandomPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
};

// UI Modal for Feedback
const FeedbackModal: React.FC<{ 
  title: string; 
  message?: string; 
  type: 'success' | 'error' | 'info'; 
  onClose: () => void;
  pass?: string | null;
}> = ({ title, message, type, onClose, pass }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
    <div className="bg-white rounded-[3rem] p-12 w-full max-w-md shadow-2xl animate-in zoom-in-95 text-center text-slate-900">
       <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl shadow-xl ${
         type === 'success' ? 'bg-green-50 text-green-500' : type === 'error' ? 'bg-red-50 text-red-500' : 'bg-[#8C7864]/10 text-[#8C7864]'
       }`}>
          {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
       </div>
       <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">{title}</h3>
       {message && <p className="text-sm text-slate-400 font-medium mb-8">{message}</p>}
       {pass && (
         <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-xl font-black text-slate-900 tracking-widest mb-10">
           {pass}
         </div>
       )}
       <button onClick={onClose} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#8C7864] transition-all">Sluiten</button>
    </div>
  </div>
);

// UI Modal for Confirmations
const ConfirmModal: React.FC<{
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}> = ({ title, message, onConfirm, onCancel, confirmText = 'Bevestigen', isDestructive = false }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
    <div className="bg-white rounded-[3rem] p-12 w-full max-w-sm shadow-2xl animate-in zoom-in-95 text-center text-slate-900">
       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 text-2xl ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
          {isDestructive ? '🗑️' : '⚠️'}
       </div>
       <h3 className="text-xl font-black uppercase tracking-tighter mb-4">{title}</h3>
       <p className="text-sm text-slate-400 font-medium mb-10">{message}</p>
       <div className="flex gap-4">
          <button onClick={onConfirm} className={`flex-1 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20'}`}>
            {confirmText}
          </button>
          <button onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Annuleren</button>
       </div>
    </div>
  </div>
);

const SuperAdminDashboard: React.FC = () => {
  const { user: currentUser, activeView, activeProject } = useAuth();
  const { t } = useTranslation();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [masterPackages, setMasterPackages] = useState<MasterPackage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [inboxTab, setInboxTab] = useState<'ESCALATED' | 'ALL'>('ESCALATED');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Expanded project card state
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Package Filter states
  const [packageProjectFilter, setPackageProjectFilter] = useState<string>('ALL');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState<string>('ALL');
  const [selectedPackageForDetail, setSelectedPackageForDetail] = useState<MasterPackage | null>(null);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  // Feedback/Confirm state
  const [feedback, setFeedback] = useState<{title: string, msg?: string, type: 'success' | 'error' | 'info', pass?: string | null} | null>(null);
  const [confirmData, setConfirmData] = useState<{title: string, message: string, onConfirm: () => void, isDestructive?: boolean} | null>(null);

  // Forms state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.PROJECT_ADMIN, isActive: true });
  const [newProject, setNewProject] = useState<Partial<Project>>({ 
    status: ProjectStatus.ACTIVE, 
    additionalPhotos: [],
    name: '',
    address: '',
    postalCode: '',
    city: '',
    manager: '',
    homesCount: 0,
    deliveryDate: '',
    internalRemarks: ''
  });
  const [newPackage, setNewPackage] = useState<Partial<MasterPackage>>({ inclusions: [], projectId: '', category: 'Standaard', photos: [] });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newInclusionInput, setNewInclusionInput] = useState('');
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);

  const projectPhotosRef = useRef<HTMLInputElement>(null);
  const packagePhotosRef = useRef<HTMLInputElement>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [p, u, mp, m] = await Promise.all([
        dataService.getProjects(),
        dataService.getUsers(),
        dataService.getMasterPackages(),
        dataService.getAllMessages()
      ]);
      setProjects(p);
      setUsers(u);
      setMasterPackages(mp);
      setMessages(m);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, [activeView]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeChatId, messages]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(masterPackages.map(p => p.category).filter(Boolean));
    return Array.from(cats);
  }, [masterPackages]);

  const filteredPackages = useMemo(() => {
    return masterPackages.filter(p => {
      const matchesProject = packageProjectFilter === 'ALL' || p.projectId === packageProjectFilter;
      const matchesCategory = packageCategoryFilter === 'ALL' || p.category === packageCategoryFilter;
      return matchesProject && matchesCategory;
    });
  }, [masterPackages, packageProjectFilter, packageCategoryFilter]);

  const handleDeescalate = async (customerId: string) => {
    setConfirmData({
      title: "Chat De-escaleren",
      message: "Weet u zeker dat u dit gesprek wilt de-escaleren? Het komt dan terug bij de projectbegeleider.",
      onConfirm: async () => {
        try {
          await dataService.deescalateChat(customerId);
          setActiveChatId(null);
          await refreshData();
          setConfirmData(null);
          setFeedback({ title: "Gede-escaleerd", msg: "Gesprek is succesvol teruggezet naar de projectadmin.", type: 'success' });
        } catch (err) {
          setConfirmData(null);
          setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
        }
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId || !currentUser) return;
    
    const chatUser = users.find(u => u.id === activeChatId);
    if (!chatUser || !chatUser.projectId) {
       setFeedback({ title: "Fout", msg: "Kon geen gekoppeld project vinden voor deze chat.", type: 'error' });
       return;
    }

    try {
      await dataService.sendMessage(
        chatUser.projectId,
        activeChatId,
        currentUser.id,
        currentUser.name,
        currentUser.role,
        newMessage
      );
      setNewMessage('');
      await refreshData();
    } catch (err) {
      setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingUserId) {
        await dataService.updateUser(editingUserId, newUser);
        setIsUserModalOpen(false);
        setFeedback({ title: "Gebruiker Bijgewerkt", type: 'success' });
      } else {
        const pass = generateRandomPassword();
        await dataService.createUser({ ...newUser, password: pass });
        setGeneratedPass(pass);
      }
      await refreshData();
    } catch (e) { setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' }); } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (id: string) => {
    setConfirmData({
      title: "Wachtwoord Resetten",
      message: "Weet u zeker dat u het wachtwoord van deze gebruiker wilt resetten?",
      onConfirm: async () => {
        const pass = generateRandomPassword();
        try {
          await dataService.updateUser(id, { password: pass });
          setConfirmData(null);
          setFeedback({ title: "Wachtwoord Gereset", msg: "Kopieer het nieuwe wachtwoord handmatig voor de gebruiker:", type: 'success', pass });
        } catch (err) {
          setConfirmData(null);
          setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
        }
      }
    });
  };

  const handleDelete = (id: string, type: 'user' | 'project' | 'package') => {
    setConfirmData({
      title: "Item Verwijderen",
      message: "Dit kan niet ongedaan worden gemaakt. Weet u het zeker?",
      isDestructive: true,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          if (type === 'user') await dataService.deleteUser(id);
          if (type === 'package') await dataService.deleteMasterPackage(id);
          if (type === 'project') await dataService.deleteProject(id);
          setConfirmData(null);
          await refreshData();
          setFeedback({ title: "Verwijderd", type: 'success' });
        } catch (e) { 
          setConfirmData(null);
          setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' }); 
        } finally { setIsLoading(false); }
      }
    });
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackage.name || !newPackage.projectId) {
       setFeedback({ title: "Invoer Fout", msg: "Vul a.u.b. een pakketnaam in en selecteer een project.", type: 'error' });
       return;
    }
    setIsLoading(true);
    try {
      const categoryToUse = (newPackage.category === 'NEW' ? newCategoryInput.trim() : newPackage.category) || 'Standaard';
      const packageToSave = { ...newPackage, category: categoryToUse };
      
      if (editingPackageId) {
        await dataService.updateMasterPackage(editingPackageId, packageToSave as any);
      } else {
        await dataService.createMasterPackage(packageToSave as any);
      }
      setIsPackageModalOpen(false);
      setEditingPackageId(null);
      setNewPackage({ inclusions: [], projectId: '', category: 'Standaard', photos: [] });
      setNewCategoryInput('');
      await refreshData();
      setFeedback({ title: "Pakket Opgeslagen", type: 'success' });
    } catch (e) { setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' }); } finally { setIsLoading(false); }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingProjectId) {
        await dataService.updateProject(editingProjectId, newProject);
      } else {
        await dataService.createProject(newProject);
      }
      setIsProjectModalOpen(false);
      setEditingProjectId(null);
      setNewProject({ 
        status: ProjectStatus.ACTIVE, 
        additionalPhotos: [],
        name: '',
        address: '',
        postalCode: '',
        city: '',
        manager: '',
        homesCount: 0,
        deliveryDate: '',
        internalRemarks: ''
      });
      await refreshData();
      setFeedback({ title: "Project Opgeslagen", type: 'success' });
    } catch (error) {
      setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setNewProject(prev => ({
          ...prev,
          additionalPhotos: [...(prev.additionalPhotos || []), reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePackagePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setNewPackage(prev => ({
          ...prev,
          photos: [...(prev.photos || []), reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const renderContent = () => {
    switch (activeView) {
      case 'Statistieken': return <DashboardStats projectId={activeProject?.id} />;

      case 'Centrale Inbox':
        const escalatedMsgs = messages.filter(m => m.isEscalated && !m.isArchived);
        const filteredMsgs = inboxTab === 'ESCALATED' ? escalatedMsgs : messages;
        const groupedByCustomer = filteredMsgs.reduce((acc, msg) => {
           if (!acc[msg.customerId]) acc[msg.customerId] = [];
           acc[msg.customerId].push(msg);
           return acc;
        }, {} as Record<string, Message[]>);

        if (activeChatId) {
           const chatUser = users.find(u => u.id === activeChatId);
           const chatMessages = messages.filter(m => m.customerId === activeChatId);
           const isCurrentlyEscalated = chatMessages.some(m => m.isEscalated);

           return (
             <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <button onClick={() => setActiveChatId(null)} className="p-3 bg-slate-100 rounded-xl text-xs hover:bg-slate-200 transition-all">←</button>
                      <div>
                         <h2 className="text-lg font-black uppercase tracking-tighter">{chatUser?.name}</h2>
                         <span className="text-[9px] font-black text-[#8C7864] uppercase tracking-widest">{chatUser?.apartmentId}</span>
                      </div>
                   </div>
                   {isCurrentlyEscalated && (
                     <button 
                        onClick={() => handleDeescalate(activeChatId)}
                        className="px-6 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#8C7864] transition-all"
                      >
                        De-escaleren
                      </button>
                   )}
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20 custom-scrollbar">
                   {chatMessages.map(m => (
                     <div key={m.id} className={`flex ${m.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${m.senderId === currentUser?.id ? 'bg-[#8C7864] text-white rounded-br-none shadow-lg shadow-[#8C7864]/10' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm'}`}>
                           {m.text}
                        </div>
                     </div>
                   ))}
                   <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-50">
                   <div className="flex gap-4">
                      <input className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder="Typ uw bericht als Super Admin..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
                      <button className="px-10 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Verstuur</button>
                   </div>
                </form>
             </div>
           );
        }

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Centrale Inbox</h1>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                   <button onClick={() => setInboxTab('ESCALATED')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inboxTab === 'ESCALATED' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`}>
                      🚨 Geëscaleerd ({escalatedMsgs.length})
                   </button>
                   <button onClick={() => setInboxTab('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inboxTab === 'ALL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>
                      Alle Berichten
                   </button>
                </div>
             </div>
             <div className="grid grid-cols-1 gap-6">
                {(Object.entries(groupedByCustomer) as [string, Message[]][]).map(([custId, msgs]) => {
                  const customer = users.find(u => u.id === custId);
                  const project = projects.find(p => p.id === customer?.projectId);
                  const lastMsg = msgs[msgs.length - 1];
                  const hasEscalation = msgs.some(m => m.isEscalated);

                  return (
                    <div key={custId} className={`bg-white p-8 rounded-[2.5rem] border ${hasEscalation ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'} shadow-sm hover:shadow-xl transition-all group`}>
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">{customer?.name[0]}</div>
                             <div>
                                <div className="flex items-center gap-3">
                                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{customer?.name || 'Onbekende Klant'}</h3>
                                   {hasEscalation && (
                                     <span className="px-3 py-1 bg-orange-500 text-white text-[8px] font-black rounded-lg animate-pulse uppercase tracking-widest">Escalatie</span>
                                   )}
                                </div>
                                <div className="flex gap-2">
                                   <span className="text-[10px] font-black text-[#8C7864] uppercase tracking-widest">{project?.name || 'GEEN PROJECT'}</span>
                                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">• {customer?.apartmentId || 'N.V.T.'}</span>
                                </div>
                             </div>
                          </div>
                          <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(lastMsg.date).toLocaleString()}</span>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 italic text-slate-600">
                          "{lastMsg.text}"
                       </div>
                       <div className="flex justify-end">
                          <button onClick={() => setActiveChatId(custId)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-[#8C7864] transition-all">Chat Openen</button>
                       </div>
                    </div>
                  );
                })}
                {Object.keys(groupedByCustomer).length === 0 && (
                   <div className="p-20 text-center opacity-20 italic text-[10px] font-black uppercase">Geen berichten gevonden</div>
                )}
             </div>
          </div>
        );

      case 'Gebruikers':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gebruikersbeheer</h1>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                   <input placeholder="Zoek op naam..." className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm min-w-[200px]" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                   <select className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                      <option value="ALL">ALLE ROLLEN</option>
                      <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
                      <option value={UserRole.PROJECT_ADMIN}>PROJECT ADMIN</option>
                      <option value={UserRole.CUSTOMER}>KLANT</option>
                   </select>
                   <button onClick={() => { setEditingUserId(null); setNewUser({ role: UserRole.PROJECT_ADMIN, isActive: true }); setIsUserModalOpen(true); setGeneratedPass(null); }} className="px-6 py-3 bg-[#8C7864] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">Nieuwe Gebruiker</button>
                </div>
             </div>
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Gebruiker</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Rol</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-8">
                           <div className="text-sm font-black text-slate-900">{u.name}</div>
                           <div className="text-[10px] text-slate-400 font-medium">{u.email}</div>
                        </td>
                        <td className="p-8"><span className="text-[9px] font-black uppercase bg-slate-100 px-3 py-1 rounded-lg text-slate-600">{u.role}</span></td>
                        <td className="p-8 text-xs font-bold text-slate-400">{projects.find(p => p.id === u.projectId)?.name || 'Globaal'}</td>
                        <td className="p-8 text-right flex gap-3 justify-end">
                           <button onClick={() => handleResetPassword(u.id)} className="p-2 text-slate-300 hover:text-orange-500 transition-all" title="Reset Wachtwoord">🔑</button>
                           <button onClick={() => { setEditingUserId(u.id); setNewUser({...u}); setIsUserModalOpen(true); setGeneratedPass(null); }} className="p-2 text-slate-300 hover:text-[#8C7864] transition-all">✏️</button>
                           <button onClick={() => handleDelete(u.id, 'user')} className="p-2 text-slate-200 hover:text-red-500 transition-all">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        );

      case 'Projecten':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Projectenoverzicht</h1>
              <button onClick={() => { 
                setEditingProjectId(null); 
                setNewProject({ 
                  status: ProjectStatus.ACTIVE, 
                  additionalPhotos: [],
                  name: '',
                  address: '',
                  postalCode: '',
                  city: '',
                  manager: '',
                  homesCount: 0,
                  deliveryDate: '',
                  internalRemarks: ''
                }); 
                setIsProjectModalOpen(true); 
              }} className="px-6 py-3 bg-[#8C7864] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">Nieuw Project</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(p => {
                const isExpanded = expandedProjectId === p.id;
                return (
                  <div key={p.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm group overflow-hidden flex flex-col hover:shadow-2xl transition-all relative text-slate-900">
                    <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => { setEditingProjectId(p.id); setNewProject(p); setIsProjectModalOpen(true); }} className="w-10 h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-sm hover:bg-slate-50 transition-colors">✏️</button>
                       <button onClick={() => handleDelete(p.id, 'project')} className="w-10 h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-sm hover:text-red-500 transition-colors">🗑️</button>
                    </div>
                    <div className="relative h-56">
                      <img src={p.additionalPhotos?.[0] || IMAGES.PROJECT_1} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      <div className="absolute top-4 left-4 bg-white/95 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">{p.status}</div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4">{p.name}</h3>
                       <div className="space-y-4">
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">📍 {p.city || p.address || 'Locatie onbekend'}</p>
                          
                          {isExpanded && (
                             <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 border-t border-slate-50 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                   <div>
                                      <span className="text-[8px] font-black text-slate-300 uppercase block mb-1">Adres</span>
                                      <p className="text-[10px] font-bold text-slate-600 leading-tight">{p.address || '-'}</p>
                                   </div>
                                   <div>
                                      <span className="text-[8px] font-black text-slate-300 uppercase block mb-1">Postcode</span>
                                      <p className="text-[10px] font-bold text-slate-600 leading-tight">{p.postalCode || '-'}</p>
                                   </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div>
                                      <span className="text-[8px] font-black text-slate-300 uppercase block mb-1">Begeleider</span>
                                      <p className="text-[10px] font-bold text-[#8C7864] leading-tight">{p.manager || '-'}</p>
                                   </div>
                                   <div>
                                      <span className="text-[8px] font-black text-slate-300 uppercase block mb-1">Oplevering</span>
                                      <p className="text-[10px] font-bold text-slate-600 leading-tight">{p.deliveryDate || '-'}</p>
                                   </div>
                                </div>
                                {p.internalRemarks && (
                                   <div>
                                      <span className="text-[8px] font-black text-slate-300 uppercase block mb-1">Opmerkingen</span>
                                      <p className="text-[10px] font-medium text-slate-500 italic line-clamp-3">{p.internalRemarks}</p>
                                   </div>
                                )}
                             </div>
                          )}
                       </div>
                       
                       <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{p.homesCount} Units</span>
                          <button 
                             onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                             className="text-[9px] font-black text-[#8C7864] uppercase border-b-2 border-[#8C7864] pb-0.5 hover:text-slate-900 hover:border-slate-900 transition-all"
                          >
                             {isExpanded ? 'Minder info' : 'Bekijk meer'}
                          </button>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'Pakketten':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Master Pakketten</h1>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                   <select className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm" value={packageProjectFilter} onChange={e => setPackageProjectFilter(e.target.value)}>
                      <option value="ALL">ALLE PROJECTEN</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                   </select>
                   <select className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm" value={packageCategoryFilter} onChange={e => setPackageCategoryFilter(e.target.value)}>
                      <option value="ALL">ALLE CATEGORIEËN</option>
                      {uniqueCategories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                   </select>
                   <button onClick={() => { setEditingPackageId(null); setNewPackage({ inclusions: [], projectId: '', category: 'Standaard', photos: [] }); setIsPackageModalOpen(true); }} className="px-6 py-3 bg-[#8C7864] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">Nieuw Pakket</button>
                </div>
             </div>
             
             <div className="space-y-12 pb-20">
                {projects.filter(proj => packageProjectFilter === 'ALL' || proj.id === packageProjectFilter).map(proj => {
                   const projectPackages = filteredPackages.filter(p => p.projectId === proj.id);
                   if (projectPackages.length === 0) return null;
                   
                   return (
                     <div key={proj.id} className="space-y-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">{proj.name}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {projectPackages.map(pkg => (
                              <div key={pkg.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col group relative text-slate-900">
                                 <div className="h-64 overflow-hidden relative">
                                    <img src={pkg.photos?.[0] || IMAGES.BASIC_PACK[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => { setEditingPackageId(pkg.id); setNewPackage(pkg); setIsPackageModalOpen(true); }} className="w-8 h-8 bg-white/95 rounded-lg flex items-center justify-center shadow-lg hover:bg-[#8C7864] hover:text-white transition-all text-xs">✏️</button>
                                       <button onClick={() => handleDelete(pkg.id, 'package')} className="w-8 h-8 bg-white/95 rounded-lg flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all text-xs">🗑️</button>
                                    </div>
                                    <div className="absolute bottom-4 left-4 bg-[#5c4d3c] px-4 py-1.5 rounded-lg text-[9px] font-black text-white uppercase tracking-widest shadow-lg">
                                       {pkg.category}
                                    </div>
                                 </div>
                                 <div className="p-10 flex-1 flex flex-col">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 leading-tight">{pkg.name}</h3>
                                    <div className="space-y-3 mb-10">
                                       {(pkg.inclusions || []).slice(0, 3).map((inc, i) => (
                                         <div key={i} className="flex items-start gap-3">
                                            <span className="w-1.5 h-1.5 bg-[#a3b8cc] rounded-full mt-1.5 shrink-0" />
                                            <span className="text-[11px] font-black text-[#6b859e] uppercase tracking-wider leading-relaxed truncate">{inc}</span>
                                         </div>
                                       ))}
                                       {(pkg.inclusions?.length || 0) > 3 && (
                                         <div className="text-[10px] font-black text-slate-300 uppercase italic">+{pkg.inclusions!.length - 3} meer...</div>
                                       )}
                                    </div>
                                    <div className="mt-auto">
                                       <button 
                                          onClick={() => setSelectedPackageForDetail(pkg)}
                                          className="w-full py-4 border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#6b859e] hover:bg-slate-50 hover:text-[#8C7864] transition-all shadow-sm"
                                       >
                                          Bekijk meer
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                   );
                })}
             </div>
          </div>
        );

      case 'Uitzonderingen':
        const usersWithEx = users.filter(u => u.exceptions && u.exceptions.length > 0);
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
             <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Uitzonderingenbeheer</h1>
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto text-slate-900">
                <table className="w-full text-left min-w-[950px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Klant</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Afwijking</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersWithEx.map(u => u.exceptions?.map((ex, idx) => (
                        <tr key={`${u.id}-${idx}`}>
                          <td className="p-8">
                             <div className="text-sm font-black text-slate-900">{u.name}</div>
                             <div className="text-[10px] text-slate-400 uppercase">{u.apartmentId}</div>
                          </td>
                          <td className="p-8 text-[10px] font-black uppercase text-[#8C7864]">{projects.find(p=>p.id===u.projectId)?.name}</td>
                          <td className="p-8">
                             <div className="text-xs font-black uppercase">{ex.title}</div>
                             <div className="text-[10px] text-slate-400">{ex.description}</div>
                          </td>
                          <td className="p-8">
                             <select className="bg-slate-100 border-none text-[8px] font-black uppercase rounded-lg px-3 py-1 outline-none" value={ex.status} onChange={(e) => dataService.updateUser(u.id, { exceptions: u.exceptions?.map(x => x.id === ex.id ? {...x, status: e.target.value as any} : x) }).then(refreshData)}>
                                <option value="In afwachting">In afwachting</option>
                                <option value="In behandeling">In behandeling</option>
                                <option value="Afgehandeld">Afgehandeld</option>
                             </select>
                          </td>
                        </tr>
                    )))}
                  </tbody>
                </table>
             </div>
          </div>
        );

      default: return null;
    }
  };

  const addInclusion = () => {
    if (!newInclusionInput.trim()) return;
    setNewPackage(prev => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), newInclusionInput.trim()]
    }));
    setNewInclusionInput('');
  };

  const removeInclusion = (index: number) => {
    setNewPackage(prev => ({
      ...prev,
      inclusions: prev.inclusions?.filter((_, i) => i !== index)
    }));
  };

  const removePackagePhoto = (index: number) => {
    setNewPackage(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="pb-32 relative">
      {renderContent()}

      {/* FEEDBACK & CONFIRM MODALS */}
      {feedback && <FeedbackModal {...feedback} onClose={() => setFeedback(null)} />}
      {confirmData && <ConfirmModal {...confirmData} onCancel={() => setConfirmData(null)} />}

      {/* PACKAGE DETAIL MODAL (Fixed 'Bekijk meer') */}
      {selectedPackageForDetail && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-white rounded-[3rem] p-12 w-full max-w-5xl shadow-2xl animate-in zoom-in-95 my-8 text-slate-900 relative">
               <button 
                  onClick={() => setSelectedPackageForDetail(null)}
                  className="absolute top-10 right-10 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all text-xl"
               >✕</button>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                     <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">{selectedPackageForDetail.name}</h2>
                     <span className="px-4 py-1.5 bg-[#8C7864] text-white text-[10px] font-black rounded-lg uppercase tracking-widest">{selectedPackageForDetail.category}</span>
                     
                     <div className="pt-8 border-t border-slate-50">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Inbegrepen in dit pakket</h3>
                        <ul className="space-y-4">
                           {selectedPackageForDetail.inclusions?.map((inc, i) => (
                             <li key={i} className="flex items-center gap-4 text-sm font-bold text-slate-700">
                                <span className="w-2 h-2 bg-[#8C7864] rounded-full shrink-0" />
                                {inc}
                             </li>
                           ))}
                        </ul>
                     </div>
                     
                     {selectedPackageForDetail.price && (
                        <div className="pt-8 border-t border-slate-50">
                           <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Vanaf prijs</span>
                           <span className="text-3xl font-black text-slate-900">€ {selectedPackageForDetail.price.toLocaleString()}</span>
                        </div>
                     )}
                  </div>
                  
                  <div className="space-y-4">
                     <div className="rounded-[2.5rem] overflow-hidden aspect-video border border-slate-100 shadow-xl bg-slate-50">
                        {selectedPackageForDetail.photos?.[0] ? (
                           <img src={selectedPackageForDetail.photos[0]} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center opacity-20 uppercase font-black text-xs">Geen hoofdfoto</div>
                        )}
                     </div>
                     <div className="grid grid-cols-3 gap-4">
                        {selectedPackageForDetail.photos?.slice(1).map((url, i) => (
                           <div key={i} className="rounded-2xl overflow-hidden aspect-square border border-slate-100 bg-slate-50">
                              <img src={url} className="w-full h-full object-cover" />
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="bg-white rounded-[3rem] p-12 w-full max-w-xl shadow-2xl animate-in zoom-in-95 my-8 text-slate-900 relative">
               <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter">{editingUserId ? 'Gebruiker Bewerken' : 'Nieuwe Gebruiker'}</h2>
               
               {generatedPass ? (
                 <div className="bg-green-50 p-8 rounded-[2rem] border border-green-100 text-center animate-in fade-in zoom-in">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-black text-green-900 uppercase tracking-tight mb-4">Gebruiker aangemaakt!</h3>
                    <p className="text-sm text-green-700 font-medium mb-8">Kopieer en bewaar dit wachtwoord handmatig:</p>
                    <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-green-200 text-2xl font-black text-slate-900 tracking-widest mb-10">
                       {generatedPass}
                    </div>
                    <button onClick={() => { setIsUserModalOpen(false); setGeneratedPass(null); setFeedback({ title: "Gereed", type: 'success' }); }} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Klaar</button>
                 </div>
               ) : (
                <form onSubmit={handleSaveUser}>
                  <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Naam & Email</label>
                        <input required placeholder="Volledige naam" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none mb-3" value={newUser.name || ''} onChange={e=>setNewUser({...newUser, name: e.target.value})} />
                        <input required type="email" placeholder="E-mailadres" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newUser.email || ''} onChange={e=>setNewUser({...newUser, email: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Rol</label>
                          <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newUser.role || UserRole.CUSTOMER} onChange={e=>setNewUser({...newUser, role: e.target.value as UserRole})}>
                            <option value={UserRole.CUSTOMER}>KLANT</option>
                            <option value={UserRole.PROJECT_ADMIN}>PROJECT ADMIN</option>
                            <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Project</label>
                          <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newUser.projectId || ''} onChange={e=>setNewUser({...newUser, projectId: e.target.value})}>
                            <option value="">GEEN (GLOBAAL)</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                  </div>
                  <div className="flex gap-4 mt-12">
                      <button type="submit" disabled={isLoading} className="flex-1 py-5 bg-[#8C7864] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">
                        {isLoading ? 'Bezig...' : (editingUserId ? 'Bijwerken' : 'Opslaan')}
                      </button>
                      <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Annuleren</button>
                  </div>
                </form>
               )}
            </div>
         </div>
      )}

      {/* PROJECT MODAL */}
      {isProjectModalOpen && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <form onSubmit={handleSaveProject} className="bg-white rounded-[3rem] p-12 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 my-8 text-slate-900 relative">
               <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter">{editingProjectId ? 'Project Bewerken' : 'Nieuw Project'}</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Project Naam</label>
                      <input required placeholder="Naam van het project" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProject.name || ''} onChange={e=>setNewProject({...newProject, name: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Status</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newProject.status || ProjectStatus.ACTIVE} onChange={e=>setNewProject({...newProject, status: e.target.value as ProjectStatus})}>
                          {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Woningen</label>
                        <input type="number" placeholder="Aantal units" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProject.homesCount || ''} onChange={e=>setNewProject({...newProject, homesCount: parseInt(e.target.value)})} />
                      </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Project Begeleider</label>
                       <input placeholder="Naam projectbegeleider" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProject.manager || ''} onChange={e=>setNewProject({...newProject, manager: e.target.value})} />
                    </div>
                    
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Verwachte Oplevering</label>
                       <input placeholder="Bijv. Q4 2026" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProject.deliveryDate || ''} onChange={e=>setNewProject({...newProject, deliveryDate: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Adres Gegevens</label>
                       <input placeholder="Straat en huisnummer" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none mb-3" value={newProject.address || ''} onChange={e=>setNewProject({...newProject, address: e.target.value})} />
                       <div className="grid grid-cols-2 gap-4">
                          <input placeholder="Postcode" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProject.postalCode || ''} onChange={e=>setNewProject({...newProject, postalCode: e.target.value})} />
                          <input placeholder="Plaats" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newProject.city || ''} onChange={e=>setNewProject({...newProject, city: e.target.value})} />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Project Afbeeldingen</label>
                       <div className="flex flex-wrap gap-2 mb-2">
                          {newProject.additionalPhotos?.map((url, i) => (
                             <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 relative group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setNewProject(p => ({...p, additionalPhotos: p.additionalPhotos?.filter((_, idx) => idx !== i)}))} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">✕</button>
                             </div>
                          ))}
                          <button type="button" onClick={() => projectPhotosRef.current?.click()} className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-[#8C7864] hover:text-[#8C7864] transition-all">+</button>
                          <input ref={projectPhotosRef} type="file" multiple className="hidden" accept="image/*" onChange={handleProjectPhotoUpload} />
                       </div>
                    </div>

                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Interne Opmerkingen</label>
                       <textarea 
                          placeholder="Interne notities voor het beheer..." 
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none h-32 resize-none text-sm" 
                          value={newProject.internalRemarks || ''} 
                          onChange={e=>setNewProject({...newProject, internalRemarks: e.target.value})}
                       />
                    </div>
                  </div>
               </div>

               <div className="flex gap-4 mt-12">
                  <button type="submit" disabled={isLoading} className="flex-1 py-5 bg-[#8C7864] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">
                     {isLoading ? 'Bezig...' : (editingProjectId ? 'Bijwerken' : 'Project Opslaan')}
                  </button>
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Annuleren</button>
               </div>
            </form>
         </div>
      )}

      {/* PACKAGE MODAL (Updated with Image Upload) */}
      {isPackageModalOpen && (
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <form onSubmit={handleSavePackage} className="bg-white rounded-[3rem] p-12 w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-8 text-slate-900">
               <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter">{editingPackageId ? 'Pakket Bewerken' : 'Nieuw Pakket'}</h2>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-slate-900">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Basisgegevens</label>
                      <input required placeholder="Pakketnaam" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none mb-3" value={newPackage.name || ''} onChange={e=>setNewPackage({...newPackage, name: e.target.value})} />
                      <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newPackage.projectId || ''} onChange={e=>setNewPackage({...newPackage, projectId: e.target.value})}>
                        <option value="">Selecteer Project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Categorie</label>
                          <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={newPackage.category || 'Standaard'} onChange={e=>setNewPackage({...newPackage, category: e.target.value})}>
                            <option value="Standaard">Standaard</option>
                            <option value="Luxe">Luxe</option>
                            <option value="Modern">Modern</option>
                            <option value="Klassiek">Klassiek</option>
                            <option value="NEW">Nieuwe Categorie...</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Prijs (€)</label>
                          <input type="number" placeholder="Vanaf prijs" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={newPackage.price || ''} onChange={e=>setNewPackage({...newPackage, price: parseFloat(e.target.value)})} />
                       </div>
                    </div>

                    {newPackage.category === 'NEW' && (
                       <input placeholder="Voer nieuwe categorie in" className="w-full p-4 bg-[#8C7864]/5 border border-[#8C7864]/20 rounded-2xl outline-none text-sm" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} />
                    )}

                    <div>
                       <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Pakket Foto's</label>
                       <div className="flex flex-wrap gap-2">
                          {(newPackage.photos || []).map((url, i) => (
                             <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-100 relative group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removePackagePhoto(i)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-xs">✕</button>
                             </div>
                          ))}
                          <button type="button" onClick={() => packagePhotosRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-[#8C7864] hover:text-[#8C7864] transition-all">+</button>
                          <input ref={packagePhotosRef} type="file" multiple className="hidden" accept="image/*" onChange={handlePackagePhotoUpload} />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-slate-400 block">Inhoud van het pakket</label>
                     <div className="flex gap-2">
                        <input placeholder="Item toevoegen (bijv. Vloerverwarming)..." className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" value={newInclusionInput} onChange={e => setNewInclusionInput(e.target.value)} />
                        <button type="button" onClick={addInclusion} className="w-10 h-10 bg-slate-900 text-white rounded-xl font-bold">+</button>
                     </div>
                     <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-50 p-4 rounded-2xl bg-slate-50/50">
                        {newPackage.inclusions?.map((inc, i) => (
                          <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                             <span className="text-[10px] font-bold uppercase text-slate-600">{inc}</span>
                             <button type="button" onClick={() => removeInclusion(i)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600">✕</button>
                          </div>
                        ))}
                        {(!newPackage.inclusions || newPackage.inclusions.length === 0) && (
                           <div className="text-center py-10 text-[9px] font-black text-slate-300 uppercase italic">Nog geen items toegevoegd</div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 mt-12">
                  <button type="submit" disabled={isLoading} className="flex-1 py-5 bg-[#8C7864] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">
                     Pakket Opslaan
                  </button>
                  <button type="button" onClick={() => setIsPackageModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Annuleren</button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
