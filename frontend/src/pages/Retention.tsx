import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Users } from 'lucide-react';
import { apiService, RetentionResult } from '../services/api';
import toast from 'react-hot-toast';

const Retention: React.FC = () => {
  const [retentionData, setRetentionData] = useState<RetentionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    cohort: 'signup',
    days: 7,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-31T23:59:59Z'
  });

  const fetchRetentionData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getRetention(
        filters.cohort,
        filters.days,
        filters.startDate,
        filters.endDate
      );
      setRetentionData(response.data.data);
    } catch (error) {
      console.error('Error fetching retention data:', error);
      toast.error('Failed to load retention data');
    } finally {
      setLoading(false);
    }
  }, [filters.cohort, filters.days, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchRetentionData();
  }, [fetchRetentionData]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const retentionChartData = retentionData?.retentionData?.map(item => ({
    day: `Day ${item.day}`,
    percentage: item.retentionRate,
    count: item.retainedUsers
  })) || [];

  const cohortOptions = [
    { value: 'signup', label: 'Signup' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'page_view', label: 'Page View' },
    { value: 'login', label: 'Login' }
  ];

  const dayOptions = [7, 14, 30, 60, 90];

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
        <h1 className="text-2xl font-bold text-gray-900">Retention Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track user retention and engagement over time
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cohort Event</label>
            <select
              value={filters.cohort}
              onChange={(e) => handleFilterChange('cohort', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {cohortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days to Track</label>
            <select
              value={filters.days}
              onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {dayOptions.map(days => (
                <option key={days} value={days}>
                  {days} days
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{retentionData?.cohortSize || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Day 1 Retention</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {retentionData?.retentionData?.[0]?.retentionRate?.toFixed(1) || 0}%
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
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Day 7 Retention</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {retentionData?.retentionData?.[6]?.retentionRate?.toFixed(1) || 0}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retention Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Retention Line Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Retention Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Retention']} />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Retention Bar Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Retention by Day</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Retention']} />
                <Bar dataKey="percentage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Retention Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Retention Details</h3>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retained Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retention Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {retentionData?.retentionData?.map((item) => (
                <tr key={item.day}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Day {item.day}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.retainedUsers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`font-medium ${
                      item.retentionRate >= 50 ? 'text-green-600' :
                      item.retentionRate >= 25 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {item.retentionRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* No Data State */}
      {(!retentionData || retentionData.retentionData.length === 0) && !loading && (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No retention data</h3>
          <p className="mt-1 text-sm text-gray-500">
            No retention data available for the selected filters. Try adjusting your date range or cohort event.
          </p>
        </div>
      )}
    </div>
  );
};

export default Retention; 