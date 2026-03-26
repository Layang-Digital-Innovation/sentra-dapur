"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import { Role } from '@/types/user.types';
import { 
  FiActivity, 
  FiServer, 
  FiDatabase,
  FiCpu,
  FiHardDrive,
  FiWifi,
  FiMonitor,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface ServerStatus {
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  uptime: string;
  load: number;
  memory: number;
  disk: number;
}

const SystemAnalytics = () => {
  const { user, isAuthenticated } = useAuth();
  const { canViewSystemAnalytics } = usePermissions();
  const router = useRouter();

  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    { name: 'CPU Usage', value: 45, unit: '%', status: 'healthy', trend: 'stable' },
    { name: 'Memory Usage', value: 67, unit: '%', status: 'warning', trend: 'up' },
    { name: 'Disk Usage', value: 23, unit: '%', status: 'healthy', trend: 'stable' },
    { name: 'Network I/O', value: 156, unit: 'MB/s', status: 'healthy', trend: 'up' },
    { name: 'Database Connections', value: 89, unit: 'active', status: 'healthy', trend: 'stable' },
    { name: 'API Response Time', value: 245, unit: 'ms', status: 'healthy', trend: 'down' }
  ]);

  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([
    { name: 'Web Server 01', status: 'online', uptime: '99.9%', load: 45, memory: 67, disk: 23 },
    { name: 'Web Server 02', status: 'online', uptime: '99.8%', load: 52, memory: 71, disk: 28 },
    { name: 'Database Server', status: 'online', uptime: '99.99%', load: 34, memory: 56, disk: 45 },
    { name: 'Cache Server', status: 'online', uptime: '99.7%', load: 28, memory: 43, disk: 12 },
    { name: 'File Server', status: 'maintenance', uptime: '98.5%', load: 0, memory: 0, disk: 67 }
  ]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!canViewSystemAnalytics()) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, canViewSystemAnalytics, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
      case 'offline':
        return 'text-red-600';
      case 'maintenance':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <FiAlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
      case 'offline':
        return <FiXCircle className="h-5 w-5 text-red-600" />;
      case 'maintenance':
        return <FiMonitor className="h-5 w-5 text-blue-600" />;
      default:
        return <FiActivity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
      default:
        return '→';
    }
  };

  const getMetricIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'cpu usage':
        return <FiCpu className="h-6 w-6" />;
      case 'memory usage':
        return <FiHardDrive className="h-6 w-6" />;
      case 'disk usage':
        return <FiDatabase className="h-6 w-6" />;
      case 'network i/o':
        return <FiWifi className="h-6 w-6" />;
      case 'database connections':
        return <FiDatabase className="h-6 w-6" />;
      case 'api response time':
        return <FiServer className="h-6 w-6" />;
      default:
        return <FiActivity className="h-6 w-6" />;
    }
  };

  return (
    <RoleGuard allowedRoles={[Role.SUPER_ADMIN]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FiActivity className="mr-3 h-8 w-8 text-blue-600" />
              System Analytics
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time system monitoring and performance metrics
            </p>
          </div>

          {/* System Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={getStatusColor(metric.status)}>
                    {getMetricIcon(metric.name)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getTrendIcon(metric.trend)}</span>
                    {getStatusIcon(metric.status)}
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.name}</h3>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <p className="text-sm text-gray-500 ml-1">{metric.unit}</p>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metric.status === 'healthy' ? 'bg-green-600' :
                        metric.status === 'warning' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Server Status */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FiServer className="mr-2 h-5 w-5" />
                Server Status
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Server
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uptime
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Load
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Memory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serverStatuses.map((server, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiServer className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">{server.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(server.status)}
                          <span className={`ml-2 text-sm font-medium ${getStatusColor(server.status)}`}>
                            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.uptime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.load}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.memory}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.disk}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU Usage Over Time</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder - CPU usage trends</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Memory Usage Over Time</h3>
              <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder - Memory usage trends</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default SystemAnalytics;