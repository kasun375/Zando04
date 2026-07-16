import 'package:flutter/material.dart';
import '../models/order_model.dart';
import '../services/firestore_service.dart';

class OrderProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  List<OrderModel> _orders = [];
  List<OrderModel> _userOrders = [];
  bool _isLoading = false;

  List<OrderModel> get orders => _orders;
  List<OrderModel> get userOrders => _userOrders;
  bool get isLoading => _isLoading;

  void fetchAllOrders() {
    _isLoading = true;
    _firestoreService.getAllOrders().listen((orders) {
      _orders = orders;
      _isLoading = false;
      notifyListeners();
    });
  }

  void fetchUserOrders(String userId) {
    _isLoading = true;
    _firestoreService.getUserOrders(userId).listen((orders) {
      _userOrders = orders;
      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> placeOrder(OrderModel order) async {
    await _firestoreService.placeOrder(order);
    notifyListeners();
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    await _firestoreService.updateOrderStatus(orderId, status);
  }
}
