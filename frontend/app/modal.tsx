import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FONTS } from '@/constants/Colors';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.surface,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: Colors.onSurface,
  },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: Colors.primary,
  },
});
