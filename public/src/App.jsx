import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

const MoreacashbackDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [filter, setFilter] = useState({ dt: 'All', zone: 'All', shopType: 'All' });

  // JSON URL from SharePoint (Power Automate exports here)
  const JSON_URL = 'https://moreakorea-my.sharepoint.com/personal/zany_ra_moreakorea_onmicrosoft_com/_api/web/GetFileByServerRelativeUrl(\'/personal/zany_ra_moreakorea_onmicrosoft_com/Documents/Cashboard Dashboard Project/Dashboard/cashback-mtd-latest.json\')/$value';

  // Fetch data every 5 minutes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(JSON_URL, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const jsonData = await response.json();
        setData(jsonData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback: use mock data for demo
        setData(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Filter stores based on selected DT, Zone, Shop Type
  const getFilteredStores = () => {
    if (!data || !data.stores) return [];
    return data.stores.filter(store => {
      const dtMatch = filter.dt === 'All' || store.dt_code === filter.dt;
      const zoneMatch = filter.zone === 'All' || store.zone_code === filter.zone;
      const shopTypeMatch = filter.shopType === 'All' || store.shop_type === filter.shopType;
      return dtMatch && zoneMatch && shopTypeMatch;
    });
  };

  const filteredStores = getFilteredStores();

  // Segment stores by achievement
  const getSegmentedStores = () => {
    return {
      achieved: filteredStores.filter(s => (s.mtd_purchase / s.monthly_target) >= 1.0),
      close: filteredStores.filter(s => {
        const ach = s.mtd_purchase / s.monthly_target;
        return ach >= 0.8 && ach < 1.0;
      }),
      mid: filteredStores.filter(s => {
        const ach = s.mtd_purchase / s.monthly_target;
        return ach >= 0.5 && ach < 0.8;
      }),
      low: filteredStores.filter(s => {
        const ach = s.mtd_purchase / s.monthly_target;
        return ach >= 0.0 && ach < 0.5;
      }),
      notStarted: filteredStores.filter(s => s.mtd_purchase === 0)
    };
  };

  const segments = getSegmentedStores();

  // Prepare chart data
  const byDTData = data?.by_dt ? Object.entries(data.by_dt).map(([dt, stores]) => ({
    name: dt,
    achievement: stores.reduce((sum, s) => sum + s.mtd_purchase, 0) / stores.reduce((sum, s) => sum + s.monthly_target, 0) * 100
  })) : [];

  const segmentData = [
    { name: 'Achieved (100%+)', value: segments.achieved.length, color: '#27AE60' },
    { name: 'Close (80-99%)', value: segments.close.length, color: '#F39C12' },
    { name: 'Mid (50-79%)', value: segments.mid.length, color: '#E67E22' },
    { name: 'Low (1-49%)', value: segments.low.length, color: '#E74C3C' },
    { name: 'Not Started (0%)', value: segments.notStarted.length, color: '#95A5A6' }
  ];

  if (loading && !data) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>🔄 Loading Morea Cashback Dashboard...</h1>
        </header>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-top">
          <h1>📊 Morea Cashback 1% – Month-to-Date Achievement</h1>
          <p className="last-updated">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</p>
        </div>
      </header>

      {/* Summary Metrics */}
      <section className="metrics-row">
        <div className="metric-card">
          <span className="metric-label">Total Outlets</span>
          <span className="metric-value">{data?.summary?.total_outlets || 0}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Monthly Target</span>
          <span className="metric-value">${(data?.summary?.total_target || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">MTD Purchase</span>
          <span className="metric-value">${(data?.summary?.total_mtd_purchase || 0).toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
        </div>
        <div className="metric-card highlight">
          <span className="metric-label">Overall Achievement</span>
          <span className="metric-value">{(data?.summary?.overall_achievement_pct * 100).toFixed(1)}%</span>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📈 Summary
        </button>
        <button
          className={`tab ${activeTab === 'stores' ? 'active' : ''}`}
          onClick={() => setActiveTab('stores')}
        >
          🏪 Store List
        </button>
        <button
          className={`tab ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          ✅ Action Plan
        </button>
      </nav>

      {/* Filters */}
      <section className="filters-section">
        <label>
          DT: 
          <select value={filter.dt} onChange={(e) => setFilter({...filter, dt: e.target.value})}>
            <option>All</option>
            {[...new Set(data?.stores?.map(s => s.dt_code) || [])].sort().map(dt => (
              <option key={dt} value={dt}>{dt}</option>
            ))}
          </select>
        </label>
        <label>
          Zone: 
          <select value={filter.zone} onChange={(e) => setFilter({...filter, zone: e.target.value})}>
            <option>All</option>
            {[...new Set(data?.stores?.map(s => s.zone_code) || [])].sort().map(zone => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </label>
        <label>
          Shop Type: 
          <select value={filter.shopType} onChange={(e) => setFilter({...filter, shopType: e.target.value})}>
            <option>All</option>
            {[...new Set(data?.stores?.map(s => s.shop_type) || [])].sort().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </section>

      {/* Content by Tab */}
      {activeTab === 'summary' && (
        <section className="content-section">
          <h2>Achievement Breakdown</h2>
          <div className="charts-grid">
            {/* Achievement by DT */}
            <div className="chart-container">
              <h3>Achievement by DT</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byDTData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Achievement %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="achievement" fill="#1F3864" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Segment Pie Chart */}
            <div className="chart-container">
              <h3>Store Segment Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={segmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'stores' && (
        <section className="content-section">
          <h2>Store Achievement List ({filteredStores.length} stores)</h2>
          <div className="store-list">
            {filteredStores.map((store, idx) => {
              const ach = (store.mtd_purchase / store.monthly_target) * 100;
              const segmentColor = 
                ach >= 100 ? '#27AE60' :
                ach >= 80 ? '#F39C12' :
                ach >= 50 ? '#E67E22' :
                ach > 0 ? '#E74C3C' : '#95A5A6';
              
              return (
                <div key={idx} className="store-row" style={{borderLeftColor: segmentColor}}>
                  <div className="store-info">
                    <strong>{store.store_code}</strong> - {store.store_name}
                    <br/>
                    <small>{store.zone_code} | {store.shop_type}</small>
                  </div>
                  <div className="store-metrics">
                    <span className="store-target">Target: ${store.monthly_target.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                    <span className="store-purchase">Purchase: ${store.mtd_purchase.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                    <span className="store-achievement" style={{backgroundColor: segmentColor}}>
                      {ach.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'actions' && (
        <section className="content-section">
          <h2>Action Plan by Segment</h2>
          
          {/* Achieved */}
          <div className="segment-section achieved">
            <h3>✅ Achieved (100%+)</h3>
            <p className="segment-count">{segments.achieved.length} stores</p>
            <div className="action-list">
              {segments.achieved.map((store, idx) => (
                <div key={idx} className="action-item">
                  <strong>{store.store_code}</strong> - {store.store_name} ({((store.mtd_purchase / store.monthly_target) * 100).toFixed(1)}%)
                  <div className="action-text">Action: Maintain momentum. Upsell opportunity.</div>
                </div>
              ))}
            </div>
          </div>

          {/* Close */}
          <div className="segment-section close">
            <h3>🎯 Close (80-99%)</h3>
            <p className="segment-count">{segments.close.length} stores</p>
            <div className="action-list">
              {segments.close.map((store, idx) => (
                <div key={idx} className="action-item">
                  <strong>{store.store_code}</strong> - {store.store_name} ({((store.mtd_purchase / store.monthly_target) * 100).toFixed(1)}%)
                  <div className="action-text">Action: Final push to 100%. Contact manager. Small promotional offer.</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mid */}
          <div className="segment-section mid">
            <h3>📊 Mid (50-79%)</h3>
            <p className="segment-count">{segments.mid.length} stores</p>
            <div className="action-list">
              {segments.mid.map((store, idx) => (
                <div key={idx} className="action-item">
                  <strong>{store.store_code}</strong> - {store.store_name} ({((store.mtd_purchase / store.monthly_target) * 100).toFixed(1)}%)
                  <div className="action-text">Action: Schedule visit. Identify barriers. Increase frequency of calls.</div>
                </div>
              ))}
            </div>
          </div>

          {/* Low */}
          <div className="segment-section low">
            <h3>⚠️ Low (1-49%)</h3>
            <p className="segment-count">{segments.low.length} stores</p>
            <div className="action-list">
              {segments.low.map((store, idx) => (
                <div key={idx} className="action-item">
                  <strong>{store.store_code}</strong> - {store.store_name} ({((store.mtd_purchase / store.monthly_target) * 100).toFixed(1)}%)
                  <div className="action-text">Action: Urgent visit. Offer demo/tasting. Remove barriers to purchase.</div>
                </div>
              ))}
            </div>
          </div>

          {/* Not Started */}
          <div className="segment-section notstarted">
            <h3>🆘 Not Started (0%)</h3>
            <p className="segment-count">{segments.notStarted.length} stores</p>
            <div className="action-list">
              {segments.notStarted.map((store, idx) => (
                <div key={idx} className="action-item">
                  <strong>{store.store_code}</strong> - {store.store_name}
                  <div className="action-text">Action: Immediate intervention. Reassess account. Consider alternative channel.</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Morea Cashback Dashboard | Real-time data from Admin Report | Refresh every 5 minutes</p>
        <p>© DREXPRESS LOGISTIC CO., LTD</p>
      </footer>
    </div>
  );
};

// Mock data for demo/fallback
const getMockData = () => ({
  timestamp: new Date().toISOString(),
  month: '2026-10',
  summary: {
    total_outlets: 350,
    total_target: 1500000,
    total_mtd_purchase: 1125000,
    overall_achievement_pct: 0.75
  },
  stores: [
    { store_code: '00001', store_name: 'Store A', dt_code: '043', zone_code: 'ZONE1', shop_type: 'Wholesale', monthly_target: 5000, mtd_purchase: 5500 },
    { store_code: '00002', store_name: 'Store B', dt_code: '043', zone_code: 'ZONE1', shop_type: 'Retail', monthly_target: 3000, mtd_purchase: 2400 },
    { store_code: '00003', store_name: 'Store C', dt_code: '044', zone_code: 'ZONE2', shop_type: 'Wholesale', monthly_target: 4000, mtd_purchase: 3200 }
  ]
});

export default MoreaashboardDashboard;
