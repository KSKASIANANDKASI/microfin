import { Fragment, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, space, textStyle } from '../theme';
import { Logo } from './Logo';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Rendered under the form, pinned to the bottom of the scroll content. */
  footer?: ReactNode;
};

/**
 * Splits a translated template like "I agree to the {terms}…" and drops React
 * nodes into its `{placeholders}`, so links keep the sentence's word order in
 * every language. Render the result inside a <Text>.
 */
export function fillTemplate(template: string, nodes: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    const node = name !== undefined && name in nodes ? nodes[name] : part;
    return <Fragment key={index}>{node}</Fragment>;
  });
}

/**
 * Shared shell for every auth screen: safe-area padding, keyboard avoidance,
 * the brand lockup, and a consistent title block.
 */
export function AuthScreen({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space[7], paddingBottom: insets.bottom + space[7] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Logo size={44} />

        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {children}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space[5], gap: space[5] },
  head: { marginTop: space[4] },
  title: { ...textStyle('display', fontFamily.display), color: colors.text },
  subtitle: { ...textStyle('body'), color: colors.textMuted, marginTop: space[2] },
  footer: { marginTop: space[2] },
});
