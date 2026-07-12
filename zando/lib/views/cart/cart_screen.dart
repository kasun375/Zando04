import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cart_provider.dart';
import '../../utils/constants.dart';
import '../../models/order_model.dart';
import '../checkout/checkout_sheet.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  Set<String> _selectedItemIds = {};
  bool _initialized = false;

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);

    // Initialize/sync selections
    if (cart.items.isEmpty) {
      _initialized = false;
      _selectedItemIds.clear();
    } else if (!_initialized) {
      _selectedItemIds = cart.items.keys.toSet();
      _initialized = true;
    } else {
      // Clean up any keys that are no longer in the cart
      _selectedItemIds.retainWhere((id) => cart.items.containsKey(id));
    }

    // Calculate selected total
    double selectedTotal = 0.0;
    cart.items.forEach((key, item) {
      if (_selectedItemIds.contains(item.id)) {
        selectedTotal += item.price * item.quantity;
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Cart'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () {
              cart.clear();
              setState(() {
                _selectedItemIds.clear();
                _initialized = false;
              });
            },
          ),
        ],
      ),
      body: cart.items.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: cart.items.length,
                    itemBuilder: (context, index) {
                      final item = cart.items.values.toList()[index];
                      final isChecked = _selectedItemIds.contains(item.id);

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Checkbox(
                              value: isChecked,
                              activeColor: AppColors.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    _selectedItemIds.add(item.id);
                                  } else {
                                    _selectedItemIds.remove(item.id);
                                  }
                                });
                              },
                            ),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                item.imageUrl,
                                width: 48,
                                height: 48,
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => Container(
                                  width: 48,
                                  height: 48,
                                  color: Colors.grey.shade100,
                                  child: const Icon(Icons.image, size: 20),
                                ),
                              ),
                            ),
                          ],
                        ),
                        title: Text(
                          item.name,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          '\$${item.price} x ${item.quantity}',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, size: 20),
                              onPressed: () {
                                cart.removeSingleItem(item.id);
                              },
                            ),
                            Text(
                              '${item.quantity}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, size: 20),
                              onPressed: () {
                                // Add single item count increments
                                // We can map the cart item to a dummy product to call addItem
                                // Let's check cart_provider signature
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 10,
                        offset: Offset(0, -5),
                      )
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total:',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '\$${selectedTotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _selectedItemIds.isEmpty
                              ? null
                              : () {
                                  final selectedOrderItems = cart.items.values
                                      .where((item) => _selectedItemIds.contains(item.id))
                                      .map((item) => OrderItem(
                                            productId: item.id,
                                            productName: item.name,
                                            quantity: item.quantity,
                                            price: item.price,
                                            imageUrl: item.imageUrl,
                                          ))
                                      .toList();

                                  showModalBottomSheet(
                                    context: context,
                                    isScrollControlled: true,
                                    backgroundColor: Colors.transparent,
                                    builder: (_) => CheckoutSheet(
                                      buyNowItems: selectedOrderItems,
                                      buyNowTotal: selectedTotal,
                                      checkoutItemIds: _selectedItemIds.toList(),
                                    ),
                                  );
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            disabledBackgroundColor: Colors.grey.shade300,
                          ),
                          child: const Text(
                            'CHECKOUT',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
