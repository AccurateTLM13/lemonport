/**
 * 404 Therapy — Human System Architecture Graph Module
 * Connects central "YOU" node to interconnected lifestyle subsystems.
 */

export function initArchitectureGraph() {
  const nodes = document.querySelectorAll('.graph-node');
  const titleEl = document.querySelector('.panel-subsystem-title');
  const metricEl = document.querySelector('.panel-status-metric');
  const descEl = document.querySelector('.panel-description');

  if (!nodes.length || !titleEl) return;

  const nodeTelemetry = {
    'work': {
      title: 'Subsystem: WORK',
      metric: 'CPU usage: 97% · Background tasks accumulating',
      desc: 'High workload does not stay quarantined inside work hours. It leaks into sleep duration, communication patience, evening decompression, and how you interpret neutral messages from loved ones.'
    },
    'sleep': {
      title: 'Subsystem: SLEEP',
      metric: 'I/O bottleneck · Cache clearing failure',
      desc: 'When sleep is fragmented, emotional regulation thresholds collapse by up to 60%. Minor friction feels like a catastrophic hardware fault. We examine the wind-down protocol before touching bigger architecture.'
    },
    'relationships': {
      title: 'Subsystem: RELATIONSHIPS',
      metric: 'Race conditions · Unhandled boundary exceptions',
      desc: 'Repeating the same argument with a new timestamp usually points to competing unspoken assumptions. We map the input-reaction-consequence loop to isolate where the packet loss occurs.'
    },
    'family': {
      title: 'Subsystem: FAMILY_ORIGIN',
      metric: 'Legacy code · Inherited defaults active',
      desc: 'Subconscious emotional scripts written in early childhood frequently run with root privileges in adult life. We identify which inherited patterns are worth keeping and which require deprecation.'
    },
    'self-talk': {
      title: 'Subsystem: SELF_TALK',
      metric: 'High logging verbosity · Critical threshold exceeded',
      desc: 'The internal monologue often runs a continuous stack trace on every minor mistake. Cognitive reframing replaces punishing internal linters with accurate, objective observation.'
    },
    'expectations': {
      title: 'Subsystem: EXPECTATIONS',
      metric: 'Over-provisioned throughput · Buffer overflow',
      desc: 'Expecting 100% throughput across all subsystems simultaneously produces inevitable thermal throttling. Learning to downgrade non-critical SLAs is a primary clinical skill.'
    }
  };

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      const target = node.getAttribute('data-subsystem');
      if (!target || !nodeTelemetry[target]) return;

      // Update active state
      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      // Update panel
      const data = nodeTelemetry[target];
      titleEl.textContent = data.title;
      metricEl.innerHTML = `<span class="status-dot warning"></span> ${data.metric}`;
      descEl.textContent = data.desc;
    });
  });
}
