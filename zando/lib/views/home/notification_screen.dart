import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../providers/notification_provider.dart';
import '../../models/notification_model.dart';
import '../../utils/constants.dart';
import '../profile/order_history_screen.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser != null) {
        Provider.of<NotificationProvider>(context, listen: false).init(currentUser.uid);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;
    final notificationProvider = Provider.of<NotificationProvider>(context);

    if (currentUser == null) {
      return const Scaffold(
        body: Center(child: Text('Please log in to view notifications.')),
      );
    }

    final allNotifications = notificationProvider.notifications;
    final filteredNotifications = _filterNotifications(allNotifications);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.black),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
        actions: [
          if (filteredNotifications.isNotEmpty) ...[
            TextButton.icon(
              onPressed: () => notificationProvider.markAllAsRead(currentUser.uid),
              icon: const Icon(Icons.done_all, size: 18, color: AppColors.primary),
              label: const Text(
                'Mark read',
                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined, color: Colors.red),
              tooltip: 'Clear All',
              onPressed: () => _showClearAllDialog(context, notificationProvider, currentUser.uid),
            ),
            const SizedBox(width: 8),
          ]
        ],
      ),
      body: Column(
        children: [
          _buildFilterChips(),
          const Divider(height: 1, color: Color(0xFFF1F1F1)),
          Expanded(
            child: notificationProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredNotifications.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        itemCount: filteredNotifications.length,
                        physics: const BouncingScrollPhysics(),
                        itemBuilder: (context, index) {
                          final notification = filteredNotifications[index];
                          return _buildNotificationItem(context, notification, currentUser.uid, notificationProvider);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  List<NotificationModel> _filterNotifications(List<NotificationModel> list) {
    switch (_selectedFilter) {
      case 'Unread':
        return list.where((n) => !n.isRead).toList();
      case 'Orders':
        return list.where((n) => n.type == 'order').toList();
      case 'Promos':
        return list.where((n) => n.type == 'promo').toList();
      case 'All':
      default:
        return list;
    }
  }

  Widget _buildFilterChips() {
    final filters = ['All', 'Unread', 'Orders', 'Promos'];
    return Container(
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = _selectedFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(
                filter,
                style: TextStyle(
                  color: isSelected ? Colors.black : Colors.grey[700],
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _selectedFilter = filter;
                  });
                }
              },
              selectedColor: AppColors.accent, // Neon Yellow
              backgroundColor: Colors.grey[100],
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              side: BorderSide.none,
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotificationItem(
    BuildContext context,
    NotificationModel notification,
    String userId,
    NotificationProvider provider,
  ) {
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) {
        provider.deleteNotification(userId, notification.id);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification deleted'), duration: Duration(seconds: 2)),
        );
      },
      background: Container(
        color: Colors.red.shade600,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: const Icon(Icons.delete_outline, color: Colors.white, size: 28),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: notification.isRead ? Colors.white : const Color(0xFFFFF9E6),
          border: const Border(
            bottom: BorderSide(color: Color(0xFFF1F1F1), width: 1),
          ),
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200, width: 1),
            ),
            padding: const EdgeInsets.all(4),
            child: Image.asset(
              'assets/images/zando_logo.png',
              fit: BoxFit.contain,
            ),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  notification.title,
                  style: TextStyle(
                    fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
                    fontSize: 15,
                    color: Colors.black,
                  ),
                ),
              ),
              if (!notification.isRead)
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                notification.body,
                style: TextStyle(
                  color: Colors.grey[800],
                  fontSize: 13,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _getRelativeTime(notification.timestamp),
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          onTap: () {
            if (!notification.isRead) {
              provider.markAsRead(userId, notification.id);
            }
            _handleNavigation(context, notification);
          },
        ),
      ),
    );
  }



  String _getRelativeTime(DateTime dateTime) {
    final duration = DateTime.now().difference(dateTime);
    if (duration.inMinutes < 1) {
      return 'Just now';
    } else if (duration.inMinutes < 60) {
      return '${duration.inMinutes}m ago';
    } else if (duration.inHours < 24) {
      return '${duration.inHours}h ago';
    } else if (duration.inDays < 7) {
      return '${duration.inDays}d ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }

  void _handleNavigation(BuildContext context, NotificationModel notification) {
    if (notification.type == 'order') {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
      );
    }
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.notifications_off_outlined,
                size: 80,
                color: Colors.grey[300],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'All caught up!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black),
            ),
            const SizedBox(height: 8),
            Text(
              'You have no notifications in this category.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Go Back', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _showClearAllDialog(BuildContext context, NotificationProvider provider, String userId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear all notifications?'),
        content: const Text('This will permanently delete all notifications from this list.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              provider.clearAll(userId);
              Navigator.pop(context);
            },
            child: const Text('Clear All', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
