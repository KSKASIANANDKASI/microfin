import { t } from '@lms/i18n';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fontFamily } from '../theme';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { ApprovalViewScreen } from '../screens/ApprovalViewScreen';
import { ApprovalsScreen } from '../screens/ApprovalsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { CollectPaymentScreen } from '../screens/CollectPaymentScreen';
import { CustomerLocationScreen } from '../screens/CustomerLocationScreen';
import { CustomerProofScreen } from '../screens/CustomerProofScreen';
import { CustomerViewScreen } from '../screens/CustomerViewScreen';
import { LinesScreen } from '../screens/LinesScreen';
import { LoanViewScreen } from '../screens/LoanViewScreen';
import { customerById } from '../lib/data';
import { getSession } from '../lib/session';
import { NewCustomerScreen } from '../screens/NewCustomerScreen';
import { NewLineScreen } from '../screens/NewLineScreen';
import { NewLoanScreen } from '../screens/NewLoanScreen';
import { PlaygroundScreen } from '../screens/PlaygroundScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/** Shared header for the screens pushed above the tabs. */
function subScreen(title: string) {
  return {
    headerShown: true,
    title,
    headerTitleStyle: { fontFamily: fontFamily.bodySemibold, color: colors.text },
    headerTintColor: colors.brand,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.bgElevated },
  } as const;
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={getSession() ? 'Main' : 'Auth'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={subScreen(t('common.nav.settings'))} />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={subScreen(t('settings.changePassword.title'))}
      />
      <Stack.Screen name="NewLine" component={NewLineScreen} options={subScreen(t('common.screens.newLine'))} />
      <Stack.Screen name="Lines" component={LinesScreen} options={subScreen(t('common.nav.lines'))} />
      <Stack.Screen
        name="NewCustomer"
        component={NewCustomerScreen}
        options={subScreen(t('common.screens.newCustomer'))}
      />
      <Stack.Screen
        name="CustomerView"
        component={CustomerViewScreen}
        options={({ route }) => subScreen(customerById(route.params.customerId)?.name ?? t('common.screens.customer'))}
      />
      <Stack.Screen
        name="CustomerProof"
        component={CustomerProofScreen}
        options={subScreen(t('common.screens.identityProof'))}
      />
      <Stack.Screen
        name="CustomerLocation"
        component={CustomerLocationScreen}
        options={subScreen(t('common.screens.doorstepPin'))}
      />
      <Stack.Screen name="NewLoan" component={NewLoanScreen} options={subScreen(t('common.screens.newLoan'))} />
      <Stack.Screen
        name="LoanView"
        component={LoanViewScreen}
        options={({ route }) => subScreen(route.params.loanId)}
      />
      <Stack.Screen
        name="CollectPayment"
        component={CollectPaymentScreen}
        options={subScreen(t('common.screens.collectPayment'))}
      />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} options={subScreen(t('common.nav.approvals'))} />
      <Stack.Screen
        name="ApprovalView"
        component={ApprovalViewScreen}
        options={({ route }) => subScreen(route.params.applicationId)}
      />
      <Stack.Screen
        name="Playground"
        component={PlaygroundScreen}
        options={subScreen(t('common.nav.calculator'))}
      />
    </Stack.Navigator>
  );
}
