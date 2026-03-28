import { AppStateProvider } from './state';
import { ExplorationMode } from './components/explorationMode';

function App() {
  return (
    <AppStateProvider>
      <ExplorationMode />
    </AppStateProvider>
  );
}

export default App;
