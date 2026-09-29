import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Collection: undefined;
  Customers: undefined;
  Loans: undefined;
  Reports: undefined;
};

export type AppStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Settings: undefined;
  Lines: undefined;
  NewLine: undefined;
  NewCustomer: undefined;
  CustomerView: { customerId: string };
  CustomerProof: { customerId: string };
  /** `customerId` preselects the borrower when arriving from their profile. */
  NewLoan: { customerId?: string } | undefined;
  LoanView: { loanId: string };
  /** `installmentId` is the row on today's collection sheet being receipted. */
  CollectPayment: { installmentId: string };
  Playground: undefined;
  /** `status` opens the queue on a tab other than Pending. */
  Approvals: { status?: 'pending' | 'approved' | 'disbursed' | 'rejected' } | undefined;
  ApprovalView: { applicationId: string };
};
