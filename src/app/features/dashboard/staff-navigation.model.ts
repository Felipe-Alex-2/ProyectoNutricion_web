export interface StaffNavigationItem {
  tab: string;
  label: string;
  icon: string;
  roles?: readonly string[];
}
export interface StaffNavigationPackage {
  id: string;
  label: string;
  icon: string;
  items: readonly StaffNavigationItem[];
}
const admins = ['SUPERADMIN', 'ADMIN_ORGANIZATION'];
const staffRoles = [...admins, 'NUTRICIONISTA'];

export const STAFF_PACKAGES: readonly StaffNavigationPackage[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: 'grid',
    items: [{ tab: 'principal', label: 'Resumen', icon: 'grid' }],
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: 'users',
    items: [
      { tab: 'clientes', label: 'Gestión de pacientes', icon: 'users' },
      { tab: 'sprint1-vinculacion', label: 'Vincular pacientes', icon: 'link' },
    ],
  },
  {
    id: 'atencion',
    label: 'Atención nutricional',
    icon: 'leaf',
    items: [
      { tab: 'historial-clinico', label: 'Evaluación nutricional', icon: 'file' },
      { tab: 'recetas', label: 'Planes y recetas', icon: 'leaf' },
      { tab: 'citas', label: 'Gestión de citas', icon: 'calendar' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Caja y pagos',
    icon: 'wallet',
    items: [{ tab: 'suscripcion', label: 'Caja y cobros', icon: 'wallet' }],
  },
  {
    id: 'reportes',
    label: 'Reportes y analítica',
    icon: 'chart',
    items: [{ tab: 'reportes', label: 'Consultar reportes', icon: 'chart' }],
  },
  {
    id: 'administracion',
    label: 'Administración',
    icon: 'building',
    items: [
      { tab: 'sprint1-tenants', label: 'Empresas', icon: 'building', roles: ['SUPERADMIN'] },
      { tab: 'sucursales', label: 'Sucursales', icon: 'building', roles: admins },
      { tab: 'sprint1-usuarios', label: 'Equipo de la organización', icon: 'users', roles: admins },
      { tab: 'sprint1-roles', label: 'Roles y permisos', icon: 'shield', roles: ['SUPERADMIN'] },
    ],
  },
  {
    id: 'seguridad',
    label: 'Seguridad y auditoría',
    icon: 'shield',
    items: [
      { tab: 'bitacora', label: 'Bitácora', icon: 'file' },
      { tab: 'backup', label: 'Copias de seguridad', icon: 'download', roles: admins },
    ],
  },
];

export function staffPackagesForRole(role: string): StaffNavigationPackage[] {
  if (!staffRoles.includes(role)) return [];
  return STAFF_PACKAGES.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
export function canOpenStaffTab(role: string, tab: string): boolean {
  return (
    staffRoles.includes(role) &&
    (['perfil', 'notificaciones'].includes(tab) ||
      staffPackagesForRole(role).some((group) => group.items.some((item) => item.tab === tab)))
  );
}
