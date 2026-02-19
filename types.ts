
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROJECT_ADMIN = 'PROJECT_ADMIN',
  CUSTOMER = 'CUSTOMER'
}

export enum ProjectStatus {
  ACTIVE = 'Actief',
  PLANNING = 'Planning',
  COMPLETED = 'Voltooid',
  ON_HOLD = 'On hold'
}

export interface PackageOption {
  id: string;
  name: string;
  category: string; 
  description: string;
  fixedPhotos: string[];
}

export interface MasterPackage {
  id: string;
  name: string; 
  projectId: string;
  category: string; // Toegevoegd voor filtering en onderverdeling
  optionIds: string[];
  price?: number;
  inclusions?: string[];
  photos?: string[];
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  availableOptionIds: string[]; 
  additionalPhotos: string[];
  address?: string;
  homesCount?: number;
  postalCode?: string;
  city?: string;
  manager?: string;
  internalRemarks?: string;
  deliveryDate?: string;
}

export interface ConstructionProgress {
  total: number;
  foundation: string;
  shell: string;
  finishing: string;
}

export interface UserException {
  id: string;
  title: string;
  status: 'In afwachting' | 'In behandeling' | 'Afgehandeld';
  description?: string;
  internalNote?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  isPasswordSet: boolean;
  projectId?: string;
  apartmentId?: string;
  isActive: boolean;
  phone?: string;
  address?: string;
  dossierNumber?: string;
  remarks?: string;
  exceptions?: UserException[];
  masterPackageId?: string; 
  selectedOptionIds?: string[];
  createdAt?: string;
  apartmentDetails?: {
    surface: number;
    rooms: number;
    floor: number;
    deliveryDate: string;
  };
  constructionProgress?: ConstructionProgress;
}

export interface PortalDocument {
  id: string;
  projectId: string;
  customerId: string;
  fileName: string;
  uploadedBy: string;
  role: UserRole;
  date: string;
  size: string;
  tag?: string;
  externalUrl?: string;
}

export type MessageCategory = 'Documenten' | 'Interieur' | 'Exterieur' | 'Overige';

export interface Message {
  id: string;
  projectId: string;
  customerId: string;
  senderId: string;
  senderName: string;
  role: UserRole;
  text: string;
  date: string;
  category?: MessageCategory;
  isEscalated?: boolean;
  isArchived?: boolean;
  assignedTo?: string;
}

export interface Notification {
  id: string;
  userId: string;
  text: string;
  date: string;
  isRead: boolean;
  type: 'MESSAGE' | 'DOCUMENT' | 'SYSTEM';
}
