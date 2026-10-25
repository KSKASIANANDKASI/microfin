import { t } from '@lms/i18n';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../components/TopBar';
import { CollectionScreen } from '../screens/CollectionScreen';
import { CustomersScreen } from '../screens/CustomersScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { HomeIcon, LedgerIcon, ReportIcon, UsersIcon, WalletIcon } from '../components/icons';
import { isManager } from '../lib/session';
import { colors, fontFamily, space, type } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS = {
  Dashboard: HomeIcon,
  Collection: WalletIcon,
  Customers: UsersIcon,
  Loans: LedgerIcon,
  Reports: ReportIcon,
} as const;

/** Top header above the tabs; bottom bar for Dashboard / Collection / Customers / Loans / Reports. */
export function MainTabs() {
  // The bar sits flush with the screen edge, so it has to lift its own content
  // clear of the Android gesture pill / nav buttons and the iOS home indicator.
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            height: 62 + space[3] + insets.bottom,
            paddingTop: space[2],
            paddingBottom: space[3] + insets.bottom,
          },
          // Five tabs leave ~70pt each; long Tamil labels shrink to fit on one line rather than clip.
          tabBarLabel: ({ color, children }) => (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ color, fontFamily: fontFamily.bodySemibold, fontSize: type.caption.size, paddingHorizontal: 2 }}
            >
              {children}
            </Text>
          ),
          tabBarIcon: ({ color }) => {
            const Icon = ICONS[route.name];
            return <Icon color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('common.nav.dashboard') }} />
        <Tab.Screen name="Collection" component={CollectionScreen} options={{ title: t('common.nav.collection') }} />
        <Tab.Screen name="Customers" component={CustomersScreen} options={{ title: t('common.nav.customers') }} />
        <Tab.Screen name="Loans" component={LoansScreen} options={{ title: t('common.nav.loans') }} />
        {/* Every report is manager-only in the API. */}
        {isManager() ? (
          <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: t('common.nav.reports') }} />
        ) : null}
      </Tab.Navigator>
    </View>
  );
}
