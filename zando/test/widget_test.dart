import 'package:flutter_test/flutter_test.dart';
import 'package:zando/models/product_model.dart';

void main() {
  group('ProductModel Tests', () {
    test('toMap and fromMap should correctly serialize/deserialize shop field', () {
      final product = ProductModel(
        id: 'test-id-123',
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        imageUrl: 'https://example.com/image.png',
        category: 'Electronics',
        shop: 'Cake Shop',
        isFeatured: true,
      );

      final map = product.toMap();
      expect(map['name'], 'Test Product');
      expect(map['description'], 'Test Description');
      expect(map['price'], 99.99);
      expect(map['imageUrl'], 'https://example.com/image.png');
      expect(map['category'], 'Electronics');
      expect(map['shop'], 'Cake Shop');
      expect(map['isFeatured'], true);

      final deserialized = ProductModel.fromMap(map, 'test-id-123');
      expect(deserialized.id, 'test-id-123');
      expect(deserialized.name, 'Test Product');
      expect(deserialized.description, 'Test Description');
      expect(deserialized.price, 99.99);
      expect(deserialized.imageUrl, 'https://example.com/image.png');
      expect(deserialized.category, 'Electronics');
      expect(deserialized.shop, 'Cake Shop');
      expect(deserialized.isFeatured, true);
    });

    test('fromMap should handle missing shop field gracefully', () {
      final map = {
        'name': 'Old Product',
        'description': 'Old Description',
        'price': 49.99,
        'imageUrl': 'https://example.com/image.png',
        'category': 'Electronics',
        'isFeatured': false,
      };

      final deserialized = ProductModel.fromMap(map, 'test-id-456');
      expect(deserialized.shop, '');
    });
  });
}
