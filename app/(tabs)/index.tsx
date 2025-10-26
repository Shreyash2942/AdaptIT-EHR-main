import { Styles } from '@/constants/Styles';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style = {Styles.mainScreen}>
       <Text>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
