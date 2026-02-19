
import { ProjectStatus, UserRole } from './types';

export const IMAGES = {
  LOGO: 'https://www.whoon.com/wp-content/uploads/2026/02/Ontwerp-zonder-titel-1-scaled.png',
  PROJECT_1: 'https://www.whoon.com/wp-content/uploads/2026/01/Screenshot-2026-01-21-145235.png',
  
  BASIC_PACK: [
    'https://www.whoon.com/wp-content/uploads/2026/01/image.png',
    'https://www.whoon.com/wp-content/uploads/2026/01/image.jpg',
    'https://www.whoon.com/wp-content/uploads/2026/01/image-1.png'
  ],
  MODERN_PACK: [
    'https://www.whoon.com/wp-content/uploads/2026/01/Untitled-1.jpg'
  ],
  LUXE_PACK: [
    'https://www.whoon.com/wp-content/uploads/2026/01/botanic.png'
  ]
};

export const MOCK_PROJECTS = [
  {
    id: 'p1',
    name: 'AREA beach V',
    status: ProjectStatus.ACTIVE,
    address: 'Calle Mayor 12',
    homesCount: 32,
    postalCode: '10231',
    city: 'Madrid',
    manager: 'Olesia',
    availableOptionIds: [],
    additionalPhotos: [IMAGES.PROJECT_1],
    deliveryDate: 'Q4 2026',
    internalRemarks: 'Luxe complex nabij kustlijn. Speciale aandacht voor zonwering bij appartementen op het zuiden.'
  }
];

export const MOCK_PACKAGES = [
  {
    id: 'mp1',
    name: 'Area Beach V - Japandi',
    projectId: 'p1',
    price: 9999,
    inclusions: ['High-quality furniture', 'Modern handle-less kitchen', 'Beds'],
    optionIds: [],
    photos: IMAGES.BASIC_PACK
  },
  {
    id: 'mp2',
    name: 'Area Beach V - Hotel Chique',
    projectId: 'p1',
    price: 9999,
    inclusions: ['Premium interior design', 'Designer furniture', 'Seamless contemporary kitchen', 'Beds'],
    optionIds: [],
    photos: IMAGES.MODERN_PACK
  },
  {
    id: 'mp3',
    name: 'Area Beach V - Basic Chique',
    projectId: 'p1',
    price: 9999,
    inclusions: ['Furniture', 'Lighting', 'Beds'],
    optionIds: [],
    photos: IMAGES.LUXE_PACK
  }
];

const now = new Date();
const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();
const currentMonth = now.toISOString();

export const MOCK_USERS = [
  { 
    id: 'u1', 
    email: 'admin@portaalpro.nl', 
    name: 'Demi-Claire', 
    role: UserRole.SUPER_ADMIN, 
    isActive: true,
    isPasswordSet: true,
    password: 'Meubilex!',
    createdAt: currentMonth
  },
  { 
    id: 'u2', 
    email: 'olesia@waterfront.nl', 
    name: 'Olesia', 
    role: UserRole.PROJECT_ADMIN, 
    projectId: 'p1', 
    isActive: true,
    isPasswordSet: true,
    password: 'Meubilex!',
    createdAt: currentMonth
  },
  { 
    id: 'u3', 
    email: 'nick@vandelft.nl', 
    name: 'Nick de Vries', 
    role: UserRole.CUSTOMER, 
    projectId: 'p1', 
    apartmentId: 'APT-14A', 
    masterPackageId: 'mp1',
    isActive: true,
    isPasswordSet: true,
    password: 'Meubilex!',
    createdAt: oneMonthAgo,
    remarks: 'Klant wenst extra stopcontacten in de woonkamer.',
    exceptions: [
      { id: 'ex1', title: 'Aangepaste Keuken', status: 'In behandeling', description: 'Klant wil een inductieplaat van 90cm i.p.v. 60cm.' }
    ],
    apartmentDetails: {
      surface: 92,
      rooms: 3,
      floor: 4,
      deliveryDate: 'Q3 2026'
    },
    constructionProgress: {
      total: 45,
      foundation: 'Voltooid',
      shell: 'In uitvoering',
      finishing: 'Nog niet gestart'
    }
  }
];
