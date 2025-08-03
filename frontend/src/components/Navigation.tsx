'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  TableCellsIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  CloudArrowUpIcon,
  HomeIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  UsersIcon,
  VideoCameraIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  sessionId?: string;
  hasData?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  disabled?: boolean;
}

export default function Navigation({ currentView, onNavigate, sessionId, hasData = false }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      id: 'guide',
      label: 'Setup Guide',
      icon: HomeIcon,
      description: 'Get started with YouTube data export'
    },
    {
      id: 'upload',
      label: 'Upload Data',
      icon: CloudArrowUpIcon,
      description: 'Upload your YouTube watch history'
    },
    {
      id: 'overview',
      label: 'Overview',
      icon: ChartBarIcon,
      description: 'Dashboard overview and key metrics',
      disabled: !sessionId && !hasData
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: ChartBarIcon,
      description: 'Detailed charts and visualizations',
      disabled: !sessionId && !hasData
    },
    {
      id: 'videos',
      label: 'Video Library',
      icon: VideoCameraIcon,
      description: 'Browse and search your watch history',
      disabled: !sessionId && !hasData
    },
    {
      id: 'channels',
      label: 'Channels',
      icon: UsersIcon,
      description: 'Top channels and creator insights',
      disabled: !sessionId && !hasData
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: TagIcon,
      description: 'Content category breakdown',
      disabled: !sessionId && !hasData
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: ClockIcon,
      description: 'Viewing patterns over time',
      disabled: !sessionId && !hasData
    },
    {
      id: 'export',
      label: 'Export',
      icon: DocumentArrowDownIcon,
      description: 'Download your data',
      disabled: !sessionId && !hasData
    }
  ];

  const handleNavigation = (viewId: string) => {
    onNavigate(viewId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          ) : (
            <Bars3Icon className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-white border-r border-gray-200 z-40">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h2>
            {sessionId && (
              <p className="text-xs text-gray-500 truncate">Session: {sessionId}</p>
            )}
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  disabled={item.disabled}
                  className={`
                    w-full text-left p-3 rounded-lg transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' 
                      : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                    }
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Status Info */}
          {sessionId && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-medium mb-1">Active Session</p>
                <p className="text-xs text-green-800 font-mono truncate">{sessionId}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
            />

            {/* Mobile Menu */}
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Mobile Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">🐰</span>
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">Rabbit Analytics</h1>
                      <p className="text-xs text-gray-500">Dashboard</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {sessionId && (
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Current Session</p>
                    <p className="text-xs font-mono text-gray-700 truncate">{sessionId}</p>
                  </div>
                )}

                {/* Mobile Navigation */}
                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    const IconComponent = item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item.id)}
                        disabled={item.disabled}
                        className={`
                          w-full text-left p-4 rounded-lg transition-all duration-200
                          ${isActive 
                            ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' 
                            : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                          }
                          ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <div className="flex items-center space-x-4">
                          <IconComponent className={`h-6 w-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                              {item.label}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                {/* Mobile Status Info */}
                {sessionId && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium mb-1">Active Session</p>
                      <p className="text-sm text-green-800 font-mono truncate">{sessionId}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}