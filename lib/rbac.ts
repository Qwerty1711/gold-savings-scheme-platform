/**
 * Role-Based Access Control (RBAC) utilities
 * Defines permissions for ADMIN, STAFF, and CUSTOMER roles
 */

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
}

/**
 * Role permissions matrix
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    // Customers
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    { resource: 'customers', action: 'delete' },
    { resource: 'customers', action: 'manage' },
    
    // Enrollments
    { resource: 'enrollments', action: 'create' },
    { resource: 'enrollments', action: 'read' },
    { resource: 'enrollments', action: 'update' },
    { resource: 'enrollments', action: 'delete' },
    
    // Transactions
    { resource: 'transactions', action: 'create' },
    { resource: 'transactions', action: 'read' },
    
    // Redemptions
    { resource: 'redemptions', action: 'create' },
    { resource: 'redemptions', action: 'read' },
    { resource: 'redemptions', action: 'update' },
    
    // Plans/Schemes
    { resource: 'plans', action: 'create' },
    { resource: 'plans', action: 'read' },
    { resource: 'plans', action: 'update' },
    { resource: 'plans', action: 'delete' },
    
    // Gold Rates
    { resource: 'gold_rates', action: 'create' },
    { resource: 'gold_rates', action: 'read' },
    { resource: 'gold_rates', action: 'update' },
    
    // Staff & Performance
    { resource: 'staff', action: 'read' },
    { resource: 'staff', action: 'manage' },
    { resource: 'incentives', action: 'read' },
    { resource: 'incentives', action: 'manage' },
    
    // Analytics
    { resource: 'analytics', action: 'read' },
    { resource: 'analytics', action: 'manage' },
    
    // Settings
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
  ],
  
  STAFF: [
    // Customers
    { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' },
    
    // Enrollments
    { resource: 'enrollments', action: 'create' },
    { resource: 'enrollments', action: 'read' },
    { resource: 'enrollments', action: 'update' },
    
    // Transactions
    { resource: 'transactions', action: 'create' },
    { resource: 'transactions', action: 'read' },
    
    // Redemptions
    { resource: 'redemptions', action: 'create' },
    { resource: 'redemptions', action: 'read' },
    
    // Plans (read-only)
    { resource: 'plans', action: 'read' },
    
    // Gold Rates (read-only)
    { resource: 'gold_rates', action: 'read' },
    
    // Own incentives only
    { resource: 'incentives', action: 'read' },
    
    // Limited analytics
    { resource: 'analytics', action: 'read' },
  ],
  
  CUSTOMER: [
    // Own profile only
    { resource: 'customers', action: 'read' },
    { resource: 'customers', action: 'update' }, // Own profile only
    
    // Own enrollments only
    { resource: 'enrollments', action: 'create' },
    { resource: 'enrollments', action: 'read' },
    
    // Own transactions only
    { resource: 'transactions', action: 'create' },
    { resource: 'transactions', action: 'read' },
    
    // Own redemptions only
    { resource: 'redemptions', action: 'read' },
    
    // Plans (read-only for selection)
    { resource: 'plans', action: 'read' },
    
    // Gold Rates (read-only)
    { resource: 'gold_rates', action: 'read' },
  ],
};

/**
 * Navigation items configuration per role
 */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export const navigationItems: NavItem[] = [
  {
    label: 'Pulse',
    href: '/pulse',
    icon: 'Activity',
    roles: ['ADMIN', 'STAFF', 'CUSTOMER'],
  },
  {
    label: 'Collections',
    href: '/collections',
    icon: 'Coins',
    roles: ['ADMIN', 'STAFF', 'CUSTOMER'],
  },
  {
    label: 'Redemptions',
    href: '/redemptions',
    icon: 'Gift',
    roles: ['ADMIN', 'STAFF', 'CUSTOMER'],
  },
  {
    label: 'Dues',
    href: '/pulse', // Filter to show dues
    icon: 'AlertCircle',
    roles: ['ADMIN', 'STAFF', 'CUSTOMER'],
  },
  {
    label: 'Customers',
    href: '/customers',
    icon: 'Users',
    roles: ['ADMIN', 'STAFF'],
  },
  {
    label: 'Plans',
    href: '/plans',
    icon: 'Package',
    roles: ['ADMIN', 'STAFF'],
  },
  {
    label: 'Growth',
    href: '/growth',
    icon: 'TrendingUp',
    roles: ['ADMIN'],
  },
];

/**
 * Check if a role has permission for a resource and action
 */
export function hasPermission(
  role: UserRole | undefined,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
): boolean {
  if (!role) return false;
  
  const permissions = rolePermissions[role];
  return permissions.some(
    (p) => p.resource === resource && (p.action === action || p.action === 'manage')
  );
}

/**
 * Check if a role can access a navigation item
 */
export function canAccessRoute(role: UserRole | undefined, href: string): boolean {
  if (!role) return false;
  
  const navItem = navigationItems.find((item) => item.href === href);
  if (!navItem) return true; // Allow access to unlisted routes
  
  return navItem.roles.includes(role);
}

/**
 * Get navigation items for a specific role
 */
export function getNavigationForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  
  return navigationItems.filter((item) => item.roles.includes(role));
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

/**
 * Check if user is staff (or admin)
 */
export function isStaff(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'STAFF';
}

/**
 * Check if user is customer
 */
export function isCustomer(role: UserRole | undefined): boolean {
  return role === 'CUSTOMER';
}

/**
 * Get data filter for role
 * Returns filter conditions for queries based on role
 */
export function getDataFilter(
  role: UserRole | undefined,
  userId: string | undefined,
  customerId?: string | undefined
): {
  filterByRetailer: boolean;
  filterByCustomer: boolean;
  customerId?: string;
} {
  if (!role || !userId) {
    return { filterByRetailer: false, filterByCustomer: false };
  }
  
  // Customers see only their own data
  if (role === 'CUSTOMER' && customerId) {
    return {
      filterByRetailer: false,
      filterByCustomer: true,
      customerId,
    };
  }
  
  // Admin and Staff see all data for their retailer
  return {
    filterByRetailer: true,
    filterByCustomer: false,
  };
}
