import '../utils/image_utils.dart';

class ProductModel {
  final String id;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String category;
  final String shop;
  final bool isFeatured;
  final double rating;
  final int reviewsCount;
  final List<String> galleryImages;

  ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.category,
    this.shop = '',
    this.isFeatured = false,
    this.rating = 0.0,
    this.reviewsCount = 0,
    this.galleryImages = const [],
  });

  factory ProductModel.fromMap(Map<String, dynamic> map, String id) {
    return ProductModel(
      id: id,
      name: map['name'] ?? '',
      description: map['description'] ?? '',
      price: (map['price'] ?? 0.0).toDouble(),
      imageUrl: ImageUtils.convertToDirectLink(map['imageUrl'] ?? ''),
      category: map['category'] ?? '',
      shop: map['shop'] ?? '',
      isFeatured: map['isFeatured'] ?? false,
      rating: (map['rating'] ?? 0.0).toDouble(),
      reviewsCount: map['reviewsCount'] ?? 0,
      galleryImages: List<String>.from(map['galleryImages'] ?? [])
          .map((url) => ImageUtils.convertToDirectLink(url))
          .toList(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'description': description,
      'price': price,
      'imageUrl': imageUrl,
      'category': category,
      'shop': shop,
      'isFeatured': isFeatured,
      'rating': rating,
      'reviewsCount': reviewsCount,
      'galleryImages': galleryImages,
    };
  }
}
