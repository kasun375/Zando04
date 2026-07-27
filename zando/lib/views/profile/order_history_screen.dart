import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/cart_provider.dart';
import '../../models/product_model.dart';
import '../../models/order_model.dart';
import '../../utils/constants.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    Future.microtask(() {
      if (!mounted) return;
      Provider.of<OrderProvider>(context, listen: false).fetchUserOrders(auth.userModel!.uid);
    });
  }

  Widget _buildTimeline(OrderStatus status) {
    int activeIndex = 0;
    switch (status) {
      case OrderStatus.pending:
        activeIndex = 0;
        break;
      case OrderStatus.processing:
        activeIndex = 1;
        break;
      case OrderStatus.shipped:
        activeIndex = 2;
        break;
      case OrderStatus.delivered:
        activeIndex = 3;
        break;
      default:
        activeIndex = 0;
    }

    final steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'DELIVERY STATUS',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(steps.length, (index) {
              final isActive = index <= activeIndex;
              final isLast = index == steps.length - 1;
              final color = status == OrderStatus.delivered && index == 3
                  ? AppColors.success
                  : AppColors.primary;

              return Expanded(
                child: Row(
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isActive ? color : Colors.grey.shade200,
                            border: Border.all(
                              color: isActive ? color : Colors.grey.shade300,
                              width: 2,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: isActive ? Colors.white : Colors.grey.shade600,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          steps[index],
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: isActive ? Colors.black87 : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          height: 3,
                          color: index < activeIndex ? color : Colors.grey.shade200,
                          margin: const EdgeInsets.only(bottom: 12),
                        ),
                      ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);
    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Order History', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: orderProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : orderProvider.userOrders.isEmpty
              ? const Center(child: Text('No orders yet'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: orderProvider.userOrders.length,
                  itemBuilder: (context, index) {
                    final order = orderProvider.userOrders[index];
                    final shortId = order.id.length > 8 ? order.id.substring(0, 8).toUpperCase() : order.id.toUpperCase();

                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Order ID & status
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Order #$shortId',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.textHead),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Placed on ${order.createdAt.toString().split(' ')[0]}',
                                      style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    order.status.toString().split('.').last.toUpperCase(),
                                    style: const TextStyle(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),

                            // Delivery Timeline Stepper
                            _buildTimeline(order.status),
                            const SizedBox(height: 8),

                            // Estimated Delivery Date
                            if (order.estimatedDelivery.isNotEmpty) ...[
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.yellow.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.yellow.shade200),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.event, color: AppColors.primary, size: 18),
                                    const SizedBox(width: 8),
                                    Text(
                                      'ESTIMATED DELIVERY: ${order.estimatedDelivery}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textHead),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            // Order Items
                            const Text(
                              'ITEMS ORDERED',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
                            ),
                            const SizedBox(height: 8),
                            ...order.items.map((item) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8.0),
                                  child: Row(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          item.imageUrl,
                                          width: 40,
                                          height: 40,
                                          fit: BoxFit.cover,
                                          errorBuilder: (c, e, s) => Container(
                                            width: 40,
                                            height: 40,
                                            color: Colors.grey.shade100,
                                            child: const Icon(Icons.image_outlined, size: 20),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.productName,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                            ),
                                            Text(
                                              '\$${item.price.toStringAsFixed(2)} × ${item.quantity}',
                                              style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '\$${(item.price * item.quantity).toStringAsFixed(2)}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                                      ),
                                    ],
                                  ),
                                )),

                            // Gift Order Details Card
                            if (order.isGift) ...[
                              const SizedBox(height: 12),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.pink.shade50.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.pink.shade100.withValues(alpha: 0.5), style: BorderStyle.solid),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.card_giftcard, color: Colors.pink, size: 16),
                                        SizedBox(width: 6),
                                        Text(
                                          '🎁 GIFT ORDER DETAILS',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.pink),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'To: ${order.recipientName} (${order.recipientPhone})',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textBody),
                                    ),
                                    if (order.giftMessage.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(
                                        'Message: "${order.giftMessage}"',
                                        style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey),
                                      ),
                                    ],
                                    if (order.giftWrap) ...[
                                      const SizedBox(height: 6),
                                      const Text(
                                        '✓ Premium Gift Wrapped',
                                        style: TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],

                            const Divider(height: 24),

                            // Reorder action & Total
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () {
                                    for (var item in order.items) {
                                      cartProvider.addItem(ProductModel(
                                        id: item.productId,
                                        name: item.productName,
                                        price: item.price,
                                        imageUrl: item.imageUrl,
                                        description: '',
                                        category: '',
                                        shop: '',
                                      ));
                                    }
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Items added back to cart!')),
                                    );
                                  },
                                  icon: const Icon(Icons.refresh, size: 16),
                                  label: const Text('REORDER', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.primary,
                                    side: const BorderSide(color: AppColors.primary),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                ),
                                Text(
                                  'Total: \$${order.totalAmount.toStringAsFixed(2)}',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.primary),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
