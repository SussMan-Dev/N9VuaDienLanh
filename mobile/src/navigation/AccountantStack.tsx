import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountantDashboardScreen from '../screens/accountant/AccountantDashboardScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

export default function AccountantStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="AccountantDashboard"
        component={AccountantDashboardScreen}
        options={{ title: '💰 Thu Ngân — Kế Toán' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Tài khoản Kế toán' }}
      />
    </Stack.Navigator>
  );
}
