import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'expo-router';

// Placeholder home screen for phase 0. Real screens arrive with i18n,
// the design system and the feature modules in later steps.
export default function HomeScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>SPARC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700' },
});
