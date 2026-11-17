import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Screens
import WorkOrderListScreen from '../screens/technician/WorkOrderListScreen';
import WorkOrderDetailScreen from '../screens/technician/WorkOrderDetailScreen';
import CameraLogScreen from '../screens/technician/CameraLogScreen';
import QuoteBuilderScreen from '../screens/technician/QuoteBuilderScreen';
import PartsRequestScreen from '../screens/technician/PartsRequestScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import LogoutButton from '../components/LogoutButton';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

// Bottom Tabs chính cho KTV
function TechnicianBottomTabs() {
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
        name="WorkOrders"
        component={WorkOrderListScreen}
        options={{
          title: 'Đơn của tôi',
          tabBarIcon: icon('🔧'),
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

// Stack Navigator bọc ngoài hỗ trợ push màn hình chi tiết
export default function TechnicianTabs() {
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
        name="TechMainTabs"
        component={TechnicianBottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkOrderDetail"
        component={WorkOrderDetailScreen}
        options={{ title: 'Chi tiết Phiếu Sửa Chữa' }}
      />
      <Stack.Screen
        name="CameraLog"
        component={CameraLogScreen}
        options={{ title: 'Chụp ảnh & Nhật ký' }}
      />
      <Stack.Screen
        name="QuoteBuilder"
        component={QuoteBuilderScreen}
        options={{ title: 'Lập Báo Giá' }}
      />
      <Stack.Screen
        name="PartsRequest"
        component={PartsRequestScreen}
        options={{ title: 'Yêu Cầu Linh Kiện Kho' }}
      />
    </Stack.Navigator>
  );
}
