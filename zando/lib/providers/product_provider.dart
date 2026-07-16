import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../models/product_model.dart';
import '../services/firestore_service.dart';
import '../services/google_sheets_service.dart';
import '../utils/constants.dart';

class ProductProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  List<ProductModel> _products = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String _selectedCategory = 'All';

  List<ProductModel> get products {
    return _products.where((p) {
      final matchesSearch = p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.shop.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategoryOrShop = _selectedCategory == 'All' ||
          p.category == _selectedCategory ||
          p.shop == _selectedCategory;
      return matchesSearch && matchesCategoryOrShop;
    }).toList();
  }

  List<String> get categories {
    final uniqueCategories = _products
        .map((p) => p.category)
        .where((c) => c.isNotEmpty)
        .toSet()
        .toList();
    final uniqueShops = _products
        .map((p) => p.shop)
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();
    final all = <String>{
      ...AppConstants.categories,
      ...uniqueCategories,
      ...uniqueShops,
    }.toList();
    return ['All', ...all];
  }

  List<String> get shops {
    final uniqueShops = _products
        .map((p) => p.shop)
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();
    return uniqueShops;
  }

  bool get isLoading => _isLoading;

  ProductProvider() {
    _loadProducts();
  }

  void _loadProducts() {
    _isLoading = true;
    _firestoreService.getProducts().listen((products) {
      _products = products;
      _isLoading = false;
      notifyListeners();
    });
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  Future<void> addProduct(ProductModel product) async {
    await _firestoreService.addProduct(product);
  }

  Future<void> updateProduct(ProductModel product) async {
    await _firestoreService.updateProduct(product);
  }

  Future<void> syncFromGoogleSheets() async {
    _isLoading = true;
    notifyListeners();
    try {
      final googleSheetsService = GoogleSheetsService();
      final sheetProducts = await googleSheetsService.fetchProducts();

      // For simplicity, we'll replace existing products in Firestore with the Sheet data
      // OR you can just add missing ones. Usually, the Sheet is the "Source of Truth".
      
      // OPTIONAL: Delete existing products in Firestore first to ensure a clean sync
      final currentProducts = await _firestoreService.getProducts().first;
      for (var p in currentProducts) {
        await _firestoreService.deleteProduct(p.id);
      }

      // Add all products from the sheet
      for (var product in sheetProducts) {
        await _firestoreService.addProduct(product);
      }
      
      debugPrint('Sync from Google Sheets completed successfully. Added ${sheetProducts.length} products.');
    } catch (e) {
      debugPrint('Sync failed: $e');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteProduct(String id) async {
    await _firestoreService.deleteProduct(id);
  }
}
