// GENERATED FROM docs/design/tokens.json by @know-meet/design-tokens. DO NOT EDIT.
// Edit the token source and run: pnpm --filter @know-meet/design-tokens generate
// ignore_for_file: public_member_api_docs, lines_longer_than_80_chars

import 'package:flutter/material.dart';

/// Theme-dependent colours and shadows. Read with
/// `Theme.of(context).extension<KmPalette>()!`. Names are the prototype's CSS
/// custom property names in lowerCamelCase.
@immutable
final class KmPalette extends ThemeExtension<KmPalette> {
  const KmPalette({
    required this.bg,
    required this.bg2,
    required this.surface,
    required this.card,
    required this.cardHov,
    required this.muted,
    required this.tile,
    required this.tile2,
    required this.fg,
    required this.fgSub,
    required this.ember,
    required this.emberBtn,
    required this.emberBtnHov,
    required this.onEmber,
    required this.emberText,
    required this.emberSoft,
    required this.cyan,
    required this.cyanText,
    required this.cyanTextOnTile,
    required this.cyanSoft,
    required this.green,
    required this.greenText,
    required this.greenSoft,
    required this.amber,
    required this.amberText,
    required this.amberSoft,
    required this.red,
    required this.redText,
    required this.redSoft,
    required this.dangerBtn,
    required this.dangerBtnHov,
    required this.onDanger,
    required this.control,
    required this.controlHov,
    required this.onControl,
    required this.controlPlaceholder,
    required this.controlInvalid,
    required this.onControlInvalid,
    required this.selected,
    required this.onSelected,
    required this.focus,
    required this.onFocus,
    required this.focusPlaceholder,
    required this.sliderThumb,
    required this.pipGreen,
    required this.pipAmber,
    required this.pipRed,
    required this.speakPerson,
    required this.speakAgent,
    required this.speakPhone,
    required this.onSpeak,
    required this.scrim,
    required this.shadowFloat,
    required this.shadowCard,
    required this.switchTrack,
    required this.switchThumb,
    required this.switchThumbOn,
    required this.switchThumbShadow,
    required this.mediaBg,
    required this.onMedia,
    required this.mediaFootScrim,
    required this.mediaTagBg,
    required this.mediaTagHost,
    required this.mediaQualityPoor,
  });

  static const KmPalette dark = KmPalette(
    bg: Color(0xFF0B0F14),
    bg2: Color(0xFF111620),
    surface: Color(0xFF161D29),
    card: Color(0xFF1C2535),
    cardHov: Color(0xFF202B40),
    muted: Color(0xFF253044),
    tile: Color(0xFF161D29),
    tile2: Color(0xFF1C2535),
    fg: Color(0xFFE8EDF3),
    fgSub: Color(0xFFA7B0BC),
    ember: Color(0xFFFF6A3D),
    emberBtn: Color(0xFFFA5F30),
    emberBtnHov: Color(0xFFFF8159),
    onEmber: Color(0xFF0B0F14),
    emberText: Color(0xFFFF6A3D),
    emberSoft: Color(0xFF2B1A18),
    cyan: Color(0xFF00C2DC),
    cyanText: Color(0xFF00C2DC),
    cyanTextOnTile: Color(0xFF00C2DC),
    cyanSoft: Color(0x2400C2DC),
    green: Color(0xFF22C55E),
    greenText: Color(0xFF4ADE80),
    greenSoft: Color(0x2422C55E),
    amber: Color(0xFFF59E0B),
    amberText: Color(0xFFFBBF24),
    amberSoft: Color(0x24F59E0B),
    red: Color(0xFFEF4444),
    redText: Color(0xFFF87171),
    redSoft: Color(0x29EF4444),
    dangerBtn: Color(0xFFDC2626),
    dangerBtnHov: Color(0xFFB91C1C),
    onDanger: Color(0xFFFFFFFF),
    control: Color(0xFF64718A),
    controlHov: Color(0xFF5C6880),
    onControl: Color(0xFFFFFFFF),
    controlPlaceholder: Color(0xFFF5F7FA),
    controlInvalid: Color(0xFFDC2626),
    onControlInvalid: Color(0xFFFFFFFF),
    selected: Color(0xFFFA5F30),
    onSelected: Color(0xFF0B0F14),
    focus: Color(0xFFFFFFFF),
    onFocus: Color(0xFF0B0F14),
    focusPlaceholder: Color(0xFF4B5563),
    sliderThumb: Color(0xFFFFFFFF),
    pipGreen: Color(0xFF22C55E),
    pipAmber: Color(0xFFF59E0B),
    pipRed: Color(0xFFEF4444),
    speakPerson: Color(0xFFE8532A),
    speakAgent: Color(0xFF0891B2),
    speakPhone: Color(0xFF15803D),
    onSpeak: Color(0xFF0B0F14),
    scrim: Color(0xA305080C),
    shadowFloat: <BoxShadow>[],
    shadowCard: <BoxShadow>[],
    switchTrack: Color(0xFF64718A),
    switchThumb: Color(0xFFE8EDF3),
    switchThumbOn: Color(0xFF0B0F14),
    switchThumbShadow: <BoxShadow>[],
    mediaBg: Color(0xFF000000),
    onMedia: Color(0xFFFFFFFF),
    mediaFootScrim: Color(0x8C000000),
    mediaTagBg: Color(0xBD0B0F14),
    mediaTagHost: Color(0xFFFFB59E),
    mediaQualityPoor: Color(0xFFFCA5A5),
  );

