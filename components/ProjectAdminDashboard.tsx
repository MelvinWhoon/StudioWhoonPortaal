
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useTranslation } from '../App';
import { dataService } from '../dataService';
import { User, UserRole, MasterPackage, Message, Project, ProjectStatus, PortalDocument } from '../types';
import DashboardStats from './DashboardStats';

const generateRandomPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let pass = "";
  for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
};

// Reuse UI Modal for Feedback
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
    <div className="bg-white rounded-[3rem] p-12 w-full max-sm shadow-2xl animate-in zoom-in-95 text-center text-slate-900">
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

const ProjectAdminDashboard: React.FC = () => {
  const { user: currentUser, activeProject, activeView, setActiveView } = useAuth();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<User[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dossierTab, setDossierTab] = useState<'profile' | 'docs' | 'chat'>('profile');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [customerDocs, setCustomerDocs] = useState<PortalDocument[]>([]);
  const [packages, setPackages] = useState<MasterPackage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI state for alerts/confirms
  const [feedback, setFeedback] = useState<{title: string, msg?: string, type: 'success' | 'error' | 'info', pass?: string | null} | null>(null);
  const [confirmData, setConfirmData] = useState<{title: string, message: string, onConfirm: () => void, isDestructive?: boolean} | null>(null);

  // Notes state
  const [localNotes, setLocalNotes] = useState('');

  // Editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<User> | null>(null);
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // File upload state for admin
  const adminFileRef = useRef<HTMLInputElement>(null);
  const [isAdminUploading, setIsAdminUploading] = useState(false);

  const refreshData = async () => {
    if (activeProject) {
      const users = await dataService.getUsers();
      const projectCustomers = users.filter(u => u.projectId === activeProject.id && u.role === UserRole.CUSTOMER);
      setCustomers(projectCustomers);
      
      const allMsgs = await dataService.getAllMessages();
      setMessages(allMsgs.filter(m => m.projectId === activeProject.id));

      const projPackages = await dataService.getMasterPackages(activeProject.id);
      setPackages(projPackages);

      if (selectedCustomerId) {
        const docs = await dataService.getDocuments(selectedCustomerId);
        setCustomerDocs(docs);
        const currentCust = projectCustomers.find(c => c.id === selectedCustomerId);
        if (currentCust) setLocalNotes(currentCust.remarks || '');
      }
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeProject, activeView, selectedCustomerId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedCustomerId, dossierTab, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCustomerId || !activeProject) return;
    await dataService.sendMessage(activeProject.id, selectedCustomerId, currentUser!.id, currentUser!.name, currentUser!.role, newMessage);
    setNewMessage('');
    await refreshData();
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !activeProject) return;
    setIsLoading(true);
    try {
      if (editingCustomer.id) {
        await dataService.updateUser(editingCustomer.id, editingCustomer);
        setIsEditModalOpen(false);
        setEditingCustomer(null);
        setFeedback({ title: "Bijgewerkt", type: 'success' });
      } else {
        const pass = generateRandomPassword();
        await dataService.createUser({
          ...editingCustomer,
          role: UserRole.CUSTOMER,
          projectId: activeProject.id,
          isActive: true,
          password: pass
        });
        setGeneratedPass(pass);
      }
      await refreshData();
    } catch (err) {
      setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    setConfirmData({
      title: "Wachtwoord Resetten",
      message: "Weet u zeker dat u het wachtwoord van deze klant wilt resetten?",
      onConfirm: async () => {
        const pass = generateRandomPassword();
        try {
          await dataService.updateUser(id, { password: pass });
          setConfirmData(null);
          setFeedback({ title: "Wachtwoord Gereset", msg: "Deel dit nieuwe wachtwoord handmatig met de klant:", type: 'success', pass });
        } catch (err) {
          setConfirmData(null);
          setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
        }
      }
    });
  };

  const handleDeleteCustomer = async (id: string) => {
    setConfirmData({
      title: "Klant Verwijderen",
      message: "Weet u zeker dat u deze klant uit het project wilt verwijderen?",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await dataService.deleteUser(id);
          if (selectedCustomerId === id) setSelectedCustomerId(null);
          setConfirmData(null);
          await refreshData();
          setFeedback({ title: "Verwijderd", type: 'success' });
        } catch (err) {
          setConfirmData(null);
          setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
        }
      }
    });
  };

  const handleEscalate = async (customerId: string) => {
    setConfirmData({
      title: "Chat Escaleren",
      message: "Wilt u dit gesprek escaleren naar een Super Admin?",
      onConfirm: async () => {
        try {
          await dataService.escalateChat(customerId, true);
          setConfirmData(null);
          setFeedback({ title: "Geëscaleerd", msg: "Super Admin is op de hoogte gesteld.", type: 'success' });
          await refreshData();
        } catch (err) {
          setConfirmData(null);
          setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
        }
      }
    });
  };

  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCustomerId || !activeProject) return;

    setIsAdminUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        await dataService.uploadDocument(
          activeProject.id,
          selectedCustomerId,
          file.name,
          currentUser!.name,
          currentUser!.role,
          sizeMb,
          base64Data
        );
        await refreshData();
        setFeedback({ title: "Geüpload", msg: "Document is toegevoegd aan het dossier.", type: 'success' });
      } catch (err) {
        setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
      } finally {
        setIsAdminUploading(false);
        if (adminFileRef.current) adminFileRef.current.value = '';
      }
    };
  };

  const updateProgress = async (key: string, val: any) => {
    if (!selectedCustomerId) return;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;
    const progress = { ...(customer.constructionProgress || {total:0, foundation:'', shell:'', finishing:''}), [key]: val };
    await dataService.updateUser(selectedCustomerId, { constructionProgress: progress as any });
    await refreshData();
  };

  const handleNotesChange = (val: string) => {
    setLocalNotes(val);
  };

  const saveNotes = async () => {
    if (!selectedCustomerId) return;
    try {
      await dataService.updateUser(selectedCustomerId, { remarks: localNotes });
      setFeedback({ title: "Opgeslagen", msg: "Dossier notities zijn bijgewerkt.", type: 'success' });
    } catch(e) {
      setFeedback({ title: "Fout", msg: t('error_generic'), type: 'error' });
    }
  };

  if (activeView === 'Dashboard') return <DashboardStats projectId={activeProject?.id} />;

  // Project View Logic
  if (activeView === 'Project') {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">{activeProject?.name}</h1>
              <p className="text-[10px] font-black text-[#8C7864] uppercase tracking-widest">Project Details & Beheer</p>
            </div>
            <span className="px-6 py-2 bg-[#8C7864] text-white text-[9px] font-black uppercase tracking-widest rounded-xl">{activeProject?.status}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Locatie</span>
                <p className="text-sm font-bold text-slate-700">{activeProject?.address}, {activeProject?.postalCode} {activeProject?.city}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Project Manager</span>
                <p className="text-sm font-bold text-slate-700">{activeProject?.manager}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Totaal Woningen</span>
                <p className="text-sm font-bold text-slate-700">{activeProject?.homesCount} Units</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Oplevering</span>
                <p className="text-sm font-bold text-slate-700">{activeProject?.deliveryDate}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl">
               <span className="text-[9px] font-black text-slate-400 uppercase block mb-3">Interne Project Notities</span>
               <textarea 
                  className="w-full h-32 bg-transparent border-none outline-none text-xs font-medium text-slate-600 resize-none leading-relaxed"
                  value={activeProject?.internalRemarks || ''}
                  readOnly
                  placeholder="Notities van Super Admin..."
               />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All Messages View Logic
  if (activeView === 'Berichten') {
    return (
      <div className="space-y-8 animate-in fade-in h-[calc(100vh-160px)] flex flex-col">
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Alle Project Berichten</h1>
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Totaal: {messages.length} berichten</span>
        </div>
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
           <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {messages.slice().reverse().map(m => {
                const isMe = m.senderId === currentUser?.id;
                const customer = customers.find(c => c.id === m.customerId);
                return (
                  <div key={m.id} className="flex gap-4 group">
                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 font-black text-xs text-slate-400 uppercase">
                        {m.senderName[0]}
                     </div>
                     <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] font-black uppercase tracking-tight ${isMe ? 'text-[#8C7864]' : 'text-slate-900'}`}>{m.senderName}</span>
                           <span className="text-[8px] font-bold text-slate-300 uppercase">{new Date(m.date).toLocaleString()}</span>
                           {customer && <span className="text-[8px] px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-md uppercase font-black">Dossier: {customer.apartmentId}</span>}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm ${isMe ? 'bg-slate-50 text-slate-700' : 'bg-white border border-slate-100 text-slate-800 shadow-sm'}`}>
                           {m.text}
                        </div>
                     </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="p-40 text-center opacity-20 italic font-black uppercase text-[10px]">Nog geen berichten in dit project</div>
              )}
           </div>
        </div>
      </div>
    );
  }

  const selectedCust = customers.find(c => c.id === selectedCustomerId);
  const isSelectedEscalated = messages.filter(m => m.customerId === selectedCustomerId).some(m => m.isEscalated);

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-160px)] pb-4 relative">
      {/* FEEDBACK & CONFIRM MODALS */}
      {feedback && <FeedbackModal {...feedback} onClose={() => setFeedback(null)} />}
      {confirmData && <ConfirmModal {...confirmData} onCancel={() => setConfirmData(null)} />}

      {/* Customer List */}
      <div className="w-full lg:w-80 bg-white/90 backdrop-blur-md rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Project Klanten</h3>
          <button onClick={() => { setEditingCustomer({}); setIsEditModalOpen(true); setGeneratedPass(null); }} className="w-8 h-8 bg-[#8C7864] text-white rounded-xl flex items-center justify-center text-sm shadow-lg shadow-[#8C7864]/20">+</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {customers.map(c => (
            <div key={c.id} className="relative group">
              <button onClick={() => setSelectedCustomerId(c.id)} className={`w-full text-left p-4 pr-12 rounded-2xl transition-all ${selectedCustomerId === c.id ? 'bg-slate-900 text-white shadow-xl' : 'hover:bg-slate-50 text-slate-900'}`}>
                <div className="font-black text-sm truncate">{c.name}</div>
                <div className={`text-[8px] font-black uppercase tracking-widest mt-1 ${selectedCustomerId === c.id ? 'text-slate-400' : 'text-slate-300'}`}>{c.apartmentId || 'GEEN ID'}</div>
              </button>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setIsEditModalOpen(true); setGeneratedPass(null); }} className="p-1.5 text-slate-400 hover:text-[#8C7864] transition-colors">✏️</button>
                 <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
              </div>
            </div>
          ))}
          {customers.length === 0 && <div className="text-center py-20 text-[10px] font-black uppercase text-slate-200 italic">Geen klanten gevonden</div>}
        </div>
      </div>

      {/* Dossier Area */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative">
        {selectedCust ? (
          <>
            <div className="p-10 border-b border-slate-50 bg-white/50 z-10">
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                       <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedCust.name}</h2>
                       <button onClick={() => { setEditingCustomer(selectedCust); setIsEditModalOpen(true); setGeneratedPass(null); }} className="text-[10px] font-black text-[#8C7864] uppercase border-b border-dashed border-[#8C7864]">Bewerk profiel</button>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedCust.email} • {selectedCust.apartmentId}</p>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                     {[
                       {id:'profile', label: 'Dossier'}, 
                       {id:'docs', label: 'Documenten'}, 
                       {id:'chat', label: 'Chat'}
                     ].map(t => (
                       <button 
                         key={t.id} 
                         onClick={() => setDossierTab(t.id as any)} 
                         className={`px-6 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${dossierTab === t.id ? 'bg-white shadow-sm text-[#8C7864]' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         {t.label}
                       </button>
                     ))}
                  </div>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar text-slate-900">
               {dossierTab === 'profile' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in">
                   <div className="space-y-8">
                     <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex justify-between">
                           Bouw Percentage
                           <span className="text-slate-900">{selectedCust.constructionProgress?.total || 0}%</span>
                        </h4>
                        <input type="range" className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#8C7864]" min="0" max="100" value={selectedCust.constructionProgress?.total || 0} onChange={e=>updateProgress('total', parseInt(e.target.value))} />
                        <div className="mt-8 grid grid-cols-3 gap-4">
                           {['foundation', 'shell', 'finishing'].map(key => (
                              <div key={key}>
                                 <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">{key}</span>
                                 <select className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none" value={(selectedCust.constructionProgress as any)?.[key] || ''} onChange={e=>updateProgress(key, e.target.value)}>
                                    <option value="Nog niet gestart">Wacht</option>
                                    <option value="In uitvoering">Bezig</option>
                                    <option value="Voltooid">OK</option>
                                 </select>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Interne Dossier Notities</h4>
                           <button onClick={saveNotes} className="text-[8px] font-black text-[#8C7864] uppercase border border-[#8C7864] px-2 py-1 rounded-md hover:bg-[#8C7864] hover:text-white transition-all">Notities Opslaan</button>
                        </div>
                        <textarea 
                          className="w-full h-40 bg-transparent border-none outline-none text-sm resize-none text-slate-700 font-medium leading-relaxed" 
                          placeholder="Bijv. Afwijkende keukenwensen of gespreksnotities..." 
                          value={localNotes} 
                          onChange={(e) => handleNotesChange(e.target.value)} 
                        />
                     </div>
                   </div>
                   <div className="space-y-8">
                      <div className="bg-[#B7A996] p-8 rounded-3xl text-slate-900 shadow-xl shadow-[#B7A996]/10">
                        <h4 className="text-[10px] font-black uppercase text-slate-700 mb-6 tracking-widest">Appartement Kenmerken</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between border-b border-black/5 pb-2">
                             <span className="text-[10px] font-bold text-slate-600 uppercase">Oppervlakte</span>
                             <span className="font-black text-sm">{selectedCust.apartmentDetails?.surface} m²</span>
                           </div>
                           <div className="flex justify-between border-b border-black/5 pb-2">
                             <span className="text-[10px] font-bold text-slate-600 uppercase">Kamers</span>
                             <span className="font-black text-sm">{selectedCust.apartmentDetails?.rooms}</span>
                           </div>
                           <div className="flex justify-between border-b border-black/5 pb-2">
                             <span className="text-[10px] font-bold text-slate-600 uppercase">Oplevering</span>
                             <span className="font-black text-sm">{selectedCust.apartmentDetails?.deliveryDate}</span>
                           </div>
                           <div className="flex justify-between items-center pt-4">
                             <span className="text-[10px] font-bold text-slate-600 uppercase">Gekozen Pakket</span>
                             <span className="px-3 py-1 bg-white/40 rounded-lg text-[10px] font-black uppercase">{packages.find(p=>p.id===selectedCust.masterPackageId)?.name || 'Geen'}</span>
                           </div>
                        </div>
                      </div>
                      <div className="p-8 bg-orange-50 border border-orange-100 rounded-3xl">
                         <h4 className="text-[10px] font-black uppercase text-orange-600 mb-4 tracking-widest">Escalatie Beheer</h4>
                         <p className="text-[11px] text-orange-500 font-medium mb-6 leading-relaxed">Heeft u hulp nodig bij dit dossier? U kunt de volledige chatgeschiedenis escaleren naar een Super Admin.</p>
                         <button 
                            disabled={isSelectedEscalated}
                            onClick={() => handleEscalate(selectedCust.id)} 
                            className={`w-full py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isSelectedEscalated ? 'bg-slate-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20'}`}
                         >
                            {isSelectedEscalated ? 'Geëscaleerd' : 'Escaleren naar Admin'}
                         </button>
                      </div>
                      <div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl">
                         <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Veiligheid</h4>
                         <button onClick={() => handleResetPassword(selectedCust.id)} className="w-full py-3 border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">Wachtwoord Resetten</button>
                      </div>
                   </div>
                 </div>
               )}
               {dossierTab === 'docs' && (
                 <div className="animate-in fade-in space-y-8">
                    <div className="flex justify-between items-end">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Klant Documenten</h4>
                       <button 
                         onClick={() => adminFileRef.current?.click()}
                         disabled={isAdminUploading}
                         className="px-6 py-3 bg-[#8C7864] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#8C7864]/20 hover:scale-105 transition-all"
                       >
                         {isAdminUploading ? 'Bezig...' : 'Upload Nieuw Document'}
                       </button>
                       <input ref={adminFileRef} type="file" className="hidden" onChange={handleAdminFileUpload} />
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-slate-100/50 border-b border-slate-200">
                             <tr>
                                <th className="p-6 text-[9px] font-black uppercase text-slate-400">Naam</th>
                                <th className="p-6 text-[9px] font-black uppercase text-slate-400">Datum</th>
                                <th className="p-6 text-right"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {customerDocs.map(doc => (
                               <tr key={doc.id} className="hover:bg-white transition-colors">
                                  <td className="p-6">
                                     <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{doc.fileName}</div>
                                     <div className="text-[8px] font-bold text-slate-400 uppercase">Door: {doc.uploadedBy} ({doc.size})</div>
                                  </td>
                                  <td className="p-6 text-[10px] font-bold text-slate-500">{doc.date}</td>
                                  <td className="p-6 text-right">
                                     <div className="flex justify-end gap-2">
                                        <button onClick={() => window.open(doc.externalUrl)} className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-[#8C7864] transition-all">📥</button>
                                        <button onClick={() => dataService.deleteDocument(doc.id).then(refreshData)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                                     </div>
                                  </td>
                               </tr>
                             ))}
                             {customerDocs.length === 0 && (
                               <tr>
                                  <td colSpan={3} className="p-12 text-center text-[10px] font-black uppercase text-slate-300 italic">Geen documenten in dit dossier</td>
                               </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>
               )}
               {dossierTab === 'chat' && (
                 <div className="flex flex-col h-full bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-4">
                   <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                     {messages.filter(m => m.customerId === selectedCust.id).map(m => {
                       const isMe = m.senderId === currentUser?.id;
                       return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-[#8C7864] text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
                            <p className="text-sm">{m.text}</p>
                            <span className="text-[8px] block mt-1 opacity-60 uppercase">{new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                       );
                     })}
                     <div ref={chatEndRef} />
                   </div>
                   <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex gap-4">
                      <input className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" placeholder="Typ uw antwoord..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
                      <button type="submit" className="px-8 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/10 hover:bg-[#8C7864] transition-all active:scale-95">Verstuur</button>
                   </form>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-slate-900 py-40">
            <span className="text-9xl mb-8">👤</span>
            <p className="text-sm font-black uppercase tracking-widest">Selecteer een klant uit de lijst om het dossier te beheren</p>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-white rounded-[3rem] p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-8 text-slate-900 relative">
              <h2 className="text-3xl font-black mb-10 uppercase tracking-tighter">{editingCustomer?.id ? 'Klant Bewerken' : 'Nieuwe Klant Toevoegen'}</h2>
              
              {generatedPass ? (
                 <div className="bg-green-50 p-8 rounded-[2rem] border border-green-100 text-center animate-in fade-in zoom-in">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-black text-green-900 uppercase tracking-tight mb-4">Klant succesvol aangemaakt!</h3>
                    <p className="text-sm text-green-700 font-medium mb-8">Kopieer en bewaar dit wachtwoord handmatig om het naar de klant te sturen:</p>
                    <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-green-200 text-2xl font-black text-slate-900 tracking-widest mb-10">
                       {generatedPass}
                    </div>
                    <button onClick={() => { setIsEditModalOpen(false); setGeneratedPass(null); setFeedback({ title: "Gereed", type: 'success' }); }} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Klaar</button>
                 </div>
              ) : (
                <form onSubmit={handleSaveCustomer}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Persoonlijke Gegevens</label>
                          <input required placeholder="Volledige naam" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none mb-3" value={editingCustomer?.name || ''} onChange={e=>setEditingCustomer({...editingCustomer, name: e.target.value})} />
                          <input required type="email" placeholder="E-mailadres" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={editingCustomer?.email || ''} onChange={e=>setEditingCustomer({...editingCustomer, email: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Appartement Info</label>
                        <input placeholder="Appartement ID (Bijv. APT-101)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none mb-3" value={editingCustomer?.apartmentId || ''} onChange={e=>setEditingCustomer({...editingCustomer, apartmentId: e.target.value})} />
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" value={editingCustomer?.masterPackageId || ''} onChange={e=>setEditingCustomer({...editingCustomer, masterPackageId: e.target.value})}>
                            <option value="">Geen Pakket</option>
                            {packages.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-12">
                    <button type="submit" disabled={isLoading} className="flex-1 py-5 bg-[#8C7864] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">
                        {isLoading ? 'Bezig...' : (editingCustomer?.id ? 'Opslaan' : 'Klant Aanmaken')}
                    </button>
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Annuleren</button>
                  </div>
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAdminDashboard;
