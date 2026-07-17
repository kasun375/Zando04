import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:carousel_slider/carousel_slider.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../../providers/product_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/banner_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/notification_service.dart';
import '../../utils/responsive_layout.dart';
import '../../utils/constants.dart';
import '../../widgets/product_card.dart';
import '../cart/cart_screen.dart';
import '../profile/order_history_screen.dart';
import '../admin/admin_panel.dart';
import 'notification_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();
  int _currentTab = 0;
  final FocusNode _searchFocusNode = FocusNode();
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();
  bool _notificationsInitialized = false;

  BannerAd? _bannerAd;
  bool _isBannerAdLoaded = false;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _loadBannerAd();
    }
    _searchFocusNode.addListener(() {
      if (_searchFocusNode.hasFocus && _searchController.text.trim().isNotEmpty) {
        _showOverlay();
      } else {
        _hideOverlay();
      }
    });
  }

  void _loadBannerAd() {
    _bannerAd = BannerAd(
      adUnitId: 'ca-app-pub-1267014580635785/7297946217',
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          setState(() {
            _isBannerAdLoaded = true;
          });
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          debugPrint('BannerAd failed to load: $error');
        },
      ),
    );
    _bannerAd!.load();
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    _searchFocusNode.dispose();
    _hideOverlay();
    _searchController.dispose();
    super.dispose();
  }

  void _showOverlay() {
    _hideOverlay();
    if (!mounted || _searchController.text.trim().isEmpty) return;

    _overlayEntry = OverlayEntry(
      builder: (context) {
        final productProvider = Provider.of<ProductProvider>(context);
        final filteredProducts = productProvider.products;

        return Positioned(
          width: MediaQuery.of(context).size.width - 32,
          child: CompositedTransformFollower(
            link: _layerLink,
            showWhenUnlinked: false,
            offset: const Offset(0, 52),
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(12),
              color: Colors.white,
              child: Container(
                constraints: const BoxConstraints(maxHeight: 250),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: filteredProducts.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Text(
                          'No products or shops found',
                          style: TextStyle(color: Colors.grey),
                          textAlign: TextAlign.center,
                        ),
                      )
                    : ListView.builder(
                        padding: EdgeInsets.zero,
                        shrinkWrap: true,
                        itemCount: filteredProducts.length,
                        itemBuilder: (context, index) {
                          final product = filteredProducts[index];
                          return ListTile(
                            leading: ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: Image.network(
                                product.imageUrl,
                                width: 36,
                                height: 36,
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => Container(
                                  width: 36,
                                  height: 36,
                                  color: Colors.grey[200],
                                  child: const Icon(Icons.image, size: 16),
                                ),
                              ),
                            ),
                            title: Text(
                              product.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                            subtitle: Text(
                              product.shop,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: Colors.grey[600], fontSize: 12),
                            ),
                            trailing: Text(
                              '\$${product.price.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            onTap: () {
                              _searchController.text = product.name;
                              productProvider.setSearchQuery(product.name);
                              _searchFocusNode.unfocus();
                              _hideOverlay();
                            },
                          );
                        },
                      ),
              ),
            ),
          ),
        );
      },
    );

    Overlay.of(context).insert(_overlayEntry!);
  }

  void _hideOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser != null && !_notificationsInitialized) {
      _notificationsInitialized = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Provider.of<NotificationProvider>(context, listen: false).init(currentUser.uid);
        NotificationService().initialize();
      });
    }

    return GestureDetector(
      onTap: () {
        _searchFocusNode.unfocus();
        _hideOverlay();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: ResponsiveLayout(
          mobileBody: _getSelectedPage(_currentTab, context),
          desktopBody: Row(
            children: [
              const SideCategoryMenu(),
              Expanded(child: _getSelectedPage(_currentTab, context)),
            ],
          ),
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentTab,
          onTap: (index) {
            _searchFocusNode.unfocus();
            _hideOverlay();
            setState(() {
              _currentTab = index;
            });
          },
          backgroundColor: AppColors.navBar,
          selectedItemColor: AppColors.navBarIcon,
          unselectedItemColor: AppColors.navBarIcon.withOpacity(0.5),
          type: BottomNavigationBarType.fixed,
          showSelectedLabels: false,
          showUnselectedLabels: false,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined, size: 28),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline, size: 28),
              label: 'Profile',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.shopping_cart_outlined, size: 28),
              label: 'Cart',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined, size: 28),
              label: 'Categories',
            ),
          ],
        ),
      ),
    );
  }

  Widget _getSelectedPage(int index, BuildContext context) {
    switch (index) {
      case 0:
        return _buildHomeTab(context);
      case 1:
        return _buildProfileTab(context);
      case 2:
        return const CartScreen();
      case 3:
        return _buildCategoriesTab(context);
      default:
        return _buildHomeTab(context);
    }
  }

  // Custom Header matching the UI screenshot search bar
  Widget _buildSearchHeader(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context, listen: false);
    final notificationProvider = Provider.of<NotificationProvider>(context);

    return Container(
      color: AppColors.primary, // Deep Plum
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        bottom: 16,
        left: 16,
        right: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Flexible(
                child: Image.asset(
                  'assets/images/zando_logo.png',
                  height: 56,
                  fit: BoxFit.contain,
                  alignment: Alignment.centerLeft,
                ),
              ),
              if (FirebaseAuth.instance.currentUser != null)
                IconButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const NotificationScreen()),
                    );
                  },
                  icon: Badge(
                    label: Text(
                      '${notificationProvider.unreadCount}',
                      style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 10),
                    ),
                    isLabelVisible: notificationProvider.unreadCount > 0,
                    backgroundColor: AppColors.accent, // Neon Yellow
                    child: const Icon(
                      Icons.notifications_none_outlined,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          CompositedTransformTarget(
            link: _layerLink,
            child: Container(
              height: 50,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      focusNode: _searchFocusNode,
                      style: const TextStyle(color: Colors.black, fontSize: 16),
                      decoration: const InputDecoration(
                        hintText: 'SEARCH PRODUCTS...',
                        hintStyle: TextStyle(
                          color: Colors.grey,
                          fontSize: 14,
                          letterSpacing: 1.0,
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16),
                      ),
                      onChanged: (value) {
                        productProvider.setSearchQuery(value);
                        if (value.trim().isNotEmpty) {
                          if (_overlayEntry == null) {
                            _showOverlay();
                          } else {
                            _overlayEntry?.markNeedsBuild();
                          }
                        } else {
                          _hideOverlay();
                        }
                      },
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      productProvider.setSearchQuery(_searchController.text);
                      _searchFocusNode.unfocus();
                      _hideOverlay();
                    },
                    child: Container(
                      width: 50,
                      height: 50,
                      margin: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: AppColors.accent, // Neon Yellow
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Icon(
                        Icons.search,
                        color: Colors.black,
                        size: 24,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHomeTab(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    final bannerProvider = Provider.of<BannerProvider>(context);

    return Column(
      children: [
        _buildSearchHeader(context),
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              // Track My Oders card
              GestureDetector(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                ),
                child: Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.creamCard, // Pale Beige/Cream
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/icon/Oder.png',
                        width: 44,
                        height: 44,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const Icon(
                          Icons.local_shipping_outlined,
                          size: 36,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Track My Oders', // Spelling matches mockup exactly
                              style: TextStyle(
                                color: Colors.black,
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'View active shipments & history', // Spelling matches mockup exactly
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right,
                        color: Colors.grey[400],
                        size: 32,
                      ),
                    ],
                  ),
                ),
              ),

              // Carousel Slider placeholder matching mockup
              _buildCarouselPlaceholder(bannerProvider),

              _buildAdMobBanner(),

              const SizedBox(height: 16),

              // Products Grid
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: productProvider.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : GridView.builder(
                        padding: const EdgeInsets.only(bottom: 24),
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.85,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: productProvider.products.isEmpty ? 4 : productProvider.products.length,
                        itemBuilder: (context, index) {
                          if (productProvider.products.isEmpty) {
                            return Container(
                              color: AppColors.productCard,
                              alignment: Alignment.center,
                              child: const Text(
                                'Products',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.normal,
                                ),
                              ),
                            );
                          } else {
                            return ProductCard(product: productProvider.products[index]);
                          }
                        },
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  final List<Map<String, String>> _fallbackBanners = [
    {
      'imageUrl': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1470&auto=format&fit=crop',
      'title': 'New Summer Collection'
    },
    {
      'imageUrl': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1470&auto=format&fit=crop',
      'title': 'Premium Fashion'
    },
    {
      'imageUrl': 'https://images.unsplash.com/photo-1441984969344-93437537b044?q=80&w=1470&auto=format&fit=crop',
      'title': 'Modern Electronics'
    },
  ];

  Widget _buildCarouselPlaceholder(BannerProvider bannerProvider) {
    final banners = bannerProvider.banners.isNotEmpty
        ? bannerProvider.banners.map((b) => {'imageUrl': b.imageUrl, 'title': b.title}).toList()
        : _fallbackBanners;

    return CarouselSlider(
      options: CarouselOptions(
        height: 200.0,
        viewportFraction: 1.0,
        autoPlay: true,
        enableInfiniteScroll: true,
      ),
      items: banners.map((banner) {
        return Builder(
          builder: (BuildContext context) {
            final imageUrl = banner['imageUrl'] ?? '';

            return Stack(
              fit: StackFit.expand,
              children: [
                imageUrl.isNotEmpty
                    ? Image.network(
                        imageUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => Container(
                          color: AppColors.primary,
                          child: const Center(
                            child: Icon(Icons.error, color: Colors.white54, size: 40),
                          ),
                        ),
                      )
                    : Container(color: AppColors.primary),
              ],
            );
          },
        );
      }).toList(),
    );
  }

  Widget _buildAdMobBanner() {
    if (kIsWeb) {
      return Container(
        height: 60,
        margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[300]!, width: 1),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.ads_click, color: Colors.grey[400], size: 20),
            const SizedBox(width: 8),
            Text(
              'AdMob Banner Ad (Web Placeholder)',
              style: TextStyle(color: Colors.grey[600], fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    if (!_isBannerAdLoaded || _bannerAd == null) {
      return Container(
        height: 60,
        margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[200]!, width: 1),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey),
            ),
            const SizedBox(width: 12),
            Text(
              'Loading Banner Ad...',
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
          ],
        ),
      );
    }

    return Container(
      alignment: Alignment.center,
      width: _bannerAd!.size.width.toDouble(),
      height: _bannerAd!.size.height.toDouble(),
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: AdWidget(ad: _bannerAd!),
    );
  }

  Widget _buildCategoriesTab(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    final categoriesList = productProvider.categories
        .where((c) => c != 'All')
        .toList();

    return Column(
      children: [
        _buildSearchHeader(context),
        Expanded(
          child: Container(
            color: Colors.white,
            child: ListView.builder(
              padding: EdgeInsets.zero,
              itemCount: categoriesList.length,
              itemBuilder: (context, index) {
                final catName = categoriesList[index];
                return Column(
                  children: [
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                      title: Text(
                        catName,
                        style: TextStyle(
                          color: Colors.grey[700],
                          fontSize: 18,
                          fontWeight: FontWeight.normal,
                        ),
                      ),
                      trailing: const Icon(
                        Icons.keyboard_double_arrow_right,
                        color: Color(0xFF4FA5D6), // Sky blue double chevrons
                        size: 24,
                      ),
                      onTap: () {
                        productProvider.setCategory(catName);
                        setState(() {
                          _currentTab = 0;
                        });
                      },
                    ),
                    Divider(height: 1, color: Colors.grey[100], indent: 24, endIndent: 24),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileTab(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.userModel;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.account_circle, size: 80, color: AppColors.primary),
            const SizedBox(height: 16),
            Text(
              user?.name ?? 'User',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black),
            ),
            const SizedBox(height: 8),
            Text(
              user?.email ?? 'user@zando.com',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                );
              },
              icon: const Icon(Icons.history, color: Colors.white),
              label: const Text('Order History', style: TextStyle(color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 16),
            if (user?.isAdmin ?? false) ...[
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AdminPanel()),
                  );
                },
                icon: const Icon(Icons.admin_panel_settings, color: Colors.white),
                label: const Text('Admin Panel', style: TextStyle(color: Colors.white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),
            ],
            OutlinedButton.icon(
              onPressed: () async {
                Provider.of<NotificationProvider>(context, listen: false).clear();
                await auth.signOut();
              },
              icon: const Icon(Icons.logout, color: AppColors.primary),
              label: const Text('Sign Out', style: TextStyle(color: AppColors.primary)),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CategoryDrawer extends StatelessWidget {
  const CategoryDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    return Drawer(
      child: ListView(
        children: [
          const DrawerHeader(
            decoration: BoxDecoration(color: AppColors.primary),
            child: Text('Categories', style: TextStyle(color: Colors.white, fontSize: 24)),
          ),
          ...productProvider.categories.map((cat) => ListTile(
                title: Text(cat),
                onTap: () {
                  productProvider.setCategory(cat);
                  Navigator.pop(context);
                },
              )),
        ],
      ),
    );
  }
}

class SideCategoryMenu extends StatelessWidget {
  const SideCategoryMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    return Container(
      width: 250,
      color: Colors.white,
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 24),
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('CATEGORIES', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
          ),
          ...productProvider.categories.map((cat) => ListTile(
                title: Text(cat),
                selected: false,
                onTap: () => productProvider.setCategory(cat),
              )),
        ],
      ),
    );
  }
}
