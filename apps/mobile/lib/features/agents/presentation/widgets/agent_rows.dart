// TJ-ARCH-MOB-001 compliant
import 'package:flutter/material.dart';

import '../../../../shared/ui/ui.dart';
import '../../domain/agent.dart';
import 'agent_widgets.dart';

/// A tappable registry row (`a.list-row`): leading glyph or orb, a title,
/// meta lines, and a trailing chip with a chevron. Below 768px the trail
/// wraps under the body, as km.css does. The whole row is one link named
/// by [semanticLabel].
class AgentListRow extends StatelessWidget {
  const AgentListRow({
    super.key,
    required this.leading,
    required this.title,
    required this.meta,
    required this.chip,
    required this.semanticLabel,
    required this.onTap,
  });

  final Widget leading;
  final String title;
  final Widget meta;
  final Widget chip;
  final String semanticLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final KmPalette p = context.km;
    final bool phone = MediaQuery.sizeOf(context).width <= KmTokens.bp767;
    final Widget trail = Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        chip,
        const SizedBox(width: KmTokens.s2),
        Icon(LucideIcons.chevronRight, size: 20, color: p.fgSub),
      ],
    );
    final Widget top = Row(
      children: <Widget>[
        leading,
        const SizedBox(width: KmTokens.s3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: KmText.body(context).copyWith(fontWeight: KmTokens.fontWeightSemibold),
              ),
              const SizedBox(height: 2),
              meta,
            ],
          ),
        ),
        if (!phone) ...<Widget>[const SizedBox(width: KmTokens.s3), trail],
      ],
    );
    return Semantics(
      link: true,
      label: semanticLabel,
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        borderRadius: BorderRadius.circular(KmTokens.radius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: KmTokens.s4, vertical: KmTokens.s3),
            child: phone
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[top, const SizedBox(height: KmTokens.s3), trail],
                  )
                : top,
          ),
        ),
      ),
    );
  }
}

/// Registry row for one agent (prototype `row(a)`).
class AgentRegistryRow extends StatelessWidget {
  const AgentRegistryRow({
    super.key,
    required this.agent,
    required this.lastDispatched,
    required this.onTap,
  });

  final Agent agent;
  final String lastDispatched;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final TextStyle meta = KmText.smallSub(context);
    final String title = agent.role.isEmpty ? agent.name : '${agent.name} · ${agent.role}';
    return AgentListRow(
      leading: KmAgentGlyph(agent.mono, size: 40, system: agent.system),
      title: title,
      semanticLabel:
          '$title, ${agent.online ? 'online' : 'offline'}, worker ${agent.worker}, '
          '$lastDispatched, owner ${agent.owner}',
      meta: Wrap(
        spacing: KmTokens.s3,
        runSpacing: 2,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text('Worker ', style: meta),
              AgentCode(agent.worker),
            ],
          ),
          Text(lastDispatched, style: meta),
          Text('Owner: ${agent.owner}', style: meta),
        ],
      ),
      chip: AgentStatusChip(online: agent.online),
      onTap: onTap,
    );
  }
}

/// `.sec-head`: h2, description, and an optional small action below.
class AgentSectionHead extends StatelessWidget {
  const AgentSectionHead({
    super.key,
    required this.title,
    this.description,
    this.action,
  });

  final String title;
  final String? description;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: KmTokens.s4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Semantics(header: true, child: Text(title, style: KmText.h2(context))),
          if (description != null) ...<Widget>[
            const SizedBox(height: 2),
            Text(description!, style: KmText.smallSub(context)),
          ],
          if (action != null) ...<Widget>[const SizedBox(height: KmTokens.s2), action!],
        ],
      ),
    );
  }
}
