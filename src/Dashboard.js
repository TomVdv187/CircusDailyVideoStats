import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { TrendingUp, Target, Lightbulb, CheckCircle, AlertTriangle, Award, Eye, Clock, Users, Upload, PlayCircle, Percent } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState({ sudinfo: false, video: false });
  const [activeTab, setActiveTab] = useState('overview');

  const handleFileUpload = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'array' });
      
      if (fileType === 'sudinfo') {
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        window.sudinfoData = jsonData;
        setUploading(prev => ({ ...prev, sudinfo: true }));
      } else {
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets["Raw data"]);
        window.videoData = jsonData;
        setUploading(prev => ({ ...prev, video: true }));
      }

      if (window.sudinfoData && window.videoData) {
        processData();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processData = () => {
    const sudinfoData = window.sudinfoData;
    const videoRawData = window.videoData;
    const circusData = videoRawData.filter(row => row.catalogue === "Circus Daily");

    const sportKeywords = ['football', 'sport', 'match', 'standard', 'anderlecht', 'charleroi', 'pro league', 
                           'champions', 'coupe', 'playoff', 'rouches', 'vestiaire', 'transfert', 'diables', 'goal'];

    const sudinfoSportVideos = sudinfoData.filter(row => {
      const title = (row.video || '').toLowerCase();
      return sportKeywords.some(keyword => title.includes(keyword));
    });

    const monthlyStats = _.chain(circusData)
      .filter(row => row.jour)
      .map(row => ({ ...row, month: new Date(row.jour).toISOString().substring(0, 7) }))
      .groupBy('month')
      .map((videos, month) => ({
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        videoCount: videos.length,
        totalStreams: _.sumBy(videos, 'Streams'),
        avgStreamsPerVideo: _.sumBy(videos, 'Streams') / videos.length,
        comp25: _.meanBy(videos, v => v['Complétion Vidéo 25%'] || 0),
        comp50: _.meanBy(videos, v => v['Complétion Vidéo 50%'] || 0),
        comp75: _.meanBy(videos, v => v['Complétion Vidéo 75%'] || 0),
        comp100: _.meanBy(videos, v => v['Complétion Vidéo 100%'] || 0)
      }))
      .sortBy('month')
      .value();

    const calcStats = (dataSet) => {
      const totalStreams = _.sumBy(dataSet, 'Streams') || 0;
      const count = dataSet.length || 1;
      
      return {
        count: dataSet.length,
        totalStreams,
        avgStreamsPerVideo: totalStreams / count,
        comp25: _.meanBy(dataSet, row => row['Complétion Vidéo 25%'] || 0),
        comp50: _.meanBy(dataSet, row => row['Complétion Vidéo 50%'] || 0),
        comp75: _.meanBy(dataSet, row => row['Complétion Vidéo 75%'] || 0),
        comp100: _.meanBy(dataSet, row => row['Complétion Vidéo 100%'] || 0),
        avgCompletionRate: _.meanBy(dataSet, row => row['Taux de complétion moyen (%)'] || 0),
        avgViewTime: _.meanBy(dataSet, row => row['Average viewing time (m)'] || 0)
      };
    };

    const circusStats = calcStats(circusData);
    const sudinfoSportStats = calcStats(sudinfoSportVideos);

    const circusFunnel = [
      { stage: 'Start', circus: 100, sudinfo: 100 },
      { stage: '25%', circus: circusStats.comp25, sudinfo: sudinfoSportStats.comp25 },
      { stage: '50%', circus: circusStats.comp50, sudinfo: sudinfoSportStats.comp50 },
      { stage: '75%', circus: circusStats.comp75, sudinfo: sudinfoSportStats.comp75 },
      { stage: '100%', circus: circusStats.comp100, sudinfo: sudinfoSportStats.comp100 }
    ];

    const circusDropoff = [
      { stage: 'Start-25%', dropoff: 100 - circusStats.comp25 },
      { stage: '25-50%', dropoff: circusStats.comp25 - circusStats.comp50 },
      { stage: '50-75%', dropoff: circusStats.comp50 - circusStats.comp75 },
      { stage: '75-100%', dropoff: circusStats.comp75 - circusStats.comp100 }
    ];

    const sudinfoDropoff = [
      { stage: 'Start-25%', dropoff: 100 - sudinfoSportStats.comp25 },
      { stage: '25-50%', dropoff: sudinfoSportStats.comp25 - sudinfoSportStats.comp50 },
      { stage: '50-75%', dropoff: sudinfoSportStats.comp50 - sudinfoSportStats.comp75 },
      { stage: '75-100%', dropoff: sudinfoSportStats.comp75 - sudinfoSportStats.comp100 }
    ];

    setData({
      circusData,
      sudinfoSportVideos,
      monthlyStats,
      circusStats,
      sudinfoSportStats,
      circusFunnel,
      circusDropoff,
      sudinfoDropoff,
      topCircus: _.take(_.orderBy(circusData, 'Streams', 'desc'), 15),
      topSudinfoSport: _.take(_.orderBy(sudinfoSportVideos, 'Streams', 'desc'), 10)
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-2xl w-full bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Upload className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-white mb-2">Circus Daily Analysis</h2>
            <p className="text-white opacity-75">Upload both Excel files to begin</p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white bg-opacity-5 rounded-xl p-6 border-2 border-red-500">
              <label className="block text-white font-semibold mb-3">1. Sudinfo File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'sudinfo')}
                className="w-full text-white file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 file:cursor-pointer"
              />
              {uploading.sudinfo && <div className="mt-3 text-red-400 flex items-center gap-2"><CheckCircle className="w-5 h-5" />Loaded</div>}
            </div>

            <div className="bg-white bg-opacity-5 rounded-xl p-6 border-2 border-slate-500">
              <label className="block text-white font-semibold mb-3">2. Circus Daily File</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'video')}
                className="w-full text-white file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-800 file:cursor-pointer"
              />
              {uploading.video && <div className="mt-3 text-red-400 flex items-center gap-2"><CheckCircle className="w-5 h-5" />Loaded</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const performanceGap = ((data.sudinfoSportStats.avgStreamsPerVideo - data.circusStats.avgStreamsPerVideo) / data.circusStats.avgStreamsPerVideo * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
          <h1 className="text-5xl font-black text-white mb-2">Circus Daily Sports</h1>
          <p className="text-xl text-white opacity-90">Performance Analysis vs Sudinfo Sport</p>
          <div className="flex gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="text-white text-sm">Videos</div>
              <div className="text-white font-bold">{data.circusStats.count} Circus | {data.sudinfoSportStats.count} Sudinfo</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          {['overview', 'completion', 'evolution', 'improvements'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-red-600 text-white shadow-lg' 
                  : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="rounded-2xl bg-gradient-to-br from-red-500 to-red-700 p-6 shadow-2xl border-2 border-red-400">
                <Eye className="w-12 h-12 text-white opacity-30 mb-2" />
                <div className="text-red-100 text-sm mb-2 font-semibold">Total Videos</div>
                <div className="text-5xl font-black text-white">{data.circusStats.count}</div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 p-6 shadow-2xl border-2 border-slate-500">
                <Users className="w-12 h-12 text-white opacity-30 mb-2" />
                <div className="text-slate-200 text-sm mb-2 font-semibold">Total Streams</div>
                <div className="text-5xl font-black text-white">{Math.round(data.circusStats.totalStreams / 1000)}K</div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-red-600 to-red-800 p-6 shadow-2xl border-2 border-red-400">
                <Target className="w-12 h-12 text-white opacity-30 mb-2" />
                <div className="text-red-100 text-sm mb-2 font-semibold">Completion</div>
                <div className="text-5xl font-black text-white">{data.circusStats.comp100.toFixed(1)}%</div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-6 shadow-2xl border-2 border-slate-600">
                <Clock className="w-12 h-12 text-white opacity-30 mb-2" />
                <div className="text-slate-200 text-sm mb-2 font-semibold">View Time</div>
                <div className="text-5xl font-black text-white">{data.circusStats.avgViewTime.toFixed(1)}m</div>
              </div>
            </div>

            <div className="mb-8 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 shadow-2xl border-2 border-red-400">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-12 h-12 text-white" />
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-2">Performance Gap</h3>
                  <p className="text-lg mb-4">Sudinfo Sport gets <span className="font-black">{performanceGap.toFixed(0)}% MORE</span> streams per video!</p>
                  <div className="flex gap-4">
                    <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                      <div className="text-sm">Circus</div>
                      <div className="text-2xl font-bold">{Math.round(data.circusStats.avgStreamsPerVideo)}</div>
                    </div>
                    <div className="text-3xl">→</div>
                    <div className="bg-white bg-opacity-30 rounded-lg px-4 py-2">
                      <div className="text-sm">Sudinfo</div>
                      <div className="text-2xl font-bold">{Math.round(data.sudinfoSportStats.avgStreamsPerVideo)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Metrics Comparison</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Streams/Video', c: Math.round(data.circusStats.avgStreamsPerVideo), s: Math.round(data.sudinfoSportStats.avgStreamsPerVideo) },
                    { label: '100% Completion', c: data.circusStats.comp100.toFixed(1) + '%', s: data.sudinfoSportStats.comp100.toFixed(1) + '%' },
                    { label: 'View Time', c: data.circusStats.avgViewTime.toFixed(2) + 'm', s: data.sudinfoSportStats.avgViewTime.toFixed(2) + 'm' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white bg-opacity-5 rounded-xl p-4">
                      <div className="text-white text-sm mb-2 opacity-75">{item.label}</div>
                      <div className="flex justify-between">
                        <div>
                          <div className="text-blue-400 text-xs">Circus</div>
                          <div className="text-white text-2xl font-bold">{item.c}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 text-xs">Sudinfo</div>
                          <div className="text-white text-2xl font-bold">{item.s}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Percent className="w-6 h-6" />
                  Viewing Checkpoints
                </h2>
                <div className="space-y-3">
                  {[
                    { label: '25% Watched', c: data.circusStats.comp25, s: data.sudinfoSportStats.comp25, color: 'from-green-500 to-green-600' },
                    { label: '50% Watched', c: data.circusStats.comp50, s: data.sudinfoSportStats.comp50, color: 'from-blue-500 to-blue-600' },
                    { label: '75% Watched', c: data.circusStats.comp75, s: data.sudinfoSportStats.comp75, color: 'from-purple-500 to-purple-600' },
                    { label: '100% Completed', c: data.circusStats.comp100, s: data.sudinfoSportStats.comp100, color: 'from-pink-500 to-red-600' }
                  ].map((item, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${item.color} rounded-lg p-4`}>
                      <div className="flex justify-between text-white">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-2xl font-black">{item.c.toFixed(1)}%</span>
                      </div>
                      <div className="text-white text-xs mt-1 opacity-75">Sudinfo: {item.s.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-blue-800 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Top 15 Circus Daily</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.topCircus.map((v, i) => (
                    <div key={i} className="bg-white bg-opacity-10 rounded-lg p-3 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-white text-sm mb-1">{v.video?.substring(0, 60)}...</div>
                        <span className="text-blue-200 text-xs">{v.Streams?.toLocaleString()} streams</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-red-900 to-red-800 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Top 10 Sudinfo Sport</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.topSudinfoSport.map((v, i) => (
                    <div key={i} className="bg-white bg-opacity-10 rounded-lg p-3 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-white text-sm mb-1">{v.video?.substring(0, 60)}...</div>
                        <span className="text-red-200 text-xs">{v.Streams?.toLocaleString()} streams</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'completion' && (
          <>
            <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl mb-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <PlayCircle className="w-8 h-8" />
                Viewer Completion Funnel
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.circusFunnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="stage" stroke="#fff" />
                  <YAxis stroke="#fff" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="circus" stroke="#3b82f6" strokeWidth={4} name="Circus Daily" />
                  <Line type="monotone" dataKey="sudinfo" stroke="#ef4444" strokeWidth={4} name="Sudinfo Sport" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Circus Daily Drop-off</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.circusDropoff}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="stage" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="dropoff" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Sudinfo Sport Drop-off</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.sudinfoDropoff}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="stage" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="dropoff" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {activeTab === 'evolution' && (
          <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-6">Monthly Evolution</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data.monthlyStats}>
                <defs>
                  <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="monthLabel" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="totalStreams" stroke="#3b82f6" fill="url(#colorStreams)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'improvements' && (
          <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-8 shadow-2xl">
            <h2 className="text-4xl font-bold text-white mb-6">Strategic Recommendations</h2>
            <div className="space-y-4 text-white">
              <div className="bg-white bg-opacity-20 rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">1. Boost Streams per Video</h3>
                <p className="mb-2">Target: {Math.round(data.sudinfoSportStats.avgStreamsPerVideo)} (Current: {Math.round(data.circusStats.avgStreamsPerVideo)})</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Optimize titles with team names and scores</li>
                  <li>Improve thumbnails with action shots</li>
                  <li>Post at optimal times</li>
                </ul>
              </div>
              <div className="bg-white bg-opacity-20 rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">2. Increase Completion Rates</h3>
                <p className="mb-2">Target: {data.sudinfoSportStats.comp100.toFixed(1)}% (Current: {data.circusStats.comp100.toFixed(1)}%)</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Cut intros to under 3 seconds</li>
                  <li>Front-load best moments</li>
                  <li>Remove unnecessary outros</li>
                </ul>
              </div>
              <div className="bg-white bg-opacity-20 rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">3. Launch Recurring Series</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Create weekly debrief format</li>
                  <li>Use consistent hosts</li>
                  <li>Build episode continuity</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;