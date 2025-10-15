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
    
    // Limit to first 100 videos for each dataset
    const circusData = videoRawData
      .filter(row => row.catalogue === "Circus Daily")
      .slice(0, 100);

    const sportKeywords = ['football', 'sport', 'match', 'standard', 'anderlecht', 'charleroi', 'pro league', 
                           'champions', 'coupe', 'playoff', 'rouches', 'vestiaire', 'transfert', 'diables', 'goal'];

    const sudinfoSportVideos = sudinfoData
      .filter(row => {
        const title = (row.video || '').toLowerCase();
        return sportKeywords.some(keyword => title.includes(keyword));
      })
      .slice(0, 100);

    // Group videos with same titles and sum their metrics
    const groupVideosByTitle = (videos) => {
      return _.chain(videos)
        .groupBy(row => (row.video || '').trim())
        .map((group, title) => {
          if (group.length === 1) {
            return group[0];
          }
          
          // Sum numerical values for grouped videos
          const summedData = {
            video: title,
            Streams: _.sumBy(group, row => Number(row.Streams) || 0),
            'Complétion Vidéo 25%': _.meanBy(group, row => Number(row['Complétion Vidéo 25%']) || 0),
            'Complétion Vidéo 50%': _.meanBy(group, row => Number(row['Complétion Vidéo 50%']) || 0),
            'Complétion Vidéo 75%': _.meanBy(group, row => Number(row['Complétion Vidéo 75%']) || 0),
            'Complétion Vidéo 100%': _.meanBy(group, row => Number(row['Complétion Vidéo 100%']) || 0),
            'Taux de complétion moyen (%)': _.meanBy(group, row => Number(row['Taux de complétion moyen (%)']) || 0),
            'Average viewing time (m)': _.meanBy(group, row => Number(row['Average viewing time (m)']) || 0),
            jour: group[0].jour,
            catalogue: group[0].catalogue
          };
          
          return summedData;
        })
        .value();
    };

    // Apply grouping to both datasets
    const groupedCircusData = groupVideosByTitle(circusData);
    const groupedSudinfoSportVideos = groupVideosByTitle(sudinfoSportVideos);

    const monthlyStats = _.chain(groupedCircusData)
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
      if (!dataSet || dataSet.length === 0) {
        return {
          count: 0,
          totalStreams: 0,
          avgStreamsPerVideo: 0,
          comp25: 0,
          comp50: 0,
          comp75: 0,
          comp100: 0,
          avgCompletionRate: 0,
          avgViewTime: 0
        };
      }

      const totalStreams = _.sumBy(dataSet, row => Number(row.Streams) || 0);
      const count = dataSet.length;
      
      return {
        count: count,
        totalStreams: totalStreams,
        avgStreamsPerVideo: count > 0 ? totalStreams / count : 0,
        comp25: _.meanBy(dataSet, row => Number(row['Complétion Vidéo 25%']) || 0),
        comp50: _.meanBy(dataSet, row => Number(row['Complétion Vidéo 50%']) || 0),
        comp75: _.meanBy(dataSet, row => Number(row['Complétion Vidéo 75%']) || 0),
        comp100: _.meanBy(dataSet, row => Number(row['Complétion Vidéo 100%']) || 0),
        avgCompletionRate: _.meanBy(dataSet, row => Number(row['Taux de complétion moyen (%)']) || 0),
        avgViewTime: _.meanBy(dataSet, row => Number(row['Average viewing time (m)']) || 0)
      };
    };

    const circusStats = calcStats(groupedCircusData);
    const sudinfoSportStats = calcStats(groupedSudinfoSportVideos);

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
      circusData: groupedCircusData,
      sudinfoSportVideos: groupedSudinfoSportVideos,
      monthlyStats,
      circusStats,
      sudinfoSportStats,
      circusFunnel,
      circusDropoff,
      sudinfoDropoff,
      topCircus: _.take(_.orderBy(groupedCircusData, row => Number(row.Streams) || 0, 'desc'), 10),
      topSudinfoSport: _.take(_.orderBy(groupedSudinfoSportVideos, row => Number(row.Streams) || 0, 'desc'), 10)
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-2xl w-full bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Upload className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-white mb-2">Circus Daily Analysis</h2>
            <p className="text-white opacity-75">Upload both Excel files to analyze first 100 videos from each</p>
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

  const performanceGap = data.circusStats.avgStreamsPerVideo > 0 
    ? ((data.sudinfoSportStats.avgStreamsPerVideo - data.circusStats.avgStreamsPerVideo) / data.circusStats.avgStreamsPerVideo * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
          <h1 className="text-5xl font-black text-white mb-2">Circus Daily Sports</h1>
          <p className="text-xl text-white opacity-90">Performance Analysis vs Sudinfo Sport (Top 100 Videos Each)</p>
          <div className="flex gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="text-white text-sm">Videos Analyzed</div>
              <div className="text-white font-bold">{data.circusStats.count} Circus | {data.sudinfoSportStats.count} Sudinfo</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          {['overview', 'completion', 'benchmarks'].map(tab => (
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
                    { 
                      label: 'Streams/Video', 
                      c: Math.round(data.circusStats.avgStreamsPerVideo || 0), 
                      s: Math.round(data.sudinfoSportStats.avgStreamsPerVideo || 0),
                      cRaw: data.circusStats.avgStreamsPerVideo || 0,
                      sRaw: data.sudinfoSportStats.avgStreamsPerVideo || 0
                    },
                    { 
                      label: '100% Completion', 
                      c: (data.circusStats.comp100 || 0).toFixed(1) + '%', 
                      s: (data.sudinfoSportStats.comp100 || 0).toFixed(1) + '%',
                      cRaw: data.circusStats.comp100 || 0,
                      sRaw: data.sudinfoSportStats.comp100 || 0
                    },
                    { 
                      label: 'View Time', 
                      c: (data.circusStats.avgViewTime || 0).toFixed(1) + 'm', 
                      s: (data.sudinfoSportStats.avgViewTime || 0).toFixed(1) + 'm',
                      cRaw: data.circusStats.avgViewTime || 0,
                      sRaw: data.sudinfoSportStats.avgViewTime || 0
                    }
                  ].map((item, idx) => {
                    const isCircusBetter = item.cRaw > item.sRaw;
                    const diff = item.sRaw > 0 ? ((item.cRaw - item.sRaw) / item.sRaw * 100) : 0;
                    const absDiff = Math.abs(diff);
                    
                    return (
                      <div key={idx} className="bg-white bg-opacity-5 rounded-xl p-4">
                        <div className="text-white text-sm mb-2 opacity-75">{item.label}</div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-blue-400 text-xs">Circus</div>
                            <div className="text-white text-2xl font-bold">{item.c}</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-xs ${isCircusBetter ? 'text-green-400' : 'text-red-400'}`}>
                              {isCircusBetter ? '↑' : '↓'} {absDiff.toFixed(0)}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-red-400 text-xs">Sudinfo</div>
                            <div className="text-white text-2xl font-bold">{item.s}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <h2 className="text-2xl font-bold text-white mb-4">Top 10 Circus Daily</h2>
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


        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 shadow-2xl">
              <h2 className="text-4xl font-bold text-white mb-6">Belgian & European Video Benchmarks 2024</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">European Completion Rates</h3>
                  <div className="space-y-3 text-white">
                    <div className="flex justify-between">
                      <span>Premium Content (Netflix):</span>
                      <span className="font-bold">72%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Video Advertising:</span>
                      <span className="font-bold">75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>General Industry Standard:</span>
                      <span className="font-bold">60-80%</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">Belgian Market Context</h3>
                  <div className="space-y-2 text-white text-sm">
                    <div>• Video penetration: <strong>65.2%</strong> in 2024</div>
                    <div>• Market growth: <strong>6.88%</strong> annually</div>
                    <div>• Cost-driven audience: <strong>43%</strong> prioritize price</div>
                    <div>• Local content preference growing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Your Performance vs Benchmarks</h3>
                <div className="space-y-4">
                  <div className="bg-white bg-opacity-5 rounded-lg p-4">
                    <div className="text-white text-sm mb-2">Circus Daily Completion</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">{data.circusStats.comp100.toFixed(1)}%</div>
                      <div className={`text-sm ${data.circusStats.comp100 >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.circusStats.comp100 >= 60 ? '✓ Above minimum' : '⚠ Below benchmark'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-5 rounded-lg p-4">
                    <div className="text-white text-sm mb-2">Sudinfo Sport Completion</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">{data.sudinfoSportStats.comp100.toFixed(1)}%</div>
                      <div className={`text-sm ${data.sudinfoSportStats.comp100 >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.sudinfoSportStats.comp100 >= 60 ? '✓ Above minimum' : '⚠ Below benchmark'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Video Length Guidelines</h3>
                <div className="space-y-3 text-white text-sm">
                  <div className="bg-green-500 bg-opacity-20 rounded-lg p-3">
                    <div className="font-bold">Under 1 minute</div>
                    <div>Expected: ~66% completion</div>
                  </div>
                  <div className="bg-yellow-500 bg-opacity-20 rounded-lg p-3">
                    <div className="font-bold">1-2 minutes</div>
                    <div>Expected: ~56% completion</div>
                  </div>
                  <div className="bg-red-500 bg-opacity-20 rounded-lg p-3">
                    <div className="font-bold">2-10 minutes</div>
                    <div>Expected: ~50% completion</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Market Opportunities</h3>
                <div className="space-y-3 text-white text-sm">
                  <div className="bg-blue-500 bg-opacity-20 rounded-lg p-3">
                    <div className="font-bold">Connected TV</div>
                    <div>Highest completion rates</div>
                    <div>53% of video impressions</div>
                  </div>
                  <div className="bg-purple-500 bg-opacity-20 rounded-lg p-3">
                    <div className="font-bold">Local Content</div>
                    <div>Growing demand in Belgium</div>
                    <div>Higher engagement potential</div>
                  </div>
                  <div className="bg-green-500 bg-opacity-20 rounded-lg p-3">
                    <div className="font-bold">Cost-Effective</div>
                    <div>43% prioritize price</div>
                    <div>Ad-supported models growing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-8 shadow-2xl">
              <h3 className="text-3xl font-bold text-white mb-6">🎯 Specific Recommendations for Circus Daily</h3>
              <div className="space-y-6">
                
                {/* Performance Gap Analysis */}
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">📊 Performance Gap Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                    <div className="bg-red-500 bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm opacity-75">Streams per Video Gap</div>
                      <div className="text-2xl font-bold">{((data.sudinfoSportStats.avgStreamsPerVideo - data.circusStats.avgStreamsPerVideo) || 0).toFixed(0)}</div>
                      <div className="text-xs">streams behind Sudinfo</div>
                    </div>
                    <div className="bg-yellow-500 bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm opacity-75">Completion Rate Gap</div>
                      <div className="text-2xl font-bold">{((data.sudinfoSportStats.comp100 - data.circusStats.comp100) || 0).toFixed(1)}%</div>
                      <div className="text-xs">behind Sudinfo</div>
                    </div>
                    <div className="bg-blue-500 bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm opacity-75">View Time Gap</div>
                      <div className="text-2xl font-bold">{((data.sudinfoSportStats.avgViewTime - data.circusStats.avgViewTime) || 0).toFixed(1)}m</div>
                      <div className="text-xs">behind Sudinfo</div>
                    </div>
                  </div>
                </div>

                {/* Immediate Actions */}
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">🚀 Immediate Actions (Next 30 Days)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-yellow-300">Content Optimization</h5>
                      <ul className="text-sm space-y-2">
                        <li>• <strong>Hook in first 3 seconds:</strong> Start with the most exciting moment</li>
                        <li>• <strong>Team-focused titles:</strong> "Standard vs Anderlecht" performs better than generic titles</li>
                        <li>• <strong>Score in thumbnail:</strong> Belgian audiences love knowing the result upfront</li>
                        <li>• <strong>Player names in titles:</strong> Use local player names for SEO</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-yellow-300">Technical Improvements</h5>
                      <ul className="text-sm space-y-2">
                        <li>• <strong>Target 1-2 minutes:</strong> Sweet spot for 56% completion rate</li>
                        <li>• <strong>Remove intros:</strong> Jump straight to action</li>
                        <li>• <strong>Add captions:</strong> 25% of Belgians watch without sound</li>
                        <li>• <strong>Mobile-first:</strong> 35% of views are mobile</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Belgian Market Strategy */}
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">🇧🇪 Belgian Market Strategy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-green-300">Cost-Conscious Audience (43%)</h5>
                      <ul className="text-sm space-y-2">
                        <li>• Focus on <strong>free, ad-supported content</strong></li>
                        <li>• Shorter ads (15-30s) for better completion</li>
                        <li>• Partner with local brands for sponsorship</li>
                        <li>• Highlight "free highlights" in marketing</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-green-300">Local Content Preference</h5>
                      <ul className="text-sm space-y-2">
                        <li>• <strong>Pro League focus:</strong> Standard, Anderlecht, Club Brugge</li>
                        <li>• Local commentators and analysis</li>
                        <li>• Behind-the-scenes with Belgian players</li>
                        <li>• Fan reactions from Belgian stadiums</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Target Metrics */}
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">🎯 90-Day Target Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-white">
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">Streams/Video</div>
                      <div className="text-xl font-bold">{Math.round((data.circusStats.avgStreamsPerVideo || 0) * 1.3)}</div>
                      <div className="text-xs">+30% target</div>
                    </div>
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">Completion Rate</div>
                      <div className="text-xl font-bold">{Math.min(((data.circusStats.comp100 || 0) + 15), 80).toFixed(0)}%</div>
                      <div className="text-xs">+15% target</div>
                    </div>
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">View Time</div>
                      <div className="text-xl font-bold">{((data.circusStats.avgViewTime || 0) + 0.5).toFixed(1)}m</div>
                      <div className="text-xs">+0.5m target</div>
                    </div>
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">25% Retention</div>
                      <div className="text-xl font-bold">{Math.min(((data.circusStats.comp25 || 0) + 10), 90).toFixed(0)}%</div>
                      <div className="text-xs">+10% target</div>
                    </div>
                  </div>
                </div>

                {/* Content Calendar */}
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">📅 Content Strategy for Belgian Market</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-blue-300">High-Performing Content</h5>
                      <ul className="text-sm space-y-1">
                        <li>• Goal compilations (1-2 min)</li>
                        <li>• Match highlights with local commentary</li>
                        <li>• Player interviews (Belgian players)</li>
                        <li>• Derby matches (Standard vs others)</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-blue-300">Posting Schedule</h5>
                      <ul className="text-sm space-y-1">
                        <li>• <strong>Sunday 20:00:</strong> Match highlights</li>
                        <li>• <strong>Wednesday 18:00:</strong> Player features</li>
                        <li>• <strong>Friday 16:00:</strong> Preview content</li>
                        <li>• <strong>Post-match:</strong> Immediate goals/key moments</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-3 text-blue-300">Platform Strategy</h5>
                      <ul className="text-sm space-y-1">
                        <li>• <strong>Connected TV:</strong> Longer highlights (2-3min)</li>
                        <li>• <strong>Mobile:</strong> Quick goals (30-60s)</li>
                        <li>• <strong>Desktop:</strong> Analysis pieces (3-5min)</li>
                        <li>• <strong>Social:</strong> Teaser clips (15-30s)</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;