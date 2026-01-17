import { authorize } from './auth';

export const requireAdmin = authorize('Admin', 'SuperAdmin', 'Administrator');
