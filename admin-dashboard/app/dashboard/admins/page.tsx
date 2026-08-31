'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://naqiapp.onrender.com/api';

interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name?: string;
  phone_number?: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const { user, getIdToken } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add admin by phone number
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');

  // Toggle status
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getIdToken();
      const response = await axios.get(`${API_BASE_URL}/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAdmins(response.data);
    } catch (err: any) {
      console.error('Error fetching admins:', err);
      setError(err.response?.data?.detail || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdminByPhone = async (e: FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchSuccess('');

    if (!phoneNumber.trim()) {
      setSearchError('Please enter a phone number');
      return;
    }

    try {
      setSearchLoading(true);
      const token = await getIdToken();

      // First, search for the user by phone number
      const searchResponse = await axios.get(
        `${API_BASE_URL}/admins/search/phone/${encodeURIComponent(phoneNumber)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const foundUser = searchResponse.data;

      // Check if user is already an admin
      if (foundUser.role === 'admin') {
        setSearchError('This user is already an admin');
        return;
      }

      // Promote user to admin by updating their role
      await axios.patch(
        `${API_BASE_URL}/admins/${foundUser.firebase_uid}/role`,
        { role: 'admin' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSearchSuccess(`Successfully promoted ${foundUser.display_name || foundUser.phone_number} to admin`);
      setPhoneNumber('');

      // Refresh the admin list
      await fetchAdmins();
    } catch (err: any) {
      console.error('Error adding admin:', err);
      if (err.response?.status === 404) {
        setSearchError('No user found with this phone number');
      } else {
        setSearchError(err.response?.data?.detail || 'Failed to add admin');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleToggleStatus = async (admin: User) => {
    try {
      setToggleLoading(admin.firebase_uid);
      const token = await getIdToken();

      await axios.patch(
        `${API_BASE_URL}/admins/${admin.firebase_uid}/status?is_active=${!admin.is_active}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setAdmins(admins.map(a =>
        a.firebase_uid === admin.firebase_uid
          ? { ...a, is_active: !a.is_active }
          : a
      ));
    } catch (err: any) {
      console.error('Error toggling admin status:', err);
      alert(err.response?.data?.detail || 'Failed to update admin status');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDeleteClick = (admin: User) => {
    setAdminToDelete(admin);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;

    try {
      setDeleting(true);
      const token = await getIdToken();

      await axios.delete(
        `${API_BASE_URL}/admins/${adminToDelete.firebase_uid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remove from local state
      setAdmins(admins.filter(a => a.firebase_uid !== adminToDelete.firebase_uid));
      setShowDeleteConfirm(false);
      setAdminToDelete(null);
    } catch (err: any) {
      console.error('Error deleting admin:', err);
      alert(err.response?.data?.detail || 'Failed to delete admin');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchAdmins}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-gray-600 mt-1">Manage admin users and permissions</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Admins: <span className="font-semibold text-gray-900">{admins.length}</span>
        </div>
      </div>

      {/* Add Admin by Phone Number Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Admin User</h2>
        <form onSubmit={handleAddAdminByPhone} className="space-y-4">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="flex gap-3">
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number (e.g., +1234567890)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={searchLoading}
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {searchLoading ? 'Searching...' : 'Add Admin'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Search for a user by phone number and promote them to admin role
            </p>
          </div>

          {searchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{searchError}</p>
            </div>
          )}

          {searchSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{searchSuccess}</p>
            </div>
          )}
        </form>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No admin users found
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {getInitials(admin.display_name, admin.email)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.display_name || 'No name'}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {admin.firebase_uid.slice(0, 12)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.email || 'N/A'}</div>
                      {admin.email && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            admin.email_verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {admin.email_verified ? 'Verified' : 'Unverified'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.phone_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          admin.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {admin.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(admin.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {admin.firebase_uid !== user?.uid && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            disabled={toggleLoading === admin.firebase_uid}
                            className={`px-3 py-1 rounded ${
                              admin.is_active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50`}
                          >
                            {toggleLoading === admin.firebase_uid
                              ? 'Loading...'
                              : admin.is_active
                              ? 'Disable'
                              : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(admin)}
                            className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {admin.firebase_uid === user?.uid && (
                        <span className="text-gray-400 text-xs">You</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && adminToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Admin User</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete{' '}
              <strong>{adminToDelete.display_name || adminToDelete.email}</strong>? This will
              remove their admin privileges and may delete their account.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAdminToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
