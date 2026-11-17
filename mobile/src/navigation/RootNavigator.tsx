import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Role-based app navigators
import TechnicianTabs from './TechnicianTabs';
import CustomerTabs from './CustomerTabs';
import AdminStack from './AdminStack';
import ReceptionistStack from './ReceptionistStack';
import WarehouseStack from './WarehouseStack';
import AccountantStack from './AccountantStack';

const Stack = createNativeStackNavigator();

/** Điều hướng gốc: quyết định AuthStack hay AppStack theo trạng thái đăng nhập và vai trò */
export default function RootNavigator() {
  const { isAuthenticated, isLoading, primaryRole } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1d4ed8' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Chưa đăng nhập: Cho phép chuyển giữa Login và Register
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : primaryRole === 'CUSTOMER' ? (
          // Khách hàng
          <Stack.Screen name="CustomerApp" component={CustomerTabs} />
        ) : primaryRole === 'ADMIN' || primaryRole === 'MANAGER' ? (
          // Admin / Quản lý
          <Stack.Screen name="AdminApp" component={AdminStack} />
        ) : primaryRole === 'RECEPTIONIST' ? (
          // Lễ tân
          <Stack.Screen name="ReceptionistApp" component={ReceptionistStack} />
        ) : primaryRole === 'WAREHOUSE_STAFF' ? (
          // Thủ kho
          <Stack.Screen name="WarehouseApp" component={WarehouseStack} />
        ) : primaryRole === 'ACCOUNTANT' ? (
          // Kế toán
          <Stack.Screen name="AccountantApp" component={AccountantStack} />
        ) : (
          // Kỹ thuật viên (mặc định cho các vai trò kỹ thuật)
          <Stack.Screen name="TechApp" component={TechnicianTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
