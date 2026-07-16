class ImageUtils {
  static String convertToDirectLink(String url) {
    url = url.trim();
    if (url.isEmpty) return url;
    
    // Pattern for lh3.googleusercontent.com/d/ID or lh3.googleusercontent.com/u/0/d/ID
    if (url.contains('lh3.googleusercontent.com')) {
      final parts = url.split('/d/');
      if (parts.length > 1) {
        final id = parts[1].split('/')[0].split('?')[0];
        return 'https://lh3.googleusercontent.com/d/$id';
      }
    }

    // Pattern for /file/d/ID/...
    if (url.contains('drive.google.com/file/d/')) {
      final parts = url.split('/d/');
      if (parts.length > 1) {
        final id = parts[1].split('/')[0].split('?')[0];
        return 'https://lh3.googleusercontent.com/d/$id';
      }
    }
    
    // Pattern for query params: id=ID
    if ((url.contains('drive.google.com') || url.contains('docs.google.com')) && url.contains('id=')) {
      final uri = Uri.tryParse(url);
      if (uri != null && uri.queryParameters.containsKey('id')) {
        final id = uri.queryParameters['id']!;
        return 'https://lh3.googleusercontent.com/d/$id';
      }
      // Fallback manual split if Uri.tryParse fails
      final parts = url.split('id=');
      if (parts.length > 1) {
        final id = parts[1].split('&')[0];
        return 'https://lh3.googleusercontent.com/d/$id';
      }
    }
    
    return url;
  }
}
