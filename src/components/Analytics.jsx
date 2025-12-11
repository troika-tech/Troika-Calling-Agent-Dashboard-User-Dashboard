import React, { useState, useEffect } from 'react';
import { FaPhone, FaCheckCircle, FaClock, FaSpinner } from 'react-icons/fa';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { callAPI, analyticsAPI } from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [directionData, setDirectionData] = useState({ inbound: 0, outbound: 0 });
  const [statusData, setStatusData] = useState({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch overview stats and charts data in parallel
      const [overviewResponse, chartsResponse] = await Promise.all([
        analyticsAPI.getOverview().catch(err => {
          console.warn('Error fetching overview:', err);
          return null;
        }),
        analyticsAPI.getCharts().catch(err => {
          console.warn('Error fetching charts:', err);
          return null;
        })
      ]);

      const overviewData = overviewResponse?.data || overviewResponse || {};
      const chartsData = chartsResponse?.data || chartsResponse || {};


      // Set overview stats for KPI cards
      setStats({
        overview: {
          totalCalls: overviewData.totalCalls || 0,
          successfulCalls: overviewData.totalCampaigns || 0, // Campaign Completed = totalCampaigns
          averageDuration: overviewData.avgDuration || 0,
        }
      });

      // Set charts data from backend
      if (chartsData.direction) {
        setDirectionData(chartsData.direction);
      }
      if (chartsData.status) {
        setStatusData(chartsData.status);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs from real data
  const calculateKPIs = () => {
    if (!stats || !stats.overview) return [];

    const overview = stats.overview;
    const totalCalls = overview.totalCalls || 0;
    const successfulCalls = overview.successfulCalls || 0;
    const avgDuration = overview.averageDuration || 0;

    const formatDuration = (seconds) => {
      if (!seconds) return '0s';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      if (mins > 0) {
        return `${mins}m ${secs}s`;
      }
      return `${secs}s`;
    };

    return [
      { title: 'Total Calls', value: totalCalls.toLocaleString(), icon: FaPhone, color: 'bg-blue-500' },
      { title: 'Campaign Completed', value: successfulCalls.toLocaleString(), icon: FaCheckCircle, color: 'bg-green-500' },
      { title: 'Avg Duration', value: formatDuration(avgDuration), icon: FaClock, color: 'bg-purple-500' },
    ];
  };

  // Prepare direction data for line chart (show total counts as bar-like comparison)
  const prepareDirectionChartData = () => {
    const { inbound, outbound } = directionData;
    // Return data for a simple comparison view
    return [
      { name: 'Incoming', value: inbound || 0, color: '#2dd4bf' },
      { name: 'Outgoing', value: outbound || 0, color: '#10b981' },
    ];
  };

  // Prepare status distribution chart data
  const prepareStatusChartData = () => {
    // Group statuses into meaningful categories
    const completed = (statusData['completed'] || 0) + (statusData['user-ended'] || 0) + (statusData['agent-ended'] || 0) + (statusData['answered'] || 0);
    const failed = (statusData['failed'] || 0) + (statusData['no-answer'] || 0) + (statusData['busy'] || 0);
    const inProgress = statusData['in-progress'] || 0;
    const initiated = statusData['initiated'] || statusData['queued'] || 0;

    return [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Failed', value: failed, color: '#ef4444' },
      { name: 'In Progress', value: inProgress, color: '#f59e0b' },
      { name: 'Initiated', value: initiated, color: '#6b7280' },
    ].filter(item => item.value > 0); // Only show non-zero values
  };

  if (loading && !stats) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
          <p className="text-zinc-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const kpiData = calculateKPIs();
  const directionChartData = prepareDirectionChartData();
  const statusDistributionData = prepareStatusChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaPhone className="h-3 w-3" />
            <span>Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Analytics & Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Detailed insights into your calling campaigns
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const isEmerald = kpi.title === 'Campaign Completed';
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] kpi-gradient"
            >
              <div className="relative p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                      {kpi.title}
                    </p>
                    <div className="text-xl font-semibold tabular-nums text-zinc-900">{kpi.value}</div>
                  </div>
                  <div
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white ${
                      isEmerald ? 'border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-100' : ''
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isEmerald ? 'text-emerald-500' : 'text-zinc-500'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incoming vs Outgoing Calls */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Incoming vs Outgoing Calls
          </h3>
          {directionData.inbound === 0 && directionData.outbound === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-zinc-500 text-sm">
              No call direction data available.
            </div>
          ) : (
              <>
                <div className={isMobile ? '-ml-4 -mr-4' : ''}>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={directionChartData} margin={{ top: 5, right: 30, left: isMobile ? 0 : 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis
                        dataKey="name"
                        stroke="#71717a"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#71717a"
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                        formatter={(value, name) => [value.toLocaleString(), 'Calls']}
                      />
                      <Bar
                        dataKey="value"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      >
                        {directionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              <div className="mt-4 flex justify-center gap-6 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                  <span className="text-zinc-700">Incoming ({directionData.inbound?.toLocaleString() || 0})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-zinc-700">Outgoing ({directionData.outbound?.toLocaleString() || 0})</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status Distribution */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4">
            Call Status Distribution
          </h3>
          <div className="w-full">
            {/* Mobile: Legend on left, chart on right */}
            <div className="block sm:hidden">
              <div className="flex items-center gap-4">
                {/* Legend on left */}
                <div className="flex-1">
                  <div className="flex flex-col gap-3">
                    {statusDistributionData.map((entry, index) => {
                      const total = statusDistributionData.reduce((sum, e) => sum + e.value, 0);
                      const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs text-zinc-600">
                            {entry.name}
                          </span>
                          <span className="text-xs font-medium text-zinc-900">
                            {percent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Chart on right */}
                <div className="flex-shrink-0" style={{ width: '150px', height: '150px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={60}
                        innerRadius={25}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                          fontSize: '11px',
                          padding: '8px 12px',
                        }}
                        formatter={(value, name) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Desktop: Chart on top, legend below */}
            <div className="hidden sm:block">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e4e4e7',
                      borderRadius: '8px',
                      fontSize: '11px',
                      padding: '8px 12px',
                    }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Desktop: Show legend below chart */}
              <div className="flex justify-center mt-6 gap-6">
                {statusDistributionData.map((entry, index) => {
                  const total = statusDistributionData.reduce((sum, e) => sum + e.value, 0);
                  const percent = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-zinc-600">
                        {entry.name}
                      </span>
                      <span className="text-xs font-medium text-zinc-900">
                        {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Analytics;
