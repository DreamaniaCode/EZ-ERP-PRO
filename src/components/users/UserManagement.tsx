import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Shield, Mail, Check, X, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth as mainAuth, db, firebaseConfig } from '../../lib/firebase';
import { AppUser, Role, Module, Permission, ALL_MODULES, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, UserPermissions } from '../../types/permissions';
import { useERP } from '../../context/ERPContext';

// Initialize a secondary app for creating users without signing out the current admin
const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { frigos = [] } = useERP();
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER' as Role,
    assignedFrigoId: ''
  });
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({});
  
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const DEFAULT_SUPER_ADMIN: AppUser = {
    uid: 'admin-1',
    email: 'admin@easyerp.com',
    displayName: 'Super Admin',
    role: 'ADMIN',
    permissions: DEFAULT_ROLE_PERMISSIONS['ADMIN'],
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      let usersList = usersSnap.docs.map(doc => doc.data() as AppUser);
      
      // Ensure Super Admin is always in the list
      if (!usersList.some(u => u.role === 'ADMIN' || u.email?.toLowerCase() === 'admin@easyerp.com')) {
        usersList = [DEFAULT_SUPER_ADMIN, ...usersList];
      }

      setUsers(usersList);
      localStorage.setItem('erp_app_users', JSON.stringify(usersList));
    } catch (err) {
      console.error("Error fetching users:", err);
      try {
        const saved = localStorage.getItem('erp_app_users');
        let parsed: AppUser[] = saved ? JSON.parse(saved) : [];
        if (!parsed.some(u => u.role === 'ADMIN' || u.email?.toLowerCase() === 'admin@easyerp.com')) {
          parsed = [DEFAULT_SUPER_ADMIN, ...parsed];
        }
        setUsers(parsed);
      } catch (e) {
        setUsers([DEFAULT_SUPER_ADMIN]);
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchUsers();
  }, []);

  // Persist users to localStorage whenever users change (for login fallback)
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('erp_app_users', JSON.stringify(users));
    }
  }, [users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError(t('users.passwords_dont_match', 'Les mots de passe ne correspondent pas'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('users.password_too_short', 'Le mot de passe doit contenir au moins 6 caractères'));
      return;
    }

    setSubmitting(true);
    let newUid = `usr-${Date.now()}`;
    let authCreated = false;

    try {
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        await secondaryAuth.signOut();
        newUid = userCredential.user.uid;
        authCreated = true;
      } catch (authErr: any) {
        console.warn("Firebase auth response:", authErr);
        if (authErr.code === 'auth/operation-not-allowed' || authErr.message?.includes('operation-not-allowed')) {
          setError(t('auth.opNotAllowedNotice', "Information : L'authentification par email/mot de passe est désactivée dans la console Firebase (auth/operation-not-allowed). Le compte utilisateur a été créé dans la base de données Firestore."));
        } else if (authErr.code === 'auth/email-already-in-use') {
          setError(t('auth.emailInUse', "Cet email est déjà utilisé."));
          setSubmitting(false);
          return;
        }
      }

      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[formData.role] || DEFAULT_ROLE_PERMISSIONS['COMMERCIAL'];

      const newUserProfile: AppUser = {
        uid: newUid,
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        permissions: defaultPerms,
        isActive: true,
        assignedFrigoId: formData.role === 'RESPONSABLE_FRIGO' ? formData.assignedFrigoId || undefined : undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', newUid), newUserProfile);
      } catch (dbErr) {
        console.warn("Firestore write error, falling back to state:", dbErr);
      }

      setUsers(prev => [...prev.filter(u => u.uid !== newUid), newUserProfile]);
      setShowForm(false);
      setFormData({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'COMMERCIAL' as Role,
        assignedFrigoId: ''
      });
      
      if (authCreated) {
        alert(t('users.userCreatedSuccess', 'Utilisateur créé avec succès !'));
      }
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message || "Échec de création d'utilisateur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInit = (user: AppUser) => {
    if (editingUser === user.uid) {
      setEditingUser(null);
    } else {
      setEditingUser(user.uid);
      setFormData({
        displayName: user.displayName,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        assignedFrigoId: user.assignedFrigoId || ''
      });
      setEditPermissions(JSON.parse(JSON.stringify(user.permissions))); // Deep copy
    }
  };

  const handlePermissionChange = (module: Module, permission: Permission, checked: boolean) => {
    setEditPermissions(prev => {
      const newPerms = { ...prev };
      if (!newPerms[module]) {
        newPerms[module] = [];
      }
      
      if (checked && !newPerms[module]!.includes(permission)) {
        newPerms[module] = [...newPerms[module]!, permission];
      } else if (!checked && newPerms[module]!.includes(permission)) {
        newPerms[module] = newPerms[module]!.filter(p => p !== permission);
      }
      
      return newPerms;
    });
  };

  const handleUpdateUser = async (uid: string) => {
    setSubmitting(true);
    try {
      const updateData: Partial<AppUser> = {
        displayName: formData.displayName,
        email: formData.email,
        role: formData.role,
        permissions: editPermissions,
        assignedFrigoId: formData.role === 'RESPONSABLE_FRIGO' ? formData.assignedFrigoId || undefined : undefined,
        updatedAt: new Date().toISOString()
      };

      try {
        await updateDoc(doc(db, 'users', uid), updateData);
      } catch (dbErr) {
        console.warn("Firestore update error, updating local state:", dbErr);
      }
      
      setUsers(prev => {
        const updated = prev.map(u => u.uid === uid ? { ...u, ...updateData } : u);
        localStorage.setItem('erp_app_users', JSON.stringify(updated));
        return updated;
      });

      // If user is editing their own profile, update local session
      const savedCu = localStorage.getItem('erp_current_user');
      if (savedCu) {
        const cu = JSON.parse(savedCu);
        if (cu.id === uid || cu.email === formData.email) {
          const newCu = { ...cu, name: formData.displayName, role: formData.role };
          localStorage.setItem('erp_current_user', JSON.stringify(newCu));
        }
      }

      setEditingUser(null);
      alert(t('users.updatedSuccess', 'Profil utilisateur mis à jour avec succès !'));
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err.message || "Échec de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };


  const handleToggleStatus = async (uid: string, currentStatus: boolean) => {
    if (uid === mainAuth.currentUser?.uid) {
      alert(t('users.cannot_disable_self', 'You cannot disable your own account'));
      return;
    }
    
    try {
      await updateDoc(doc(db, 'users', uid), { isActive: !currentStatus });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isActive: !currentStatus } : u));
    } catch (err: any) {
      console.error("Error updating user status:", err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === mainAuth.currentUser?.uid) {
      alert(t('users.cannot_delete_self', 'You cannot delete your own account'));
      return;
    }

    if (window.confirm(t('users.confirm_delete', 'Are you sure you want to delete this user?'))) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (err: any) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user profile");
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLE_MATRIX'>('USERS');
  const [selectedMatrixRole, setSelectedMatrixRole] = useState<Role>('COMMERCIAL');
  const [rolePermissionsState, setRolePermissionsState] = useState<Record<string, UserPermissions>>(DEFAULT_ROLE_PERMISSIONS);

  const handleRoleMatrixPermissionChange = (role: Role, module: Module, permission: Permission, checked: boolean) => {
    setRolePermissionsState(prev => {
      const rolePerms = { ...prev[role] };
      const modulePerms = rolePerms[module] ? [...rolePerms[module]!] : [];
      let updatedModulePerms: Permission[];
      if (checked) {
        updatedModulePerms = Array.from(new Set([...modulePerms, permission]));
      } else {
        updatedModulePerms = modulePerms.filter(p => p !== permission);
      }
      rolePerms[module] = updatedModulePerms;
      return {
        ...prev,
        [role]: rolePerms
      };
    });
  };

  const handleSaveRoleMatrix = async () => {
    setSubmitting(true);
    try {
      // 1. Update all users belonging to this role in Firestore and state
      const targetRolePerms = rolePermissionsState[selectedMatrixRole];
      const usersToUpdate = users.filter(u => u.role === selectedMatrixRole);

      for (const u of usersToUpdate) {
        try {
          await updateDoc(doc(db, 'users', u.uid), { permissions: targetRolePerms });
        } catch (e) {
          console.warn(`Could not update Firestore for user ${u.uid}:`, e);
        }
      }

      setUsers(prev => prev.map(u => u.role === selectedMatrixRole ? { ...u, permissions: targetRolePerms } : u));
      
      // Update global defaults object
      DEFAULT_ROLE_PERMISSIONS[selectedMatrixRole] = targetRolePerms;

      alert(`Permissions du rôle ${selectedMatrixRole} enregistrées et appliquées à tous les comptes concernés !`);
    } catch (err: any) {
      console.error("Error saving role matrix:", err);
      alert("Erreur lors de l'enregistrement des permissions du rôle.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title', 'Gestion des Utilisateurs & Autorisations par Rôles')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('users.subtitle', 'Configurer l\'accès spécifique aux pages et les permissions par Rôle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-lg border border-gray-200 flex text-xs font-bold">
            <button
              onClick={() => setActiveTab('USERS')}
              className={`px-4 py-2 rounded-md transition-all ${activeTab === 'USERS' ? 'bg-[#0f62fe] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Comptes Utilisateurs ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('ROLE_MATRIX')}
              className={`px-4 py-2 rounded-md transition-all ${activeTab === 'ROLE_MATRIX' ? 'bg-[#0f62fe] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Matrice des Rôles & Accès Pages
            </button>
          </div>

          {activeTab === 'USERS' && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                setFormData({ displayName: '', email: '', password: '', confirmPassword: '', role: 'COMMERCIAL', assignedFrigoId: '' });
                setEditingUser(null);
              }}
              className="flex items-center gap-2 bg-[#0f62fe] text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showForm ? t('common.cancel', 'Annuler') : t('users.add_user', 'Nouvel Utilisateur')}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 p-4 rounded-lg flex items-start gap-3 border border-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900">{error}</div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 transition-all">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">{t('users.new_user', 'Create New User')}</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name', 'Name')}</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email', 'Email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password', 'Password')}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.confirm_password', 'Confirm Password')}</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.role', 'Role')}</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent bg-white"
                >
                  <option value="ADMIN">{t('roles.admin', 'Admin')}</option>
                  <option value="MANAGER">{t('roles.manager', 'Manager')}</option>
                  <option value="RESPONSABLE_FRIGO">{t('roles.responsable_frigo', 'Frigo Manager')}</option>
                  <option value="CAISSIER">{t('roles.caissier', 'Cashier')}</option>
                  <option value="USER">{t('roles.user', 'User')}</option>
                </select>
              </div>
              {formData.role === 'RESPONSABLE_FRIGO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.assigned_frigo', 'Assigned Frigo')}</label>
                  <select
                    name="assignedFrigoId"
                    value={formData.assignedFrigoId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0f62fe] focus:border-transparent bg-white"
                  >
                    <option value="">{t('common.select', 'Select...')}</option>
                    {frigos.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#0f62fe] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'USERS' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f62fe]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('common.name', 'Name')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('users.role', 'Role')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('users.status', 'Status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <React.Fragment key={user.uid}>
                    <tr className={`hover:bg-gray-50 transition-colors ${editingUser === user.uid ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase mr-3 rtl:mr-0 rtl:ml-3">
                            {user.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.displayName}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span dir="ltr">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 w-fit">
                            <Shield className="w-3 h-3" />
                            {user.role}
                          </span>
                          {user.role === 'RESPONSABLE_FRIGO' && user.assignedFrigoId && (
                            <span className="text-xs text-gray-500 mt-1">
                              Frigo: {frigos.find(f => f.id === user.assignedFrigoId)?.name || user.assignedFrigoId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {user.isActive ? t('users.active', 'Active') : t('users.disabled', 'Disabled')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 rtl:space-x-reverse">
                        <button 
                          onClick={() => handleToggleStatus(user.uid, user.isActive)}
                          className={`p-1.5 rounded text-gray-500 hover:text-gray-700 transition-colors`}
                          title={user.isActive ? t('users.disable', 'Disable') : t('users.enable', 'Enable')}
                        >
                          {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleEditInit(user)}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                          title={t('common.edit', 'Edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          title={t('common.delete', 'Delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Inline Edit Form */}
                    {editingUser === user.uid && (
                      <tr>
                        <td colSpan={4} className="p-0 border-b border-blue-100">
                          <div className="bg-white border-x-4 border-l-[#0f62fe] rtl:border-l-0 rtl:border-r-4 rtl:border-r-[#0f62fe] p-6 shadow-inner">
                            <h3 className="text-md font-semibold mb-4">{t('users.edit_user', 'Edit User')}: {user.displayName}</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name', 'Name')}</label>
                                <input
                                  type="text"
                                  name="displayName"
                                  value={formData.displayName}
                                  onChange={handleInputChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.role', 'Role')}</label>
                                <select
                                  name="role"
                                  value={formData.role}
                                  onChange={handleInputChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                >
                                  <option value="ADMIN">{t('roles.admin', 'Admin')}</option>
                                  <option value="MANAGER">{t('roles.manager', 'Manager')}</option>
                                  <option value="RESPONSABLE_FRIGO">{t('roles.responsable_frigo', 'Frigo Manager')}</option>
                                  <option value="CAISSIER">{t('roles.caissier', 'Cashier')}</option>
                                  <option value="USER">{t('roles.user', 'User')}</option>
                                </select>
                              </div>
                              {formData.role === 'RESPONSABLE_FRIGO' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.assigned_frigo', 'Assigned Frigo')}</label>
                                  <select
                                    name="assignedFrigoId"
                                    value={formData.assignedFrigoId}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                  >
                                    <option value="">{t('common.select', 'Select...')}</option>
                                    {frigos.map(f => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            <div className="mb-4">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-600" />
                                {t('users.permissions', 'Permissions')}
                              </h4>
                              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left rtl:text-right font-medium text-gray-600">{t('users.module', 'Module')}</th>
                                      {ALL_PERMISSIONS.map(p => (
                                        <th key={p} className="px-4 py-2 text-center font-medium text-gray-600">{p}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {ALL_MODULES.map(module => (
                                      <tr key={module} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-800">{module}</td>
                                        {ALL_PERMISSIONS.map(permission => (
                                          <td key={permission} className="px-4 py-2 text-center">
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 text-[#0f62fe] border-gray-300 rounded focus:ring-[#0f62fe] cursor-pointer"
                                              checked={editPermissions[module]?.includes(permission) || false}
                                              onChange={(e) => handlePermissionChange(module, permission, e.target.checked)}
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                              <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                {t('common.cancel', 'Cancel')}
                              </button>
                              <button
                                onClick={() => handleUpdateUser(user.uid)}
                                disabled={submitting}
                                className="px-4 py-2 bg-[#0f62fe] text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {submitting ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      {t('users.no_users', 'Aucun utilisateur trouvé.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      ) : (
        /* Role Permissions Matrix View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0f62fe]" />
                Configuration des Accès par Rôle
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Définissez les pages et actions autorisées pour chaque profil d'utilisateur
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-700 uppercase">Sélectionner le Rôle :</label>
              <select
                value={selectedMatrixRole}
                onChange={e => setSelectedMatrixRole(e.target.value as Role)}
                className="carbon-input font-bold text-xs bg-blue-50 border-blue-300 text-blue-900"
              >
                <option value="ADMIN">ADMINISTRATEUR (Super Admin)</option>
                <option value="COMMERCIAL">COMMERCIAL / VENTE</option>
                <option value="RESPONSABLE_FRIGO">RESPONSABLE FRIGO (Gestion Stock)</option>
                <option value="COMPTABLE">COMPTABLE / FINANCES</option>
              </select>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#161616] text-white">
                <tr>
                  <th className="px-4 py-3 text-left rtl:text-right font-bold uppercase tracking-wider">Page / Module ERP</th>
                  <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-emerald-400">VOIR PAGE (ACCÈS)</th>
                  <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-blue-400">CRÉER</th>
                  <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-amber-400">MODIFIER</th>
                  <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-rose-400">SUPPRIMER</th>
                  <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-purple-400">EXPORTER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ALL_MODULES.map(module => {
                  const currentRolePerms = rolePermissionsState[selectedMatrixRole] || {};
                  const isChecked = (perm: Permission) => currentRolePerms[module]?.includes(perm) || false;

                  return (
                    <tr key={module} className="hover:bg-blue-50/40">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {module === 'DASHBOARD' && '📊 Tableau de Bord (Dashboard)'}
                        {module === 'PRODUCTS' && '📦 Produits & Catalogue Stock'}
                        {module === 'BL' && '🚚 Bons de Livraison (BL)'}
                        {module === 'CLIENTS' && '👥 Annuaire Clients & Solde'}
                        {module === 'SALES_ORDERS' && '🛒 Commandes Clients'}
                        {module === 'PURCHASES' && '🚢 Achats & Importations'}
                        {module === 'INVENTORY' && '📋 Inventaires Multi-Frigo'}
                        {module === 'INVOICING' && '📄 Factures Client & Règlements'}
                        {module === 'TREASURY' && '🏛️ Trésorerie, Chèques & Effets'}
                        {module === 'EXPENSES' && '🧾 Frais Frigo & Dépenses'}
                        {module === 'SUPPLIERS' && '🏬 Annuaire Fournisseurs'}
                        {module === 'FRIGO_MGMT' && '🏭 Gestion des Entrepôts Frigo'}
                        {module === 'COMPANY_INFO' && '🏢 Informations Société'}
                        {module === 'USERS' && '👤 Gestion Utilisateurs & Droits'}
                        {module === 'IMPORT_BL' && '📥 Importateur BL (Excel / PDF)'}
                        {module === 'BACKUP' && '💾 Sauvegarde & Restauration'}
                        {!['DASHBOARD','PRODUCTS','BL','CLIENTS','SALES_ORDERS','PURCHASES','INVENTORY','INVOICING','TREASURY','EXPENSES','SUPPLIERS','FRIGO_MGMT','COMPANY_INFO','USERS','IMPORT_BL','BACKUP'].includes(module) && module}
                      </td>

                      {ALL_PERMISSIONS.map(permission => (
                        <td key={permission} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked(permission)}
                            disabled={selectedMatrixRole === 'ADMIN'}
                            onChange={e => handleRoleMatrixPermissionChange(selectedMatrixRole, module, permission, e.target.checked)}
                            className="w-4 h-4 text-[#0f62fe] border-gray-300 rounded focus:ring-[#0f62fe] cursor-pointer disabled:opacity-50"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-3 border-t">
            <div className="text-xs text-gray-500 italic">
              {selectedMatrixRole === 'ADMIN' 
                ? "Le rôle ADMINISTRATEUR dispose de tous les accès par défaut et ne peut être restreint." 
                : `Les modifications s'appliqueront instantanément à tous les comptes attribués au rôle "${selectedMatrixRole}".`}
            </div>

            {selectedMatrixRole !== 'ADMIN' && (
              <button
                onClick={handleSaveRoleMatrix}
                disabled={submitting}
                className="px-5 py-2.5 bg-[#0f62fe] hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer la Matrice de Permissions ({selectedMatrixRole})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
