import React, { useState, useEffect } from 'react';
import { 
  FaCalendarCheck, 
  FaSpinner
} from 'react-icons/fa';
import { appointmentAPI } from '../services/api';

const AppointmentBooking = () => {
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]); // Store all appointments for filtering
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState({}); // Track which appointment is being updated
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const response = await appointmentAPI.list({ limit: 100 });
      if (response.data && response.data.appointments) {
        // Sort by createdAt descending (newest first)
        const sortedAppointments = [...response.data.appointments].sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateB - dateA; // Descending order (newest first)
        });
        setAllAppointments(sortedAppointments);
        setAppointments(sortedAppointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Apply filters whenever search, status, or date filters change
  useEffect(() => {
    let filtered = [...allAppointments];

    // Search filter (name, phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.customerName?.toLowerCase().includes(query) ||
        apt.customerPhone?.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Date range filter
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= fromDate;
      });
    }

    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate <= toDate;
      });
    }

    setAppointments(filtered);
  }, [searchQuery, statusFilter, dateFromFilter, dateToFilter, allAppointments]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} ${timeStr}`;
  };

  // Calculate statistics (based on all appointments, not filtered)
  const stats = {
    total: allAppointments.length,
    completed: allAppointments.filter(apt => apt.status === 'completed').length,
    pending: allAppointments.filter(apt => apt.status === 'scheduled').length,
    today: allAppointments.filter(apt => {
      const appointmentDate = new Date(apt.appointmentDate);
      const today = new Date();
      return appointmentDate.toDateString() === today.toDateString() && apt.status === 'scheduled';
    }).length
  };

  const handleStatusToggle = async (appointmentId, currentStatus) => {
    // Toggle between 'scheduled' (pending) and 'completed'
    const newStatus = currentStatus === 'completed' ? 'scheduled' : 'completed';
    
    setUpdatingStatus(prev => ({ ...prev, [appointmentId]: true }));
    
    try {
      await appointmentAPI.update(appointmentId, { status: newStatus });
      
      // Update local state in both filtered and all appointments
      const updateAppointment = (appointment) =>
        appointment._id === appointmentId
          ? { ...appointment, status: newStatus }
          : appointment;

      setAppointments(prevAppointments =>
        prevAppointments.map(updateAppointment)
      );
      setAllAppointments(prevAppointments =>
        prevAppointments.map(updateAppointment)
      );
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Failed to update appointment status. Please try again.');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  if (loadingAppointments) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaCalendarCheck className="h-3 w-3" />
          <span>Appointment Management</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Appointment Booking
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          View and manage your appointments
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Scheduled Appointments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Today's Scheduled</p>
              <p className="text-2xl font-semibold text-zinc-900">{stats.today}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Completed Appointments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Completed</p>
              <p className="text-2xl font-semibold text-zinc-900">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Pending</p>
              <p className="text-2xl font-semibold text-zinc-900">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Appointments */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 mb-1">Total Appointments</p>
              <p className="text-2xl font-semibold text-zinc-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FaCalendarCheck className="text-blue-600" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Booked Appointments
        </h2>

        {/* Search and Filter Bar */}
        <div className="mb-4 pb-4 border-b border-zinc-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>

            {/* Date From Filter */}
            <div className="min-w-[150px]">
              <input
                type="date"
                placeholder="From Date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              />
            </div>

            {/* Date To Filter */}
            <div className="min-w-[150px]">
              <input
                type="date"
                placeholder="To Date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
              />
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFromFilter('');
                  setDateToFilter('');
                }}
                className="h-9 px-4 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="mt-3 text-xs text-zinc-500">
            Showing {appointments.length} of {allAppointments.length} appointments
          </div>
        </div>

        {loadingAppointments ? (
          <div className="flex justify-center items-center py-8">
            <FaSpinner className="animate-spin text-emerald-500" size={24} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            No appointments booked yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Schedule Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Schedule Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment._id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="py-3 px-4 text-sm text-zinc-900">{appointment.customerName}</td>
                    <td className="py-3 px-4 text-sm text-zinc-600">{appointment.customerPhone}</td>
                    <td className="py-3 px-4 text-sm text-zinc-600">{formatDate(appointment.appointmentDate)}</td>
                    <td className="py-3 px-4 text-sm text-zinc-600">{formatTime(appointment.appointmentTime)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={appointment.status === 'completed'}
                            onChange={() => handleStatusToggle(appointment._id, appointment.status)}
                            disabled={updatingStatus[appointment._id]}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          <span className="ml-2 text-sm text-zinc-600">
                            {updatingStatus[appointment._id] ? (
                              <FaSpinner className="animate-spin inline" size={12} />
                            ) : (
                              appointment.status === 'completed' ? 'Completed' : 'Pending'
                            )}
                          </span>
                        </label>
                        
                        {/* Status Badge (for other statuses like cancelled) */}
                        {appointment.status === 'cancelled' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                            Cancelled
                          </span>
                        )}
                        {appointment.status === 'rescheduled' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                            Rescheduled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-500">{formatDateTime(appointment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentBooking;
