import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  UserModel? _userModel;
  bool _isLoading = false;

  UserModel? get userModel => _userModel;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => FirebaseAuth.instance.currentUser != null;

  AuthProvider() {
    FirebaseAuth.instance.authStateChanges().listen((User? user) async {
      if (user != null) {
        _userModel = await _authService.getUserData(user.uid);
      } else {
        _userModel = null;
      }
      notifyListeners();
    });
  }

  Future<void> signUp(String email, String password, String name) async {
    _isLoading = true;
    notifyListeners();
    try {
      await _authService.signUp(email, password, name);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signIn(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      await _authService.signIn(email, password);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithGoogle() async {
    _isLoading = true;
    notifyListeners();
    try {
      await _authService.signInWithGoogle();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await _authService.signOut();
  }

  Future<void> toggleWishlist(String productId) async {
    if (_userModel == null) return;
    final updatedWishlist = List<String>.from(_userModel!.wishlist);
    if (updatedWishlist.contains(productId)) {
      updatedWishlist.remove(productId);
    } else {
      updatedWishlist.add(productId);
    }
    // Update local state first for responsiveness
    _userModel = UserModel(
      uid: _userModel!.uid,
      email: _userModel!.email,
      name: _userModel!.name,
      phoneNumber: _userModel!.phoneNumber,
      profileImageUrl: _userModel!.profileImageUrl,
      isAdmin: _userModel!.isAdmin,
      wishlist: updatedWishlist,
    );
    notifyListeners();
    await _authService.updateUserData(_userModel!);
  }
}