  static const KmPalette light = KmPalette(
    bg: Color(0xFFF7F7F8),
    bg2: Color(0xFFFFFFFF),
    surface: Color(0xFFFAFBFC),
    card: Color(0xFFFFFFFF),
    cardHov: Color(0xFFF2F4F7),
    muted: Color(0xFFEEF0F3),
    tile: Color(0xFFE9ECF1),
    tile2: Color(0xFFDDE2E9),
    fg: Color(0xFF0B0F14),
    fgSub: Color(0xFF4B5563),
    ember: Color(0xFFE04E28),
    emberBtn: Color(0xFFC13E1E),
    emberBtnHov: Color(0xFFA93518),
    onEmber: Color(0xFFFFFFFF),
    emberText: Color(0xFFC13E1E),
    emberSoft: Color(0xFFFCECE7),
    cyan: Color(0xFF0891B2),
    cyanText: Color(0xFF0E7490),
    cyanTextOnTile: Color(0xFF0B6680),
    cyanSoft: Color(0x1A0891B2),
    green: Color(0xFF16A34A),
    greenText: Color(0xFF166534),
    greenSoft: Color(0x1F16A34A),
    amber: Color(0xFFD97706),
    amberText: Color(0xFFB45309),
    amberSoft: Color(0x1FD97706),
    red: Color(0xFFDC2626),
    redText: Color(0xFFB91C1C),
    redSoft: Color(0x1ADC2626),
    dangerBtn: Color(0xFFDC2626),
    dangerBtnHov: Color(0xFFB91C1C),
    onDanger: Color(0xFFFFFFFF),
    control: Color(0xFF858F9E),
    controlHov: Color(0xFF7C8696),
    onControl: Color(0xFF0B0F14),
    controlPlaceholder: Color(0xFF1C2230),
    controlInvalid: Color(0xFFDC2626),
    onControlInvalid: Color(0xFFFFFFFF),
    selected: Color(0xFFC13E1E),
    onSelected: Color(0xFFFFFFFF),
    focus: Color(0xFF0B0F14),
    onFocus: Color(0xFFFFFFFF),
    focusPlaceholder: Color(0xFFC3CAD4),
    sliderThumb: Color(0xFF0B0F14),
    pipGreen: Color(0xFF166534),
    pipAmber: Color(0xFFB45309),
    pipRed: Color(0xFFDC2626),
    speakPerson: Color(0xFFE8532A),
    speakAgent: Color(0xFF0891B2),
    speakPhone: Color(0xFF15803D),
    onSpeak: Color(0xFF0B0F14),
    scrim: Color(0x660B0F14),
    shadowFloat: <BoxShadow>[],
    shadowCard: <BoxShadow>[],
    switchTrack: Color(0xFF858F9E),
    switchThumb: Color(0xFFFFFFFF),
    switchThumbOn: Color(0xFFFFFFFF),
    switchThumbShadow: <BoxShadow>[],
    mediaBg: Color(0xFF000000),
    onMedia: Color(0xFFFFFFFF),
    mediaFootScrim: Color(0x8C000000),
    mediaTagBg: Color(0xBD0B0F14),
    mediaTagHost: Color(0xFFFFB59E),
    mediaQualityPoor: Color(0xFFFCA5A5),
  );

