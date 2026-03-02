
import React, { useState, createContext, useContext, useEffect } from 'react';
import { User, UserRole, Project, Message } from './types';
import { dataService } from './dataService';
import { translations, Language } from './translations';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ProjectAdminDashboard from './components/ProjectAdminDashboard';
import CustomerPortal from './components/CustomerPortal';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { MOCK_USERS } from './constants';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => void;
  logout: () => void;
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

interface TranslationContextType {
  t: (key: string) => string;
  lang: Language;
  setLang: (l: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used within TranslationProvider');
  return context;
};

export const useMessageTranslation = (messages: Message[], targetLang: Language) => {
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const translateAll = async () => {
      if (targetLang === 'nl' || messages.length === 0) {
        setTranslatedMessages({});
        return;
      }
      setIsTranslating(true);
      const newTranslations: Record<string, string> = { ...translatedMessages };
      let changed = false;
      for (const m of messages) {
        const cacheKey = `${m.id}_${targetLang}`;
        if (!newTranslations[cacheKey]) {
          try {
            const translated = await dataService.translateText(m.text, targetLang);
            newTranslations[cacheKey] = translated;
            changed = true;
          } catch (e) {
            console.error("Translation error:", e);
          }
        }
      }
      if (changed) setTranslatedMessages(newTranslations);
      setIsTranslating(false);
    };
    translateAll();
  }, [messages, targetLang]);

  return { translatedMessages, isTranslating };
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeView, setActiveView] = useState('Default');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Language>('nl');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await dataService.ensureSeeded();
        const projects = await dataService.getProjects();
        if (projects.length > 0) setActiveProject(projects[0]);
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = async (email: string, password?: string) => {
    setIsLoggingIn(true);
    try {
      console.log('Attempting login for:', email);
      const users = await dataService.getUsers();
      console.log('Users fetched:', users.length);
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (found) {
        if (found.password && found.password !== password) {
          alert('Onjuist wachtwoord.');
          return;
        }
        setUser(found);
        const projects = await dataService.getProjects();
        if (found.role === UserRole.SUPER_ADMIN) {
          setActiveView('Statistieken');
        } else if (found.role === UserRole.PROJECT_ADMIN) {
          setActiveView('Dashboard');
          const p = projects.find(proj => proj.id === found.projectId);
          setActiveProject(p || null);
        } else {
          setActiveView('Overzicht');
          const p = projects.find(proj => proj.id === found.projectId);
          setActiveProject(p || null);
        }
      } else {
        alert('Onbekend emailadres.');
      }
    } catch (error) {
      console.error("Login error:", error);
      alert('Er is een fout opgetreden bij het inloggen. Controleer uw verbinding.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    setUser(null);
    setActiveProject(null);
    setActiveView('Default');
  };

  const t = (key: string) => (translations[lang] as any)[key] || key;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edeae6]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#8C7864] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#8C7864]">Initialiseren...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, activeProject, setActiveProject, activeView, setActiveView, isSidebarOpen, setSidebarOpen }}>
      <TranslationContext.Provider value={{ t, lang, setLang }}>
        {!user ? (
          <Login onLogin={login} isLoggingIn={isLoggingIn} />
        ) : (
          <div className="flex h-screen bg-[#edeae6] font-inter overflow-hidden relative">
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(https://www.whoon.com/wp-content/uploads/2026/02/2e51ae92f59d5cb308c03b8dd6b83d91.jpg)` }}
            />
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 z-10 relative">
              <Header />
              <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {user.role === UserRole.SUPER_ADMIN && <SuperAdminDashboard />}
                {user.role === UserRole.PROJECT_ADMIN && <ProjectAdminDashboard />}
                {user.role === UserRole.CUSTOMER && <CustomerPortal />}
              </main>
            </div>
          </div>
        )}
      </TranslationContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;
