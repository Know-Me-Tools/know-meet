import 'dart:io';

import 'package:flutter/painting.dart';

/// Records every URL a NetworkImage asks for, through Flutter's
/// `debugNetworkImageHttpClientProvider` hook, and fails each request (no
/// network in tests). Call [uninstall] before the test ends.
final class ImageRequestRecorder {
  final List<String> urls = [];

  void install() {
    debugNetworkImageHttpClientProvider = () => _RecordingClient(urls);
  }

  void uninstall() {
    debugNetworkImageHttpClientProvider = null;
  }
}

final class _RecordingClient implements HttpClient {
  _RecordingClient(this._urls);

  final List<String> _urls;

  @override
  bool autoUncompress = false;

  @override
  Future<HttpClientRequest> getUrl(Uri url) {
    _urls.add(url.toString());
    return Future<HttpClientRequest>.error(
      const SocketException('network disabled in tests'),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