  final Color bg;
  final Color bg2;
  final Color surface;
  final Color card;
  final Color cardHov;
  final Color muted;
  final Color tile;
  final Color tile2;
  final Color fg;
  final Color fgSub;
  final Color ember;
  final Color emberBtn;
  final Color emberBtnHov;
  final Color onEmber;
  final Color emberText;
  final Color emberSoft;
  final Color cyan;
  final Color cyanText;
  final Color cyanTextOnTile;
  final Color cyanSoft;
  final Color green;
  final Color greenText;
  final Color greenSoft;
  final Color amber;
  final Color amberText;
  final Color amberSoft;
  final Color red;
  final Color redText;
  final Color redSoft;
  final Color dangerBtn;
  final Color dangerBtnHov;
  final Color onDanger;
  final Color control;
  final Color controlHov;
  final Color onControl;
  final Color controlPlaceholder;
  final Color controlInvalid;
  final Color onControlInvalid;
  final Color selected;
  final Color onSelected;
  final Color focus;
  final Color onFocus;
  final Color focusPlaceholder;
  final Color sliderThumb;
  final Color pipGreen;
  final Color pipAmber;
  final Color pipRed;
  final Color speakPerson;
  final Color speakAgent;
  final Color speakPhone;
  final Color onSpeak;
  final Color scrim;
  final List<BoxShadow> shadowFloat;
  final List<BoxShadow> shadowCard;
  final Color switchTrack;
  final Color switchThumb;
  final Color switchThumbOn;
  final List<BoxShadow> switchThumbShadow;
  final Color mediaBg;
  final Color onMedia;
  final Color mediaFootScrim;
  final Color mediaTagBg;
  final Color mediaTagHost;
  final Color mediaQualityPoor;

