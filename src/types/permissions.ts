export type ModulePermission = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT';
export type Permission = ModulePermission;

export type ERPModule = 
  | 'DASHBOARD'
  | 'PRODUCTS'
  | 'BL'
  | 'CLIENTS'
  | 'SALES_ORDERS'
  | 'PURCHASES'
  | 'INVENTORY'
  | 'INVOICING'
  | 'TREASURY'
  | 'EXPENSES'
  | 'SUPPLIERS'
  | 'FRIGO_MGMT'
  | 'COMPANY_INFO'
  | 'USERS'
  | 'IMPORT_BL'
  | 'BACKUP';
export type Module = ERPModule;

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'CONTROLEUR' 
  | 'AGENT_STOCK' 
  | 'RESPONSABLE_FRIGO' 
  | 'COMPTABLE_FACTURES'
  | 'ADMIN' 
  | 'COMMERCIAL' 
  | 'COMPTABLE';
export type Role = UserRole;

export interface RoleDefinition {
  key: UserRole;
  label: string;
  shortLabel: string;
  description: string;
}

export const OFFICIAL_ROLES: RoleDefinition[] = [
  {
    key: 'SUPER_ADMIN',
    label: 'Super Admin (Le Gérant / Propriétaire)',
    shortLabel: 'Super Admin (Gérant)',
    description: 'Accès complet d\'administration: gestion utilisateurs, configuration entreprise, sauvegardes et logs.'
  },
  {
    key: 'CONTROLEUR',
    label: 'Contrôleur (Audit & Inspection - Voit Tout)',
    shortLabel: 'Contrôleur (Audit)',
    description: 'Accès complet en lecture seule ("voit tout") sur tous les modules, stocks, mouvements et factures.'
  },
  {
    key: 'AGENT_STOCK',
    label: 'Agent Stock & Logistique',
    desc: 'Gère les entrées/sorties de marchandise, ajustements de stock, comptage physique et émission des BLs.'
  } as any,
  {
    key: 'RESPONSABLE_FRIGO',
    label: 'Responsable Frigo / Entrepôt',
    shortLabel: 'Responsable Frigo',
    description: 'Valide le chargement quai et téléverse la Photo du Bon de Sortie physique du frigo.'
  },
  {
    key: 'COMPTABLE_FACTURES',
    label: 'Responsable Facturation & Comptabilité',
    shortLabel: 'Facturation & Comptabilité',
    description: 'Gère l\'émission des factures d\'après les BLs approuvés par le frigo, encaissements et dépenses.'
  }
];

export interface UserPermissions {
  [module: string]: ModulePermission[];
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedFrigoId?: string;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
}

// Default permission sets per role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  SUPER_ADMIN: {
    DASHBOARD: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    BL: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SALES_ORDERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    PURCHASES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    INVOICING: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    TREASURY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    EXPENSES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SUPPLIERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    FRIGO_MGMT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    COMPANY_INFO: ['VIEW', 'EDIT'],
    USERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    IMPORT_BL: ['VIEW', 'CREATE'],
    BACKUP: ['VIEW', 'CREATE'],
  },
  ADMIN: {
    DASHBOARD: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    BL: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SALES_ORDERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    PURCHASES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    INVOICING: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    TREASURY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    EXPENSES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SUPPLIERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    FRIGO_MGMT: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    COMPANY_INFO: ['VIEW', 'EDIT'],
    USERS: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    IMPORT_BL: ['VIEW', 'CREATE'],
    BACKUP: ['VIEW', 'CREATE'],
  },
  CONTROLEUR: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PRODUCTS: ['VIEW', 'EXPORT'],
    BL: ['VIEW', 'EXPORT'],
    CLIENTS: ['VIEW', 'EXPORT'],
    SALES_ORDERS: ['VIEW', 'EXPORT'],
    PURCHASES: ['VIEW', 'EXPORT'],
    INVENTORY: ['VIEW', 'EXPORT'],
    INVOICING: ['VIEW', 'EXPORT'],
    TREASURY: ['VIEW', 'EXPORT'],
    EXPENSES: ['VIEW', 'EXPORT'],
    SUPPLIERS: ['VIEW', 'EXPORT'],
    FRIGO_MGMT: ['VIEW', 'EXPORT'],
    COMPANY_INFO: ['VIEW'],
    USERS: ['VIEW'],
    IMPORT_BL: ['VIEW'],
    BACKUP: ['VIEW'],
  },
  AGENT_STOCK: {
    DASHBOARD: ['VIEW'],
    PRODUCTS: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    BL: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    FRIGO_MGMT: ['VIEW'],
    CLIENTS: ['VIEW', 'CREATE', 'EXPORT'],
    SUPPLIERS: ['VIEW', 'CREATE', 'EXPORT'],
    INVOICING: ['VIEW', 'EXPORT'],
    IMPORT_BL: ['VIEW', 'CREATE'],
  },
  COMMERCIAL: {
    DASHBOARD: ['VIEW'],
    PRODUCTS: ['VIEW', 'EXPORT'],
    BL: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    SALES_ORDERS: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    INVOICING: ['VIEW', 'EXPORT'],
    SUPPLIERS: ['VIEW'],
    IMPORT_BL: ['VIEW', 'CREATE'],
  },
  RESPONSABLE_FRIGO: {
    BL: ['VIEW', 'EDIT'],
    FRIGO_MGMT: ['VIEW'],
    PRODUCTS: ['VIEW'],
  },


  COMPTABLE_FACTURES: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PRODUCTS: ['VIEW', 'EXPORT'],
    BL: ['VIEW', 'EXPORT'],
    CLIENTS: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    INVOICING: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    TREASURY: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    EXPENSES: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
    SUPPLIERS: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    PURCHASES: ['VIEW', 'EXPORT'],
  },
  COMPTABLE: {
    DASHBOARD: ['VIEW', 'EXPORT'],
    PRODUCTS: ['VIEW', 'EXPORT'],
    BL: ['VIEW', 'EXPORT'],
    CLIENTS: ['VIEW', 'EXPORT'],
    INVOICING: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    TREASURY: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    EXPENSES: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
    SUPPLIERS: ['VIEW', 'EXPORT'],
    PURCHASES: ['VIEW', 'EXPORT'],
  },
};

export const ALL_MODULES: ERPModule[] = [
  'DASHBOARD', 'PRODUCTS', 'BL', 'CLIENTS', 'SALES_ORDERS',
  'PURCHASES', 'INVENTORY', 'INVOICING', 'TREASURY', 'EXPENSES',
  'SUPPLIERS', 'FRIGO_MGMT', 'COMPANY_INFO', 'USERS', 'IMPORT_BL', 'BACKUP',
];

export const ALL_PERMISSIONS: ModulePermission[] = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'];

export function hasPermission(
  permissions: UserPermissions | undefined,
  module: ERPModule,
  action: ModulePermission
): boolean {
  if (!permissions) return false;
  const modulePerms = permissions[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}

export function hasModuleAccess(
  permissions: UserPermissions | undefined,
  module: ERPModule
): boolean {
  return hasPermission(permissions, module, 'VIEW');
}
