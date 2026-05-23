import React, { useState, useEffect, useRef } from 'react';
import { FaDownload } from 'react-icons/fa';
import { getApiUrl, adminFetch } from '../../utils/security';
function AdminAdvancedStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
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
      {/* KPI cumulés — toujours flatteurs car ils ne reculent pas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">Chiffre d'affaires total</p>
          <p className="text-3xl font-bold text-green-600">
            {(stats?.revenue?.total ?? 0).toFixed(2)} €
          </p>
          <p className="text-xs text-gray-400 mt-1">Depuis l'ouverture</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">Commandes payées</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.orders?.total ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Total cumulé</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">Panier moyen</p>
          <p className="text-3xl font-bold text-purple-600">
            {(stats?.averageBasket ?? 0).toFixed(2)} €
          </p>
          <p className="text-xs text-gray-400 mt-1">Par commande payée</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-2">Meilleure journée</p>
          {stats?.bestDay ? (
            <>
              <p className="text-3xl font-bold text-indigo-600">
                {Number(stats.bestDay.revenue ?? 0).toFixed(2)} €
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(stats.bestDay.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-1">À venir</p>
            </>
          )}
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
          const hasRevenue = dailyData.some((d: any) => Number(d.revenue) > 0);
          if (dailyData.length === 0 || !hasRevenue) {
            return (
              <div className="h-80 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="text-5xl mb-3">📊</div>
                <p className="text-sm font-medium text-gray-600">Pas encore de ventes sur cette période</p>
                <p className="text-xs text-gray-400 mt-1">Le graphique s'affichera dès la première commande payée</p>
              </div>
            );
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

      {/* Top 5 produits vendus */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Top 5 des produits les plus vendus</h2>
        {(() => {
          const top = (stats?.topProducts || []) as Array<{ name: string; quantity: number; revenue: number }>;
          if (top.length === 0) {
            return (
              <div className="py-8 text-center text-gray-400">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-sm">Les produits stars apparaîtront ici dès vos premières ventes</p>
              </div>
            );
          }
          const maxQty = Math.max(...top.map(p => p.quantity), 1);
          return (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={`${p.name}-${i}`} className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-200 text-gray-700' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-medium text-gray-900 truncate pr-2">{p.name}</p>
                      <p className="text-sm font-semibold text-green-600 whitespace-nowrap">{p.revenue.toFixed(2)} €</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                          style={{ width: `${(p.quantity / maxQty) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {p.quantity} vendu{p.quantity > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
export default AdminAdvancedStats;
