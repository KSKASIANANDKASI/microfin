import { t } from '@lms/i18n';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, fontFamily, palette, radius, space, textStyle, type } from '../theme';
import { clearPortfolio, notifications, user } from '../lib/data';
import { usePortfolio } from '../lib/usePortfolio';
import { clearSession } from '../lib/session';
import { LogoMark } from './Logo';
import { BellIcon, ChevronDownIcon, GearIcon, IdIcon, LogOutIcon } from './icons';

type Panel = 'notifications' | 'profile' | null;

/** Company name on the left; notifications, settings and profile on the right. */
export function TopBar() {
  usePortfolio();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [panel, setPanel] = useState<Panel>(null);
  const unread = notifications.filter((n) => n.unread).length;

  const close = () => setPanel(null);

  return (
    <View style={[styles.bar, { paddingTop: insets.top + space[2] }]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <LogoMark size={32} />
          <Text style={styles.name} numberOfLines={1}>
            Finance Easy
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setPanel('notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unread ? t('common.topbar.notificationsUnread', { count: unread }) : t('common.topbar.notifications')
            }
            hitSlop={4}
          >
            <BellIcon />
            {unread ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel={t('common.nav.settings')}
            hitSlop={4}
          >
            <GearIcon />
          </Pressable>

          <Pressable
            style={styles.profileBtn}
            onPress={() => setPanel('profile')}
            accessibilityRole="button"
            accessibilityLabel={t('common.topbar.profileMenu')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.initials}</Text>
            </View>
            <ChevronDownIcon />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={panel !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('common.topbar.closeMenu')}>
          {/* Stop the press from bubbling so taps inside the sheet don't dismiss it. */}
          <Pressable
            style={[styles.sheet, { top: insets.top + 56 }]}
            onPress={() => {}}
            accessibilityViewIsModal
          >
            {panel === 'notifications' ? (
              <>
                <View style={styles.sheetHead}>
                  <Text style={styles.sheetTitle}>{t('common.topbar.notifications')}</Text>
                  <Text style={styles.link}>{t('common.topbar.markAllRead')}</Text>
                </View>
                <ScrollView style={styles.notifScroll}>
                  {notifications.map((item) => (
                    <View key={item.id} style={styles.notif}>
                      <View style={[styles.notifDot, item.unread && styles.notifDotOn]} />
                      <View style={styles.flex}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.notifBody}>{item.body}</Text>
                        <Text style={styles.notifAt}>{item.at}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.identity}>
                  <View style={[styles.avatar, styles.avatarLg]}>
                    <Text style={styles.avatarText}>{user.initials}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.notifTitle}>{user.name}</Text>
                    <Text style={styles.notifBody}>{user.branch}</Text>
                  </View>
                </View>
                <MenuItem icon={<IdIcon />} label={t('common.topbar.myProfile')} onPress={close} />
                <MenuItem
                  icon={<GearIcon size={16} />}
                  label={t('common.nav.settings')}
                  onPress={() => {
                    close();
                    navigation.navigate('Settings');
                  }}
                />
                <View style={styles.rule} />
                <MenuItem
                  icon={<LogOutIcon />}
                  label={t('common.topbar.signOut')}
                  danger
                  onPress={() => {
                    close();
                    clearSession();
                    clearPortfolio();
                    // The bar sits above the tabs, so this is already the root stack.
                    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                  }}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {icon}
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: space[2],
    paddingHorizontal: space[4],
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[3], flexShrink: 1 },
  name: {
    fontFamily: fontFamily.display,
    fontSize: type.h3.size,
    color: colors.brand,
    letterSpacing: -0.2,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: palette.white, fontSize: 10, fontFamily: fontFamily.bodyBold },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingLeft: space[1] },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLg: { width: 40, height: 40 },
  avatarText: {
    color: palette.white,
    fontFamily: fontFamily.bodyBold,
    fontSize: type.caption.size,
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(4, 22, 47, 0.28)' },
  sheet: {
    position: 'absolute',
    right: space[4],
    width: 300,
    maxHeight: 420,
    padding: space[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    ...elevation('card'),
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space[3],
  },
  sheetTitle: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  link: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  notifScroll: { maxHeight: 320 },
  notif: { flexDirection: 'row', gap: space[3], padding: space[3] },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  notifDotOn: { backgroundColor: colors.accent },
  notifTitle: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  notifBody: { ...textStyle('caption'), color: colors.textMuted },
  notifAt: { ...textStyle('caption'), color: colors.textFaint, marginTop: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space[2],
    marginHorizontal: space[3],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.sm,
  },
  menuItemPressed: { backgroundColor: colors.bg },
  menuLabel: { ...textStyle('bodySm'), color: colors.text },
  menuLabelDanger: { color: colors.danger },
});
