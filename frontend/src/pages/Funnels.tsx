import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, ArrowRight, TrendingDown } from 'lucide-react';
import { apiService, Funnel, FunnelResult } from '../services/api';
import toast from 'react-hot-toast';

const Funnels = () => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [funnelAnalytics, setFunnelAnalytics] = useState<FunnelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFunnel, setNewFunnel] = useState({
    name: '',
    steps: [{ eventName: '' }]
  });

  useEffect(() => {
    fetchFunnels();
  }, []);

  const fetchFunnels = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFunnels();
      setFunnels(response.data.data || []);
    } catch (error) {
      console.error('Error fetching funnels:', error);
      toast.error('Failed to load funnels');
    } finally {
      setLoading(false);
    }
  };

  const fetchFunnelAnalytics = async (funnelId: string) => {
    try {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';
      const response = await apiService.getFunnelAnalytics(funnelId, startDate, endDate);
      setFunnelAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching funnel analytics:', error);
      toast.error('Failed to load funnel analytics');
    }
  };

  const handleFunnelSelect = (funnel: Funnel) => {
    setSelectedFunnel(funnel);
    const funnelId = funnel.id || funnel._id;
    if (funnelId) {
      fetchFunnelAnalytics(funnelId);
    } else {
      toast.error('Invalid funnel ID');
    }
  };

  const handleCreateFunnel = async () => {
    try {
      if (!newFunnel.name || newFunnel.steps.length < 2) {
        toast.error('Please provide a name and at least 2 steps');
        return;
      }

      await apiService.createFunnel(newFunnel);
      toast.success('Funnel created successfully');
      setShowCreateForm(false);
      setNewFunnel({ name: '', steps: [{ eventName: '' }] });
      fetchFunnels();
    } catch (error) {
      console.error('Error creating funnel:', error);
      toast.error('Failed to create funnel');
    }
  };

  const addStep = () => {
    setNewFunnel(prev => ({
      ...prev,
      steps: [...prev.steps, { eventName: '' }]
    }));
  };

  const removeStep = (index: number) => {
    if (newFunnel.steps.length > 1) {
      setNewFunnel(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index)
      }));
    }
  };

  const updateStep = (index: number, eventName: string) => {
    setNewFunnel(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, eventName } : step
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const funnelData = funnelAnalytics?.steps?.map((step, index) => ({
    step: `${index + 1}. ${step.eventName}`,
    count: step.count,
    conversionRate: step.conversionRate,
    dropOffRate: step.dropOffRate
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funnels</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track user conversion paths and identify drop-off points
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Funnel
        </button>
      </div>

      {/* Funnel List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {funnels.map((funnel) => (
          <div
            key={funnel.id || funnel._id}
            onClick={() => handleFunnelSelect(funnel)}
            className={`bg-white p-6 rounded-lg shadow cursor-pointer border-2 transition-colors ${
              (selectedFunnel?.id || selectedFunnel?._id) === (funnel.id || funnel._id)
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-2">{funnel.name}</h3>
            <div className="space-y-1">
              {funnel.steps.map((step, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="ml-2">{step.eventName}</span>
                  {index < funnel.steps.length - 1 && (
                    <ArrowRight className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Created {new Date(funnel.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* Funnel Analytics */}
      {selectedFunnel && funnelAnalytics && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {selectedFunnel.name} - Analytics
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Chart */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Funnel</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="step" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Conversion Rates */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Rates</h3>
              <div className="space-y-3">
                {funnelAnalytics.steps.map((step, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{step.eventName}</p>
                      <p className="text-sm text-gray-500">{step.count} users</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {step.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-sm text-red-500">
                        {step.dropOffRate.toFixed(1)}% drop-off
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Funnel Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Funnel</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Funnel Name</label>
                  <input
                    type="text"
                    value={newFunnel.name}
                    onChange={(e) => setNewFunnel(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., E-commerce Conversion"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
                  <div className="space-y-2">
                    {newFunnel.steps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={step.eventName}
                          onChange={(e) => updateStep(index, e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Event name (e.g., page_view)"
                        />
                        {newFunnel.steps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrendingDown className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addStep}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFunnel}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Create Funnel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Funnels; 