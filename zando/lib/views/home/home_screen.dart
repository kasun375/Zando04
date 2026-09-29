import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:carousel_slider/carousel_slider.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/product_model.dart';
import '../../providers/product_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/banner_provider.dart';
import '../../providers/notification_provider.dart';
import '../../services/notification_service.dart';
import '../../utils/responsive_layout.dart';
import '../../utils/constants.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../cart/cart_screen.dart';
import '../profile/order_history_screen.dart';
import '../admin/admin_panel.dart';
import 'notification_screen.dart';
import '../../widgets/product_card.dart';

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
      if (_searchFocusNode.hasFocus &&
          _searchController.text.trim().isNotEmpty) {
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
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            subtitle: Text(
                              product.shop,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                            trailing: Text(
                              AppConstants.formatCurrency(product.price),
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
        Provider.of<NotificationProvider>(
          context,
          listen: false,
        ).init(currentUser.uid);
        NotificationService().initialize();
      });
    }

    return GestureDetector(
      onTap: () {
        _searchFocusNode.unfocus();
        _hideOverlay();
      },
      child: Scaffold(
        drawer: const CategoryDrawer(),
        backgroundColor: Colors.white,
        body: ResponsiveLayout(
          mobileBody: _getSelectedPage(_currentTab, context),
          desktopBody: _getSelectedPage(_currentTab, context),
        ),
        bottomNavigationBar: MediaQuery.of(context).size.width < 800
            ? BottomNavigationBar(
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
                unselectedItemColor: AppColors.navBarIcon.withValues(alpha: 0.5),
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
              )
            : null,
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

  // Header matching provided design mockup exactly
  Widget _buildSearchHeader(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(
      context,
      listen: false,
    );
    final notificationProvider = Provider.of<NotificationProvider>(context);

    return Container(
      color: AppColors.primary, // Deep Plum #2E062B
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 8,
              bottom: 8,
              left: 16,
              right: 16,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Zando Logo
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _currentTab = 0;
                    });
                  },
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/images/zando_logo.png',
                        height: 38,
                        fit: BoxFit.contain,
                        alignment: Alignment.centerLeft,
                        errorBuilder: (c, e, s) => Row(
                          children: const [
                            Icon(Icons.local_fire_department, color: Colors.orange, size: 28),
                            SizedBox(width: 4),
                            Text(
                              'ZANDO',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                // Search Input Field
                Expanded(
                  child: CompositedTransformTarget(
                    link: _layerLink,
                    child: Container(
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              focusNode: _searchFocusNode,
                              style: const TextStyle(color: Colors.black, fontSize: 13),
                              decoration: const InputDecoration(
                                hintText: 'SEARCH PRODUCTS...',
                                hintStyle: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
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
                              width: 40,
                              height: 36,
                              decoration: const BoxDecoration(
                                color: AppColors.accent, // Bright Yellow #FFFF00
                                borderRadius: BorderRadius.only(
                                  topRight: Radius.circular(4),
                                  bottomRight: Radius.circular(4),
                                ),
                              ),
                              child: const Icon(
                                Icons.search,
                                color: Colors.black,
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (FirebaseAuth.instance.currentUser != null) ...[
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const NotificationScreen(),
                        ),
                      );
                    },
                    icon: Badge(
                      label: Text(
                        '${notificationProvider.unreadCount}',
                        style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      ),
                      isLabelVisible: notificationProvider.unreadCount > 0,
                      backgroundColor: AppColors.accent,
                      child: const Icon(
                        Icons.notifications_none_outlined,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Category Menu Strip
          Container(
            width: double.infinity,
            color: const Color(0xFF240422), // Darker Plum strip
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                Builder(
                  builder: (scaffoldContext) => InkWell(
                    onTap: () {
                      Scaffold.of(scaffoldContext).openDrawer();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(3),
                        border: Border.all(color: Colors.white30, width: 1),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.menu, color: Colors.white, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'All Categories',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
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

  Widget _buildHomeTab(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    final bannerProvider = Provider.of<BannerProvider>(context);
    final screenWidth = MediaQuery.of(context).size.width;

    // Determine grid columns based on screen width matching mockup (7 cols on Desktop)
    int crossAxisCount = 2;
    if (screenWidth >= 1100) {
      crossAxisCount = 7;
    } else if (screenWidth >= 800) {
      crossAxisCount = 5;
    } else if (screenWidth >= 500) {
      crossAxisCount = 3;
    }

    return Column(
      children: [
        _buildSearchHeader(context),
        Expanded(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              // Hero Banner / Carousel Slider
              _buildCarouselPlaceholder(bannerProvider),

              _buildAdMobBanner(),

              const SizedBox(height: 24),

              // ── 1. FEATURED PRODUCTS ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Featured Products',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    productProvider.isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : GridView.builder(
                            padding: const EdgeInsets.only(bottom: 24),
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: crossAxisCount,
                              childAspectRatio: 0.75,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 16,
                            ),
                            itemCount: productProvider.products.isEmpty
                                ? 21 // 3 rows of 7 cards matching mockup grid
                                : productProvider.products.length,
                            itemBuilder: (context, index) {
                              if (productProvider.products.isEmpty) {
                                final dummyProduct = ProductModel(
                                  id: 'demo_$index',
                                  name: 'Extravagant Bouquet',
                                  description: 'Sample description',
                                  price: (index % 2 == 0) ? 15700.0 : 4790.0,
                                  imageUrl: '',
                                  category: 'Flower Shop',
                                  shop: 'Zando Store',
                                );
                                return ProductCard(product: dummyProduct);
                              } else {
                                return ProductCard(
                                  product: productProvider.products[index],
                                );
                              }
                            },
                          ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ── 2. POPULAR CATEGORIES ──
              _buildPopularCategories(context),

              const SizedBox(height: 32),

              // ── 3. YOUR SUGGESTIONS ──
              _buildYourSuggestions(context, productProvider),

              const SizedBox(height: 32),

              // ── 4. SELL WITH ZANDO BANNER ──
              _buildSellWithZandoBanner(),

              // ── 5. FOOTER SECTION ──
              _buildFooter(context),
            ],
          ),
        ),
      ],
    );
  }

  // Carousel Slider Banner matching design screenshot
  final List<Map<String, String>> _fallbackBanners = [
    {
      'imageUrl': '',
      'title': 'Carousel Slider',
    },
  ];

  Widget _buildCarouselPlaceholder(BannerProvider bannerProvider) {
    final banners = bannerProvider.banners.isNotEmpty
        ? bannerProvider.banners
              .map((b) => {'imageUrl': b.imageUrl, 'title': b.title})
              .toList()
        : _fallbackBanners;

    return CarouselSlider(
      options: CarouselOptions(
        height: 220.0,
        viewportFraction: 1.0,
        autoPlay: true,
        enableInfiniteScroll: true,
      ),
      items: banners.map((banner) {
        return Builder(
          builder: (BuildContext context) {
            final imageUrl = banner['imageUrl'] ?? '';

            return Container(
              color: AppColors.primary,
              child: imageUrl.isNotEmpty
                  ? Image.network(
                      imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: AppColors.primary,
                        child: const Center(
                          child: Text(
                            'Carousel Slider',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    )
                  : const Center(
                      child: Text(
                        'Carousel Slider',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
            );
          },
        );
      }).toList(),
    );
  }

  Widget _buildAdMobBanner() {
    if (kIsWeb) return const SizedBox.shrink();

    if (!_isBannerAdLoaded || _bannerAd == null) {
      return const SizedBox.shrink();
    }

    return Container(
      alignment: Alignment.center,
      width: _bannerAd!.size.width.toDouble(),
      height: _bannerAd!.size.height.toDouble(),
      margin: const EdgeInsets.symmetric(vertical: 12),
      child: AdWidget(ad: _bannerAd!),
    );
  }

  // Popular Categories Section (Exact matching mockup cards)
  Widget _buildPopularCategories(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 800;

    final categoriesData = [
      {
        'tag': 'Top Rated Products',
        'title': 'Flower Shop',
        'bgColor': AppColors.greyCard,
        'textColor': AppColors.primary,
        'categoryKey': 'Flower Shop',
      },
      {
        'tag': 'Fine Silk + Premium Cocoa',
        'title': 'Chocolates',
        'bgColor': AppColors.creamCard,
        'textColor': AppColors.primary,
        'categoryKey': 'Chocolets',
      },
      {
        'tag': 'Natural Organic Glow',
        'title': 'Cosmetics',
        'bgColor': AppColors.greenCard,
        'textColor': const Color(0xFF1E3A1E),
        'categoryKey': 'Fashion',
      },
      {
        'tag': 'Fresh Handcrafted Food',
        'title': 'Food / Restaurant',
        'bgColor': AppColors.creamCard,
        'textColor': const Color(0xFF333333),
        'categoryKey': 'Grocery Items',
      },
      {
        'tag': 'Sparkle With Every Gem',
        'title': 'Jewellery',
        'bgColor': AppColors.greyCard,
        'textColor': AppColors.primary,
        'categoryKey': 'Fashion',
      },
      {
        'tag': 'For the Love of Cake',
        'title': 'Cakes',
        'bgColor': AppColors.cyanCard,
        'textColor': const Color(0xFF0F3B4C),
        'categoryKey': 'Cake Shop',
      },
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Popular Categories',
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: isWide ? 3 : 2,
              childAspectRatio: isWide ? 2.4 : 1.7,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: categoriesData.length,
            itemBuilder: (context, index) {
              final cat = categoriesData[index];
              return InkWell(
                onTap: () {
                  final productProvider = Provider.of<ProductProvider>(
                    context,
                    listen: false,
                  );
                  productProvider.setCategory(cat['categoryKey'] as String);
                  setState(() {
                    _currentTab = 0;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: cat['bgColor'] as Color,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        cat['tag'] as String,
                        style: TextStyle(
                          color: (cat['textColor'] as Color).withValues(alpha: 0.7),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        cat['title'] as String,
                        style: TextStyle(
                          color: cat['textColor'] as Color,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // Your Suggestions Section (Matching exact mockup: 4 products per page, plum title, grey backdrop)
  Widget _buildYourSuggestions(BuildContext context, ProductProvider productProvider) {
    final defaultProducts = List.generate(
      12,
      (i) => ProductModel(
        id: 'sug_$i',
        name: 'Extravaganza Hamper',
        description: 'Extravaganza Hamper',
        price: 16750.0,
        imageUrl: '',
        category: 'Suggestions',
        shop: 'Zando Store',
      ),
    );

    final items = productProvider.products.isNotEmpty
        ? productProvider.products.take(12).toList()
        : defaultProducts;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Your Suggestions',
            style: TextStyle(
              color: AppColors.primary, // #280026
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          color: const Color(0xFFB1A7B4), // Exact grey backdrop color
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final displayCount = constraints.maxWidth > 800 ? 4 : (constraints.maxWidth > 500 ? 2 : 1);
              final visibleItems = items.take(displayCount).toList();

              return Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: visibleItems.map((prod) {
                  return Container(
                    width: 210,
                    margin: const EdgeInsets.only(left: 16),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 6,
                          offset: Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Portrait Image Box (3:4 aspect ratio)
                        AspectRatio(
                          aspectRatio: 3 / 4,
                          child: Container(
                            color: const Color(0xFFA095A3),
                            alignment: Alignment.center,
                            child: prod.imageUrl.isNotEmpty
                                ? Image.network(
                                    prod.imageUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (c, e, s) => const Text(
                                      'Products',
                                      style: TextStyle(color: Colors.white, fontSize: 13),
                                    ),
                                  )
                                : const Text(
                                    'Products',
                                    style: TextStyle(color: Colors.white, fontSize: 13),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          prod.name.isNotEmpty ? prod.name : 'Extravaganza Hamper',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF444444),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'RS. ${prod.price.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ),
      ],
    );
  }

  // Sell With Zando Banner matching mockup
  Widget _buildSellWithZandoBanner() {
    return Container(
      width: double.infinity,
      color: AppColors.primary, // Deep Plum
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(
        children: const [
          Text(
            'SELL WITH ZANDO AND',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.0,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'GROW YOUR BUSINESS',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.0,
            ),
          ),
          SizedBox(height: 12),
          Text(
            '076 634 18 72',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.accent, // Bright Yellow
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  // Footer matching design screenshot
  // Footer matching design screenshot
  Widget _buildFooter(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isWide = screenWidth > 800;
    const accentYellow = Color(0xFFDCE319);

    return Container(
      width: double.infinity,
      color: const Color(0xFF545454),
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 32),
      child: Column(
        children: [
          // Top WhatsApp Header
          const Text(
            'ODER ON WHATSAPP',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            "Tell us what you need - we'll find it,price it, and deliver it.Open 24/7",
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 20),

          // Main Top Row
          if (isWide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Col 1: Brand Info & Yellow links
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Zando is your ultimate online shopping destination. Discover premium fashion, electronics, lifestyle products and more with fast delivery and easy returns.',
                        style: TextStyle(color: Colors.white, fontSize: 13, height: 1.45),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          InkWell(
                            onTap: () {},
                            child: const Text(
                              'Contact Us',
                              style: TextStyle(color: accentYellow, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const Text(' | ', style: TextStyle(color: Colors.white, fontSize: 13)),
                          InkWell(
                            onTap: () {},
                            child: const Text(
                              'About Us',
                              style: TextStyle(color: accentYellow, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const Text(' | ', style: TextStyle(color: Colors.white, fontSize: 13)),
                          InkWell(
                            onTap: () {},
                            child: const Text(
                              'Privacy Policy',
                              style: TextStyle(color: accentYellow, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),

                // Col 2: White WhatsApp Button & Phone Box
                Expanded(
                  flex: 3,
                  child: Column(
                    children: [
                      ElevatedButton.icon(
                        onPressed: () async {
                          final url = Uri.parse('https://wa.me/94760891262');
                          if (await canLaunchUrl(url)) {
                            await launchUrl(url, mode: LaunchMode.externalApplication);
                          }
                        },
                        icon: Image.asset(
                          'assets/images/logo-whatsapp-png-46068.png',
                          width: 22,
                          height: 22,
                          errorBuilder: (c, e, s) => const FaIcon(
                            FontAwesomeIcons.whatsapp,
                            color: Color(0xFF25D366),
                            size: 20,
                          ),
                        ),
                        label: const Text(
                          'ODER ON WHATSAPP',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6C6C6C),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'To Oder by phone, call - 076 089 12 62',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),

                // Col 3: App Badges & QR Code
                Row(
                  children: [
                    Image.asset(
                      'assets/images/pngegg.png',
                      height: 75,
                      fit: BoxFit.contain,
                      errorBuilder: (c, e, s) => Column(
                        children: [
                          Container(
                            width: 110,
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(4)),
                            child: const Row(
                              children: [
                                FaIcon(FontAwesomeIcons.googlePlay, color: Colors.white, size: 14),
                                SizedBox(width: 4),
                                Text('Google Play', style: TextStyle(color: Colors.white, fontSize: 10)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: 110,
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(4)),
                            child: const Row(
                              children: [
                                FaIcon(FontAwesomeIcons.apple, color: Colors.white, size: 14),
                                SizedBox(width: 4),
                                Text('App Store', style: TextStyle(color: Colors.white, fontSize: 10)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Image.asset(
                      'assets/images/qr-code.png',
                      width: 75,
                      height: 75,
                      fit: BoxFit.contain,
                      errorBuilder: (c, e, s) => Container(
                        width: 75,
                        height: 75,
                        color: Colors.white24,
                        child: const Icon(Icons.qr_code, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ],
            )
          else
            Column(
              children: [
                const Text(
                  'Zando is your ultimate online shopping destination. Discover premium fashion, electronics, lifestyle products and more with fast delivery and easy returns.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 13),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () async {
                    final url = Uri.parse('https://wa.me/94760891262');
                    if (await canLaunchUrl(url)) {
                      await launchUrl(url, mode: LaunchMode.externalApplication);
                    }
                  },
                  icon: Image.asset(
                    'assets/images/logo-whatsapp-png-46068.png',
                    width: 22,
                    height: 22,
                    errorBuilder: (c, e, s) => const FaIcon(
                      FontAwesomeIcons.whatsapp,
                      color: Color(0xFF25D366),
                      size: 20,
                    ),
                  ),
                  label: const Text(
                    'ODER ON WHATSAPP',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6C6C6C),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'To Oder by phone, call - 076 089 12 62',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),

          const SizedBox(height: 28),

          // Bottom 3 Columns Grid
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Col 1: Quick Links
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Quick Links',
                      style: TextStyle(color: accentYellow, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    _footerLink('Home', () => setState(() => _currentTab = 0)),
                    _footerLink('Categories', () => setState(() => _currentTab = 3)),
                    _footerLink('Shopping Cart', () => setState(() => _currentTab = 2)),
                    _footerLink('My Profile', () => setState(() => _currentTab = 1)),
                  ],
                ),
              ),

              // Col 2: Customer Care
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Customer Care',
                      style: TextStyle(color: accentYellow, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    _footerLink('Track Orders', () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                      );
                    }),
                    _footerLink('Help & Support', () {}),
                    _footerLink('Returns & Refunds', () {}),
                    _footerLink('FAQ', () {}),
                  ],
                ),
              ),

              // Col 3: Contact Us
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Contact Us',
                      style: TextStyle(color: accentYellow, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text('Email Us', style: TextStyle(color: Colors.white, fontSize: 13)),
                    SizedBox(height: 4),
                    Text('076081262', style: TextStyle(color: Colors.white, fontSize: 13)),
                    SizedBox(height: 4),
                    Text(
                      'Zando Stores,No 49,\nPaniyandoowa Rd,\nAmbalangoda.',
                      style: TextStyle(color: Colors.white, fontSize: 13, height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          const Text(
            '© 2026 ZANDO. All rights reserved.',
            style: TextStyle(color: Colors.white, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _footerLink(String title, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: InkWell(
        onTap: onTap,
        child: Text(
          title,
          style: const TextStyle(color: Colors.white, fontSize: 13),
        ),
      ),
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
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 8,
                      ),
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
                        color: Color(0xFF4FA5D6),
                        size: 24,
                      ),
                      onTap: () {
                        productProvider.setCategory(catName);
                        setState(() {
                          _currentTab = 0;
                        });
                      },
                    ),
                    Divider(
                      height: 1,
                      color: Colors.grey[100],
                      indent: 24,
                      endIndent: 24,
                    ),
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
    return ProfileTabWidget(authProvider: auth);
  }
}


class ProfileTabWidget extends StatefulWidget {
  final AuthProvider authProvider;
  const ProfileTabWidget({super.key, required this.authProvider});

  @override
  State<ProfileTabWidget> createState() => _ProfileTabWidgetState();
}

class _ProfileTabWidgetState extends State<ProfileTabWidget> {
  String? _selectedGender;
  String? _selectedLanguage;
  DateTime? _selectedDate;
  final _newAddressController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _syncUserData();
  }

  @override
  void didUpdateWidget(ProfileTabWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.authProvider.userModel != oldWidget.authProvider.userModel) {
      _syncUserData();
    }
  }

  void _syncUserData() {
    final user = widget.authProvider.userModel;
    if (user != null) {
      _selectedGender = (user.gender == null || user.gender!.isEmpty)
          ? null
          : user.gender;
      _selectedLanguage = (user.language == null || user.language!.isEmpty)
          ? 'English'
          : user.language;
      if (user.birthday != null && user.birthday!.isNotEmpty) {
        _selectedDate = DateTime.tryParse(user.birthday!);
      }
    }
  }

  @override
  void dispose() {
    _newAddressController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _pickAndUploadImage(BuildContext context) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 250,
        maxHeight: 250,
        imageQuality: 70,
      );

      if (image != null) {
        setState(() {
          _isSaving = true;
        });

        final bytes = await image.readAsBytes();
        final base64String = 'data:image/jpeg;base64,${base64Encode(bytes)}';

        await widget.authProvider.updateUserProfile(
          profileImageUrl: base64String,
        );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile picture updated successfully!'),
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update picture: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.authProvider.userModel;
    final addresses = user?.savedAddresses ?? [];
    final isAdmin = user?.isAdmin ?? false;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: GestureDetector(
                onTap: () => _pickAndUploadImage(context),
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: Colors.transparent,
                      child: ClipOval(
                        child: user?.profileImageUrl != null
                            ? (user!.profileImageUrl!.startsWith('data:image')
                                  ? Image.memory(
                                      base64Decode(
                                        user.profileImageUrl!.split(',').last,
                                      ),
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) =>
                                              const Icon(
                                                Icons.account_circle,
                                                size: 80,
                                                color: AppColors.primary,
                                              ),
                                    )
                                  : Image.network(
                                      user.profileImageUrl!,
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.cover,
                                      errorBuilder:
                                          (context, error, stackTrace) =>
                                              const Icon(
                                                Icons.account_circle,
                                                size: 80,
                                                color: AppColors.primary,
                                              ),
                                    ))
                            : const Icon(
                                Icons.account_circle,
                                size: 80,
                                color: AppColors.primary,
                              ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.edit,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              user?.name ?? 'User',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              user?.email ?? 'user@zando.com',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),

            // PERSONAL DETAILS CARD
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PERSONAL INFORMATION',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedGender,
                      decoration: const InputDecoration(
                        labelText: 'Gender',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Male', child: Text('Male')),
                        DropdownMenuItem(
                          value: 'Female',
                          child: Text('Female'),
                        ),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                      ],
                      onChanged: (val) {
                        setState(() {
                          _selectedGender = val;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () => _selectDate(context),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Birthday',
                          border: OutlineInputBorder(),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _selectedDate == null
                                  ? 'Select Birthday'
                                  : "${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}",
                              style: const TextStyle(fontSize: 15),
                            ),
                            const Icon(
                              Icons.calendar_today,
                              size: 18,
                              color: Colors.grey,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedLanguage,
                      decoration: const InputDecoration(
                        labelText: 'Preferred Language',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'English',
                          child: Text('English'),
                        ),
                        DropdownMenuItem(
                          value: 'Sinhala',
                          child: Text('Sinhala'),
                        ),
                        DropdownMenuItem(value: 'Tamil', child: Text('Tamil')),
                      ],
                      onChanged: (val) {
                        setState(() {
                          _selectedLanguage = val;
                        });
                      },
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSaving
                            ? null
                            : () async {
                                setState(() {
                                  _isSaving = true;
                                });
                                String? birthdayStr;
                                if (_selectedDate != null) {
                                  birthdayStr =
                                      "${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}";
                                }
                                try {
                                  await widget.authProvider.updateUserProfile(
                                    gender: _selectedGender,
                                    birthday: birthdayStr,
                                    language: _selectedLanguage,
                                  );
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Profile updated successfully!',
                                        ),
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Failed to update profile: $e',
                                        ),
                                      ),
                                    );
                                  }
                                } finally {
                                  if (mounted) {
                                    setState(() {
                                      _isSaving = false;
                                    });
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text('Save Profile'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ADDRESS BOOK CARD
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ADDRESS BOOK',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (addresses.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8.0),
                        child: Text(
                          'No saved addresses yet.',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: addresses.length,
                        itemBuilder: (context, idx) {
                          final addr = addresses[idx];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              border: Border.all(color: Colors.grey.shade200),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.location_on,
                                  color: AppColors.primary,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    addr,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    color: AppColors.error,
                                    size: 20,
                                  ),
                                  onPressed: () async {
                                    final list = List<String>.from(addresses);
                                    list.removeAt(idx);
                                    await widget.authProvider.updateUserProfile(
                                      savedAddresses: list,
                                    );
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        const SnackBar(
                                          content: Text('Address removed.'),
                                        ),
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _newAddressController,
                            decoration: const InputDecoration(
                              hintText: 'Add new address...',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () async {
                            final text = _newAddressController.text.trim();
                            if (text.isEmpty) return;
                            final list = List<String>.from(addresses)
                              ..add(text);
                            await widget.authProvider.updateUserProfile(
                              savedAddresses: list,
                            );
                            _newAddressController.clear();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Address added successfully.'),
                                ),
                              );
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.all(12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Icon(Icons.add),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                );
              },
              icon: const Icon(Icons.history, color: Colors.white),
              label: const Text(
                'Order History',
                style: TextStyle(color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (isAdmin) ...[
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(
                    context,
                  ).push(MaterialPageRoute(builder: (_) => const AdminPanel()));
                },
                icon: const Icon(
                  Icons.admin_panel_settings,
                  color: Colors.white,
                ),
                label: const Text(
                  'Admin Panel',
                  style: TextStyle(color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
            OutlinedButton.icon(
              onPressed: () async {
                Provider.of<NotificationProvider>(
                  context,
                  listen: false,
                ).clear();
                await widget.authProvider.signOut();
              },
              icon: const Icon(Icons.logout, color: AppColors.primary),
              label: const Text(
                'Sign Out',
                style: TextStyle(color: AppColors.primary),
              ),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
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
            child: Text(
              'Categories',
              style: TextStyle(color: Colors.white, fontSize: 24),
            ),
          ),
          ...productProvider.categories.map(
            (cat) => ListTile(
              title: Text(cat),
              onTap: () {
                productProvider.setCategory(cat);
                Navigator.pop(context);
              },
            ),
          ),
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
            child: Text(
              'CATEGORIES',
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
            ),
          ),
          ...productProvider.categories.map(
            (cat) => ListTile(
              title: Text(cat),
              selected: false,
              onTap: () => productProvider.setCategory(cat),
            ),
          ),
        ],
      ),
    );
  }
}
