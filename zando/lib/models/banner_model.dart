import '../utils/image_utils.dart';

class BannerModel {
  final String id;
  final String imageUrl;
  final String? title;

  BannerModel({
    required this.id,
    required this.imageUrl,
    this.title,
  });

  Map<String, dynamic> toMap() {
    return {
      'imageUrl': imageUrl,
      'title': title,
    };
  }

  factory BannerModel.fromMap(Map<String, dynamic> map, String id) {
    return BannerModel(
      id: id,
      imageUrl: ImageUtils.convertToDirectLink(map['imageUrl'] ?? ''),
      title: map['title'],
    );
  }
}
