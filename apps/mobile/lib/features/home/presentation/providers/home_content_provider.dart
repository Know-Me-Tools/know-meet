// TJ-ARCH-MOB-001 compliant
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../data/static_home_content.dart';
import '../../domain/home_content.dart';

part 'home_content_provider.g.dart';

/// The home content port; static fixtures this phase.
@Riverpod(keepAlive: true)
HomeContentRepository homeContentRepository(Ref ref) =>
    const StaticHomeContentRepository();

/// The home page's content.
@riverpod
HomeContent homeContent(Ref ref) =>
    ref.watch(homeContentRepositoryProvider).load();
