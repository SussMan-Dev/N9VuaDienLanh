import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WarehouseDashboardScreen from '../screens/warehouse/WarehouseDashboardScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

export default function WarehouseStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="WarehouseDashboard"
        component={WarehouseDashboardScreen}
        options={{ title: '📦 Quản Lý Kho — Thủ Kho' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Tài khoản Thủ kho' }}
      />
    </Stack.Navigator>
  );
}
