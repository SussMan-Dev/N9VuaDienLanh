import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import CustomerOrderListScreen from '../screens/customer/CustomerOrderListScreen';
import CreateBookingScreen from '../screens/customer/CreateBookingScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import WarrantyScreen from '../screens/customer/WarrantyScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import LogoutButton from '../components/LogoutButton';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

function CustomerBottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#1d4ed8',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tab.Screen
        name="MyOrders"
        component={CustomerOrderListScreen}
        options={{
          title: 'Đơn của tôi',
          tabBarIcon: icon('📋'),
          headerRight: () => <LogoutButton />,
        }}
      />
      <Tab.Screen
        name="CreateBooking"
        component={CreateBookingScreen}
        options={{
          title: 'Đặt lịch sửa',
          tabBarIcon: icon('📅'),
          headerRight: () => <LogoutButton />,
        }}
      />
      <Tab.Screen
        name="Warranty"
        component={WarrantyScreen}
        options={{
          title: 'Bảo hành',
          tabBarIcon: icon('🛡'),
          headerRight: () => <LogoutButton />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Tài khoản',
          tabBarIcon: icon('👤'),
          headerRight: () => <LogoutButton />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function CustomerTabs() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
        headerBackTitle: 'Quay lại',
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen
        name="CustomerMainTabs"
        component={CustomerBottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{ title: 'Tiến trình Sửa chữa' }}
      />
      <Stack.Screen
        name="BookingForm"
        component={CreateBookingScreen}
        options={{ title: 'Đặt lịch sửa chữa' }}
      />
    </Stack.Navigator>
  );
}
