import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users as UsersIcon, User, Clock, Activity } from 'lucide-react';
import { apiService, UserJourney } from '../services/api';
import toast from 'react-hot-toast';

const UsersPage: React.FC = () => {
  const [userJourney, setUserJourney] = useState<UserJourney | null>(null);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('user-001');
  const [filters, setFilters] = useState({
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-31T23:59:59Z'
  });

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [journeyResponse, summaryResponse] = await Promise.all([
        apiService.getUserJourney(selectedUserId, filters.startDate, filters.endDate),
        apiService.getUserSummary(selectedUserId, filters.startDate, filters.endDate)
      ]);

      setUserJourney(journeyResponse.data.data);
      setUserSummary(summaryResponse.data.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserData();
    }
  }, [selectedUserId, filters, fetchUserData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const journeyData = userJourney?.events?.map((event, index) => ({
    step: index + 1,
    event: event.eventName,
    timestamp: new Date(event.timestamp).toLocaleString(),
    time: new Date(event.timestamp).toLocaleTimeString()
  })) || [];

  const eventCounts = userJourney?.events?.reduce((acc: any, event) => {
    acc[event.eventName] = (acc[event.eventName] || 0) + 1;
    return acc;
  }, {}) || {};

  const eventChartData = Object.entries(eventCounts).map(([eventName, count]) => ({
    event: eventName,
    count: count as number
  }));

  const sampleUsers = [
    { id: 'user-001', name: 'User 001', events: 7 },
    { id: 'user-002', name: 'User 002', events: 0 },
    { id: 'user-003', name: 'User 003', events: 0 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze individual user journeys and behavior patterns
        </p>
      </div>

      {/* User Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select User</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {sampleUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.events} events)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate.split('T')[0]}
              onChange={(e) => handleFilterChange('startDate', `${e.target.value}T00:00:00Z`)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate.split('T')[0]}
              onChange={(e) => handleFilterChange('endDate', `${e.target.value}T23:59:59Z`)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchUserData}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* User Summary */}
      {userSummary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                    <dd className="text-lg font-medium text-gray-900">{userSummary.totalEvents || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">First Event</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {userSummary.firstEvent ? new Date(userSummary.firstEvent).toLocaleDateString() : 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Last Event</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {userSummary.lastEvent ? new Date(userSummary.lastEvent).toLocaleDateString() : 'N/A'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Journey */}
      {userJourney && userJourney.events.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Journey Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Journey Timeline</h3>
            <div className="space-y-4">
              {userJourney.events.map((event, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{event.eventName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {Object.keys(event.properties).length > 0 && (
                      <div className="mt-1 text-xs text-gray-400">
                        {Object.entries(event.properties).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Distribution Chart */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Event Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={journeyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="step" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No user data</h3>
          <p className="mt-1 text-sm text-gray-500">
            No events found for this user in the selected date range.
          </p>
        </div>
      )}

      {/* Event Counts Table */}
      {userJourney && userJourney.events.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Event Summary</h3>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eventChartData.map((item) => (
                  <tr key={item.event}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.event}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((item.count / userJourney.events.length) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage; 