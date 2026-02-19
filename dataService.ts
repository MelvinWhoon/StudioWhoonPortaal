
import { 
  Project, User, PortalDocument, Message, Notification,
  ProjectStatus, UserRole, MasterPackage, MessageCategory 
} from './types';
import { MOCK_PROJECTS, MOCK_USERS, MOCK_PACKAGES } from './constants';
import { supabase } from './supabaseClient';
import { GoogleGenAI } from "@google/genai";

export interface DashboardData {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  totalApartments: number;
  customersPerProject: Record<string, number>;
  totalCustomers: number;
  assignedApartments: number;
  customerTrend: { month: string; count: number }[];
  chats: {
    open: number;
    resolved: number;
  };
}

class DataService {
  async translateText(text: string, targetLang: string): Promise<string> {
    if (targetLang === 'nl' || !text.trim()) return text;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following customer portal message to ${targetLang}. Only return the translated text, no explanation: "${text}"`,
      });
      return response.text || text;
    } catch (e) {
      console.error("AI Translation error:", e);
      return text;
    }
  }

  async ensureSeeded() {
    try {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) return;
      if (count === 0) {
        await supabase.from('projects').upsert(MOCK_PROJECTS.map(p => ({
          id: p.id, name: p.name, status: p.status, address: p.address,
          homes_count: p.homesCount, postal_code: p.postalCode, city: p.city,
          manager: p.manager, additional_photos: p.additionalPhotos,
          available_option_ids: p.availableOptionIds,
          internal_remarks: p.internalRemarks,
          delivery_date: p.deliveryDate
        })));
        await supabase.from('users').upsert(MOCK_USERS.map(u => ({
          id: u.id, email: u.email, name: u.name, role: u.role, is_active: u.isActive,
          password: u.password,
          is_password_set: u.isPasswordSet, project_id: u.projectId, apartment_id: u.apartmentId,
          master_package_id: u.masterPackageId, apartment_details: u.apartmentDetails,
          // Fixed typo: construction_progress was incorrectly accessed as u.construction_progress. 
          // The correct property from MOCK_USERS is constructionProgress.
          construction_progress: u.constructionProgress,
          created_at: u.createdAt || new Date().toISOString(),
          remarks: u.remarks,
          exceptions: u.exceptions || []
        })));
        await supabase.from('master_packages').upsert(MOCK_PACKAGES.map(mp => ({
          id: mp.id, name: mp.name, project_id: mp.projectId, price: mp.price,
          inclusions: mp.inclusions, photos: mp.photos, option_ids: mp.optionIds,
          category: 'Standaard'
        })));
      }
    } catch (e) {
      console.error('Seeding error:', e);
    }
  }

  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    return (data || []).map(p => ({
      ...p, 
      homesCount: p.homes_count, 
      postalCode: p.postal_code,
      additionalPhotos: p.additional_photos || [], 
      availableOptionIds: p.available_option_ids || [],
      internalRemarks: p.internal_remarks,
      deliveryDate: p.delivery_date
    }));
  }

  async getDashboardStats(projectId?: string): Promise<DashboardData> {
    const projects = await this.getProjects();
    const allUsers = await this.getUsers();
    const allMessages = await this.getAllMessages();

    const filteredProjects = projectId ? projects.filter(p => p.id === projectId) : projects;
    const filteredUsers = projectId ? allUsers.filter(u => u.projectId === projectId) : allUsers;
    const customers = filteredUsers.filter(u => u.role === UserRole.CUSTOMER);
    
    const statusMap: Record<string, number> = {};
    filteredProjects.forEach(p => {
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    });

    const custProjMap: Record<string, number> = {};
    customers.forEach(c => {
      const pName = projects.find(p => p.id === c.projectId)?.name || 'Onbekend';
      custProjMap[pName] = (custProjMap[pName] || 0) + 1;
    });

    const activeCustomerIdsWithUnarchived = new Set(
      allMessages.filter(m => !m.isArchived).map(m => m.customerId)
    );
    const activeCustomerIdsWithArchived = new Set(
      allMessages.filter(m => m.isArchived).map(m => m.customerId)
    );

    const visibleCustomerIds = new Set(customers.map(c => c.id));
    let openChats = 0;
    let resolvedChats = 0;

    visibleCustomerIds.forEach(id => {
      if (activeCustomerIdsWithUnarchived.has(id)) openChats++;
      else if (activeCustomerIdsWithArchived.has(id)) resolvedChats++;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    const now = new Date();
    const trend = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      
      const count = customers.filter(c => {
        const dateStr = c.createdAt;
        if (!dateStr) return false;
        
        const cDate = new Date(dateStr);
        return !isNaN(cDate.getTime()) && 
               cDate.getMonth() === targetMonth && 
               cDate.getFullYear() === targetYear;
      }).length;
      
      trend.push({ month: months[targetMonth].toUpperCase(), count });
    }

    return {
      totalProjects: filteredProjects.length,
      projectsByStatus: statusMap,
      totalApartments: filteredProjects.reduce((sum, p) => sum + (p.homesCount || 0), 0),
      customersPerProject: custProjMap,
      totalCustomers: customers.length,
      assignedApartments: customers.filter(c => !!c.apartmentId).length,
      customerTrend: trend,
      chats: {
        open: openChats,
        resolved: resolvedChats
      }
    };
  }

  async createProject(data: Partial<Project>) {
    const id = `p${Math.random().toString(36).substr(2, 5)}`;
    const { data: inserted, error } = await supabase.from('projects').insert([{
      id, 
      name: data.name, 
      status: data.status, 
      address: data.address,
      homes_count: data.homesCount || 0, 
      postal_code: data.postalCode, 
      city: data.city,
      manager: data.manager, 
      available_option_ids: [], 
      additional_photos: data.additionalPhotos || [],
      internal_remarks: data.internal_remarks,
      delivery_date: data.delivery_date
    }]).select().single();
    if (error) throw error;
    return inserted;
  }

  async updateProject(id: string, updates: Partial<Project>) {
    const mapped: any = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.address !== undefined) mapped.address = updates.address;
    if (updates.homesCount !== undefined) mapped.homes_count = updates.homesCount;
    if (updates.postalCode !== undefined) mapped.postal_code = updates.postalCode;
    if (updates.city !== undefined) mapped.city = updates.city;
    if (updates.manager !== undefined) mapped.manager = updates.manager;
    if (updates.additionalPhotos !== undefined) mapped.additional_photos = updates.additionalPhotos;
    if (updates.internalRemarks !== undefined) mapped.internal_remarks = updates.internalRemarks;
    if (updates.deliveryDate !== undefined) mapped.delivery_date = updates.deliveryDate;
    
    const { error } = await supabase.from('projects').update(mapped).eq('id', id);
    if (error) throw error;
  }

  async deleteProject(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(u => ({
      ...u, 
      createdAt: u.created_at, 
      isActive: u.is_active, 
      isPasswordSet: u.is_password_set,
      projectId: u.project_id, 
      apartmentId: u.apartment_id,
      masterPackageId: u.master_package_id, 
      apartmentDetails: u.apartment_details,
      constructionProgress: u.construction_progress, 
      dossierNumber: u.dossier_number,
      exceptions: u.exceptions || []
    }));
  }

  async createUser(userData: Partial<User>) {
    const id = `u${Math.random().toString(36).substr(2, 9)}`;
    const { error } = await supabase.from('users').insert([{
      id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      password: userData.password,
      is_active: userData.isActive,
      is_password_set: false,
      project_id: userData.projectId,
      apartment_id: userData.apartmentId,
      apartment_details: userData.apartmentDetails,
      master_package_id: userData.master_package_id,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  }

  async updateUser(id: string, updates: Partial<User>) {
    const mapped: any = {};
    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.email !== undefined) mapped.email = updates.email;
    if (updates.role !== undefined) mapped.role = updates.role;
    if (updates.isActive !== undefined) mapped.is_active = updates.isActive;
    if (updates.projectId !== undefined) mapped.project_id = updates.projectId;
    if (updates.apartmentId !== undefined) mapped.apartment_id = updates.apartmentId;
    if (updates.masterPackageId !== undefined) mapped.master_package_id = updates.masterPackageId;
    if (updates.remarks !== undefined) mapped.remarks = updates.remarks;
    if (updates.exceptions !== undefined) mapped.exceptions = updates.exceptions;
    if (updates.apartmentDetails !== undefined) mapped.apartment_details = updates.apartmentDetails;
    if (updates.constructionProgress !== undefined) mapped.construction_progress = updates.constructionProgress;
    if (updates.password !== undefined) {
      mapped.password = updates.password;
      mapped.is_password_set = false;
    }

    const { error } = await supabase.from('users').update(mapped).eq('id', id);
    if (error) throw error;
  }

  async deleteUser(id: string) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  }

  async getAllMessages(): Promise<Message[]> {
    const { data, error } = await supabase.from('messages').select('*').order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(m => ({
      ...m,
      projectId: m.project_id,
      customerId: m.customer_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      isEscalated: m.is_escalated,
      isArchived: m.is_archived
    }));
  }

  async getMessages(userId: string): Promise<Message[]> {
    const { data, error } = await supabase.from('messages').select('*').eq('customer_id', userId).order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(m => ({
      ...m,
      projectId: m.project_id,
      customerId: m.customer_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      isEscalated: m.is_escalated,
      isArchived: m.is_archived
    }));
  }

  async sendMessage(projectId: string, customerId: string, senderId: string, senderName: string, role: UserRole, text: string, category?: MessageCategory): Promise<void> {
    const { error } = await supabase.from('messages').insert([{
      id: `m${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      customer_id: customerId,
      sender_id: senderId,
      sender_name: senderName,
      role: role,
      text: text,
      date: new Date().toISOString(),
      category: category,
      is_escalated: false,
      is_archived: false
    }]);
    if (error) throw error;
  }

  async escalateChat(customerId: string, isEscalated: boolean): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_escalated: isEscalated })
      .eq('customer_id', customerId)
      .eq('is_archived', false);
    if (error) throw error;
  }

  async deescalateChat(customerId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_escalated: false })
      .eq('customer_id', customerId)
      .eq('is_archived', false);
    if (error) throw error;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data || []).map(n => ({
      ...n,
      userId: n.user_id,
      isRead: n.is_read
    }));
  }

  async markNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    if (error) throw error;
  }

  async getMasterPackages(projectId?: string): Promise<MasterPackage[]> {
    let query = supabase.from('master_packages').select('*');
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mp => ({
      ...mp,
      projectId: mp.project_id,
      optionIds: mp.option_ids || []
    }));
  }

  async createMasterPackage(pkg: Partial<MasterPackage>) {
    const id = `mp${Math.random().toString(36).substr(2, 5)}`;
    const { error } = await supabase.from('master_packages').insert([{
      id,
      name: pkg.name,
      project_id: pkg.projectId,
      price: pkg.price || 0,
      category: pkg.category || 'Standaard',
      inclusions: pkg.inclusions || [],
      photos: pkg.photos || [],
      option_ids: pkg.optionIds || []
    }]);
    if (error) throw error;
  }

  async updateMasterPackage(id: string, updates: Partial<MasterPackage>) {
    const mapped: any = {
      name: updates.name,
      project_id: updates.projectId,
      price: updates.price,
      category: updates.category,
      inclusions: updates.inclusions,
      photos: updates.photos,
      option_ids: updates.optionIds
    };
    Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);

    const { error } = await supabase.from('master_packages').update(mapped).eq('id', id);
    if (error) throw error;
  }

  async deleteMasterPackage(id: string) {
    const { error } = await supabase.from('master_packages').delete().eq('id', id);
    if (error) throw error;
  }

  async getDocuments(userId: string): Promise<PortalDocument[]> {
    const { data, error } = await supabase.from('portal_documents').select('*').eq('customer_id', userId);
    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      projectId: d.project_id,
      customerId: d.customer_id,
      fileName: d.file_name,
      uploadedBy: d.uploaded_by,
      externalUrl: d.external_url
    }));
  }

  async uploadDocument(projectId: string, customerId: string, fileName: string, uploadedBy: string, role: UserRole, size: string, base64Data: string): Promise<void> {
    const { error } = await supabase.from('portal_documents').insert([{
      id: `d${Math.random().toString(36).substr(2, 9)}`,
      project_id: projectId,
      customer_id: customerId,
      file_name: fileName,
      uploaded_by: uploadedBy,
      role: role,
      date: new Date().toLocaleDateString(),
      size: size,
      external_url: base64Data
    }]);
    if (error) throw error;
  }

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase.from('portal_documents').delete().eq('id', id);
    if (error) throw error;
  }
}

export const dataService = new DataService();
