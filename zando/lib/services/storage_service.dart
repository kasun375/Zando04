import 'dart:typed_data';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  StorageService() {
    print('StorageService initialized with bucket: ${_storage.bucket}');
  }

  Future<String?> uploadImage(XFile image, String folder) async {
    try {
      final fileName = DateTime.now().millisecondsSinceEpoch.toString();
      final ref = _storage.ref().child(folder).child('$fileName.jpg');

      print('Attempting upload to: gs://${_storage.bucket}/${ref.fullPath}');

      final Uint8List imageData = await image.readAsBytes();

      final uploadTask = await ref.putData(
        imageData,
        SettableMetadata(contentType: 'image/jpeg'),
      );

      final downloadUrl = await uploadTask.ref.getDownloadURL();
      print('Upload successful. URL: $downloadUrl');
      return downloadUrl;
    } on FirebaseException catch (e) {
      print('--- Firebase Storage Error ---');
      print('Code: ${e.code}');
      print('Message: ${e.message}');
      print('Bucket: ${_storage.bucket}');

      if (e.code == 'object-not-found') {
        throw 'Storage bucket not found or not enabled. Please go to Firebase Console > Storage and click "Get Started". Also verify the bucket name is "${_storage.bucket}"';
      }
      rethrow;
    } catch (e) {
      print('Unexpected error during image upload: $e');
      rethrow;
    }
  }
}
