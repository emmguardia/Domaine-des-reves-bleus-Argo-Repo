import React, { useState, useEffect, useRef } from 'react';
import { FaDownload } from 'react-icons/fa';
import { getApiUrl, adminFetch } from '../../utils/security';
function AdminAdvancedStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const handlePeriodChange = (p: number) => {
    setPeriod(Math.max(3, p));
  };
  useEffect(() => {
    fetchStats();
  }, [period]);
  const fetchStats = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await adminFetch(`${apiUrl}/api/admin/stats/advanced?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const handleExport = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await adminFetch(`${apiUrl}/api/admin/export/orders`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
    }
  };
  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques avancées</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <FaDownload /> Exporter les commandes (CSV)
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenus</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm">7 derniers jours</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.revenue?.last7Days?.toFixed(2) || '0.00'} €
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">30 derniers jours</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.revenue?.last30Days?.toFixed(2) || '0.00'} €
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Commandes</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm">7 derniers jours</p>
              <p className="text-3xl font-bold text-purple-600">{stats?.orders?.last7Days || 0}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">30 derniers jours</p>
              <p className="text-3xl font-bold text-indigo-600">{stats?.orders?.last30Days || 0}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Revenus quotidiens</h2>
          <div className="flex gap-2">
            {[3, 7, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {p === 3 ? '3 jours' : p === 7 ? '7 jours' : p === 30 ? '1 mois' : '3 mois'}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const dailyData = stats?.revenue?.daily || [];
          if (dailyData.length === 0) {
            return <div className="h-80 flex items-center justify-center text-gray-500">Aucune donnée disponible</div>;
          }
          const chartWidth = 800;
          const chartHeight = 300;
          const padding = { top: 40, right: 40, bottom: 60, left: 60 };
          const graphWidth = chartWidth - padding.left - padding.right;
          const graphHeight = chartHeight - padding.top - padding.bottom;
          const maxRevenue = Math.max(...dailyData.map((d: any) => d.revenue), 1);
          const minRevenue = Math.min(...dailyData.map((d: any) => d.revenue), 0);
          const revenueRange = maxRevenue - minRevenue || 1;
          const yTicks = 5;
          const yStep = revenueRange / yTicks;
          const yValues = Array.from({ length: yTicks + 1 }, (_, i) => minRevenue + (yStep * i));
          const barWidth = graphWidth / dailyData.length * 0.7;
          const barSpacing = graphWidth / dailyData.length;
          const getVisibleIndices = () => {
            const total = dailyData.length;
            if (total <= 7) return Array.from({ length: total }, (_, i) => i);
            if (total <= 30) {
              const step = Math.max(1, Math.floor(total / 7));
              const indices: number[] = [];
              for (let i = 0; i < total; i += step) {
                indices.push(i);
              }
              if (indices[indices.length - 1] !== total - 1) {
                indices.push(total - 1);
              }
              return indices;
            }
            const step = Math.max(1, Math.floor(total / 12));
            const indices: number[] = [];
            for (let i = 0; i < total; i += step) {
              indices.push(i);
            }
            if (indices[indices.length - 1] !== total - 1) {
              indices.push(total - 1);
            }
            return indices;
          };
          const formatDate = (dateStr: string) => {
            const date = new Date(dateStr);
            if (period <= 7) {
              return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
            } else if (period <= 30) {
              return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
            } else {
              return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
            }
          };
          const getBarHeight = (revenue: number) => {
            return ((revenue - minRevenue) / revenueRange) * graphHeight;
          };
          const getBarX = (index: number) => {
            return padding.left + (index * barSpacing) + (barSpacing - barWidth) / 2;
          };
          return (
            <div className="relative">
              <svg
                ref={svgRef}
                width={chartWidth}
                height={chartHeight}
                className="w-full h-auto"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
                  </linearGradient>
                  <filter id="shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
                  </filter>
                </defs>
                {yValues.map((value, i) => {
                  const y = padding.top + graphHeight - (i * (graphHeight / yTicks));
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + graphWidth}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                      <text
                        x={padding.left - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="12"
                        fill="#6b7280"
                      >
                        {value.toFixed(0)}€
                      </text>
                    </g>
                  );
                })}
                {dailyData.map((day: any, index: number) => {
                  const barHeight = getBarHeight(day.revenue);
                  const barX = getBarX(index);
                  const barY = padding.top + graphHeight - barHeight;
                  const isHovered = hoveredIndex === index;
                  return (
                    <g key={index}>
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        fill={isHovered ? "#2563eb" : "url(#barGradient)"}
                        rx="4"
                        filter={isHovered ? "url(#shadow)" : "none"}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        style={{ transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)', transformOrigin: 'bottom' }}
                      />
                      {(() => {
                        const visibleIndices = getVisibleIndices();
                        if (!visibleIndices.includes(index)) return null;
                        return (
                          <text
                            x={barX + barWidth / 2}
                            y={chartHeight - padding.bottom + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#6b7280"
                            transform={`rotate(-45 ${barX + barWidth / 2} ${chartHeight - padding.bottom + 20})`}
                          >
                            {formatDate(day.date)}
                          </text>
                        );
                      })()}
                      {isHovered && (
                        <g>
                          <rect
                            x={barX + barWidth / 2 - 40}
                            y={barY - 35}
                            width="80"
                            height="28"
                            fill="#1f2937"
                            rx="4"
                          />
                          <text
                            x={barX + barWidth / 2}
                            y={barY - 15}
                            textAnchor="middle"
                            fontSize="12"
                            fill="#fff"
                            fontWeight="600"
                          >
                            {day.revenue.toFixed(2)} €
                          </text>
                          <polygon
                            points={`${barX + barWidth / 2 - 6},${barY - 7} ${barX + barWidth / 2 + 6},${barY - 7} ${barX + barWidth / 2},${barY}`}
                            fill="#1f2937"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
                <line
                  x1={padding.left}
                  y1={padding.top + graphHeight}
                  x2={padding.left + graphWidth}
                  y2={padding.top + graphHeight}
                  stroke="#374151"
                  strokeWidth="2"
                />
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={padding.top + graphHeight}
                  stroke="#374151"
                  strokeWidth="2"
                />
              </svg>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
export default AdminAdvancedStats;
