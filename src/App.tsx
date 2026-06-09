import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SchichtplanPage from '@/pages/SchichtplanPage';
import SchichtplanDetailPage from '@/pages/SchichtplanDetailPage';
import MitarbeitendePage from '@/pages/MitarbeitendePage';
import MitarbeitendeDetailPage from '@/pages/MitarbeitendeDetailPage';
import PublicFormSchichtplan from '@/pages/public/PublicForm_Schichtplan';
import PublicFormMitarbeitende from '@/pages/public/PublicForm_Mitarbeitende';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a26d437aa06a821653cb480" element={<PublicFormSchichtplan />} />
              <Route path="public/6a26d4338b9ba3ce84ee6789" element={<PublicFormMitarbeitende />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="schichtplan" element={<SchichtplanPage />} />
                <Route path="schichtplan/:id" element={<SchichtplanDetailPage />} />
                <Route path="mitarbeitende" element={<MitarbeitendePage />} />
                <Route path="mitarbeitende/:id" element={<MitarbeitendeDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
