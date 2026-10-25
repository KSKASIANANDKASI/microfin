import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ApprovalView } from './pages/ApprovalView';
import { Approvals } from './pages/Approvals';
import { CollectPayment } from './pages/CollectPayment';
import { ChangePassword } from './pages/ChangePassword';
import { Collection } from './pages/Collection';
import { CustomerLocation } from './pages/CustomerLocation';
import { CustomerProof } from './pages/CustomerProof';
import { CustomerView } from './pages/CustomerView';
import { Customers } from './pages/Customers';
import { Dashboard } from './pages/Dashboard';
import { NewCustomer } from './pages/NewCustomer';
import { ForgotPassword } from './pages/ForgotPassword';
import { LineRoute } from './pages/LineRoute';
import { Lines } from './pages/Lines';
import { LoanView } from './pages/LoanView';
import { Loans } from './pages/Loans';
import { NewLine } from './pages/NewLine';
import { NewLoan } from './pages/NewLoan';
import { Playground } from './pages/Playground';
import { Insights } from './pages/Insights';
import { Reports } from './pages/Reports';
import { ResetPassword } from './pages/ResetPassword';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { isManager } from './lib/session';

/** Pages a loan officer has no use for: the API refuses them, so send officers home instead. */
function ManagersOnly() {
  return isManager() ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/collection/route" element={<LineRoute />} />
        <Route path="/collection/:id" element={<CollectPayment />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/calculator" element={<Playground />} />
        <Route path="/lines" element={<Lines />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/new" element={<NewCustomer />} />
        <Route path="/customers/:id" element={<CustomerView />} />
        <Route path="/customers/:id/proof" element={<CustomerProof />} />
        <Route path="/customers/:id/location" element={<CustomerLocation />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/new" element={<NewLoan />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/approvals/:id" element={<ApprovalView />} />
        <Route path="/loans/:id" element={<LoanView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/password" element={<ChangePassword />} />

        <Route element={<ManagersOnly />}>
          <Route path="/reports" element={<Reports />} />
          <Route path="/lines/new" element={<NewLine />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
