
import React, { useEffect, useState } from 'react';
import { dataService, DashboardData } from '../dataService';
import { useAuth } from '../App';

const DashboardStats: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await dataService.getDashboardStats(projectId);
        setStats(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white/50 rounded-[2rem] border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Totaal Projecten', val: stats.totalProjects, icon: '🏢' },
          { label: 'Woningen', val: stats.totalApartments, icon: '🏠' },
          { label: 'Totaal Klanten', val: stats.totalCustomers, icon: '👥' },
          { label: 'Bezetting', val: `${stats.totalApartments > 0 ? Math.round((stats.assignedApartments / stats.totalApartments) * 100) : 0}%`, icon: '📈' }
        ].map((box, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">{box.label}</span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900 tracking-tighter">{box.val}</span>
              <span className="text-2xl opacity-20">{box.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Status Verdeling</h3>
               <div className="space-y-6">
                 {Object.entries(stats.projectsByStatus).map(([status, count]) => (
                   <div key={status} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span>{status}</span>
                        <span className="text-slate-400">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#8C7864] transition-all duration-1000" style={{ width: `${((count as number) / stats.totalProjects) * 100}%` }} />
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Chat Activiteit</h3>
               <div className="flex items-center justify-around h-full py-4">
                  <div className="text-center">
                    <div className="text-3xl font-black text-orange-500">{stats.chats.open}</div>
                    <div className="text-[9px] font-black uppercase text-slate-300 tracking-widest mt-2">Openstaand</div>
                  </div>
                  <div className="w-px h-12 bg-slate-100" />
                  <div className="text-center">
                    <div className="text-3xl font-black text-green-600">{stats.chats.resolved}</div>
                    <div className="text-[9px] font-black uppercase text-slate-300 tracking-widest mt-2">Afgehandeld</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-[#B7A996] rounded-[2.5rem] p-10 text-slate-900 shadow-xl shadow-[#B7A996]/20 flex flex-col">
           <h3 className="text-sm font-black uppercase tracking-widest mb-8 border-b border-black/5 pb-4">Klanten per Project</h3>
           <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {Object.entries(stats.customersPerProject).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center group">
                   <div>
                      <div className="text-xs font-bold uppercase tracking-tight group-hover:text-white transition-colors">{name}</div>
                      <div className="text-[9px] text-slate-700 font-black uppercase">{count} klanten</div>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-black">
                      {stats.totalCustomers > 0 ? Math.round(((count as number) / stats.totalCustomers) * 100) : 0}%
                   </div>
                </div>
              ))}
           </div>
           <div className="mt-8 pt-8 border-t border-black/5 space-y-4">
              <div className="p-5 bg-white/20 rounded-2xl">
                 <span className="text-[9px] font-black uppercase block mb-1">Dossier Voltooiing</span>
                 <div className="text-xl font-black">{stats.assignedApartments} / {stats.totalCustomers}</div>
                 <p className="text-[8px] uppercase mt-1 opacity-60">Toegewezen woningen</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
