import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/banner_provider.dart';

class ManageBannersScreen extends StatefulWidget {
  const ManageBannersScreen({super.key});

  @override
  State<ManageBannersScreen> createState() => _ManageBannersScreenState();
}

class _ManageBannersScreenState extends State<ManageBannersScreen> {
  @override
  Widget build(BuildContext context) {
    final bannerProvider = Provider.of<BannerProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Manage Banners')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                ElevatedButton.icon(
                  onPressed: bannerProvider.isLoading
                      ? null
                      : () async {
                          final ctx = context;
                          try {
                            await bannerProvider.syncFromGoogleSheets(gid: '1274288907');
                            if (!ctx.mounted) return;
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              const SnackBar(content: Text('Banners synced successfully')),
                            );
                          } catch (e) {
                            if (!ctx.mounted) return;
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(content: Text('Sync failed: $e')),
                            );
                          }
                        },
                  icon: const Icon(Icons.sync, color: Colors.white),
                  label: const Text('SYNC FROM GOOGLE SHEETS', style: TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: bannerProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: bannerProvider.banners.length,
                    itemBuilder: (context, index) {
                      final banner = bannerProvider.banners[index];
                      return ListTile(
                        leading: Image.network(banner.imageUrl, width: 100, height: 50, fit: BoxFit.cover),
                        title: Text(banner.title ?? 'No Title'),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => bannerProvider.deleteBanner(banner.id),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