  @override
  KmPalette copyWith({
    Color? bg,
    Color? bg2,
    Color? surface,
    Color? card,
    Color? cardHov,
    Color? muted,
    Color? tile,
    Color? tile2,
    Color? fg,
    Color? fgSub,
    Color? ember,
    Color? emberBtn,
    Color? emberBtnHov,
    Color? onEmber,
    Color? emberText,
    Color? emberSoft,
    Color? cyan,
    Color? cyanText,
    Color? cyanTextOnTile,
    Color? cyanSoft,
    Color? green,
    Color? greenText,
    Color? greenSoft,
    Color? amber,
    Color? amberText,
    Color? amberSoft,
    Color? red,
    Color? redText,
    Color? redSoft,
    Color? dangerBtn,
    Color? dangerBtnHov,
    Color? onDanger,
    Color? control,
    Color? controlHov,
    Color? onControl,
    Color? controlPlaceholder,
    Color? controlInvalid,
    Color? onControlInvalid,
    Color? selected,
    Color? onSelected,
    Color? focus,
    Color? onFocus,
    Color? focusPlaceholder,
    Color? sliderThumb,
    Color? pipGreen,
    Color? pipAmber,
    Color? pipRed,
    Color? speakPerson,
    Color? speakAgent,
    Color? speakPhone,
    Color? onSpeak,
    Color? scrim,
    List<BoxShadow>? shadowFloat,
    List<BoxShadow>? shadowCard,
    Color? switchTrack,
    Color? switchThumb,
    Color? switchThumbOn,
    List<BoxShadow>? switchThumbShadow,
    Color? mediaBg,
    Color? onMedia,
    Color? mediaFootScrim,
    Color? mediaTagBg,
    Color? mediaTagHost,
    Color? mediaQualityPoor,
  }) {
    return KmPalette(
      bg: bg ?? this.bg,
      bg2: bg2 ?? this.bg2,
      surface: surface ?? this.surface,
      card: card ?? this.card,
      cardHov: cardHov ?? this.cardHov,
      muted: muted ?? this.muted,
      tile: tile ?? this.tile,
      tile2: tile2 ?? this.tile2,
      fg: fg ?? this.fg,
      fgSub: fgSub ?? this.fgSub,
      ember: ember ?? this.ember,
      emberBtn: emberBtn ?? this.emberBtn,
      emberBtnHov: emberBtnHov ?? this.emberBtnHov,
      onEmber: onEmber ?? this.onEmber,
      emberText: emberText ?? this.emberText,
      emberSoft: emberSoft ?? this.emberSoft,
      cyan: cyan ?? this.cyan,
      cyanText: cyanText ?? this.cyanText,
      cyanTextOnTile: cyanTextOnTile ?? this.cyanTextOnTile,
      cyanSoft: cyanSoft ?? this.cyanSoft,
      green: green ?? this.green,
      greenText: greenText ?? this.greenText,
      greenSoft: greenSoft ?? this.greenSoft,
      amber: amber ?? this.amber,
      amberText: amberText ?? this.amberText,
      amberSoft: amberSoft ?? this.amberSoft,
      red: red ?? this.red,
      redText: redText ?? this.redText,
      redSoft: redSoft ?? this.redSoft,
      dangerBtn: dangerBtn ?? this.dangerBtn,
      dangerBtnHov: dangerBtnHov ?? this.dangerBtnHov,
      onDanger: onDanger ?? this.onDanger,
      control: control ?? this.control,
      controlHov: controlHov ?? this.controlHov,
      onControl: onControl ?? this.onControl,
      controlPlaceholder: controlPlaceholder ?? this.controlPlaceholder,
      controlInvalid: controlInvalid ?? this.controlInvalid,
      onControlInvalid: onControlInvalid ?? this.onControlInvalid,
      selected: selected ?? this.selected,
      onSelected: onSelected ?? this.onSelected,
      focus: focus ?? this.focus,
      onFocus: onFocus ?? this.onFocus,
      focusPlaceholder: focusPlaceholder ?? this.focusPlaceholder,
      sliderThumb: sliderThumb ?? this.sliderThumb,
      pipGreen: pipGreen ?? this.pipGreen,
      pipAmber: pipAmber ?? this.pipAmber,
      pipRed: pipRed ?? this.pipRed,
      speakPerson: speakPerson ?? this.speakPerson,
      speakAgent: speakAgent ?? this.speakAgent,
      speakPhone: speakPhone ?? this.speakPhone,
      onSpeak: onSpeak ?? this.onSpeak,
      scrim: scrim ?? this.scrim,
      shadowFloat: shadowFloat ?? this.shadowFloat,
      shadowCard: shadowCard ?? this.shadowCard,
      switchTrack: switchTrack ?? this.switchTrack,
      switchThumb: switchThumb ?? this.switchThumb,
      switchThumbOn: switchThumbOn ?? this.switchThumbOn,
      switchThumbShadow: switchThumbShadow ?? this.switchThumbShadow,
      mediaBg: mediaBg ?? this.mediaBg,
      onMedia: onMedia ?? this.onMedia,
      mediaFootScrim: mediaFootScrim ?? this.mediaFootScrim,
      mediaTagBg: mediaTagBg ?? this.mediaTagBg,
      mediaTagHost: mediaTagHost ?? this.mediaTagHost,
      mediaQualityPoor: mediaQualityPoor ?? this.mediaQualityPoor,
    );
  }

