import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF2E062B); // Deep plum/purple
  static const Color secondary = Color(0xFFE5E5E5);
  static const Color accent = Color(0xFFFFFF00); // Neon/bright yellow
  static const Color background = Color(0xFFF8F9FA);
  static const Color textBody = Color(0xFF333333);
  static const Color textHead = Color(0xFF1A1A1A);
  static const Color error = Color(0xFFDC3545);
  static const Color success = Color(0xFF28A745);
  
  // Custom UI colors from mockup
  static const Color creamCard = Color(0xFFFFF2CC); // Light beige/cream card
  static const Color productCard = Color(0xFFB1A7B4); // Lavender/grey product card
  static const Color navBar = Color(0xFFE0E0E0); // Bottom nav background
  static const Color navBarIcon = Color(0xFF000000); // Bottom nav icon color
}



class AppThemes {
  static final ThemeData lightTheme = ThemeData(
    primaryColor: AppColors.primary,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      secondary: AppColors.accent,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: AppColors.primary,
      elevation: 0,
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        color: AppColors.textHead,
        fontWeight: FontWeight.bold,
        fontSize: 32,
      ),
      headlineMedium: TextStyle(
        color: AppColors.textHead,
        fontWeight: FontWeight.bold,
        fontSize: 24,
      ),
      bodyLarge: TextStyle(
        color: AppColors.textBody,
        fontSize: 16,
      ),
      bodyMedium: TextStyle(
        color: AppColors.textBody,
        fontSize: 14,
      ),
    ),
  );
}

class AppConstants {
  static const String vapidKey = 'YOUR_PUBLIC_VAPID_KEY';
  static const List<String> categories = [
    'Mobile Phones',
    'Electronics',
    'Home Appliances',
    'Fashion',
    'Cake Shop',
    'Pooja Banda',
    'Chocolets',
    'Flower Shop',
    'Grocery Items',
  ];
}
