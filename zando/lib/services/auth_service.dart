import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<User?> get user => _auth.authStateChanges();

  Future<UserCredential?> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
      if (googleUser == null) return null;

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final AuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      UserCredential result = await _auth.signInWithCredential(credential);
      User? user = result.user;
      if (user != null) {
        DocumentSnapshot doc = await _db.collection('users').doc(user.uid).get();
        if (!doc.exists) {
          UserModel userModel = UserModel(
            uid: user.uid,
            email: user.email ?? '',
            name: user.displayName ?? 'Google User',
            phoneNumber: user.phoneNumber,
            profileImageUrl: user.photoURL,
            wishlist: [],
          );
          await _db.collection('users').doc(user.uid).set(userModel.toMap());
        }
      }
      return result;
    } catch (e) {
      print('Error signing in with Google: $e');
      rethrow;
    }
  }

  Future<UserModel?> getUserData(String uid) async {
    try {
      DocumentSnapshot doc = await _db.collection('users').doc(uid).get();
      if (doc.exists) {
        return UserModel.fromMap(doc.data() as Map<String, dynamic>, uid);
      }
    } catch (e) {
      print('Error getting user data: $e');
    }
    return null;
  }

  Future<UserCredential?> signUp(String email, String password, String name) async {
    try {
      UserCredential result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      User? user = result.user;
      if (user != null) {
        UserModel userModel = UserModel(
          uid: user.uid,
          email: email,
          name: name,
        );
        await _db.collection('users').doc(user.uid).set(userModel.toMap());
      }
      return result;
    } catch (e) {
      print('Error signing up: $e');
      rethrow;
    }
  }

  Future<UserCredential?> signIn(String email, String password) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      print('Error signing in: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  Future<void> updateUserData(UserModel user) async {
    await _db.collection('users').doc(user.uid).update(user.toMap());
  }
}