  @override
  KmPalette lerp(covariant ThemeExtension<KmPalette>? other, double t) {
    if (other is! KmPalette) return this;
    return KmPalette(
      bg: Color.lerp(bg, other.bg, t) ?? bg,
      bg2: Color.lerp(bg2, other.bg2, t) ?? bg2,
      surface: Color.lerp(surface, other.surface, t) ?? surface,
      card: Color.lerp(card, other.card, t) ?? card,
      cardHov: Color.lerp(cardHov, other.cardHov, t) ?? cardHov,
      muted: Color.lerp(muted, other.muted, t) ?? muted,
      tile: Color.lerp(tile, other.tile, t) ?? tile,
      tile2: Color.lerp(tile2, other.tile2, t) ?? tile2,
      fg: Color.lerp(fg, other.fg, t) ?? fg,
      fgSub: Color.lerp(fgSub, other.fgSub, t) ?? fgSub,
      ember: Color.lerp(ember, other.ember, t) ?? ember,
      emberBtn: Color.lerp(emberBtn, other.emberBtn, t) ?? emberBtn,
      emberBtnHov: Color.lerp(emberBtnHov, other.emberBtnHov, t) ?? emberBtnHov,
      onEmber: Color.lerp(onEmber, other.onEmber, t) ?? onEmber,
      emberText: Color.lerp(emberText, other.emberText, t) ?? emberText,
      emberSoft: Color.lerp(emberSoft, other.emberSoft, t) ?? emberSoft,
      cyan: Color.lerp(cyan, other.cyan, t) ?? cyan,
      cyanText: Color.lerp(cyanText, other.cyanText, t) ?? cyanText,
      cyanTextOnTile: Color.lerp(cyanTextOnTile, other.cyanTextOnTile, t) ?? cyanTextOnTile,
      cyanSoft: Color.lerp(cyanSoft, other.cyanSoft, t) ?? cyanSoft,
      green: Color.lerp(green, other.green, t) ?? green,
      greenText: Color.lerp(greenText, other.greenText, t) ?? greenText,
      greenSoft: Color.lerp(greenSoft, other.greenSoft, t) ?? greenSoft,
      amber: Color.lerp(amber, other.amber, t) ?? amber,
      amberText: Color.lerp(amberText, other.amberText, t) ?? amberText,
      amberSoft: Color.lerp(amberSoft, other.amberSoft, t) ?? amberSoft,
      red: Color.lerp(red, other.red, t) ?? red,
      redText: Color.lerp(redText, other.redText, t) ?? redText,
      redSoft: Color.lerp(redSoft, other.redSoft, t) ?? redSoft,
      dangerBtn: Color.lerp(dangerBtn, other.dangerBtn, t) ?? dangerBtn,
      dangerBtnHov: Color.lerp(dangerBtnHov, other.dangerBtnHov, t) ?? dangerBtnHov,
      onDanger: Color.lerp(onDanger, other.onDanger, t) ?? onDanger,
      control: Color.lerp(control, other.control, t) ?? control,
      controlHov: Color.lerp(controlHov, other.controlHov, t) ?? controlHov,
      onControl: Color.lerp(onControl, other.onControl, t) ?? onControl,
      controlPlaceholder: Color.lerp(controlPlaceholder, other.controlPlaceholder, t) ?? controlPlaceholder,
      controlInvalid: Color.lerp(controlInvalid, other.controlInvalid, t) ?? controlInvalid,
      onControlInvalid: Color.lerp(onControlInvalid, other.onControlInvalid, t) ?? onControlInvalid,
      selected: Color.lerp(selected, other.selected, t) ?? selected,
      onSelected: Color.lerp(onSelected, other.onSelected, t) ?? onSelected,
      focus: Color.lerp(focus, other.focus, t) ?? focus,
      onFocus: Color.lerp(onFocus, other.onFocus, t) ?? onFocus,
      focusPlaceholder: Color.lerp(focusPlaceholder, other.focusPlaceholder, t) ?? focusPlaceholder,
      sliderThumb: Color.lerp(sliderThumb, other.sliderThumb, t) ?? sliderThumb,
      pipGreen: Color.lerp(pipGreen, other.pipGreen, t) ?? pipGreen,
      pipAmber: Color.lerp(pipAmber, other.pipAmber, t) ?? pipAmber,
      pipRed: Color.lerp(pipRed, other.pipRed, t) ?? pipRed,
      speakPerson: Color.lerp(speakPerson, other.speakPerson, t) ?? speakPerson,
      speakAgent: Color.lerp(speakAgent, other.speakAgent, t) ?? speakAgent,
      speakPhone: Color.lerp(speakPhone, other.speakPhone, t) ?? speakPhone,
      onSpeak: Color.lerp(onSpeak, other.onSpeak, t) ?? onSpeak,
      scrim: Color.lerp(scrim, other.scrim, t) ?? scrim,
      shadowFloat: BoxShadow.lerpList(shadowFloat, other.shadowFloat, t) ?? const <BoxShadow>[],
      shadowCard: BoxShadow.lerpList(shadowCard, other.shadowCard, t) ?? const <BoxShadow>[],
      switchTrack: Color.lerp(switchTrack, other.switchTrack, t) ?? switchTrack,
      switchThumb: Color.lerp(switchThumb, other.switchThumb, t) ?? switchThumb,
      switchThumbOn: Color.lerp(switchThumbOn, other.switchThumbOn, t) ?? switchThumbOn,
      switchThumbShadow: BoxShadow.lerpList(switchThumbShadow, other.switchThumbShadow, t) ?? const <BoxShadow>[],
      mediaBg: Color.lerp(mediaBg, other.mediaBg, t) ?? mediaBg,
      onMedia: Color.lerp(onMedia, other.onMedia, t) ?? onMedia,
      mediaFootScrim: Color.lerp(mediaFootScrim, other.mediaFootScrim, t) ?? mediaFootScrim,
      mediaTagBg: Color.lerp(mediaTagBg, other.mediaTagBg, t) ?? mediaTagBg,
      mediaTagHost: Color.lerp(mediaTagHost, other.mediaTagHost, t) ?? mediaTagHost,
      mediaQualityPoor: Color.lerp(mediaQualityPoor, other.mediaQualityPoor, t) ?? mediaQualityPoor,
    );
  }
}

