import { useState } from 'react';
import { LifeSimGame } from './components/LifeSimGame';
import { AnalysisDashboard } from './pages/AnalysisDashboard';
import { Button } from './components/ui/button';
import { BarChart3, Gamepad2 } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'game' | 'analysis'>('game');

  return (
    <div className="h-screen flex flex-col">
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
      </header>
      <main className="flex-1 min-h-0 overflow-auto">
        {view === 'game' && <LifeSimGame />}
        {view === 'analysis' && <AnalysisDashboard />}
      </main>
    </div>
  );
}
