# Firebase model classes perlu dipertahankan agar (de)serialization tidak error saat R8/ProGuard aktif
-keepclassmembers class com.parentalcontrol.child.data.** {
  *;
}
