import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../utils/constants.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import '../firebase_options.dart';
import '../models/notification_model.dart';
import 'firestore_service.dart';
import '../providers/auth_provider.dart';
import '../views/profile/order_history_screen.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint("Handling a background message: ${message.messageId}");
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    final userId = FirebaseAuth.instance.currentUser?.uid;
    if (userId != null) {
      final title =
          message.notification?.title ??
          message.data['title'] ??
          'New Notification';
      final body = message.notification?.body ?? message.data['body'] ?? '';
      final type = message.data['type'] ?? 'general';
      final messageId = message.messageId;

      final notification = NotificationModel(
        id: messageId ?? '',
        title: title,
        body: body,
        timestamp: DateTime.now(),
        type: type,
        data: Map<String, dynamic>.from(message.data),
      );

      await FirestoreService().addNotification(userId, notification);
      debugPrint("Background notification saved: $messageId");
    }
  } catch (e) {
    debugPrint('Error saving background notification: $e');
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  FirebaseMessaging? get _fcm {
    try {
      return FirebaseMessaging.instance;
    } catch (_) {
      return null;
    }
  }


  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;
    _isInitialized = true;

    final fcm = _fcm;
    if (fcm == null) {
      debugPrint('Firebase Messaging is not supported or failed to initialize on this platform.');
      return;
    }

    // Capture auth state synchronously before any awaits
    String? initialUserId;
    final initialContext = navigatorKey.currentContext;
    if (initialContext != null) {
      try {
        final authProvider = Provider.of<AuthProvider>(initialContext, listen: false);
        initialUserId = authProvider.userModel?.uid;
      } catch (e) {
        debugPrint('Error getting AuthProvider during initialize: $e');
      }
    }

    try {
      NotificationSettings settings = await fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('User granted permission');
      }
    } catch (e) {
      debugPrint('Error requesting FCM permission: $e');
    }

    if (initialUserId != null) {
      _saveToken(initialUserId);
    }


    FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        _saveToken(user.uid);
      }
    });

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Got a message whilst in the foreground!');
      _saveNotificationToDatabase(message);

      final title =
          message.notification?.title ??
          message.data['title'] ??
          'New Notification';
      final body = message.notification?.body ?? message.data['body'] ?? '';
      showForegroundBanner(title, body, message.data);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('Notification opened app from background!');
      _saveNotificationToDatabase(message);
      _handleNotificationClick(message.data);
    });

    fcm.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        debugPrint('Notification opened app from terminated state!');
        _saveNotificationToDatabase(message);
        _handleNotificationClick(message.data);
      }
    });
  }

  void _saveNotificationToDatabase(RemoteMessage message) {
    final title =
        message.notification?.title ??
        message.data['title'] ??
        'New Notification';
    final body = message.notification?.body ?? message.data['body'] ?? '';
    final type = message.data['type'] ?? 'general';
    final messageId = message.messageId;

    try {
      final userId = FirebaseAuth.instance.currentUser?.uid;
      if (userId != null) {
        final notification = NotificationModel(
          id: messageId ?? '',
          title: title,
          body: body,
          timestamp: DateTime.now(),
          type: type,
          data: Map<String, dynamic>.from(message.data),
        );
        FirestoreService().addNotification(userId, notification);
        debugPrint('Notification saved to database: $messageId');
      } else {
        debugPrint('No authenticated user found, cannot save notification.');
      }
    } catch (e) {
      debugPrint('Error saving notification to database: $e');
    }
  }

  Future<void> _saveToken(String userId) async {
    final fcm = _fcm;
    if (fcm == null) return;
    try {
      String? token;
      if (kIsWeb) {
        if (AppConstants.vapidKey != 'YOUR_PUBLIC_VAPID_KEY') {
          token = await fcm.getToken(vapidKey: AppConstants.vapidKey);
        } else {
          debugPrint('Web VAPID Key is not configured. Web FCM token registration skipped.');
          return;
        }
      } else {
        token = await fcm.getToken();
      }
      if (token != null) {
        await FirestoreService().saveUserFcmToken(userId, token);
        debugPrint('FCM Token saved: $token');
      }
    } catch (e) {
      debugPrint('Error saving FCM Token: $e');
    }
  }

  void showForegroundBanner(
    String title,
    String body,
    Map<String, dynamic> data,
  ) {
    final overlayState = navigatorKey.currentState?.overlay;
    if (overlayState == null) {
      debugPrint('OverlayState is null, cannot show banner.');
      return;
    }
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => SlideDownBanner(
        title: title,
        body: body,
        onTap: () {
          overlayEntry.remove();
          _handleNotificationClick(data);
        },
        onDismiss: () {
          overlayEntry.remove();
        },
      ),
    );

    overlayState.insert(overlayEntry);
  }

  void _handleNotificationClick(Map<String, dynamic> data) {
    final type = data['type'] ?? 'general';
    if (type == 'order') {
      navigatorKey.currentState?.push(
        MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
      );
    }
  }
}

class SlideDownBanner extends StatefulWidget {
  final String title;
  final String body;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const SlideDownBanner({
    super.key,
    required this.title,
    required this.body,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  State<SlideDownBanner> createState() => _SlideDownBannerState();
}

class _SlideDownBannerState extends State<SlideDownBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0.0, -1.5),
      end: const Offset(0.0, 0.0),
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutBack));

    _controller.forward();

    _timer = Timer(const Duration(milliseconds: 4000), () {
      if (mounted) {
        _controller.reverse().then((_) {
          if (mounted) widget.onDismiss();
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: Alignment.topCenter,
        child: SlideTransition(
          position: _offsetAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Material(
              color: Colors.transparent,
              child: GestureDetector(
                onTap: widget.onTap,
                onVerticalDragUpdate: (details) {
                  if (details.delta.dy < -5) {
                    _timer?.cancel();
                    _controller.reverse().then((_) {
                      if (mounted) widget.onDismiss();
                    });
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2E062B),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(4),
                        child: Image.asset(
                          'assets/images/zando_logo.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.body,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.85),
                                fontSize: 13,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(
                          Icons.close,
                          color: Colors.white54,
                          size: 18,
                        ),
                        onPressed: () {
                          _timer?.cancel();
                          _controller.reverse().then((_) {
                            if (mounted) widget.onDismiss();
                          });
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
