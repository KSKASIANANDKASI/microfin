import type { NavigatorScreenParams } from '@react-navigation/native';
import type { IdType } from '../lib/data';

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
  ChangePassword: undefined;
  Lines: undefined;
  NewLine: undefined;
  NewCustomer: undefined;
  CustomerView: { customerId: string };
  /** `type` opens that proof for editing; without it the screen adds a new one. */
  CustomerProof: { customerId: string; type?: IdType };
  CustomerLocation: { customerId: string };
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
