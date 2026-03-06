import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    { label: 'New Chat', icon: 'chatbubble-outline', action: () => router.push('/conversation?new=true') },
    { label: 'Log Food', icon: 'restaurant-outline', action: () => router.push('/log-food') },
    { label: 'New Workout', icon: 'barbell-outline', action: () => console.log('New Workout') },
  ];

  const handleMenuItemPress = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.dark,
          tabBarShowLabel: false,
          tabBarItemStyle: { marginRight: 10 },
        }}>
        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Workouts',
            tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="calories"
          options={{
            title: 'Calories',
            tabBarIcon: ({ color, size }) => <Ionicons name="nutrition" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" size={24} color={color} />,
          }}
        />
      </Tabs>
      
      <TouchableOpacity 
        style={styles.addButton}
        onLongPress={() => setShowMenu(true)}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item.action)}
              >
                <Ionicons name={item.icon as any} size={20} color={Colors.dark} />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  tabBar: {
    position: 'absolute',
    bottom: 8,
    width: '80%',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    height: 60,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: Colors.dark,
    fontWeight: '500',
  },
});
