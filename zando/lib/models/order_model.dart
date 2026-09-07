import 'package:cloud_firestore/cloud_firestore.dart';

enum OrderStatus { pending, processing, shipped, delivered, cancelled }

class OrderModel {
  final String id;
  final String userId;
  final List<OrderItem> items;
  final double totalAmount;
  final OrderStatus status;
  final DateTime createdAt;
  final String shippingAddress;
  final String mobileNumber;
  final String paymentMethod;
  final bool isGift;
  final String recipientName;
  final String recipientPhone;
  final String giftMessage;
  final bool giftWrap;
  final String estimatedDelivery;

  OrderModel({
    required this.id,
    required this.userId,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    required this.shippingAddress,
    required this.mobileNumber,
    required this.paymentMethod,
    this.isGift = false,
    this.recipientName = '',
    this.recipientPhone = '',
    this.giftMessage = '',
    this.giftWrap = false,
    this.estimatedDelivery = '',
  });

  factory OrderModel.fromMap(Map<String, dynamic> map, String id) {
    return OrderModel(
      id: id,
      userId: map['userId'] ?? '',
      items: (map['items'] is List)
          ? (map['items'] as List)
              .map((i) => OrderItem.fromMap(
                  i is Map<String, dynamic> ? i : Map<String, dynamic>.from(i as Map)))
              .toList()
          : [],
      totalAmount: (map['totalAmount'] is num)
          ? (map['totalAmount'] as num).toDouble()
          : 0.0,
      status: OrderStatus.values.firstWhere(
        (e) => e.toString() == 'OrderStatus.${map['status']}',
        orElse: () => OrderStatus.pending,
      ),
      createdAt: (map['createdAt'] is Timestamp)
          ? (map['createdAt'] as Timestamp).toDate()
          : (map['createdAt'] is DateTime
              ? map['createdAt']
              : (map['createdAt'] is String
                  ? (DateTime.tryParse(map['createdAt']) ?? DateTime.now())
                  : DateTime.now())),
      shippingAddress: map['shippingAddress'] ?? '',
      mobileNumber: map['mobileNumber'] ?? '',
      paymentMethod: map['paymentMethod'] ?? '',
      isGift: map['isGift'] ?? false,
      recipientName: map['recipientName'] ?? '',
      recipientPhone: map['recipientPhone'] ?? '',
      giftMessage: map['giftMessage'] ?? '',
      giftWrap: map['giftWrap'] ?? false,
      estimatedDelivery: map['estimatedDelivery'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'items': items.map((i) => i.toMap()).toList(),
      'totalAmount': totalAmount,
      'status': status.toString().split('.').last,
      'createdAt': createdAt,
      'shippingAddress': shippingAddress,
      'mobileNumber': mobileNumber,
      'paymentMethod': paymentMethod,
      'isGift': isGift,
      'recipientName': recipientName,
      'recipientPhone': recipientPhone,
      'giftMessage': giftMessage,
      'giftWrap': giftWrap,
      'estimatedDelivery': estimatedDelivery,
    };
  }
}

class OrderItem {
  final String productId;
  final String productName;
  final int quantity;
  final double price;
  final String imageUrl;

  OrderItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.imageUrl,
  });

  factory OrderItem.fromMap(Map<String, dynamic> map) {
    return OrderItem(
      productId: map['productId'] ?? '',
      productName: map['productName'] ?? '',
      quantity: (map['quantity'] is num) ? (map['quantity'] as num).toInt() : 1,
      price: (map['price'] is num) ? (map['price'] as num).toDouble() : 0.0,
      imageUrl: map['imageUrl'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'price': price,
      'imageUrl': imageUrl,
    };
  }
}
