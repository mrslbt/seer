import { useCallback } from 'react';
import { playClick } from '../lib/sounds';
import './BottomTabBar.css';

export type ActiveTab = 'oracle' | 'cosmos' | 'chart' | 'bonds';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  hasTransitAlert: boolean;
}

export function BottomTabBar({ activeTab, onTabChange, hasTransitAlert }: BottomTabBarProps) {
  const handleTab = useCallback((tab: ActiveTab) => {
    if (tab === activeTab) return;
    playClick();
    onTabChange(tab);
  }, [activeTab, onTabChange]);

  return (
    <nav className="bottom-tab-bar">
      {/* Seer */}
      <button
        className={`tab-btn ${activeTab === 'oracle' ? 'tab-btn--active' : ''}`}
        onClick={() => handleTab('oracle')}
        aria-label="Seer"
      >
        <span className="tab-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </span>
        <span className="tab-label">Seer</span>
      </button>

      {/* Cosmos */}
      <button
        className={`tab-btn ${activeTab === 'cosmos' ? 'tab-btn--active' : ''}`}
        onClick={() => handleTab('cosmos')}
        aria-label="Cosmos"
      >
        <span className="tab-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </span>
        <span className="tab-label">Cosmos</span>
        {hasTransitAlert && <span className="tab-alert-dot" />}
      </button>

      {/* Chart */}
      <button
        className={`tab-btn ${activeTab === 'chart' ? 'tab-btn--active' : ''}`}
        onClick={() => handleTab('chart')}
        aria-label="Chart"
      >
        <span className="tab-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
          </svg>
        </span>
        <span className="tab-label">Chart</span>
      </button>

      {/* Bonds */}
      <button
        className={`tab-btn ${activeTab === 'bonds' ? 'tab-btn--active' : ''}`}
        onClick={() => handleTab('bonds')}
        aria-label="Bonds"
      >
        <span className="tab-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            <path d="M16 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
            <path d="M12 20c-4 0-7-1.5-7-4s2-4 7-4 7 1.5 7 4-3 4-7 4z"/>
          </svg>
        </span>
        <span className="tab-label">Bonds</span>
      </button>
    </nav>
  );
}
