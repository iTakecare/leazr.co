import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

export interface PDFMonthlyData {
  month: string;
  ca: number;
  caLeasing: number;
  selfLeasing: number;
  directSales: number;
  achats: number;
  marge: number;
  margePercent: number;
  creditNotes: number;
}

export interface PDFContractStats {
  status: string;
  count: number;
  total_revenue: number;
  total_purchases: number;
  total_margin: number;
}

export interface PDFOverdueInvoices {
  overdue_count: number;
  overdue_amount: number;
}

export interface PDFYearData {
  year: number;
  monthlyData: PDFMonthlyData[];
  totals: {
    ca: number; caLeasing: number; selfLeasing: number;
    directSales: number; achats: number; marge: number; creditNotes: number;
  };
  moyennes: {
    ca: number; caLeasing: number; selfLeasing: number;
    directSales: number; achats: number; marge: number; margePercent: number;
  };
  contractStats: {
    realized?: PDFContractStats;
    pending?: PDFContractStats;
    refused?: PDFContractStats;
    directSales?: PDFContractStats;
  };
  overdueInvoices: PDFOverdueInvoices;
}

export interface PDFSections {
  kpiCards: boolean;
  monthlyTable: boolean;
  statusStats: boolean;
  overdueInvoices: boolean;
}

export interface PDFCharts {
  barRevenueMargin: boolean;
  lineMarginPercent: boolean;
  pieRevenue: boolean;
  stackedBarType: boolean;
}

interface DashboardPDFContentProps {
  yearsData: PDFYearData[];
  sections: PDFSections;
  charts: PDFCharts;
  companyName?: string;
}

const COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const YEAR_COLORS = ['#2563eb', '#ef4444', '#10b981', '#f59e0b'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

const DashboardPDFContent = React.forwardRef<HTMLDivElement, DashboardPDFContentProps>(
  ({ yearsData, sections, charts, companyName }, ref) => {
    const primaryYear = yearsData[0];
    if (!primaryYear) return null;

    const yearLabels = yearsData.map(y => y.year).join(' / ');
    const isMultiYear = yearsData.length > 1;

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute', left: '-9999px', top: 0,
          width: '1100px', backgroundColor: '#ffffff', color: '#1e293b',
          fontFamily: 'system-ui, -apple-system, sans-serif', padding: '40px',
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: '3px solid #2563eb', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Rapport Financier — {yearLabels}
          </h1>
          {companyName && (
            <p style={{ fontSize: '16px', color: '#64748b', margin: '8px 0 0' }}>{companyName}</p>
          )}
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
            Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPI Cards */}
        {sections.kpiCards && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Indicateurs Clés {isMultiYear ? `(${primaryYear.year})` : ''}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'CA Total', value: formatCurrency(primaryYear.totals.ca), color: '#2563eb' },
                { label: 'Achats Total', value: formatCurrency(primaryYear.totals.achats), color: '#f59e0b' },
                { label: 'Marge Brute', value: formatCurrency(primaryYear.totals.marge), color: '#10b981' },
                { label: 'Taux de Marge', value: `${primaryYear.moyennes.margePercent.toFixed(2)}%`, color: '#8b5cf6' },
              ].map((kpi, i) => (
                <div key={i} style={{
                  border: `2px solid ${kpi.color}20`, borderRadius: '8px', padding: '16px',
                  backgroundColor: `${kpi.color}08`,
                }}>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{kpi.label}</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 0', color: kpi.color }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Multi-year KPI comparison */}
            {isMultiYear && yearsData.slice(1).map(yd => (
              <div key={yd.year} style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{yd.year}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {[
                    { label: 'CA Total', value: formatCurrency(yd.totals.ca) },
                    { label: 'Achats Total', value: formatCurrency(yd.totals.achats) },
                    { label: 'Marge Brute', value: formatCurrency(yd.totals.marge) },
                    { label: 'Taux de Marge', value: `${yd.moyennes.margePercent.toFixed(2)}%` },
                  ].map((kpi, i) => (
                    <div key={i} style={{
                      border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px',
                      backgroundColor: '#f8fafc',
                    }}>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{kpi.label}</p>
                      <p style={{ fontSize: '18px', fontWeight: 600, margin: '2px 0 0', color: '#334155' }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monthly Table */}
        {sections.monthlyTable && yearsData.map(yd => (
          <div key={yd.year} style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Tableau Mensuel {yd.year}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  {['Mois', 'CA total', 'CA Leasing', 'Self-Leasing', 'Ventes Dir.', 'Achats', 'Marge', 'Marge %'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Mois' ? 'left' : 'right', borderBottom: '2px solid #cbd5e1', fontWeight: 600, color: '#475569' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yd.monthlyData.map((m, i) => (
                  <tr key={m.month} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0' }}>{m.month}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatCurrency(m.ca)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#2563eb' }}>{formatCurrency(m.caLeasing)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#6366f1' }}>{formatCurrency(m.selfLeasing)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#06b6d4' }}>{formatCurrency(m.directSales)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{formatCurrency(m.achats)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#10b981', fontWeight: 600 }}>{formatCurrency(m.marge)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#10b981', fontWeight: 600 }}>{m.margePercent.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                  <td style={{ padding: '8px 10px' }}>TOTAL</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(yd.totals.ca)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#2563eb' }}>{formatCurrency(yd.totals.caLeasing)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6366f1' }}>{formatCurrency(yd.totals.selfLeasing)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#06b6d4' }}>{formatCurrency(yd.totals.directSales)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(yd.totals.achats)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(yd.totals.marge)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#10b981' }}>{yd.moyennes.margePercent.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Charts */}
        {charts.barRevenueMargin && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              CA vs Achats vs Marge
            </h2>
            {isMultiYear ? (
              // Multi-year: grouped bars per year
              yearsData.map((yd, yi) => (
                <div key={yd.year} style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>{yd.year}</p>
                  <BarChart width={1020} height={280} data={yd.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="ca" name="CA" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="achats" name="Achats" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="marge" name="Marge" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </div>
              ))
            ) : (
              <BarChart width={1020} height={320} data={primaryYear.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="ca" name="CA" fill="#2563eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="achats" name="Achats" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="marge" name="Marge" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </div>
        )}

        {charts.lineMarginPercent && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Évolution du Taux de Marge (%)
            </h2>
            <LineChart width={1020} height={300} data={primaryYear.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} unit="%" />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend />
              {yearsData.map((yd, i) => (
                <Line
                  key={yd.year}
                  data={yd.monthlyData}
                  type="monotone"
                  dataKey="margePercent"
                  name={`Marge % ${yd.year}`}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </div>
        )}

        {charts.pieRevenue && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Répartition du CA {isMultiYear ? `(${primaryYear.year})` : ''}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <PieChart width={400} height={300}>
                <Pie
                  data={[
                    { name: 'Leasing', value: primaryYear.totals.caLeasing },
                    { name: 'Self-Leasing', value: primaryYear.totals.selfLeasing },
                    { name: 'Ventes Directes', value: primaryYear.totals.directSales },
                  ].filter(d => d.value > 0)}
                  cx={200} cy={150} outerRadius={120}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {[0, 1, 2].map((_, i) => (
                    <Cell key={i} fill={['#2563eb', '#8b5cf6', '#06b6d4'][i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
              <div style={{ fontSize: '14px' }}>
                {[
                  { label: 'Leasing', value: primaryYear.totals.caLeasing, color: '#2563eb' },
                  { label: 'Self-Leasing', value: primaryYear.totals.selfLeasing, color: '#8b5cf6' },
                  { label: 'Ventes Directes', value: primaryYear.totals.directSales, color: '#06b6d4' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: item.color }} />
                    <span>{item.label}: <strong>{formatCurrency(item.value)}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {charts.stackedBarType && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              CA par Type (empilé) {isMultiYear ? `(${primaryYear.year})` : ''}
            </h2>
            <BarChart width={1020} height={320} data={primaryYear.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="caLeasing" name="Leasing" stackId="a" fill="#2563eb" />
              <Bar dataKey="selfLeasing" name="Self-Leasing" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="directSales" name="Ventes Directes" stackId="a" fill="#06b6d4" radius={[3, 3, 0, 0]} />
            </BarChart>
          </div>
        )}

        {/* Status Stats */}
        {sections.statusStats && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Statistiques par Statut {isMultiYear ? `(${primaryYear.year})` : ''}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'Réalisés', data: primaryYear.contractStats.realized, color: '#10b981', borderColor: '#10b981' },
                { label: 'En Attente', data: primaryYear.contractStats.pending, color: '#f59e0b', borderColor: '#f59e0b' },
                { label: 'Refusés', data: primaryYear.contractStats.refused, color: '#ef4444', borderColor: '#ef4444' },
                { label: 'Ventes Directes', data: primaryYear.contractStats.directSales, color: '#06b6d4', borderColor: '#06b6d4' },
              ].map(stat => (
                <div key={stat.label} style={{
                  border: `1px solid ${stat.borderColor}40`, borderLeft: `4px solid ${stat.borderColor}`,
                  borderRadius: '8px', padding: '16px', backgroundColor: `${stat.color}08`,
                }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: stat.color, margin: '0 0 8px' }}>{stat.label}</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px', color: '#0f172a' }}>{stat.data?.count || 0}</p>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    <p style={{ margin: '2px 0' }}>CA: {formatCurrency(stat.data?.total_revenue || 0)}</p>
                    <p style={{ margin: '2px 0' }}>Achats: {formatCurrency(stat.data?.total_purchases || 0)}</p>
                    <p style={{ margin: '2px 0', fontWeight: 600, color: stat.color }}>
                      Marge: {formatCurrency(stat.data?.total_margin || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Invoices */}
        {sections.overdueInvoices && (
          <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>
              Factures en Attente de Paiement
            </h2>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '400px',
            }}>
              <div style={{ border: '1px solid #fb923c40', borderRadius: '8px', padding: '16px', backgroundColor: '#fff7ed', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#9a3412', margin: 0 }}>Nombre</p>
                <p style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0 0', color: '#c2410c' }}>{primaryYear.overdueInvoices.overdue_count}</p>
              </div>
              <div style={{ border: '1px solid #fb923c40', borderRadius: '8px', padding: '16px', backgroundColor: '#fff7ed', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#9a3412', margin: 0 }}>Montant dû</p>
                <p style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0 0', color: '#c2410c' }}>{formatCurrency(primaryYear.overdueInvoices.overdue_amount)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '40px', fontSize: '11px', color: '#94a3b8' }}>
          <p style={{ margin: 0 }}>
            {companyName} — Rapport financier confidentiel — {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    );
  }
);

DashboardPDFContent.displayName = 'DashboardPDFContent';

export default DashboardPDFContent;
