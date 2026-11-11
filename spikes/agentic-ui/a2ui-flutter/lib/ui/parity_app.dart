import 'package:flutter/material.dart';

import '../a2ui/media_policy.dart';
import '../surfaces/golden_surface.dart';
import '../theme/km_theme.dart';
import 'surface_page.dart';

/// Width above which the list and the selected surface sit side by side.
const double _twoPaneMinWidth = 840;

class ParityApp extends StatelessWidget {
  const ParityApp({super.key, required this.surfaces, required this.media});

  final List<GoldenSurface> surfaces;
  final MediaPolicy media;

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.sizeOf(context).width;
    return MaterialApp(
      title: 'A2UI parity (spike)',
      debugShowCheckedModeBanner: false,
      theme: buildKmTheme(Brightness.light, viewportWidth: width),
      darkTheme: buildKmTheme(Brightness.dark, viewportWidth: width),
      home: _Home(surfaces: surfaces, media: media),
    );
  }
}

class _Home extends StatefulWidget {
  const _Home({required this.surfaces, required this.media});

  final List<GoldenSurface> surfaces;
  final MediaPolicy media;

  @override
  State<_Home> createState() => _HomeState();
}

class _HomeState extends State<_Home> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('A2UI 1.0 parity')),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < _twoPaneMinWidth) {
            return _SurfaceList(
              surfaces: widget.surfaces,
              selected: null,
              onSelect: (i) => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: Text(widget.surfaces[i].id)),
                    body: SurfacePage(
                      surface: widget.surfaces[i],
                      media: widget.media,
                    ),
                  ),
                ),
              ),
            );
          }
          return Row(
            children: [
              SizedBox(
                width: 300,
                child: Material(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  child: _SurfaceList(
                    surfaces: widget.surfaces,
                    selected: _selected,
                    onSelect: (i) => setState(() => _selected = i),
                  ),
                ),
              ),
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 720),
                    child: SurfacePage(
                      surface: widget.surfaces[_selected],
                      media: widget.media,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _SurfaceList extends StatelessWidget {
  const _SurfaceList({
    required this.surfaces,
    required this.selected,
    required this.onSelect,
  });

  final List<GoldenSurface> surfaces;
  final int? selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: surfaces.length,
      itemBuilder: (context, i) => ListTile(
        selected: i == selected,
        title: Text(surfaces[i].title),
        subtitle: Text(surfaces[i].id),
        onTap: () => onSelect(i),
      ),
    );
  }
}
