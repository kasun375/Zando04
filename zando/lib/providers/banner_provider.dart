import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../models/banner_model.dart';
import '../services/firestore_service.dart';
import '../services/google_sheets_service.dart';

class BannerProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  List<BannerModel> _banners = [];
  bool _isLoading = false;

  List<BannerModel> get banners => _banners;
  bool get isLoading => _isLoading;

  BannerProvider() {
    _loadBanners();
  }

  void _loadBanners() {
    _isLoading = true;
    _firestoreService.getBanners().listen((banners) {
      _banners = banners;
      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> addBanner(BannerModel banner) async {
    await _firestoreService.addBanner(banner);
  }

  Future<void> deleteBanner(String id) async {
    await _firestoreService.deleteBanner(id);
  }

  Future<void> syncFromGoogleSheets({String? sheetId, String? gid}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final googleSheetsService = GoogleSheetsService();
      final sheetBanners = await googleSheetsService.fetchBanners(sheetId: sheetId, gid: gid);

      // Clean sync: Delete existing banners first
      final currentBanners = await _firestoreService.getBanners().first;
      for (var b in currentBanners) {
        await _firestoreService.deleteBanner(b.id);
      }

      // Add all banners from the sheet
      for (var banner in sheetBanners) {
        await _firestoreService.addBanner(banner);
      }
      
      debugPrint('Sync from Google Sheets completed successfully. Added ${sheetBanners.length} banners.');
    } catch (e) {
      debugPrint('Banner sync failed: $e');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
