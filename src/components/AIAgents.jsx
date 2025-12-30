import React, { useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaPlay, FaRobot, FaMicrophone } from 'react-icons/fa';

const AIAgents = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Dummy AI agents data
  const agents = [
    {
      id: 1,
      name: 'Agent Alpha',
      voice: 'Molly - Conversational',
      status: 'active',
      callsHandled: 1250,
      successRate: 68.5,
    },
    {
      id: 2,
      name: 'Agent Beta',
      voice: 'James - Professional',
      status: 'active',
      callsHandled: 980,
      successRate: 72.3,
    },
    {
      id: 3,
      name: 'Agent Gamma',
      voice: 'Sarah - Friendly',
      status: 'inactive',
      callsHandled: 750,
      successRate: 65.8,
    },
  ];

  const voices = [
    'Molly - Conversational',
    'James - Professional',
    'Sarah - Friendly',
    'David - Authoritative',
    'Emma - Warm',
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Agents
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create and manage your AI calling agents
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
        >
          <FaPlus />
          <span>Create New Agent</span>
        </button>
      </div>

      {/* AI Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center">
                  <FaRobot className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {agent.voice}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  agent.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {agent.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Calls Handled</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {agent.callsHandled.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Success Rate</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {agent.successRate}%
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSelectedAgent(agent);
                  setShowCreateModal(true);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <FaEdit className="inline mr-2" />
                Edit
              </button>
              <button className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium">
                <FaPlay className="inline mr-2" />
                Test
              </button>
              <button className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedAgent ? 'Edit AI Agent' : 'Create New AI Agent'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedAgent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  placeholder="Enter agent name"
                  defaultValue={selectedAgent?.name || ''}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Voice Selection
                </label>
                <select
                  defaultValue={selectedAgent?.voice || ''}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a voice</option>
                  {voices.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt/Script */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent Prompt / Script
                </label>
                <textarea
                  rows={6}
                  placeholder="Enter the agent's conversation script or prompt..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Define how the AI agent should interact with customers
                </p>
              </div>

              {/* Knowledge Base Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Knowledge Base (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <FaMicrophone className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Upload knowledge base documents
                  </p>
                  <button className="text-primary-500 hover:text-primary-600 font-medium text-sm">
                    Choose Files
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedAgent(null);
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
                  {selectedAgent ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgents;

