/**
 * Permissions hook for RBAC
 * Provides easy access to role-based permissions in components
 */

import { useAuth } from '@/lib/contexts/auth-context';
import {
  hasPermission,
  canAccessRoute,
  getNavigationForRole,
  isAdmin,
  isStaff,
  isCustomer,
  getDataFilter,
  type UserRole,
  type NavItem,
} from '@/lib/rbac';

export interface UsePermissionsReturn {
  role: UserRole | undefined;
  customerId: string | undefined;
  hasPermission: (
    resource: string,
    action: 'create' | 'read' | 'update' | 'delete' | 'manage'
  ) => boolean;
  canAccessRoute: (href: string) => boolean;
  navigationItems: NavItem[];
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  dataFilter: {
    filterByRetailer: boolean;
    filterByCustomer: boolean;
    customerId?: string;
  };
}

/**
 * Hook to access user permissions and role-based utilities
 * Works for both staff/admin (via AuthContext) and customers (via CustomerAuthContext)
 * 
 * Note: For customer-specific features, use useCustomerAuth directly in customer routes.
 * This hook is primarily for staff/admin RBAC.
 */
export function usePermissions(): UsePermissionsReturn {
  // Use staff/admin auth context
  const { user, profile } = useAuth();
  
  // Get role from profile
  const role = profile?.role as UserRole | undefined;
  const customerId = undefined; // Staff/admin don't have customer_id
  
  return {
    role,
    customerId,
    hasPermission: (resource, action) => hasPermission(role, resource, action),
    canAccessRoute: (href) => canAccessRoute(role, href),
    navigationItems: getNavigationForRole(role),
    isAdmin: isAdmin(role),
    isStaff: isStaff(role),
    isCustomer: isCustomer(role),
    dataFilter: getDataFilter(role, userId, customerId),
  };
}
