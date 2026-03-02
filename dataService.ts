import { 
  Project, User, PortalDocument, Message, Notification,
  ProjectStatus, UserRole, MasterPackage, MessageCategory 
} from './types';
import { MOCK_PROJECTS, MOCK_USERS, MOCK_PACKAGES } from './constants';
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
  private async fetchApi(endpoint: string, options?: RequestInit) {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API Error');
    }
    return response.json();
  }

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
      const users = await this.getUsers();
      
      // Always upsert MOCK_USERS to ensure critical accounts (like melvin@whoon.com) exist and have correct credentials
      console.log('Upserting mock users to local API...');
      await this.fetchApi('/users/upsert', {
        method: 'POST',
        body: JSON.stringify(MOCK_USERS)
      });

      if (users.length === 0) {
        // Seed projects
        for (const p of MOCK_PROJECTS) {
          await this.fetchApi('/projects', {
            method: 'POST',
            body: JSON.stringify(p)
          });
        }
        // Seed packages
        for (const mp of MOCK_PACKAGES) {
          await this.fetchApi('/master_packages', {
            method: 'POST',
            body: JSON.stringify(mp)
          });
        }
      }
    } catch (e) {
      console.error('Seeding error:', e);
    }
  }

  async getProjects(): Promise<Project[]> {
    return this.fetchApi('/projects');
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
    return this.fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify({ ...data, id })
    });
  }

  async updateProject(id: string, updates: Partial<Project>) {
    // Implementation for update via API
  }

  async deleteProject(id: string) {
    // Implementation for delete via API
  }

  async getUsers(): Promise<User[]> {
    return this.fetchApi('/users');
  }

  async createUser(userData: Partial<User>) {
    const id = `u${Math.random().toString(36).substr(2, 9)}`;
    return this.fetchApi('/users/upsert', {
      method: 'POST',
      body: JSON.stringify([{ ...userData, id }])
    });
  }

  async updateUser(id: string, updates: Partial<User>) {
    return this.fetchApi('/users/upsert', {
      method: 'POST',
      body: JSON.stringify([{ ...updates, id }])
    });
  }

  async deleteUser(id: string) {
    // Implementation for delete via API
  }

  async getAllMessages(): Promise<Message[]> {
    return this.fetchApi('/messages');
  }

  async getMessages(userId: string): Promise<Message[]> {
    return this.fetchApi(`/messages?customerId=${userId}`);
  }

  async sendMessage(projectId: string, customerId: string, senderId: string, senderName: string, role: UserRole, text: string, category?: MessageCategory): Promise<void> {
    return this.fetchApi('/messages', {
      method: 'POST',
      body: JSON.stringify({
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
      })
    });
  }

  async escalateChat(customerId: string, isEscalated: boolean): Promise<void> {
    // Implementation for escalation via API
  }

  async deescalateChat(customerId: string): Promise<void> {
    // Implementation for de-escalation via API
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return []; // Placeholder
  }

  async markNotificationsRead(userId: string): Promise<void> {
    // Placeholder
  }

  async getMasterPackages(projectId?: string): Promise<MasterPackage[]> {
    return this.fetchApi(`/master_packages${projectId ? `?projectId=${projectId}` : ''}`);
  }

  async createMasterPackage(pkg: Partial<MasterPackage>) {
    const id = `mp${Math.random().toString(36).substr(2, 5)}`;
    return this.fetchApi('/master_packages', {
      method: 'POST',
      body: JSON.stringify({ ...pkg, id })
    });
  }

  async updateMasterPackage(id: string, updates: Partial<MasterPackage>) {
    // Implementation for update via API
  }

  async deleteMasterPackage(id: string) {
    // Implementation for delete via API
  }

  async getDocuments(userId: string): Promise<PortalDocument[]> {
    return this.fetchApi(`/documents?customerId=${userId}`);
  }

  async uploadDocument(projectId: string, customerId: string, fileName: string, uploadedBy: string, role: UserRole, size: string, base64Data: string): Promise<void> {
    return this.fetchApi('/documents', {
      method: 'POST',
      body: JSON.stringify({
        id: `d${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        customer_id: customerId,
        file_name: fileName,
        uploaded_by: uploadedBy,
        role: role,
        date: new Date().toLocaleDateString(),
        size: size,
        external_url: base64Data
      })
    });
  }

  async deleteDocument(id: string): Promise<void> {
    // Implementation for delete via API
  }
}

export const dataService = new DataService();
