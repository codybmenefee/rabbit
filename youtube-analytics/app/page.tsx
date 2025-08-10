export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8 gradient-text">
          YouTube Analytics Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Total Watch Time</h3>
            <p className="text-3xl font-bold text-purple-400">235 hours</p>
            <p className="text-green-400 text-sm mt-2">↗ +12.5% vs last month</p>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Videos Watched</h3>
            <p className="text-3xl font-bold text-blue-400">1,247</p>
            <p className="text-green-400 text-sm mt-2">↗ +8.7% vs last month</p>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Unique Channels</h3>
            <p className="text-3xl font-bold text-pink-400">89</p>
            <p className="text-red-400 text-sm mt-2">↘ -2.1% vs last month</p>
          </div>
        </div>

        <div className="glass-card p-8 mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Insights</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-white">AI Content Surge</h4>
              <p className="text-gray-300">Your AI-related viewing increased 340% after ChatGPT launch</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-white">Weekend Learning Pattern</h4>
              <p className="text-gray-300">You consume 45% more educational content on weekends</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
            Upload YouTube Data
          </button>
        </div>
      </div>
    </div>
  )
}