import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './components/layout/AppSidebar';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Transactions from './pages/Transactions';
import Financials from './pages/Financials';
import DataAnalytics from './pages/DataAnalytics';
import ImportScreen from './pages/ImportScreen';
import InvoiceQuote from './pages/InvoiceQuote';
import QuantChat from './pages/QuantChat';
import ProfileSetup from './pages/ProfileSetup';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import Projections from './pages/Projections';
import Accounting from './pages/Accounting';
import PersonelSetup from './pages/PersonelSetup';
import PayrollDashboard from './components/payroll/PayrollDashboard';
import POSScreen from './pages/POS';
import { DocumentManagement } from './pages/DocumentManagement';
import { FinancialsProvider } from './contexts/FinancialsContext';

// NEW IMPORTS FOR AUTHENTICATION
import { LoginPage, AuthProvider, useAuth } from './LoginPage'; // Assuming LoginPage.tsx is in the same directory

// PrivateRoute component to protect routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className='min-h-screen flex w-full'>
      {/* Only show sidebar if authenticated */}
      {isAuthenticated && <AppSidebar />}
      <SidebarInset className='flex-1'>
        <FinancialsProvider>
          <Routes>
            {/* Public route for login */}
            <Route path='/login' element={<LoginPage />} />

            {/* Protected routes */}
            <Route path='/' element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path='/tasks' element={<PrivateRoute><Tasks /></PrivateRoute>} />
            <Route path='/transactions' element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path='/financials' element={<PrivateRoute><Financials /></PrivateRoute>} />
            <Route path='/analytics' element={<PrivateRoute><DataAnalytics /></PrivateRoute>} />
            <Route path='/import' element={<PrivateRoute><ImportScreen /></PrivateRoute>} />
            <Route path='/invoice-quote' element={<PrivateRoute><InvoiceQuote /></PrivateRoute>} />
            <Route path='/payroll' element={<PrivateRoute><PayrollDashboard /></PrivateRoute>} />
            <Route path='/quant-chat' element={<PrivateRoute><QuantChat /></PrivateRoute>} />
            <Route path='/projections' element={<PrivateRoute><Projections /></PrivateRoute>} />
            <Route path='/accounting' element={<PrivateRoute><Accounting /></PrivateRoute>} />
            <Route path='/pos' element={<PrivateRoute><POSScreen /></PrivateRoute>} />
            <Route path='/documents' element={<PrivateRoute><DocumentManagement/></PrivateRoute>} />
            <Route path='/personel-setup' element={<PrivateRoute><PersonelSetup /></PrivateRoute>} />
            <Route path='/profile-setup' element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
            
            {/* Redirect any other unmatched routes to login if not authenticated, or to dashboard if authenticated */}
            <Route path='*' element={isAuthenticated ? <Navigate to="/" /> : <Navigate to="/login" />} />
          </Routes>
        </FinancialsProvider>
      </SidebarInset>
    </div>
  );
};

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AuthProvider> {/* Wrap the entire app with AuthProvider */}
        <SidebarProvider>
          <AppContent /> {/* Render AppContent which uses AuthContext */}
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
