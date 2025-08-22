import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/pages/HomePage';
import AnalysisTypePage from './components/pages/AnalysisTypePage';
import AnalysisWorkflowPage from './components/pages/AnalysisWorkflowPage';
import ReportPage from './components/pages/ReportPage';
import DummyReportPage from './components/pages/DummyReportPage';
import PlaceholderPage from './components/pages/PlaceholderPage';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen font-sans bg-slate-100 text-slate-800">
        <div className="container mx-auto px-4 py-6">
          <Header />
          <main className="mt-8 flex gap-8">
            <Sidebar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/analysis-type/abdomen-pelvis" element={<AnalysisTypePage />} />
                <Route path="/analysis-workflow/tumor-morphology" element={<AnalysisWorkflowPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/dummy-report/:type" element={<DummyReportPage />} />
                <Route path="/placeholder" element={<PlaceholderPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
