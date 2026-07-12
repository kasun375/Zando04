import 'package:http/http.dart' as http;
import 'package:csv/csv.dart';
import '../models/product_model.dart';
import '../models/banner_model.dart';
import '../utils/image_utils.dart';

class GoogleSheetsService {
  final String defaultProductSheetId = '1yk_RTBEhvyr-2AUqBCCrMOhuz_-yuOMl9xYEcnKgOUY';
  
  String getCsvUrl(String sheetId, {String? gid}) {
    String url = 'https://docs.google.com/spreadsheets/d/$sheetId/export?format=csv';
    if (gid != null) {
      url += '&gid=$gid';
    }
    return url;
  }

  Future<List<ProductModel>> fetchProducts({String? sheetId}) async {
    final targetSheetId = sheetId ?? defaultProductSheetId;
    try {
      final response = await http.get(Uri.parse(getCsvUrl(targetSheetId)));
      
      if (response.statusCode == 200) {
        String csvData = response.body;
        List<List<dynamic>> rows = const CsvToListConverter().convert(csvData);
        
        if (rows.isEmpty) return [];
        
        // Remove header row
        rows.removeAt(0);
        
        return rows.where((row) => row.length >= 6).map((row) {
          // Mapping: Name(0), Description(1), Price(2), ImageURL(3), Category(4), IsFeatured(5), Shop(6), GalleryImages(7)
          String name = (row[0]?.toString() ?? '').trim();
          String rawImageUrl = (row[3]?.toString() ?? '').trim();
          
          List<String> imageUrls = rawImageUrl.split(',')
              .map((url) => url.trim())
              .where((url) => url.isNotEmpty)
              .toList();
          
          String mainImageUrl = '';
          List<String> galleryImages = [];
          
          if (imageUrls.isNotEmpty) {
            mainImageUrl = ImageUtils.convertToDirectLink(imageUrls[0]);
            if (imageUrls.length > 1) {
              galleryImages = imageUrls.sublist(1)
                  .map((url) => ImageUtils.convertToDirectLink(url))
                  .toList();
            }
          }
          
          if (row.length > 7) {
            String rawGallery = (row[7]?.toString() ?? '').trim();
            if (rawGallery.isNotEmpty) {
              final parsedGallery = rawGallery.split(',')
                  .map((url) => ImageUtils.convertToDirectLink(url.trim()))
                  .where((url) => url.isNotEmpty)
                  .toList();
              if (parsedGallery.isNotEmpty) {
                galleryImages = parsedGallery;
              }
            }
          }
          
          print('DEBUG: Product: $name');
          print('DEBUG: Main URL: $mainImageUrl');
          print('DEBUG: Gallery URLs: $galleryImages');

          return ProductModel(
            id: '', 
            name: name,
            description: (row[1]?.toString() ?? '').trim(),
            price: double.tryParse((row[2]?.toString() ?? '0').trim()) ?? 0.0,
            imageUrl: mainImageUrl,
            category: (row[4]?.toString() ?? '').trim(),
            shop: row.length > 6 ? (row[6]?.toString() ?? '').trim() : '',
            isFeatured: (row[5]?.toString() ?? '').trim().toLowerCase() == 'true',
            galleryImages: galleryImages,
          );
        }).toList();
      } else {
        throw Exception('Failed to load Google Sheet: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching Google Sheet: $e');
      rethrow;
    }
  }

  Future<List<BannerModel>> fetchBanners({String? sheetId, String? gid}) async {
    final targetSheetId = sheetId ?? defaultProductSheetId;
    final url = getCsvUrl(targetSheetId, gid: gid);
    print('DEBUG: Fetching banners from: $url');
    try {
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        String csvData = response.body;
        print('DEBUG: Banner CSV Data (first 100 chars): ${csvData.substring(0, csvData.length > 100 ? 100 : csvData.length)}');
        
        List<List<dynamic>> rows = const CsvToListConverter().convert(csvData);
        print('DEBUG: Total rows found including header: ${rows.length}');
        
        if (rows.isEmpty) return [];
        
        // Remove header row
        rows.removeAt(0);
        
        List<BannerModel> banners = [];
        for (var row in rows) {
          try {
            if (row.isEmpty) continue;
            
            // Mapping: ImageURL(0), Title(1) - Title is optional
            String rawImageUrl = (row[0]?.toString() ?? '').trim();
            if (rawImageUrl.isEmpty) continue;

            String title = row.length > 1 ? (row[1]?.toString() ?? '').trim() : '';
            String convertedUrl = ImageUtils.convertToDirectLink(rawImageUrl);
            
            print('DEBUG: Banner processing - Title: $title, Raw URL: $rawImageUrl');
            
            banners.add(BannerModel(
              id: '', 
              imageUrl: convertedUrl,
              title: title.isEmpty ? null : title,
            ));
          } catch (e) {
            print('DEBUG: Error processing banner row $row: $e');
          }
        }
        return banners;
      } else {
        throw Exception('Failed to load Banner Google Sheet: ${response.statusCode}');
      }
    } catch (e) {
      print('DEBUG: Error fetching Banner Google Sheet: $e');
      rethrow;
    }
  }
}
