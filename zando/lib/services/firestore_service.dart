import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product_model.dart';
import '../models/order_model.dart';
import '../models/review_model.dart';
import '../models/banner_model.dart';
import '../models/notification_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Banner Methods
  Stream<List<BannerModel>> getBanners() {
    return _db.collection('banners').snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => BannerModel.fromMap(doc.data(), doc.id)).toList());
  }

  Future<void> addBanner(BannerModel banner) async {
    await _db.collection('banners').add(banner.toMap());
  }

  Future<void> deleteBanner(String id) async {
    await _db.collection('banners').doc(id).delete();
  }

  // Product Methods
  Stream<List<ProductModel>> getProducts() {
    return _db.collection('products').snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => ProductModel.fromMap(doc.data(), doc.id)).toList());
  }

  Future<void> addProduct(ProductModel product) async {
    await _db.collection('products').add(product.toMap());
  }

  Future<void> updateProduct(ProductModel product) async {
    await _db.collection('products').doc(product.id).update(product.toMap());
  }

  Future<void> deleteProduct(String id) async {
    await _db.collection('products').doc(id).delete();
  }

  // Order Methods
  Stream<List<OrderModel>> getUserOrders(String userId) {
    return _db
        .collection('orders')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => OrderModel.fromMap(doc.data(), doc.id)).toList());
  }

  Stream<List<OrderModel>> getAllOrders() {
    return _db
        .collection('orders')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => OrderModel.fromMap(doc.data(), doc.id)).toList());
  }

  Future<void> placeOrder(OrderModel order) async {
    await _db.collection('orders').add(order.toMap());
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus status) async {
    await _db.collection('orders').doc(orderId).update({
      'status': status.toString().split('.').last,
    });
  }

  // Wishlist Methods
  Future<void> toggleWishlist(String userId, String productId, List<String> currentWishlist) async {
    if (currentWishlist.contains(productId)) {
      currentWishlist.remove(productId);
    } else {
      currentWishlist.add(productId);
    }
    await _db.collection('users').doc(userId).update({'wishlist': currentWishlist});
  }

  // Review Methods
  Stream<List<ReviewModel>> getProductReviews(String productId) {
    return _db
        .collection('products')
        .doc(productId)
        .collection('reviews')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => ReviewModel.fromMap(doc.data(), doc.id)).toList());
  }

  Future<void> addReview(String productId, ReviewModel review) async {
    await _db.collection('products').doc(productId).collection('reviews').add(review.toMap());
  }

  // Notification Methods
  Stream<List<NotificationModel>> getUserNotifications(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => NotificationModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  Future<void> addNotification(String userId, NotificationModel notification) async {
    if (notification.id.isNotEmpty) {
      await _db
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .doc(notification.id)
          .set(notification.toMap());
    } else {
      await _db
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add(notification.toMap());
    }
  }

  Future<void> markNotificationAsRead(String userId, String notificationId) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notificationId)
        .update({'isRead': true});
  }

  Future<void> markAllNotificationsAsRead(String userId) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .where('isRead', isEqualTo: false)
        .get();

    final batch = _db.batch();
    for (var doc in snapshot.docs) {
      batch.update(doc.reference, {'isRead': true});
    }
    await batch.commit();
  }

  Future<void> deleteNotification(String userId, String notificationId) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .doc(notificationId)
        .delete();
  }

  Future<void> clearAllNotifications(String userId) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .get();

    final batch = _db.batch();
    for (var doc in snapshot.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  Future<void> saveUserFcmToken(String userId, String token) async {
    await _db.collection('users').doc(userId).update({'fcmToken': token});
  }
}
