import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import QuoteApprovalScreen from '../screens/admin/QuoteApprovalScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import LogoutButton from '../components/LogoutButton';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: '👑 Vua Sửa Chữa — Admin',
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen
        name="QuoteApproval"
        component={QuoteApprovalScreen}
        options={{
          title: 'Phê duyệt báo giá',
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Tài khoản',
          headerRight: () => <LogoutButton />,
        }}
      />
    </Stack.Navigator>
  );
}
