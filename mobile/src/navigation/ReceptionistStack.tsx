import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReceptionistDashboardScreen from '../screens/receptionist/ReceptionistDashboardScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

export default function ReceptionistStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="ReceptionistDashboard"
        component={ReceptionistDashboardScreen}
        options={{ title: '🗒 Tiếp Nhận — Lễ Tân' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Tài khoản Lễ tân' }}
      />
    </Stack.Navigator>
  );
}
