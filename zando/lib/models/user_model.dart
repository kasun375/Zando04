class UserModel {
  final String uid;
  final String email;
  final String name;
  final String? phoneNumber;
  final String? profileImageUrl;
  final bool isAdmin;
  final List<String> wishlist;
  final String? gender;
  final String? birthday;
  final String? language;
  final List<String> savedAddresses;

  UserModel({
    required this.uid,
    required this.email,
    required this.name,
    this.phoneNumber,
    this.profileImageUrl,
    this.isAdmin = false,
    this.wishlist = const [],
    this.gender,
    this.birthday,
    this.language,
    this.savedAddresses = const [],
  });

  factory UserModel.fromMap(Map<String, dynamic> map, String uid) {
    return UserModel(
      uid: uid,
      email: map['email'] ?? '',
      name: map['name'] ?? '',
      phoneNumber: map['phoneNumber'],
      profileImageUrl: map['profileImageUrl'],
      isAdmin: map['isAdmin'] ?? false,
      wishlist: List<String>.from(map['wishlist'] ?? []),
      gender: map['gender'],
      birthday: map['birthday'],
      language: map['language'],
      savedAddresses: List<String>.from(map['savedAddresses'] ?? []),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'name': name,
      'phoneNumber': phoneNumber,
      'profileImageUrl': profileImageUrl,
      'isAdmin': isAdmin,
      'wishlist': wishlist,
      'gender': gender,
      'birthday': birthday,
      'language': language,
      'savedAddresses': savedAddresses,
    };
  }
}
