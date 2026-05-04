import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CardioPage } from './pages/CardioPage';
import { ComparePage } from './pages/ComparePage';
import { ExercisesPage } from './pages/ExercisesPage';
import { FrequencyPage } from './pages/FrequencyPage';
import { ImportPage } from './pages/ImportPage';
import { OverviewPage } from './pages/OverviewPage';
import { PeriodizationPage } from './pages/PeriodizationPage';
import { PRsPage } from './pages/PRsPage';
import { PredictivePage } from './pages/PredictivePage';
import { ProgressionPage } from './pages/ProgressionPage';
import { SettingsPage } from './pages/SettingsPage';
import { VolumePage } from './pages/VolumePage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/frequency" element={<FrequencyPage />} />
            <Route path="/volume" element={<VolumePage />} />
            <Route path="/prs" element={<PRsPage />} />
            <Route path="/progression" element={<ProgressionPage />} />
            <Route path="/periodization" element={<PeriodizationPage />} />
            <Route path="/predictive" element={<PredictivePage />} />
            <Route path="/cardio" element={<CardioPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
