/**
 * Permissions hook for RBAC
 * Provides easy access to role-based permissions in components
 */

import { useAuth } from '@/lib/contexts/auth-context';
import { useCustomerAuth } from '@/lib/contexts/customer-auth-context';
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
 */
export function usePermissions(): UsePermissionsReturn {
  // Try staff/admin auth first
  const staffAuth = useAuth();
  
  // Try customer auth if staff auth not available
  const customerAuth = useCustomerAuth();
  
  // Determine which auth to use
  const role = staffAuth?.profile?.role || (customerAuth?.customer ? 'CUSTOMER' : undefined);
  const userId = staffAuth?.user?.id || customerAuth?.user?.id;
  const customerId = customerAuth?.customer?.id;
  
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
