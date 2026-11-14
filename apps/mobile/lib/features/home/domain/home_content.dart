// TJ-ARCH-MOB-001 compliant

/// One row of the "Guest or signed in" comparison (prototype index.html
/// `ROWS`).
final class CapabilityRow {
  const CapabilityRow({
    required this.capability,
    this.note,
    required this.guestIncluded,
    this.guestNote,
    this.signedInNote,
  });

  final String capability;

  /// Small line under the capability name.
  final String? note;

  /// Guests get it; otherwise the guest cell reads "Sign in required".
  final bool guestIncluded;
  final String? guestNote;
  final String? signedInNote;
}

/// One step of "How a meeting flows".
final class FlowStep {
  const FlowStep({
    required this.number,
    required this.title,
    required this.body,
    required this.linkLabel,
    required this.location,
  });

  final String number;
  final String title;
  final String body;
  final String linkLabel;

  /// App location the step opens.
  final String location;
}

/// A registered agent shown on the home page's agent card.
final class AgentTeaser {
  const AgentTeaser(this.glyph, this.name, this.role);

  final String glyph;
  final String name;
  final String role;
}

/// The static content of the home page.
final class HomeContent {
  const HomeContent({
    required this.capabilities,
    required this.flow,
    required this.agents,
    required this.sampleCid,
  });

  final List<CapabilityRow> capabilities;
  final List<FlowStep> flow;
  final List<AgentTeaser> agents;

  /// IPFS CID shown on the "Recall the whole session" card.
  final String sampleCid;
}

/// Port: where the home page's content comes from.
abstract interface class HomeContentRepository {
  HomeContent load();
}
