import { useCallback } from 'react';
import { playClick } from '../lib/sounds';
import { useI18n } from '../i18n/I18nContext';
import './InlineTabs.css';

export type ActiveTab = 'oracle' | 'cosmos' | 'chart' | 'bonds';

interface InlineTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  hasTransitAlert: boolean;
}

const TABS: { key: ActiveTab; labelKey: string }[] = [
  { key: 'oracle', labelKey: 'nav.seer' },
  { key: 'cosmos', labelKey: 'nav.cosmos' },
  { key: 'chart', labelKey: 'nav.chart' },
  { key: 'bonds', labelKey: 'nav.bonds' },
];

export function InlineTabs({ activeTab, onTabChange, hasTransitAlert }: InlineTabsProps) {
  const { t } = useI18n();

  const handleTab = useCallback((tab: ActiveTab) => {
    if (tab === activeTab) return;
    playClick();
    onTabChange(tab);
  }, [activeTab, onTabChange]);

  return (
    <nav className="inline-tabs" role="tablist" aria-label="App sections">
      {TABS.map(({ key, labelKey }) => (
        <button
          key={key}
          role="tab"
          aria-selected={activeTab === key}
          className={`inline-tab ${activeTab === key ? 'inline-tab--active' : ''}`}
          onClick={() => handleTab(key)}
        >
          {t(labelKey as Parameters<typeof t>[0])}
          {key === 'cosmos' && hasTransitAlert && (
            <span className="inline-tab-alert" aria-label="Transit alert" />
          )}
        </button>
      ))}
    </nav>
  );
}