/// Theme-invariant tokens: type, space, radius, layout, motion.
/// Breakpoints are the prototype's max-width queries; z-index values document
/// paint order (Flutter uses Stack and Overlay order instead).
abstract final class KmTokens {
  static const Alignment orbCenter = Alignment(-0.32, -0.4);
  static const double orbHighlightMix = 0.45;
  static const double orbMidStop = 0.56;
  static const double orbShadeMix = 0.68;
  static const double orbMiniMidStop = 0.58;
  static const double orbMiniShadeMix = 0.7;
  static const String fontDisplay = 'Space Grotesk';
  static const String fontBody = 'Inter';
  static const String fontMono = 'JetBrains Mono';
  static const FontWeight fontWeightRegular = FontWeight.w400;
  static const FontWeight fontWeightMedium = FontWeight.w500;
  static const FontWeight fontWeightSemibold = FontWeight.w600;
  static const FontWeight fontWeightBold = FontWeight.w700;
  static const double text10 = 10.0;
  static const double text11 = 11.0;
  static const double textXs = 12.0;
  static const double text13 = 13.0;
  static const double textSm = 14.0;
  static const double text15 = 15.0;
  static const double textBase = 16.0;
  static const double textLg = 18.0;
  static const double text22 = 22.0;
  static const double textXl = 24.0;
  static const double text34 = 34.0;
  /// clamp(28px, 2.2vw + 16px, 40px)
  static double text2xl(double viewportWidth) =>
      _fluid(viewportWidth, 28.0, 2.2, 16.0, 40.0);
  static const double text2xlAt375 = 28.0;
  static const double text2xlAt768 = 32.9;
  static const double text2xlAt1024 = 38.53;
  static const double text2xlAt1440 = 40.0;
  /// clamp(36px, 3.6vw + 18px, 64px)
  static double textDisplay(double viewportWidth) =>
      _fluid(viewportWidth, 36.0, 3.6, 18.0, 64.0);
  static const double textDisplayAt375 = 36.0;
  static const double textDisplayAt768 = 45.65;
  static const double textDisplayAt1024 = 54.86;
  static const double textDisplayAt1440 = 64.0;
  /// clamp(40px, 4vw + 16px, 72px)
  static double textDisplayBrand(double viewportWidth) =>
      _fluid(viewportWidth, 40.0, 4.0, 16.0, 72.0);
  static const double textDisplayBrandAt375 = 40.0;
  static const double textDisplayBrandAt768 = 46.72;
  static const double textDisplayBrandAt1024 = 56.96;
  static const double textDisplayBrandAt1440 = 72.0;
  /// clamp(24px, 2vw + 12px, 32px)
  static double textStat(double viewportWidth) =>
      _fluid(viewportWidth, 24.0, 2.0, 12.0, 32.0);
  static const double textStatAt375 = 24.0;
  static const double textStatAt768 = 27.36;
  static const double textStatAt1024 = 32.0;
  static const double textStatAt1440 = 32.0;
  /// clamp(16px, 1.2vw + 8px, 22px)
  static double textGlyph(double viewportWidth) =>
      _fluid(viewportWidth, 16.0, 1.2, 8.0, 22.0);
  static const double textGlyphAt375 = 16.0;
  static const double textGlyphAt768 = 17.22;
  static const double textGlyphAt1024 = 20.29;
  static const double textGlyphAt1440 = 22.0;
  /// clamp(22px, 2vw + 8px, 36px)
  static double textTileAvatar(double viewportWidth) =>
      _fluid(viewportWidth, 22.0, 2.0, 8.0, 36.0);
  static const double textTileAvatarAt375 = 22.0;
  static const double textTileAvatarAt768 = 23.36;
  static const double textTileAvatarAt1024 = 28.48;
  static const double textTileAvatarAt1440 = 36.0;
  /// Relative to the parent font size (0.88em).
  static const double textCodeInlineEm = 0.88;
  static const double leadingNone = 1.0;
  static const double leadingDisplay = 1.04;
  static const double leading105 = 1.05;
  static const double leadingStat = 1.15;
  static const double leadingHeading = 1.2;
  static const double leading140 = 1.4;
  static const double leading145 = 1.45;
  static const double leadingBody = 1.5;
  static const double leadingBubble = 1.55;
  static const double leadingCode = 1.6;
  /// Absolute line box (18px); TextStyle.height = leading18px / fontSize.
  static const double leading18px = 18.0;
  /// Absolute line box (20px); TextStyle.height = leading20px / fontSize.
  static const double leading20px = 20.0;
  /// letterSpacing = trackingDisplayEm * fontSize.
  static const double trackingDisplayEm = -0.025;
  /// letterSpacing = trackingHeadingEm * fontSize.
  static const double trackingHeadingEm = -0.01;
  /// letterSpacing = trackingNoneEm * fontSize.
  static const double trackingNoneEm = 0.0;
  /// letterSpacing = trackingCodeEm * fontSize.
  static const double trackingCodeEm = 0.04;
  /// letterSpacing = trackingLabelEm * fontSize.
  static const double trackingLabelEm = 0.08;
  /// letterSpacing = trackingTableEm * fontSize.
  static const double trackingTableEm = 0.1;
  /// letterSpacing = trackingEyebrowEm * fontSize.
  static const double trackingEyebrowEm = 0.12;
  /// letterSpacing = trackingMaskedEm * fontSize.
  static const double trackingMaskedEm = 0.18;
  static const double s1 = 4.0;
  static const double s2 = 8.0;
  static const double s3 = 12.0;
  static const double s4 = 16.0;
  static const double s5 = 24.0;
  static const double s6 = 32.0;
  static const double s7 = 48.0;
  static const double s8 = 64.0;
  static const double radius1 = 1.0;
  static const double radius2 = 2.0;
  static const double radius3 = 3.0;
  static const double radius4 = 4.0;
  static const double radius5 = 5.0;
  static const double radius6 = 6.0;
  static const double radius8 = 8.0;
  static const double radius9 = 9.0;
  static const double radius10 = 10.0;
  static const double radius = 12.0;
  static const double radius14 = 14.0;
  static const double radiusTile = 16.0;
  static const double radius18 = 18.0;
  static const double radiusLg = 20.0;
  static const double radius22 = 22.0;
  static const double radius28 = 28.0;
  static const double radiusPill = 999.0;
  /// 50%: use CircleBorder or StadiumBorder.
  static const double radiusRoundFraction = 0.5;
  static const double headerH = 64.0;
  static const double pageMax = 1200.0;
  static const double rsW = 400.0;
  static const double sizeTargetMin = 24.0;
  static const double sizeTarget = 44.0;
  static const double sizeControlH = 48.0;
  static const double sizeControlHSm = 36.0;
  static const double sizeInputPadX = 14.0;
  static const double sizeInputPadY = 12.0;
  static const double sizeSelectPadEnd = 40.0;
  static const double sizeTextareaMinH = 96.0;
  static const double sizeCheck = 20.0;
  static const double sizeSwitchW = 48.0;
  static const double sizeSwitchH = 28.0;
  static const double sizeSwitchThumb = 22.0;
  static const double sizeSwitchThumbInset = 3.0;
  static const double sizeSwitchTravel = 20.0;
  static const double sizeSliderTrackH = 6.0;
  static const double sizeSliderThumb = 20.0;
  static const double sizePip = 8.0;
  static const double sizeSpeakBadge = 24.0;
  static const double sizeDialogW = 560.0;
  static const double sizeSheetW = 440.0;
  static const double sizeToastW = 440.0;
  static const double sizeTooltipMaxW = 320.0;
  static const double sizeTooltipPadX = 12.0;
  static const double sizeTooltipPadY = 8.0;
  static const double sizeNavBarH = 64.0;
  static const double sizeNavRailW = 80.0;
  static const double sizeNavIndicatorW = 56.0;
  static const double sizeNavIndicatorH = 32.0;
  /// 46ch: multiply by the advance width of "0" in the body font.
  static const double measureEmptyCh = 46.0;
  /// Prototype @media (max-width: 380px).
  static const double bp380 = 380.0;
  /// Prototype @media (max-width: 420px).
  static const double bp420 = 420.0;
  /// Prototype @media (max-width: 480px).
  static const double bp480 = 480.0;
  /// Prototype @media (max-width: 599px).
  static const double bp599 = 599.0;
  /// Prototype @media (max-width: 767px).
  static const double bp767 = 767.0;
  /// Prototype @media (max-width: 899px).
  static const double bp899 = 899.0;
  /// Prototype @media (max-width: 1023px).
  static const double bp1023 = 1023.0;
  /// Prototype @media (max-width: 1199px).
  static const double bp1199 = 1199.0;
  /// Adaptive window class: width >= 600px (DESIGN.md, Adaptive layout).
  static const double windowMedium = 600.0;
  /// Adaptive window class: width >= 1024px (DESIGN.md, Adaptive layout).
  static const double windowExpanded = 1024.0;
  static const int zRaised = 1;
  static const int zStickyTools = 5;
  static const int zRoomScrim = 15;
  static const int zRoomSheet = 20;
  static const int zAppbar = 50;
  static const int zMenu = 60;
  static const int zScrim = 69;
  static const int zSheet = 70;
  static const int zToast = 80;
  static const int zSkipLink = 100;
  static const Duration durMeter = Duration(milliseconds: 80);
  static const Duration durFast = Duration(milliseconds: 150);
  static const Duration durProgress = Duration(milliseconds: 180);
  static const Duration durBar = Duration(milliseconds: 200);
  static const Duration dur = Duration(milliseconds: 240);
  static const Duration durPanel = Duration(milliseconds: 280);
  static const Duration durExit = Duration(milliseconds: 190);
  static const Duration durNavMorph = Duration(milliseconds: 280);
  static const Duration durNavLabel = Duration(milliseconds: 150);
  static const Duration durReflow = Duration(milliseconds: 200);
  static const Curve easeOut = Cubic(0.16, 1.0, 0.3, 1.0);
  static const Curve easeIn = Cubic(0.55, 0.0, 0.75, 0.25);
  static const Curve easeStandard = Curves.ease;
  static const Curve easeInOut = Curves.easeInOut;
  static const Curve easeLinear = Curves.linear;
  static const Curve easeLayout = Cubic(0.2, 0.0, 0.0, 1.0);
  static const Duration dotBreathe = Duration(milliseconds: 3200);
  static const Duration dotThink = Duration(milliseconds: 900);
  static const Duration dotThinkBreathe = Duration(milliseconds: 1200);
  static const Duration dotSpeak = Duration(milliseconds: 900);
  static const Duration dotRipple = Duration(milliseconds: 1600);
  static const Duration dotRippleOffset = Duration(milliseconds: 800);
  static const Duration animSpin = Duration(milliseconds: 900);
  static const Duration animSpinFast = Duration(milliseconds: 800);
  static const Duration animSpinSlow = Duration(milliseconds: 1000);
  static const Duration animVoiceBar = Duration(milliseconds: 700);
  static const Duration animTyping = Duration(milliseconds: 1000);
  static const Duration animRecBlink = Duration(milliseconds: 1600);
  static const Duration animLiveRing = Duration(milliseconds: 1800);
  static const Duration animWaitRing = Duration(milliseconds: 2400);
  static const Duration durReducedMotion = Duration(microseconds: 1);

  static double _fluid(double width, double min, double vw, double px, double max) =>
      (width * vw / 100 + px).clamp(min, max).toDouble();
}
