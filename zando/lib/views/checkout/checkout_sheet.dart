import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:flutter/services.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_stripe/flutter_stripe.dart' hide Card;
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../../providers/cart_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../models/order_model.dart';
import '../../utils/constants.dart';
import '../auth/login_screen.dart';

class CheckoutSheet extends StatefulWidget {
  final List<OrderItem>? buyNowItems;
  final double? buyNowTotal;
  final List<String>? checkoutItemIds;

  const CheckoutSheet({
    super.key,
    this.buyNowItems,
    this.buyNowTotal,
    this.checkoutItemIds,
  });

  @override
  State<CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<CheckoutSheet> {
  final _formKey = GlobalKey<FormState>();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();

  // Gift options controllers
  bool _isGift = false;
  bool _giftWrap = false;
  final _recipientNameController = TextEditingController();
  final _recipientPhoneController = TextEditingController();
  final _giftMessageController = TextEditingController();
  String? _selectedSavedAddress;

  // Payment field controllers
  final _cardNumberController = TextEditingController();
  final _cardHolderController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvvController = TextEditingController();

  String _selectedPaymentMethod = 'Credit Card';

  bool _isProcessing = false;
  bool _cardEditComplete = false;
  String? _cardBrand;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _addressController.dispose();
    _phoneController.dispose();
    _recipientNameController.dispose();
    _recipientPhoneController.dispose();
    _giftMessageController.dispose();
    _cardNumberController.dispose();
    _cardHolderController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  InputDecoration _buildInputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
      filled: true,
      fillColor: Colors.grey.shade50,
      prefixIcon: Icon(icon, color: Colors.grey.shade400, size: 20),
      contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.error),
      ),
    );
  }

  Widget _buildPaymentMethodsSelector() {
    final methods = [
      {'id': 'Credit Card', 'name': 'Card', 'icon': Icons.credit_card_outlined},
      {
        'id': 'Cash on Delivery',
        'name': 'Cash on Delivery',
        'icon': Icons.handshake_outlined,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Payment Method',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: AppColors.textHead,
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 50,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: methods.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final method = methods[index];
              final isSelected = _selectedPaymentMethod == method['id'];
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedPaymentMethod = method['id'] as String;
                  });
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withValues(alpha: 0.05)
                        : Colors.white,
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : Colors.grey.shade300,
                      width: isSelected ? 1.5 : 1.0,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        method['icon'] as IconData,
                        color: isSelected
                            ? AppColors.primary
                            : Colors.grey.shade600,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        method['name'] as String,
                        style: TextStyle(
                          color: isSelected
                              ? AppColors.primary
                              : Colors.grey.shade700,
                          fontWeight: isSelected
                              ? FontWeight.bold
                              : FontWeight.normal,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentForm() {
    if (_selectedPaymentMethod == 'Credit Card') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          TextFormField(
            controller: _cardHolderController,
            decoration: _buildInputDecoration(
              'Cardholder Name',
              Icons.person_outline,
            ),
            validator: (val) {
              if (_selectedPaymentMethod == 'Credit Card') {
                if (val == null || val.trim().isEmpty) {
                  return 'Enter cardholder name';
                }
              }
              return null;
            },
            enabled: !_isProcessing,
          ),
          const SizedBox(height: 12),
          const Text(
            'Card Details',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 6),
          CardField(
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.grey.shade50,
              contentPadding: const EdgeInsets.symmetric(
                vertical: 16,
                horizontal: 18,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: AppColors.primary,
                  width: 1.5,
                ),
              ),
            ),
            style: TextStyle(fontSize: 14, color: Colors.grey.shade800),
            onCardChanged: (card) {
              setState(() {
                _cardEditComplete = card?.complete ?? false;
                _cardBrand = card?.brand;
              });
            },
          ),
        ],
      );
    } else {
      return Container(
        margin: const EdgeInsets.only(top: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: const Row(
          children: [
            Icon(Icons.handshake_outlined, color: AppColors.primary),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Pay with cash on arrival.',
                style: TextStyle(fontSize: 13, color: AppColors.textBody),
              ),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.userModel;
    final addresses = user?.savedAddresses ?? [];

    final baseAmount = widget.buyNowTotal ?? cart.totalAmount;
    final finalTotal = baseAmount + (_isGift && _giftWrap ? 5.00 : 0.0);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 20,
        bottom: 24 + bottomInset,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'CHECKOUT',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                      color: AppColors.textHead,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(height: 20),

              // Section 0.5: Saved Addresses Dropdown
              if (user != null && addresses.isNotEmpty) ...[
                const Text(
                  'Use Saved Address',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textHead,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _selectedSavedAddress,
                  hint: const Text('Select Saved Address'),
                  decoration: _buildInputDecoration(
                    'Select from book',
                    Icons.bookmark_outline,
                  ),
                  items: addresses
                      .map(
                        (addr) => DropdownMenuItem(
                          value: addr,
                          child: Text(
                            addr,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedSavedAddress = val;
                      if (val != null) {
                        _addressController.text = val;
                      }
                    });
                  },
                ),
                const SizedBox(height: 16),
              ],

              // Section 1: Delivery Address
              const Text(
                'Delivery Address',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textHead,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _addressController,
                maxLines: 2,
                decoration: _buildInputDecoration(
                  'Enter shipping address...',
                  Icons.local_shipping_outlined,
                ),
                validator: (val) => val == null || val.trim().isEmpty
                    ? 'Enter shipping address'
                    : null,
                enabled: !_isProcessing,
              ),
              const SizedBox(height: 16),

              // Section 1.2: Deliver as Gift Card
              Card(
                elevation: 0,
                color: Colors.grey.shade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    children: [
                      CheckboxListTile(
                        title: const Text(
                          '🎁 Deliver as a Gift',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        value: _isGift,
                        onChanged: (val) {
                          setState(() {
                            _isGift = val ?? false;
                            if (!_isGift) {
                              _giftWrap = false;
                            }
                          });
                        },
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        activeColor: AppColors.primary,
                      ),
                      if (_isGift) ...[
                        const Divider(),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _recipientNameController,
                          decoration: _buildInputDecoration(
                            "Recipient's Name",
                            Icons.person_outline,
                          ),
                          validator: (val) =>
                              _isGift && (val == null || val.trim().isEmpty)
                              ? "Enter recipient name"
                              : null,
                          enabled: !_isProcessing,
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _recipientPhoneController,
                          decoration: _buildInputDecoration(
                            "Recipient's Phone",
                            Icons.phone_outlined,
                          ),
                          validator: (val) =>
                              _isGift && (val == null || val.trim().isEmpty)
                              ? "Enter recipient phone"
                              : null,
                          enabled: !_isProcessing,
                        ),
                        const SizedBox(height: 10),
                        TextFormField(
                          controller: _giftMessageController,
                          maxLines: 2,
                          decoration: _buildInputDecoration(
                            "Gift Message / Card Note",
                            Icons.notes_outlined,
                          ),
                          enabled: !_isProcessing,
                        ),
                        const SizedBox(height: 8),
                        CheckboxListTile(
                          title: const Text(
                            'Add Gift Wrapping (+\$5.00)',
                            style: TextStyle(fontSize: 12),
                          ),
                          value: _giftWrap,
                          onChanged: (val) {
                            setState(() {
                              _giftWrap = val ?? false;
                            });
                          },
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          activeColor: AppColors.primary,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Section 1.5: Mobile Number
              const Text(
                'Sender Mobile Number',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textHead,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: _buildInputDecoration(
                  'Enter mobile number...',
                  Icons.phone_outlined,
                ),
                validator: (val) => val == null || val.trim().isEmpty
                    ? 'Enter mobile number'
                    : null,
                enabled: !_isProcessing,
              ),
              const SizedBox(height: 20),

              // Payment Section
              _buildPaymentMethodsSelector(),
              _buildPaymentForm(),
              const SizedBox(height: 20),

              // Section 2: Checkout Total Breakdown
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Subtotal',
                          style: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        Text(
                          '\$${baseAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    if (_isGift && _giftWrap) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Gift Wrapping',
                            style: TextStyle(fontSize: 13, color: Colors.grey),
                          ),
                          const Text(
                            '\$5.00',
                            style: TextStyle(fontSize: 13, color: Colors.grey),
                          ),
                        ],
                      ),
                    ],
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total Amount',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textBody,
                          ),
                        ),
                        Text(
                          '\$${finalTotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Section 3: Place Order Button
              SizedBox(
                width: double.infinity,
                child: _isProcessing
                    ? const Center(
                        child: SpinKitThreeBounce(
                          color: AppColors.primary,
                          size: 32.0,
                        ),
                      )
                    : ElevatedButton(
                        onPressed: () =>
                            _processCheckout(context, cart, finalTotal),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          elevation: 0,
                        ),
                        child: Text(
                          'PLACE ORDER \$${finalTotal.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<String> _determineActiveHost() async {
    if (kIsWeb) return 'localhost';

    final List<String> potentialHosts = [
      '192.168.1.4', // Current computer IP on local Wi-Fi
      '10.0.2.2', // Android Emulator
      'localhost', // iOS Emulator / Desktop
    ];

    for (final host in potentialHosts) {
      // 1. Try local payment server port
      try {
        final uri = Uri.parse('http://$host:4242/');
        await http.get(uri).timeout(const Duration(milliseconds: 800));
        return host;
      } catch (_) {}

      // 2. Try Firebase Functions emulator port
      try {
        final uri = Uri.parse('http://$host:5001/');
        await http.get(uri).timeout(const Duration(milliseconds: 800));
        return host;
      } catch (_) {}

      // 3. Try Firebase Emulator UI port
      try {
        final uri = Uri.parse('http://$host:4000/');
        await http.get(uri).timeout(const Duration(milliseconds: 800));
        return host;
      } catch (_) {}
    }

    // Default fallback
    return Platform.isAndroid ? '10.0.2.2' : 'localhost';
  }

  Future<void> _processDirectCardPayment(double amount) async {
    final String cardHolder = _cardHolderController.text.trim();

    // 1. Create PaymentMethod securely using Stripe client SDK (raw card data never touches our app or backend)
    final paymentMethod = await Stripe.instance.createPaymentMethod(
      params: PaymentMethodParams.card(
        paymentMethodData: PaymentMethodData(
          billingDetails: BillingDetails(name: cardHolder.isNotEmpty ? cardHolder : 'Customer'),
        ),
      ),
    );

    final String paymentMethodId = paymentMethod.id;
    bool success = false;

    // ── 2. Call Firebase Cloud Function to create & confirm PaymentIntent (if deployed) ──
    try {
      final functions = FirebaseFunctions.instanceFor(region: 'us-central1');
      final callable = functions.httpsCallable(
        'createPaymentIntent',
        options: HttpsCallableOptions(timeout: const Duration(seconds: 10)),
      );

      final result = await callable.call({
        'amount': (amount * 100).round(),
        'currency': 'usd',
        'paymentMethodId': paymentMethodId,
      });

      final data = result.data;
      if (data != null &&
          (data['success'] == true ||
              data['status'] == 'succeeded' ||
              data['status'] == 'requires_capture')) {
        success = true;
      }
    } catch (e) {
      debugPrint('Cloud Function payment attempt: $e');
    }

    // ── 3. Fallback to Local/Remote Payment Server ──
    if (!success) {
      final String host = await _determineActiveHost();
      final List<String> endpoints = [
        'http://$host:4242/create-payment-intent',
        'http://$host:3000/create-payment-intent',
        'https://ais-pre-4ljegk456q6qlwsbcmmwfu-526958624760.asia-east1.run.app/create-payment-intent',
      ];

      for (final endpoint in endpoints) {
        try {
          final url = Uri.parse(endpoint);
          final response = await http
              .post(
                url,
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode({
                  'amount': (amount * 100).round(),
                  'currency': 'usd',
                  'paymentMethodId': paymentMethodId,
                }),
              )
              .timeout(const Duration(seconds: 8));

          if (response.statusCode == 200) {
            final data = jsonDecode(response.body);
            if (data['success'] == true ||
                data['status'] == 'succeeded' ||
                data['status'] == 'requires_capture') {
              success = true;
              break;
            }
          }
        } catch (e) {
          debugPrint('Endpoint $endpoint failed: $e');
        }
      }
    }

    // ── 4. Verify Payment Authorized ──
    if (!success) {
      throw Exception(
        'Card payment could not be completed with Stripe. Please check your card details, ensure the payment backend is online, or select Cash on Delivery.',
      );
    }
  }

  Future<void> _processCheckout(
    BuildContext context,
    CartProvider cart,
    double totalAmount,
  ) async {
    // Validate authentication first
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to place your order.'),
          backgroundColor: AppColors.error,
        ),
      );
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    // Validate delivery address first
    if (_addressController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a delivery address.')),
      );
      return;
    }

    // Validate checkout form (contains card holder field or PayPal fields)
    if (!_formKey.currentState!.validate()) return;

    // Validate CardField completion state
    if (_selectedPaymentMethod == 'Credit Card' && !_cardEditComplete) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter valid credit card details.'),
        ),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
    });

    try {
      String methodDisplay = _selectedPaymentMethod;

      if (_selectedPaymentMethod == 'Credit Card') {
        // Process direct card payment
        await _processDirectCardPayment(totalAmount);
        final cleanBrand = _cardBrand ?? 'Card';
        methodDisplay = 'Credit Card ($cleanBrand)';
      }

      await _finalizeOrder(cart, totalAmount, methodDisplay);

      if (!context.mounted) return;
      setState(() {
        _isProcessing = false;
      });
      Navigator.pop(context);
      _showSuccessDialog(context);
    } catch (err) {
      if (!context.mounted) return;
      setState(() {
        _isProcessing = false;
      });
      _showErrorDialog(context, err.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _finalizeOrder(
    CartProvider cart,
    double totalAmount,
    String paymentMethod,
  ) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);

    final currentUser = FirebaseAuth.instance.currentUser;
    final userId = auth.userModel?.uid ?? currentUser?.uid ?? '';
    if (userId.isEmpty) {
      throw Exception('Please sign in to place your order.');
    }

    final orderItems =
        widget.buyNowItems ??
        cart.items.values
            .map(
              (i) => OrderItem(
                productId: i.id,
                productName: i.name,
                quantity: i.quantity,
                price: i.price,
                imageUrl: i.imageUrl,
              ),
            )
            .toList();

    // calculate estimated delivery 2-3 business days
    final estDate = DateTime.now().add(const Duration(days: 3));
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final estimatedDelivery =
        "${months[estDate.month - 1]} ${estDate.day}, ${estDate.year}";

    final order = OrderModel(
      id: '',
      userId: userId,
      items: orderItems,
      totalAmount: totalAmount,
      status: OrderStatus.pending,
      createdAt: DateTime.now(),
      shippingAddress: _addressController.text.trim(),
      mobileNumber: _phoneController.text.trim(),
      paymentMethod: paymentMethod,
      isGift: _isGift,
      recipientName: _isGift ? _recipientNameController.text.trim() : '',
      recipientPhone: _isGift ? _recipientPhoneController.text.trim() : '',
      giftMessage: _isGift ? _giftMessageController.text.trim() : '',
      giftWrap: _isGift ? _giftWrap : false,
      estimatedDelivery: estimatedDelivery,
    );

    await orderProvider.placeOrder(order);

    if (widget.checkoutItemIds != null) {
      cart.removeItems(widget.checkoutItemIds!);
    } else if (widget.buyNowItems == null) {
      cart.clear();
    }
  }

  void _showSuccessDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.success,
                  size: 72,
                ),
                const SizedBox(height: 20),
                const Text(
                  'Order Placed!',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textHead,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Your order has been placed successfully. Thank you for shopping with ZANDO!',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(dialogContext); // Close Success Dialog
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 0,
                    ),
                    child: const Text(
                      'BACK TO STORE',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showErrorDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          scrollable: true,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Row(
            children: [
              Icon(Icons.error_outline_rounded, color: AppColors.error),
              SizedBox(width: 8),
              Text(
                'Order Failed',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Text(
            message,
            style: const TextStyle(fontSize: 13, color: AppColors.textBody),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text(
                'TRY AGAIN',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class CardNumberInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll(' ', '');
    if (text.isEmpty) {
      return newValue.copyWith(text: '');
    }
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      final nonZeroIndex = i + 1;
      if (nonZeroIndex % 4 == 0 && nonZeroIndex != text.length) {
        buffer.write(' ');
      }
    }
    final string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}

class CardExpiryInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.replaceAll('/', '');
    if (text.isEmpty) {
      return newValue.copyWith(text: '');
    }
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      final nonZeroIndex = i + 1;
      if (nonZeroIndex == 2 && nonZeroIndex != text.length) {
        buffer.write('/');
      }
    }
    final string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}
