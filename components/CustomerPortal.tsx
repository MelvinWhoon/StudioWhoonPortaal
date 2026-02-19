
import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useTranslation, useMessageTranslation } from '../App';
import { dataService } from '../dataService';
import { PortalDocument, Message, Notification, UserRole, MasterPackage, MessageCategory } from '../types';

const InteractiveGallery: React.FC<{ photos: string[] }> = ({ photos }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!photos || photos.length === 0) return (
    <div className="w-full aspect-video bg-slate-100 rounded-[2rem] flex items-center justify-center text-[10px] font-black text-slate-300 uppercase">Geen afbeeldingen</div>
  );
  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-100 aspect-video border border-slate-100 shadow-sm">
        <img src={photos[activeIndex]} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" alt="Gallery" />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {photos.map((url, i) => (
            <button key={i} onClick={() => setActiveIndex(i)} className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 transition-all border-2 ${i === activeIndex ? 'border-[#8C7864] scale-95' : 'border-transparent opacity-60'}`}>
              <img src={url} className="w-full h-full object-cover" alt="Thumb" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomerPortal: React.FC = () => {
  const { user, activeProject, activeView, setActiveView } = useAuth();
  const { t, lang } = useTranslation();
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const { translatedMessages, isTranslating } = useMessageTranslation(messages, lang);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [packages, setPackages] = useState<MasterPackage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDocs = async () => {
    if (user) {
      const allDocs = await dataService.getDocuments(user.id);
      setDocs(allDocs);
    }
  };

  useEffect(() => {
    if (user) {
      refreshDocs();
      dataService.getMessages(user.id).then(setMessages);
      dataService.getNotifications(user.id).then(setNotifications);
      dataService.getMasterPackages(activeProject?.id).then(setPackages);
    }
  }, [user, activeView, activeProject]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeProject) return;
    await dataService.sendMessage(activeProject.id, user.id, user.id, user.name, user.role, newMessage);
    setMessages(await dataService.getMessages(user.id));
    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeProject) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        await dataService.uploadDocument(
          activeProject.id,
          user.id,
          uploadFileName || file.name,
          user.name,
          UserRole.CUSTOMER,
          sizeMb,
          base64Data
        );
        setUploadFileName('');
        await refreshDocs();
        alert('Bestand succesvol geüpload!');
      } catch (err) {
        alert(t('error_generic'));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  const currentPackage = packages.find(mp => mp.id === user?.masterPackageId);

  if (activeView === 'Berichten') {
    return (
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-160px)] animate-in fade-in">
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Project Chat</h2>
            {isTranslating && <span className="text-[8px] font-black text-[#8C7864] animate-pulse">Vertaald door AI...</span>}
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/20">
            {messages.map(m => {
              const isMe = m.senderId === user?.id;
              const text = translatedMessages[m.id] || m.text;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${isMe ? 'bg-[#8C7864] text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
                    <p className="text-sm">{text}</p>
                    <span className="text-[8px] block mt-1 opacity-60 uppercase">{new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              );
            })}
            <div ref={msgEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-50 bg-white flex gap-4">
            <input className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" placeholder={t('type_message')} value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
            <button type="submit" className="px-10 bg-[#8C7864] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all">Verzend</button>
          </form>
        </div>
        <div className="w-full lg:w-80 bg-white rounded-[2.5rem] border border-slate-100 p-8">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 border-b border-slate-50 pb-4">Meldingen</h3>
           <div className="space-y-4 h-full overflow-y-auto custom-scrollbar">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 rounded-2xl border ${n.isRead ? 'bg-white border-slate-50 opacity-50' : 'bg-[#8C7864]/5 border-[#8C7864]/10'}`}>
                  <p className="text-[11px] font-bold text-slate-700">{n.text}</p>
                </div>
              ))}
              {notifications.length === 0 && <div className="text-center text-[10px] font-black uppercase text-slate-300 py-10 italic">Geen nieuwe meldingen</div>}
           </div>
        </div>
      </div>
    );
  }

  if (activeView === 'Documenten') {
    return (
      <div className="space-y-12 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Documenten</h1>
            <p className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">Beheer uw bestanden en uploads</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Naam van bestand (optioneel)" 
              className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-[#8C7864] transition-all"
              value={uploadFileName}
              onChange={e => setUploadFileName(e.target.value)}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-8 py-4 bg-[#8C7864] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#8C7864]/20 active:scale-95 transition-all"
            >
              {isUploading ? 'Bezig met uploaden...' : 'Bestand Selecteren & Uploaden'}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400">Bestand</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400">Datum</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400">Grootte</th>
                <th className="p-8 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-8">
                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{doc.fileName}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold">Door: {doc.uploadedBy}</div>
                  </td>
                  <td className="p-8 text-xs text-slate-500 font-bold">{doc.date}</td>
                  <td className="p-8 text-xs text-slate-500 font-bold">{doc.size}</td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => window.open(doc.externalUrl)} className="w-10 h-10 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-[#8C7864] transition-all flex items-center justify-center">📥</button>
                       {doc.uploadedBy === user?.name && (
                         <button onClick={() => dataService.deleteDocument(doc.id).then(refreshDocs)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">🗑️</button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-24 text-center text-[10px] font-black uppercase text-slate-300 italic">Nog geen documenten aanwezig in uw dossier</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeView === 'Mijn Pakket') {
    return (
      <div className="space-y-12 animate-in fade-in">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Mijn Geselecteerde Pakket</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Alle Pakket-afbeeldingen</h3>
            <div className="grid grid-cols-1 gap-8">
              {(currentPackage?.photos || []).map((photo, i) => (
                <div key={i} className="relative rounded-[2.5rem] overflow-hidden bg-slate-100 aspect-video border border-slate-100 shadow-xl">
                  <img src={photo} className="w-full h-full object-cover" alt={`Package view ${i}`} />
                </div>
              ))}
              {(currentPackage?.photos || []).length === 0 && (
                <div className="bg-white rounded-[2rem] border border-slate-100 p-20 text-center opacity-20 italic uppercase font-black text-xs">Geen foto's beschikbaar</div>
              )}
            </div>
          </div>
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm text-slate-900 h-fit sticky top-8">
             <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">{currentPackage?.name || 'Pakket laden...'}</h2>
             <div className="space-y-8 mt-12">
                <div>
                   <h3 className="text-sm font-black uppercase text-slate-400 border-b border-slate-50 pb-4 tracking-widest mb-6">Inbegrepen Inhoud</h3>
                   <ul className="space-y-5">
                      {currentPackage?.inclusions?.map((inc, i) => (
                        <li key={i} className="flex items-center gap-4 text-sm font-bold text-slate-700">
                           <span className="w-2 h-2 bg-[#8C7864] rounded-full shrink-0 shadow-sm" />
                           {inc}
                        </li>
                      ))}
                   </ul>
                </div>
                {currentPackage?.price && (
                  <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                    <div>
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Indicatieve Pakketprijs</span>
                       <span className="text-4xl font-black text-slate-900 tracking-tighter">€ {currentPackage.price.toLocaleString()}</span>
                    </div>
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">🏷️</div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Welkom, {user?.name}</h1>
           <p className="text-xs text-[#8C7864] font-bold uppercase mt-3 tracking-widest">Uw persoonlijk dossier voor {activeProject?.name}</p>
        </div>
        <div className="bg-white px-8 py-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="w-10 h-10 bg-[#8C7864]/10 rounded-xl flex items-center justify-center text-xl">📄</div>
           <div>
              <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">Dossier Nummer</span>
              <span className="text-sm font-black text-slate-900">{user?.apartmentId || 'N.v.t.'}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Apartment Card */}
        <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <div className="p-12">
             <div className="h-72 rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl relative">
                <img src={activeProject?.additionalPhotos?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <h3 className="absolute bottom-10 left-10 text-2xl font-black text-white uppercase tracking-tighter">Uw Nieuwe Thuis</h3>
             </div>
             
             <div className="space-y-8">
                <div className="grid grid-cols-2 gap-10">
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Bouwvoortgang</span>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">{user?.constructionProgress?.total || 0}%</div>
                      <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#8C7864] transition-all duration-1000" style={{ width: `${user?.constructionProgress?.total || 0}%` }} />
                      </div>
                   </div>
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Verwachte Oplevering</span>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">{user?.apartmentDetails?.deliveryDate || 'T.b.a.'}</div>
                      <div className="mt-3 text-[10px] font-black text-[#8C7864] uppercase">{activeProject?.status}</div>
                   </div>
                </div>

                <div className="pt-10 border-t border-slate-50 space-y-5">
                   <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adres Project</span>
                      <span className="text-xs font-bold text-slate-900 uppercase">{activeProject?.address || 'Niet beschikbaar'}</span>
                   </div>
                   <div className="flex justify-between items-center p-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Woonoppervlakte</span>
                      <span className="text-xs font-bold text-slate-900 uppercase">{user?.apartmentDetails?.surface || 0} m²</span>
                   </div>
                   <div className="flex justify-between items-center p-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aantal Kamers</span>
                      <span className="text-xs font-bold text-slate-900 uppercase">{user?.apartmentDetails?.rooms || 0}</span>
                   </div>
                   <div className="flex justify-between items-center p-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etage / Verdieping</span>
                      <span className="text-xs font-bold text-slate-900 uppercase">{user?.apartmentDetails?.floor || 0}e etage</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Package Card */}
        <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
          <div className="p-12 flex flex-col flex-1">
             <div className="h-72 rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl relative">
                <img src={currentPackage?.photos?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <h3 className="absolute bottom-10 left-10 text-2xl font-black text-white uppercase tracking-tighter">Geselecteerd Pakket</h3>
             </div>
             <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 text-slate-900">{currentPackage?.name || 'Nog geen pakket gekozen'}</h3>
             
             <div className="space-y-4 mb-12 flex-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Hoogtepunten van selectie</span>
                {(currentPackage?.inclusions || []).slice(0,6).map((inc, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-50">
                    <span className="w-2 h-2 bg-[#8C7864] rounded-full shadow-sm" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase leading-none">{inc}</span>
                  </div>
                ))}
                {(currentPackage?.inclusions || []).length === 0 && (
                  <div className="text-center py-10 text-[10px] text-slate-300 uppercase font-black italic">Geen informatie beschikbaar</div>
                )}
             </div>

             <button 
               onClick={() => setActiveView('Mijn Pakket')} 
               className="w-full py-6 border-2 border-slate-100 text-[#8C7864] rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 hover:border-[#8C7864] transition-all"
             >
               Volledig pakket inzien
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
