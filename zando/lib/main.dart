import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'providers/auth_provider.dart';
import 'providers/product_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/order_provider.dart';
import 'providers/banner_provider.dart';
import 'providers/notification_provider.dart';
import 'utils/constants.dart';
import 'firebase_options.dart';
import 'views/auth/welcome_screen.dart';
import 'views/auth/splash_screen.dart';
import 'views/home/home_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!kIsWeb) {
    try {
      await MobileAds.instance.initialize();
    } catch (e) {
      debugPrint('Mobile Ads SDK initialization failed: $e');
    }
  }

  // ── Stripe publishable key (safe to be in client code) ──
  Stripe.publishableKey =
      'pk_live_51Ted5APDNJFdc8fiVuKPhOpSNZblzFGXW9FSUEUiOdC5YWgplyJ23EHagAyJqN2GOn3HXl4uMeYXsGhDLOWYFizC00hUBu6tBU';
  await Stripe.instance.applySettings();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    try {
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    } catch (e) {
      debugPrint('Firebase Messaging background handler not supported on this platform: $e');
    }

    // NotificationService is initialized inside HomeScreen with context to support provider & custom slide banners.
  } catch (e) {
    debugPrint('Firebase initialization failed: $e');
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => BannerProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: MaterialApp(
        navigatorKey: NotificationService.navigatorKey,
        title: 'ZANDO',
        debugShowCheckedModeBanner: false,
        theme: AppThemes.lightTheme,
        home: const SplashScreen(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    if (authProvider.isAuthenticated) {
      return const HomeScreen();
    } else {
      return const WelcomeScreen();
    }
  }
}
