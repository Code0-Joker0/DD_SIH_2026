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

const mockUsersData = [
  { id: 'usr_1', name: 'Reva Kulkarni', email: 'reva.kulkarni@org.local', role: 'Admin', department: 'Engineering', status: 'Active', lastActive: '10 mins ago' },
  { id: 'usr_2', name: 'Ananya Sharma', email: 'ananya.sharma@org.local', role: 'Engineer', department: 'Engineering', status: 'Active', lastActive: '45 mins ago' },
  { id: 'usr_3', name: 'Vikram Mehta', email: 'vikram.mehta@org.local', role: 'Reviewer', department: 'Operations', status: 'Active', lastActive: '2 hours ago' },
  { id: 'usr_4', name: 'Siddharth Rao', email: 'siddharth.rao@org.local', role: 'Viewer', department: 'Management', status: 'Active', lastActive: '1 day ago' },
  { id: 'usr_5', name: 'Priya Nair', email: 'priya.nair@org.local', role: 'Engineer', department: 'Operations', status: 'Deactivated', lastActive: '5 days ago' },
];

export default function AdminUsersView() {
  const [users, setUsers] = useState(mockUsersData);
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

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: formName,
        email: formEmail,
        department: formDepartment,
        role: formRole,
        status: formStatus
      } : u));
    } else {
      const newUser = {
        id: `usr_${Date.now()}`,
        name: formName,
        email: formEmail,
        department: formDepartment,
        role: formRole,
        status: formStatus,
        lastActive: 'Just now'
      };
      setUsers(prev => [newUser, ...prev]);
    }
    setIsModalOpen(false);
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
