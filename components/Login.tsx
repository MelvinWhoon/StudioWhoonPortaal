
import React, { useState } from 'react';
import { MOCK_USERS, IMAGES } from '../constants';
import { useTranslation } from '../App';
import { Language } from '../translations';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (email: string, password?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { lang, setLang, t } = useTranslation();

  const getTranslatedRole = (role: UserRole) => {
    switch(role) {
      case UserRole.SUPER_ADMIN: return t('role_super_admin');
      case UserRole.PROJECT_ADMIN: return t('role_project_admin');
      case UserRole.CUSTOMER: return t('role_customer');
      default: return role;
    }
  };

  const bgImageUrl = 'https://www.whoon.com/wp-content/uploads/2026/02/2e51ae92f59d5cb308c03b8dd6b83d91.jpg';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-inter">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[30s]"
        style={{ 
          backgroundImage: `url(${bgImageUrl})`,
          animation: 'slow-zoom 40s ease-in-out infinite'
        }}
      />
      
      <div className="absolute inset-0 z-10 bg-white/75 backdrop-blur-[2px]" />

      <div className="absolute top-6 right-6 flex gap-2 z-30">
        {(['nl', 'en', 'es'] as Language[]).map(l => (
          <button 
            key={l}
            onClick={() => setLang(l)}
            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${lang === l ? 'bg-[#8C7864] text-white border-[#8C7864] shadow-lg' : 'bg-white/80 backdrop-blur-md border-slate-200 hover:bg-white text-slate-600'}`}
          >
            <span className="text-sm font-bold">{l.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in duration-700 border border-slate-100 relative z-20">
        <div className="p-10 md:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-black/5 border border-slate-50 p-4">
              <img src={IMAGES.LOGO} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 text-center mb-2 uppercase tracking-tighter">{t('login_title')}</h1>
          <p className="text-slate-400 text-center mb-10 font-medium text-xs">{t('login_subtitle')}</p>
          
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{t('email_label')}</label>
              <input
                type="email"
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-[#8C7864]/10 focus:border-[#8C7864] outline-none transition-all font-medium text-slate-900 text-center placeholder:text-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email_placeholder')}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Wachtwoord</label>
              <input
                type="password"
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-[#8C7864]/10 focus:border-[#8C7864] outline-none transition-all font-medium text-slate-900 text-center placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
              />
            </div>
            <button
              type="submit"
              className="w-full py-5 bg-[#8C7864] hover:brightness-110 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-xl shadow-[#8C7864]/20 active:scale-95"
            >
              {t('login_btn')}
            </button>
          </form>

          <div className="mt-12 border-t border-slate-50 pt-10">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center mb-6">{t('quick_links')}</p>
            <div className="grid grid-cols-1 gap-3">
              {MOCK_USERS.map(u => (
                <button
                  key={u.id}
                  onClick={() => onLogin(u.email, 'Meubilex!')}
                  className="px-6 py-3.5 text-left bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 text-xs text-slate-600 transition-all flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-black text-slate-900 uppercase tracking-tight">{u.name.toUpperCase()}</span> 
                    <span className="text-[#8C7864] font-bold text-[9px] uppercase tracking-tighter">({getTranslatedRole(u.role)})</span>
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 text-[#8C7864]">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Login;
