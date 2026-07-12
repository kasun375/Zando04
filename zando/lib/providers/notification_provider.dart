import 'dart:async';
import 'package:flutter/material.dart';
import '../models/notification_model.dart';
import '../services/firestore_service.dart';

class NotificationProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  List<NotificationModel> _notifications = [];
  StreamSubscription? _subscription;
  bool _isLoading = false;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  String? _currentUserId;

  void init(String userId) {
    if (_currentUserId == userId && _subscription != null) return;
    _currentUserId = userId;
    _subscription?.cancel();
    _isLoading = true;
    notifyListeners();

    _subscription = _firestoreService.getUserNotifications(userId).listen((data) {
      _notifications = data;
      _isLoading = false;
      notifyListeners();
    }, onError: (e) {
      _isLoading = false;
      notifyListeners();
    });
  }

  void clear() {
    _subscription?.cancel();
    _subscription = null;
    _notifications = [];
    _currentUserId = null;
    notifyListeners();
  }

  Future<void> addNotification(
    String userId,
    String title,
    String body, {
    String type = 'general',
    Map<String, dynamic> data = const {},
  }) async {
    final notification = NotificationModel(
      id: '',
      title: title,
      body: body,
      timestamp: DateTime.now(),
      type: type,
      data: data,
    );
    await _firestoreService.addNotification(userId, notification);
  }

  Future<void> markAsRead(String userId, String notificationId) async {
    await _firestoreService.markNotificationAsRead(userId, notificationId);
  }

  Future<void> markAllAsRead(String userId) async {
    await _firestoreService.markAllNotificationsAsRead(userId);
  }

  Future<void> deleteNotification(String userId, String notificationId) async {
    await _firestoreService.deleteNotification(userId, notificationId);
  }

  Future<void> clearAll(String userId) async {
    await _firestoreService.clearAllNotifications(userId);
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
