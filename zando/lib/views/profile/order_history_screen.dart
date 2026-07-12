import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';

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
    Future.microtask(() =>
        Provider.of<OrderProvider>(context, listen: false).fetchUserOrders(auth.userModel!.uid));
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = Provider.of<OrderProvider>(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Order History')),
      body: orderProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : orderProvider.userOrders.isEmpty
              ? const Center(child: Text('No orders yet'))
              : ListView.builder(
                  itemCount: orderProvider.userOrders.length,
                  itemBuilder: (context, index) {
                    final order = orderProvider.userOrders[index];
                    return Card(
                      margin: const EdgeInsets.all(8),
                      child: ListTile(
                        title: Text('Order #${order.id.substring(0, 8)}'),
                        subtitle: Text('Status: ${order.status.toString().split('.').last}\nDate: ${order.createdAt.toString().split(' ')[0]}'),
                        trailing: Text('\$${order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    );
                  },
                ),
    );
  }
}
