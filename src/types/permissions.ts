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

export type UserRole = 'ADMIN' | 'COMMERCIAL' | 'RESPONSABLE_FRIGO' | 'COMPTABLE';
export type Role = UserRole;

export interface UserPermissions {
  [module: string]: ModulePermission[];
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'COMMERCIAL' | 'RESPONSABLE_FRIGO' | 'COMPTABLE';
  assignedFrigoId?: string;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  avatar?: string;
}

// Default permission sets per role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  ADMIN: {
    DASHBOARD: ['VIEW', 'EXPORT'],
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
    DASHBOARD: ['VIEW'],
    PRODUCTS: ['VIEW'],
    BL: ['VIEW', 'EDIT'],
    INVENTORY: ['VIEW', 'CREATE', 'EDIT'],
    FRIGO_MGMT: ['VIEW'],
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
