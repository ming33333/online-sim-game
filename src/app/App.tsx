import { useState } from 'react';
import { LifeSimGame } from './components/LifeSimGame';
import { AnalysisDashboard } from './pages/AnalysisDashboard';
import { Button } from './components/ui/button';
import { BarChart3, ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'game' | 'analysis'>('game');
  const [showTopSwitcher, setShowTopSwitcher] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {showTopSwitcher ? (
        <header className="flex-shrink-0 border-b bg-white/80 backdrop-blur px-4 py-2 flex items-center gap-2">
          <Button
            variant={view === 'game' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('game')}
          >
            <Gamepad2 className="size-4 mr-1" />
            Game
          </Button>
          <Button
            variant={view === 'analysis' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('analysis')}
          >
            <BarChart3 className="size-4 mr-1" />
            Analysis
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 px-2 text-xs"
            onClick={() => setShowTopSwitcher(false)}
            title="Hide top switcher"
          >
            <ChevronUp className="size-4 mr-1" />
            Hide
          </Button>
        </header>
      ) : null}
      <main className="flex-1 min-h-0 overflow-auto">
        {view === 'game' && <LifeSimGame />}
        {view === 'analysis' && <AnalysisDashboard />}
      </main>
      <div className="fixed top-2 right-2 z-50 flex flex-col items-end gap-2 max-w-[min(calc(100vw-1rem),22rem)]">
        {!showTopSwitcher && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs bg-white/90 border shadow-sm backdrop-blur"
            onClick={() => setShowTopSwitcher(true)}
            title="Show top switcher"
          >
            <ChevronDown className="size-4 mr-1" />
            Show Game/Analysis
          </Button>
        )}
        {view === 'game' && <div id="life-sim-dev-cheats-anchor" className="w-full" />}
      </div>
    </div>
  );
}
