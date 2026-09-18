import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  UserCheck, 
  UserX, 
  Shield, 
  Check, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function AdminUsersView() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formRole, setFormRole] = useState('Engineer');
  const [formStatus, setFormStatus] = useState('Active');

  // Deactivate confirmation
  const [deactivatingUser, setDeactivatingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9000';
      const res = await fetch(`${API_BASE}/auth/users`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users.map(u => ({
          id: u.id,
          name: u.username,
          email: u.email,
          role: u.role,
          department: 'Engineering', // Placeholder since DB doesn't have it
          status: 'Active',
          lastActive: new Date(u.created_at).toLocaleDateString()
        })));
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(usr => {
    const matchesSearch = usr.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          usr.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || usr.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormDepartment('Engineering');
    setFormRole('Engineer');
    setFormStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (usr) => {
    setEditingUser(usr);
    setFormName(usr.name);
    setFormEmail(usr.email);
    setFormDepartment(usr.department);
    setFormRole(usr.role);
    setFormStatus(usr.status);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    if (editingUser) {
      // Future: Implement PUT /auth/users/:id
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: formName,
        email: formEmail,
        department: formDepartment,
        role: formRole,
        status: formStatus
      } : u));
      setIsModalOpen(false);
    } else {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9000';
        const res = await fetch(`${API_BASE}/auth/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formName,
            email: formEmail,
            role: formRole,
            password: 'password123' // Default password
          })
        });
        
        if (!res.ok) {
          const err = await res.json();
          alert(`Error creating user: ${err.detail}`);
          return;
        }
        
        await fetchUsers(); // Refresh the list
        alert('User created successfully with default password: password123');
        setIsModalOpen(false);
      } catch (err) {
        console.error("Failed to create user", err);
        alert("Failed to connect to backend");
      }
    }
  };

  const handleToggleDeactivate = (usr) => {
    setUsers(prev => prev.map(u => u.id === usr.id ? {
      ...u,
      status: u.status === 'Active' ? 'Deactivated' : 'Active'
    } : u));
    setDeactivatingUser(null);
  };

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Users & Access</h2>
          <p className="subpage-subtitle">Manage organization users, departments, roles, and access controls.</p>
        </div>
        <button className="primary-action-btn" onClick={handleOpenAddModal}>
          <Plus size={15} />
          <span>Add User</span>
        </button>
      </header>

      {/* Controls Bar */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by user name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group font-mono">
          {['All', 'Admin', 'Engineer', 'Reviewer', 'Viewer'].map((r) => (
            <button
              key={r}
              className={`filter-pill-btn ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table Card */}
      <div className="subpage-card">
        <div className="admin-table-header users-grid">
          <span className="col-user">User</span>
          <span className="col-role">Role</span>
          <span className="col-dept">Department</span>
          <span className="col-status">Status</span>
          <span className="col-active">Last Activity</span>
          <span className="col-actions">Actions</span>
        </div>

        <div className="admin-table-body">
          {filteredUsers.length === 0 ? (
            <div className="empty-state-box">
              <Users size={24} className="empty-icon" />
              <p className="empty-title">No users found</p>
              <p className="empty-sub font-mono">Try searching with a different term</p>
            </div>
          ) : (
            filteredUsers.map((usr) => (
              <div key={usr.id} className="admin-table-row users-grid">
                <div className="col-user">
                  <div className="user-avatar-circle font-mono">
                    {usr.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="user-info-block">
                    <span className="user-name-text font-sans">{usr.name}</span>
                    <span className="user-email-sub font-mono">{usr.email}</span>
                  </div>
                </div>

                <span className="col-role font-mono">
                  <span className={`role-pill ${usr.role.toLowerCase()}`}>{usr.role}</span>
                </span>

                <span className="col-dept font-sans">{usr.department}</span>

                <div className="col-status font-mono">
                  {usr.status === 'Active' ? (
                    <span className="status-badge-green"><UserCheck size={12} /> Active</span>
                  ) : (
                    <span className="status-badge-red"><UserX size={12} /> Deactivated</span>
                  )}
                </div>

                <span className="col-active font-mono">{usr.lastActive}</span>

                <div className="col-actions font-mono">
                  <button 
                    className="icon-sub-btn" 
                    title="Edit user"
                    onClick={() => handleOpenEditModal(usr)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className={`icon-sub-btn ${usr.status === 'Active' ? 'danger' : 'success'}`}
                    title={usr.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                    onClick={() => setDeactivatingUser(usr)}
                  >
                    {usr.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title font-sans">
                <Users size={18} className="icon-blue" />
                <span>{editingUser ? 'Edit User' : 'Add New User'}</span>
              </div>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="modal-body font-sans">
              <div className="setting-field">
                <label className="setting-label">Full Name</label>
                <input 
                  type="text" 
                  className="setting-input-text" 
                  placeholder="e.g. Ananya Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="setting-field">
                <label className="setting-label">Email / Username</label>
                <input 
                  type="email" 
                  className="setting-input-text" 
                  placeholder="e.g. ananya.sharma@org.local"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="settings-form-grid">
                <div className="setting-field">
                  <label className="setting-label">Department</label>
                  <select 
                    className="setting-input-select"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Management">Management</option>
                  </select>
                </div>

                <div className="setting-field">
                  <label className="setting-label">Role</label>
                  <select 
                    className="setting-input-select"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="setting-field">
                <label className="setting-label">Account Status</label>
                <select 
                  className="setting-input-select"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Deactivated">Deactivated</option>
                </select>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="secondary-cancel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn">
                  <Check size={14} />
                  <span>{editingUser ? 'Save Changes' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingUser && (
        <div className="modal-overlay" onClick={() => setDeactivatingUser(null)}>
          <div className="modal-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title font-sans">
                <AlertCircle size={18} className="icon-red" />
                <span>Confirm Action</span>
              </div>
              <button className="close-btn" onClick={() => setDeactivatingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body font-sans">
              <p>
                Are you sure you want to {deactivatingUser.status === 'Active' ? 'deactivate' : 'activate'} user <strong>{deactivatingUser.name}</strong> ({deactivatingUser.email})?
              </p>
            </div>

            <div className="modal-actions-row">
              <button type="button" className="secondary-cancel-btn" onClick={() => setDeactivatingUser(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="logout-btn font-mono"
                onClick={() => handleToggleDeactivate(deactivatingUser)}
              >
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
