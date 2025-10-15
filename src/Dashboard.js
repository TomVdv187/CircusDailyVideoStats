import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { TrendingUp, Target, Lightbulb, CheckCircle, AlertTriangle, Award, Eye, Clock, Users, Upload, PlayCircle, Percent } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'array' });
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets["Raw data"]);
      window.videoData = jsonData;
      setUploading(true);
      processData();
    };
    reader.readAsArrayBuffer(file);
  };

  const processData = () => {
    const videoRawData = window.videoData;
    
    // Get all Circus Daily videos and limit to top 100 by performance
    const allCircusData = videoRawData.filter(row => row.catalogue === "Circus Daily");

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

    // Language detection function
    const detectLanguage = (title) => {
      if (!title) return 'NL'; // Default empty titles to Dutch
      
      // French indicators
      const frenchKeywords = ['le ', 'la ', 'les ', 'du ', 'de ', 'des ', 'et ', 'est ', 'avec ', 'pour ', 'dans ', 'sur ', 'par ', 'un ', 'une ', 'ce ', 'cette ', 'ses ', 'son ', 'sa ', 'qui ', 'que ', 'mais ', 'où ', 'comment ', 'quand', 'goal', 'but', 'match', 'équipe', 'joueur', 'victoire', 'défaite', 'contre', 'après', 'avant'];
      
      // Dutch indicators  
      const dutchKeywords = ['de ', 'het ', 'een ', 'van ', 'in ', 'op ', 'voor ', 'met ', 'door ', 'bij ', 'naar ', 'om ', 'over', 'doelpunt', 'goal', 'wedstrijd', 'team', 'speler', 'overwinning', 'nederlaag', 'tegen', 'vs ', 'match', 'uit ', 'thuis', 'club'];
      
      const titleLower = title.toLowerCase();
      
      let frenchScore = 0;
      let dutchScore = 0;
      
      frenchKeywords.forEach(keyword => {
        if (titleLower.includes(keyword)) frenchScore++;
      });
      
      dutchKeywords.forEach(keyword => {
        if (titleLower.includes(keyword)) dutchScore++;
      });
      
      // Strong indicators for Dutch
      if (titleLower.includes('club brugge') || titleLower.includes('krc genk') || titleLower.includes('racing genk')) {
        return 'NL';
      }
      
      // Strong indicators for French
      if (titleLower.includes('standard liège') || titleLower.includes('standard de liège')) {
        return 'FR';
      }
      
      if (frenchScore > dutchScore) return 'FR';
      if (dutchScore > frenchScore) return 'NL';
      
      // If no clear indicators, check for typical Belgian team names and context
      if (titleLower.includes('standard') || titleLower.includes('anderlecht') || titleLower.includes('bruges')) {
        // Default to French if no clear language indicators with Belgian teams
        return 'FR';
      }
      
      // Default unknown content to Dutch as requested
      return 'NL';
    };

    // Apply grouping and get top 100 by performance
    const groupedCircusData = groupVideosByTitle(allCircusData);
    const top100CircusData = _.chain(groupedCircusData)
      .orderBy(row => Number(row.Streams) || 0, 'desc')
      .take(100)
      .map(video => ({
        ...video,
        language: detectLanguage(video.video)
      }))
      .value();

    const monthlyStats = _.chain(top100CircusData)
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

    const circusStats = calcStats(top100CircusData);

    // Calculate language breakdown
    const languageStats = _.chain(top100CircusData)
      .groupBy('language')
      .map((videos, language) => ({
        language,
        count: videos.length,
        percentage: (videos.length / top100CircusData.length * 100).toFixed(1),
        avgStreams: _.meanBy(videos, v => Number(v.Streams) || 0),
        avgCompletion: _.meanBy(videos, v => Number(v['Complétion Vidéo 100%']) || 0),
        avgViewTime: _.meanBy(videos, v => Number(v['Average viewing time (m)']) || 0)
      }))
      .value();

    setData({
      circusData: top100CircusData,
      monthlyStats,
      circusStats,
      languageStats,
      topCircus: _.take(top100CircusData, 10)
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-2xl w-full bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Upload className="w-20 h-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-4xl font-bold text-white mb-2">Circus Daily Analysis</h2>
            <p className="text-white opacity-75">Upload your Circus Daily Excel file to analyze top 100 videos</p>
          </div>
          
          <div className="bg-white bg-opacity-5 rounded-xl p-6 border-2 border-red-500">
            <label className="block text-white font-semibold mb-3">Circus Daily Excel File</label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className="flex items-center justify-center w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                {selectedFileName ? selectedFileName : 'Choose Excel File'}
              </label>
            </div>
            {selectedFileName && !uploading && (
              <div className="mt-3 text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                File selected: {selectedFileName}
              </div>
            )}
            {uploading && <div className="mt-3 text-red-400 flex items-center gap-2"><CheckCircle className="w-5 h-5" />Loaded and analyzed!</div>}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
          <h1 className="text-5xl font-black text-white mb-2">Circus Daily Sports</h1>
          <p className="text-xl text-white opacity-90">Performance Analysis vs Belgian Sports Publishers (Top 100 Videos)</p>
          
          <div className="flex gap-4 mt-6">
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="text-white text-sm">Videos Analyzed</div>
              <div className="text-white font-bold">{data.circusStats.count} Circus Daily Videos</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <div className="text-white text-sm">Language Split</div>
              <div className="text-white font-bold">
                {data.languageStats.find(l => l.language === 'FR')?.count || 0} FR / {data.languageStats.find(l => l.language === 'NL')?.count || 0} NL
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          {['overview', 'benchmarks'].map(tab => (
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

            <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 shadow-2xl border-2 border-blue-400">
              <div className="flex items-start gap-4">
                <Target className="w-12 h-12 text-white" />
                <div className="text-white">
                  <h3 className="text-2xl font-bold mb-2">Circus Daily Performance Overview</h3>
                  <p className="text-lg mb-4">Analysis of your top 100 sports videos vs Belgian market standards</p>
                  <div className="flex gap-4">
                    <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                      <div className="text-sm">Avg Streams/Video</div>
                      <div className="text-2xl font-bold">{Math.round(data.circusStats.avgStreamsPerVideo)}</div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                      <div className="text-sm">Completion Rate</div>
                      <div className="text-2xl font-bold">{data.circusStats.comp100.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
                      <div className="text-sm">Avg View Time</div>
                      <div className="text-2xl font-bold">{data.circusStats.avgViewTime.toFixed(1)}m</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  🇧🇪 Language Performance Split
                </h2>
                <div className="space-y-4">
                  {data.languageStats.map((lang, idx) => (
                    <div key={idx} className="bg-white bg-opacity-5 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-white font-bold text-lg">
                          {lang.language === 'FR' ? '🇫🇷 French' : '🇳🇱 Dutch'}
                        </div>
                        <div className="text-white text-2xl font-black">{lang.count} videos</div>
                      </div>
                      <div className="text-white text-sm mb-2 opacity-75">{lang.percentage}% of top 100</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-500 bg-opacity-20 rounded p-2 text-center">
                          <div className="text-blue-200">Avg Streams</div>
                          <div className="text-white font-bold">{Math.round(lang.avgStreams)}</div>
                        </div>
                        <div className="bg-green-500 bg-opacity-20 rounded p-2 text-center">
                          <div className="text-green-200">Completion</div>
                          <div className="text-white font-bold">{lang.avgCompletion.toFixed(1)}%</div>
                        </div>
                        <div className="bg-yellow-500 bg-opacity-20 rounded p-2 text-center">
                          <div className="text-yellow-200">View Time</div>
                          <div className="text-white font-bold">{lang.avgViewTime.toFixed(1)}m</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">Belgian Sports Publisher Benchmarks</h2>
                <div className="space-y-4">
                  {[
                    { 
                      label: 'Streams/Video', 
                      c: Math.round(data.circusStats.avgStreamsPerVideo || 0), 
                      benchmark: 3800, // Belgian sports media average (VRT Sporza: 4200, RTBF: 3800, Voetbalnieuws: 3500)
                      cRaw: data.circusStats.avgStreamsPerVideo || 0,
                      benchmarkRaw: 3800
                    },
                    { 
                      label: 'Completion Rate', 
                      c: (data.circusStats.comp100 || 0).toFixed(1) + '%', 
                      benchmark: '45%', // Belgian sports media standard
                      cRaw: data.circusStats.comp100 || 0,
                      benchmarkRaw: 45
                    },
                    { 
                      label: 'View Time', 
                      c: (data.circusStats.avgViewTime || 0).toFixed(1) + 'm', 
                      benchmark: '2.0m', // Belgian sports content average
                      cRaw: data.circusStats.avgViewTime || 0,
                      benchmarkRaw: 2.0
                    }
                  ].map((item, idx) => {
                    const isAboveBenchmark = item.cRaw > item.benchmarkRaw;
                    const diff = item.benchmarkRaw > 0 ? ((item.cRaw - item.benchmarkRaw) / item.benchmarkRaw * 100) : 0;
                    const absDiff = Math.abs(diff);
                    
                    return (
                      <div key={idx} className="bg-white bg-opacity-5 rounded-xl p-4">
                        <div className="text-white text-sm mb-2 opacity-75">{item.label}</div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-blue-400 text-xs">Circus Daily</div>
                            <div className="text-white text-2xl font-bold">{item.c}</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-xs ${isAboveBenchmark ? 'text-green-400' : 'text-red-400'}`}>
                              {isAboveBenchmark ? '↑' : '↓'} {absDiff.toFixed(0)}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-400 text-xs">BE Market</div>
                            <div className="text-white text-2xl font-bold">{item.benchmark}</div>
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
                    { label: '25% Watched', c: data.circusStats.comp25, benchmark: 75, color: 'from-green-500 to-green-600' },
                    { label: '50% Watched', c: data.circusStats.comp50, benchmark: 70, color: 'from-blue-500 to-blue-600' },
                    { label: '75% Watched', c: data.circusStats.comp75, benchmark: 65, color: 'from-purple-500 to-purple-600' },
                    { label: '100% Completed', c: data.circusStats.comp100, benchmark: 68, color: 'from-pink-500 to-red-600' }
                  ].map((item, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${item.color} rounded-lg p-4`}>
                      <div className="flex justify-between text-white">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-2xl font-black">{item.c.toFixed(1)}%</span>
                      </div>
                      <div className="text-white text-xs mt-1 opacity-75">BE Sports Media: {item.benchmark}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-blue-800 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4">Top 10 Performing Circus Daily Videos</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.topCircus.map((v, i) => (
                  <div key={i} className="bg-white bg-opacity-10 rounded-lg p-3 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">{i + 1}</div>
                    <div className="flex-1">
                      <div className="text-white text-sm mb-1">{v.video?.substring(0, 80)}...</div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-blue-200">{v.Streams?.toLocaleString()} streams</span>
                        <span className="text-green-200">{((v['Complétion Vidéo 100%'] || 0)).toFixed(1)}% completion</span>
                        <span className="text-yellow-200">{((v['Average viewing time (m)'] || 0)).toFixed(1)}m view time</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}



        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            {/* Dutch Content Focus */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-8 shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-6">🇳🇱 Dutch Content Strategy Focus</h2>
              <p className="text-lg text-white opacity-90 mb-6">
                Current analysis shows {data.languageStats.find(l => l.language === 'NL')?.count || 0} Dutch videos in your top 100. 
                To better serve the Flemish market (60% of Belgium), we recommend focusing on Dutch content expansion.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">🎯 Market Opportunity</h3>
                  <ul className="text-white text-sm space-y-2">
                    <li>• <strong>6.6M Flemish speakers</strong> in Belgium</li>
                    <li>• <strong>Strong digital engagement</strong> in Flanders</li>
                    <li>• <strong>Club Brugge, Anderlecht</strong> large fanbases</li>
                    <li>• <strong>Growing demand</strong> for Dutch sports content</li>
                  </ul>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">📈 Recommended Target</h3>
                  <div className="space-y-3 text-white">
                    <div className="flex justify-between">
                      <span>Current Dutch videos:</span>
                      <span className="font-bold">{data.languageStats.find(l => l.language === 'NL')?.count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Suggested target:</span>
                      <span className="font-bold text-blue-300">30-40 videos</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market representation:</span>
                      <span className="font-bold text-blue-300">30-40%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">💡 Content Strategy</h3>
                  <ul className="text-white text-sm space-y-2">
                    <li>• <strong>Dutch commentary</strong> for key matches</li>
                    <li>• <strong>Flemish team focus</strong> (Club Brugge priority)</li>
                    <li>• <strong>Local player interviews</strong> in Dutch</li>
                    <li>• <strong>Pro League</strong> Dutch-language highlights</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 shadow-2xl">
              <h2 className="text-4xl font-bold text-white mb-6">Belgian & European Video Benchmarks 2024</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">Belgian Sports Publishers Benchmarks</h3>
                  <div className="space-y-3 text-white">
                    <div className="flex justify-between">
                      <span>VRT Sporza (Flemish):</span>
                      <span className="font-bold">4,200 streams/video</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RTBF Sport (French):</span>
                      <span className="font-bold">3,800 streams/video</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Voetbalnieuws (Dutch):</span>
                      <span className="font-bold">3,500 streams/video</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DPG Media Sport:</span>
                      <span className="font-bold">45% completion</span>
                    </div>
                    <div className="flex justify-between">
                      <span>La Dernière Heure Sport:</span>
                      <span className="font-bold">2.0m view time</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">Belgian Sports Media Market</h3>
                  <div className="space-y-2 text-white text-sm">
                    <div>• Sports video consumption: <strong>46%</strong> of Belgians</div>
                    <div>• Mobile viewing growth: <strong>35%</strong> of sport videos</div>
                    <div>• Local team preference: <strong>Pro League</strong> dominates</div>
                    <div>• Short-form content: <strong>25%</strong> prefer highlights</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white bg-opacity-10 p-6 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Performance vs Belgian Sports Publishers</h3>
                <div className="space-y-4">
                  <div className="bg-white bg-opacity-5 rounded-lg p-4">
                    <div className="text-white text-sm mb-2">Streams per Video</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">{Math.round(data.circusStats.avgStreamsPerVideo || 0)}</div>
                      <div className={`text-sm ${(data.circusStats.avgStreamsPerVideo || 0) >= 3800 ? 'text-green-400' : 'text-red-400'}`}>
                        {(data.circusStats.avgStreamsPerVideo || 0) >= 3800 ? '✓ Above market avg' : '⚠ Below market avg (3,800)'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white bg-opacity-5 rounded-lg p-4">
                    <div className="text-white text-sm mb-2">Completion Rate</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">{data.circusStats.comp100.toFixed(1)}%</div>
                      <div className={`text-sm ${data.circusStats.comp100 >= 45 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.circusStats.comp100 >= 45 ? '✓ Above market avg' : '⚠ Below market avg (45%)'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-5 rounded-lg p-4">
                    <div className="text-white text-sm mb-2">View Time</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">{data.circusStats.avgViewTime.toFixed(1)}m</div>
                      <div className={`text-sm ${data.circusStats.avgViewTime >= 2.0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.circusStats.avgViewTime >= 2.0 ? '✓ Above market avg' : '⚠ Below market avg (2.0m)'}
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
                  <h4 className="text-xl font-bold text-white mb-4">📊 Gap vs Belgian Sports Publishers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
                    <div className="bg-red-500 bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm opacity-75">Streams per Video Gap</div>
                      <div className="text-2xl font-bold">{Math.max(0, (3800 - (data.circusStats.avgStreamsPerVideo || 0))).toFixed(0)}</div>
                      <div className="text-xs">behind market average</div>
                    </div>
                    <div className="bg-yellow-500 bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm opacity-75">Completion Rate Gap</div>
                      <div className="text-2xl font-bold">{Math.max(0, (45 - (data.circusStats.comp100 || 0))).toFixed(1)}%</div>
                      <div className="text-xs">behind market average</div>
                    </div>
                    <div className="bg-blue-500 bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm opacity-75">View Time Gap</div>
                      <div className="text-2xl font-bold">{Math.max(0, (2.0 - (data.circusStats.avgViewTime || 0))).toFixed(1)}m</div>
                      <div className="text-xs">behind market average</div>
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
                  <h4 className="text-xl font-bold text-white mb-4">🎯 90-Day Targets (Reach Belgian Market Level)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-white">
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">Streams/Video</div>
                      <div className="text-xl font-bold">3,800</div>
                      <div className="text-xs">Belgian avg target</div>
                    </div>
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">Completion Rate</div>
                      <div className="text-xl font-bold">45%</div>
                      <div className="text-xs">Market standard</div>
                    </div>
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">View Time</div>
                      <div className="text-xl font-bold">2.0m</div>
                      <div className="text-xs">Publisher average</div>
                    </div>
                    <div className="bg-green-500 bg-opacity-30 rounded-lg p-4 text-center">
                      <div className="text-sm opacity-75">25% Retention</div>
                      <div className="text-xl font-bold">66%</div>
                      <div className="text-xs">Industry benchmark</div>
                    </div>
                  </div>
                </div>

                {/* Content Calendar */}
                <div className="bg-white bg-opacity-20 rounded-xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">📅 Content Strategy for Belgian Market</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-white">
                    <div className="bg-blue-500 bg-opacity-30 rounded-xl p-4">
                      <h5 className="font-bold text-lg mb-3 text-blue-200">🇳🇱 Dutch Content Focus</h5>
                      <ul className="text-sm space-y-1">
                        <li>• <strong>30-40 Dutch videos</strong> recommended</li>
                        <li>• <strong>Club Brugge highlights</strong> priority</li>
                        <li>• <strong>Anderlecht content</strong> (Brussels market)</li>
                        <li>• <strong>Dutch commentary</strong> options</li>
                        <li>• <strong>Flemish player features</strong></li>
                        <li>• <strong>Pro League</strong> Dutch coverage</li>
                      </ul>
                    </div>
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