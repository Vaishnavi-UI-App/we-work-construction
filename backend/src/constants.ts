// Modules that admin-defined custom roles can be granted access to.
// 'user-management' and 'organisation' are intentionally excluded — those
// stay hardcoded ADMIN-only to prevent a custom role from escalating access.
export const MODULES = [
  'dashboard',
  'tracker',
  'billing',
  'delivery-challan',
  'simple-challan',
  'banking',
  'attendance',
  'admin-attendance',
  'customers',
  'vendors',
  'reports',
] as const

export type ModuleKey = typeof MODULES[number]
export type PermissionAction = 'canView' | 'canAdd' | 'canEdit' | 'canDelete'
